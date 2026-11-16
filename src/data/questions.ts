// Architectural gaps, security questions and inconsistencies found while
// building this guide. Every entry says how it was established:
//   verified  — read in the code (origin/stage 0ca89c748), not executed
//   observed  — seen in production data through the read-only CRM MCP
//   suspected — inferred from code; needs confirmation by running it
// Nothing here was exploited or probed against a live system.

export type Severity = 'high' | 'medium' | 'low' | 'info';
export type Kind = 'security' | 'gap' | 'data' | 'docs';
export type Evidence = 'verified' | 'observed' | 'suspected';

export interface Question {
  id: string;
  component: string;
  kind: Kind;
  severity: Severity;
  evidence: Evidence;
  title: string;
  detail: string;
  ask: string;
  files?: string[];
  /** Set when stage has since fixed it: what changed, with the commit. */
  resolved?: string;
}

export const COMPONENTS = [
  'Whole architecture',
  'CREAM-PQL & generic API',
  'Tenancy & RBAC',
  'Lists & vocabulary',
  'Recipes & navigation',
  'Relationships',
  'Leads',
  'Infrastructure',
  'Modules & availability',
  'PubSub & events',
  'Docs',
] as const;

export const QUESTIONS: Question[] = [
  // ── security ─────────────────────────────────────────────────────────────
  {
    id: 'S1',
    component: 'CREAM-PQL & generic API',
    kind: 'security',
    severity: 'high',
    evidence: 'suspected',
    title: 'Can when[…] filter on secret columns (a boolean oracle)?',
    detail:
      '`utils/sensitiveFields.ts` keeps a deny list (User.password, resetToken, Credential.secretHash, HostingProvider.password…) and `isUnqueryableField` enforces it in the typed-kind query path, the MCP gateway and populate scoping. The CREAM-PQL field resolver (`buildFieldResolver`) and `whenRuleFilter` do **not** call it: they accept any DMMF scalar at any relation depth. If so, `?when[resetToken][startsWith]=a` (or `when[user.password][startsWith]=$2b$10$a` from a model related to User) compiles to a Prisma `where`. The column is redacted in the response, but the **row count** answers yes/no — enough to extract a value character by character. A live reset token is redeemable. Exposure depends on which callers can list a model with a path to User (CASL and tenant scope may hide it; for constrained callers the new row-level security also limits the oracle to rows in their own tenant, but staff are not constrained). Re-checked on stage `403b0800f4`: `fieldResolver.ts` was trimmed (dead exports removed) but still never calls `isUnqueryableField`. Note: the Schema-B auth review proves `filters[roles]` is refused — a separate guard for the legacy `?filters=` path, not for `when[]`.',
    ask: 'Should `buildFieldResolver` return null for `isUnqueryableField` paths (every hop), so the compiler fails closed with 422? Is there a CASL-matrix cell for `when[…]` on sensitive fields?',
    files: ['apps/web-services/src/modules/cream-pie/fieldResolver.ts:234-375', 'apps/web-services/src/modules/cream-pie/viewFilter.ts:466-477', 'apps/web-services/src/utils/sensitiveFields.ts:46-111'],
  },
  {
    id: 'S2',
    component: 'CREAM-PQL & generic API',
    kind: 'security',
    severity: 'low',
    evidence: 'verified',
    title: 'pageSize is now capped at 1000 — is that low enough?',
    detail:
      '**Update:** stage commit `9c0925a9ac` ("cap generic list pageSize at 1000") added `MAX_PAGE_SIZE = 1000` in `utils/queryParams.ts`, read by `parseListPagination` in `orm.ts`. Before it, `pageSize=1000000` pulled a whole table with populated relations in one request. 1000 rows × six hydrated vocabularies × two populated relations is still a heavy response, and paging through every row remains a bulk export for anyone with read access.',
    ask: 'Is 1000 the intended ceiling for every model (the MCP caps at 200), and should full exports be an explicit, audited action?',
    files: ['apps/web-services/src/utils/queryParams.ts', 'apps/web-services/src/middleware/orm.ts:674-678'],
  },
  {
    id: 'S3',
    component: 'CREAM-PQL & generic API',
    kind: 'security',
    severity: 'medium',
    evidence: 'verified',
    title: 'No query-complexity budget',
    detail:
      'Relation paths may be arbitrarily deep (`when[a.b.c.d…]`), each to-many hop becomes an `EXISTS`, and `contains`/`startsWith`/`endsWith` compile to case-insensitive `ILIKE` (no index). Regex is refused, which is good. There is no depth limit, no rule-count limit and no statement timeout visible in the chain. Stage tabs alone fire one count per tab.',
    ask: 'Add a max path depth / max rules per request, and a per-request statement timeout on the generic route?',
    files: ['libs/cream-pie/src/lib/prisma-where.ts:194-284'],
  },
  {
    id: 'S4',
    component: 'Tenancy & RBAC',
    kind: 'security',
    severity: 'low',
    evidence: 'verified',
    title: 'Tenant scope now has a database backstop — what does it still not cover?',
    detail:
      '**Update (stage, Oct 2026):** migration `20261231900000_tenant_row_level_security` adds PostgreSQL row-level security. A constrained request runs its generic-API operations as the NOLOGIN role `ci_tenant` with `app.tenant_org_ids` / `app.tenant_site_keys` / `app.tenant_emails` set for the transaction (`withTenantRls`), and policies on the tenant-owned tables hide every other tenant\'s rows. That closes the original worry here — a model missing from `DERIVED_TENANT_PARENTS` or a wrong application filter now returns no foreign rows. What stays outside it, by design: staff and system requests (every role other than `ci_tenant` matches the `tenant_rls_bypass` policy), raw SQL on the scoped client, tables RLS was not enabled on, and a restore into a cluster without the `ci_tenant` role, where the service logs an error and falls back to the application scope only.',
    ask: 'Is there an alert (not just a log line) when the RLS role is missing and the service falls back to application-only scope? And which tables are deliberately left without RLS?',
    files: ['libs/prisma/src/utils/tenantRls.ts', 'libs/prisma/src/schema/migrations/20261231900000_tenant_row_level_security/migration.sql', 'apps/web-services/src/utils/tenantScope.ts', 'docs/database/row-level-security.md'],
  },
  {
    id: 'S5',
    component: 'Infrastructure',
    kind: 'security',
    severity: 'medium',
    evidence: 'verified',
    resolved:
      'Commit `63b9f05007` (Oct 27, "move the Infrastructure menu into a module manifest") gave Infrastructure a `modules/infrastructure/module.json`; its nodes now go through the same module gate and `canRead` filter as every other workspace. `pages/Infrastructure.tsx` was deleted on Nov 3 (`517549e9f1`, Backups screens became recipes).',
    title: 'The Infrastructure menu bypasses the canRead gate',
    detail:
      'The sidebar\'s legacy branch for Infrastructure is gated only by `isHiddenByModules`; its own comment says it "predates the ability-based canRead gate and was never wired into it". The page itself does a manual staff redirect. Server-side endpoints have their own route permissions (seeded), so this is mainly a UI exposure — but it is the only workspace where menu visibility is not ability-driven.',
    ask: 'Fold Infrastructure into the manifest tree (refactor phase 2), which gives it the gate for free?',
    files: ['apps/synapse-v3/src/components/dashboard/UnifiedSidebar.tsx:288-297', 'apps/synapse-v3/src/pages/Infrastructure.tsx:30-42'],
  },
  {
    id: 'S6',
    component: 'Leads',
    kind: 'security',
    severity: 'low',
    evidence: 'verified',
    title: 'The organization-496 pin is presentation, not access control',
    detail:
      'Leads are pinned to CI Web Group via `LEADS_VIEW.fixedWhen` in the browser. The leads table also holds ~10,000 client-website leads (observed). Any caller allowed to read `leads` who calls the API without that `when` gets the other tenants\' leads unless tenant scope applies to them — staff are not tenant-scoped, and the new row-level security does not change that (staff requests bypass it by design). Likely intended for staff, but it is worth stating explicitly.',
    ask: 'Is "every staff user can read every client\'s leads through the API" the intended policy? If not, the pin belongs in an ability condition, not a view template.',
    files: ['apps/synapse-v3/src/components/entity-list/resourceViews/leads.ts:114-123', 'apps/synapse-v3/src/config/ciWebGroup.ts'],
  },
  {
    id: 'S7',
    component: 'Lists & vocabulary',
    kind: 'security',
    severity: 'info',
    evidence: 'verified',
    title: 'Schema B: every new machinery list must be added to a hand-kept guard',
    detail:
      'Recipes, navigation, PubSub topics/subscribers, schedules and role/token grants now live in List/ListItem/ListResource, which every staff tier may write through the generic API. `managedListWrites.ts` refuses writes to a fixed `MANAGED_LIST_KEYS` set unless the caller is a super admin. A future fold that forgets to add its list there silently widens who can change it. The reviews prove each fold, but the rule is enforced by memory.',
    ask: 'Can "managed" become a property of the List row (or the declaration in `jsonSchemas/declarations.ts`) so the guard derives the set instead of listing it?',
    files: ['apps/web-services/src/middleware/managedListWrites.ts:40-65', 'apps/web-services/src/middleware/edgeWriteGuard.ts'],
  },
  {
    id: 'S8',
    component: 'CREAM-PQL & generic API',
    kind: 'security',
    severity: 'low',
    evidence: 'verified',
    title: 'Unknown when[] fields are dropped, not refused',
    detail:
      'The compiler throws on unresolvable fields because "a silently dropped rule is a data-leak primitive" (D18). But `whenRuleFilter` drops unknown ad-hoc fields *before* compiling "so the list does not 422". Within the caller\'s scope this only removes a refinement, so it cannot leak across tenants — yet a typo (`when[stauts][eq]=new`) silently returns everything, which is exactly the user-visible failure D18 warns about.',
    ask: 'Return the dropped rules in `meta` (or a warning header) so the UI can show "filter ignored"?',
    files: ['apps/web-services/src/modules/cream-pie/viewFilter.ts:455-477'],
  },
  {
    id: 'S9',
    component: 'CREAM-PQL & generic API',
    kind: 'security',
    severity: 'low',
    evidence: 'verified',
    title: '?transform= is caller-chosen and its cache never invalidates',
    detail:
      'Any caller can name any TRANSFORM list key; rules are cached per process for 60 s and not invalidated on edit; malformed rules are dropped silently; `coerce:…->number` turns null into 0. Inert today (0 lists seeded) but mounted on every generic request.',
    ask: 'Retire TRANSFORM (as SEEDED-LISTS §3.2 proposes) or gate `?transform=` to known clients?',
    files: ['apps/web-services/src/middleware/responseTransform.ts'],
  },

  // ── data / gaps ──────────────────────────────────────────────────────────
  {
    id: 'G1',
    component: 'Lists & vocabulary',
    kind: 'gap',
    severity: 'high',
    evidence: 'verified',
    title: 'Who owns a system list: the manifest or the Lists admin?',
    detail:
      'The doctrine says "add list values via the admin UI, not migrations". But the module system seeder owns `label, value, position, color, icon, isDefault, isInitial, isTerminal, system, metadata` of every manifest-declared item and rewrites them on each deploy. So an admin relabel/recolour/reorder of a system list is reverted; only additions and `isActive` survive. Nav nodes and platform modules have an `adminEdited` marker that protects admin edits — list items do not.',
    ask: 'Should list items get the same `metadata.adminEdited` marker, or should the admin refuse to edit seed-owned columns of system lists (and say "change the manifest")?',
    files: ['libs/prisma/src/seeders/modules/_moduleSeeder.ts:37-50, 163-210', 'libs/prisma/src/utils/adminEdits.ts'],
  },
  {
    id: 'G2',
    component: 'Lists & vocabulary',
    kind: 'data',
    severity: 'medium',
    evidence: 'observed',
    title: 'Admin-created keys are not slugs — and are about to collide',
    detail:
      'Production leadType has admin-created items with keys `"List"` and `"Employment Application"` (capitals, a space). 22 leads already store `lead_type = "List"`. Stage\'s manifest adds its own item `employment` labelled "Employment Application". After the next seed there will be two values with one label and different keys. The list-slot trigger does not help here: both keys exist in the List, so both are valid values.',
    ask: 'Validate keys as slugs in the Lists admin (`^[a-z][a-z0-9_]*$`), and reconcile `"Employment Application"` → `employment` before deploying?',
  },
  {
    id: 'G3',
    component: 'Lists & vocabulary',
    kind: 'data',
    severity: 'low',
    evidence: 'observed',
    title: 'Production holds lead statuses the List does not know',
    detail:
      'Production (read-only MCP, Oct 22) holds `partner_referral`, `Converted` (capital C) and `contact` on CI Web Group leads — none are leadStatus keys, so those leads match no stage tab and no transition. **Correction to an earlier version of this item:** the schema does tie the column to the List. A `list_slot__status` trigger (`enforce_list_slot(\'status\', \'leadStatus\')`) refuses any written value that is not a key of the platform list (HTTP 400, SQLSTATE LS001), and `lead_type`, `lead_origin`, `customer_type` and `source` are guarded the same way. But the trigger only checks a value on INSERT or when it changes on UPDATE, and it checks that the key exists, not that it is active. So rows written before the trigger was installed keep their old values.',
    ask: 'Does production have the `list_slot__*` triggers on `leads`? If so, a one-off cleanup of the existing orphans; if not, when do they ship?',
    files: ['libs/prisma/src/schema/migrations/20261101000000_baseline/migration.sql (enforce_list_slot, list_slot__status)', 'docs/database/polymorphic-slots.md'],
  },
  {
    id: 'G4',
    component: 'Recipes & navigation',
    kind: 'gap',
    severity: 'medium',
    evidence: 'verified',
    title: 'Organization 496 is hardcoded in four places',
    detail:
      '`sales.referrals`, `sales.vendors-partners` and `sales.reporting` recipes contain `organizationId eq 496`, and the frontend has `CI_WEB_GROUP_ORGANIZATION_ID = 496`. That is a business constant in code and data — the very drift doctrine §1 targets — and it breaks on any environment where the house org has another id.',
    ask: 'Introduce a context binding (e.g. `{{platform.houseOrganizationId}}`) resolved server-side like `{{user.id}}`?',
    files: ['modules/crm/module.json:2820-2890', 'apps/synapse-v3/src/config/ciWebGroup.ts'],
  },
  {
    id: 'G5',
    component: 'Recipes & navigation',
    kind: 'gap',
    severity: 'low',
    evidence: 'verified',
    title: 'Perspectives appear twice in the menu',
    detail:
      '`sales.vendors-partners` and `sales.reporting` are CreamPie nav siblings of the `sales.leads` Item, so they show both as top-level entries and inside the Leads accordion. The sidebar dedupes only CreamPie *children*. Doctrine §5 retires perspectives as menu entries.',
    ask: 'Add a `check:modules` rule: a CreamPie node whose recipe\'s primaryResource equals a sibling Item\'s primaryResource is an error (or must be a child)?',
    files: ['modules/crm/module.json:2965-2976', 'apps/synapse-v3/src/components/dashboard/UnifiedSidebar.tsx:203-208'],
  },
  {
    id: 'G6',
    component: 'Relationships',
    kind: 'gap',
    severity: 'medium',
    evidence: 'verified',
    title: 'The campaign resolver survived its own worked example',
    detail:
      'Doctrine\'s canonical example says "declare `Lead.campaignMembers`, delete `campaignMembershipFilter.ts`". On stage the resolver is still wired (fieldResolver + viewFilter), and `campaign_members` has since been folded into ListResource edges, so a Prisma relation is no longer possible. The edge grammar needs a RELATIONSHIP list, but the membership role list `campaignMemberRole` is TAXONOMY.',
    ask: 'What is the target: an `edges.*` path over the campaign-member predicate, a single linkage, or a declared computed field? (Tutorials → "Make the Campaign filter doctrine-compliant")',
    files: ['apps/web-services/src/modules/cream-pie/campaignMembershipFilter.ts', 'libs/prisma/src/schema/migrations/20261230000000_campaign_members_fold_into_edges', 'modules/events/module.json:1521'],
  },
  {
    id: 'G7',
    component: 'Relationships',
    kind: 'gap',
    severity: 'low',
    evidence: 'suspected',
    title: 'Where is edge inversion enforced?',
    detail:
      'RELATIONSHIP items carry `inverseSlug`, `symmetric`, `directional` and an edge is stored once. The org-graph resolver reads "the type the root plays, inverse included", but nothing found validates that `inverseSlug` pairs are mutual (A→B ⇒ B→A) or that every list declares them.',
    ask: 'Is there a seed-time check that inverse pairs are consistent?',
    files: ['libs/prisma/src/seeders/seed-RelationshipGraphDefinitions.ts', 'apps/web-services/src/modules/cream-pie/edgePath.ts'],
  },
  {
    id: 'G8',
    component: 'Leads',
    kind: 'gap',
    severity: 'low',
    evidence: 'verified',
    title: 'Manifest inconsistencies around Lead taxonomies',
    detail:
      '`trade` and `industry` are listed in `Lead.taxonomies` and requested on every leads call (`lists=…,trade,industry`), but the vocabulary manifest\'s `resources` for them omit `leads`. Conversely `leadTag` is declared for leads but missing from `Lead.taxonomies`.',
    ask: 'Should `check:modules` cross-validate `taxonomies[]` against each list\'s `resources`?',
    files: ['modules/crm/module.json:201-209', 'modules/vocabulary/module.json:83-110'],
  },
  {
    id: 'G9',
    component: 'Lists & vocabulary',
    kind: 'gap',
    severity: 'low',
    evidence: 'verified',
    title: 'A STAGE list where every move is allowed',
    detail:
      'On stage every leadStatus item declares transitions to every other item. The state machine is wired, but governs nothing for leads — STAGE behaves like TAXONOMY plus initial/terminal flags. SEEDED-LISTS proposes renaming STAGE to STATE.',
    ask: 'Is the all-to-all graph deliberate (sales wants freedom) or a placeholder?',
  },
  {
    id: 'G10',
    component: 'Whole architecture',
    kind: 'data',
    severity: 'medium',
    evidence: 'observed',
    title: 'What is actually deployed?',
    detail:
      'Production differs from stage in ways that matter for debugging: leadStatus has 11 items with only `stageGroup` metadata (stage: 12 with `transitions`, incl. `spam`); `leadIntakeChannel` does not exist in prod; the MCP view returns no `creamPieRecipe` / `navigation` / `savedView` lists (Schema B), and its ListType enum still shows retired STATUS/CATEGORY/TYPE. Reading stage code to explain prod behaviour can mislead — and stage moves fast: in one week it gained tenant row-level security, a pageSize cap, status-column list slots for agreements/projects/messages, and deleted four architecture docs.',
    ask: 'Expose the deployed commit + last seed run per module (e.g. in Admin › Modules) so docs and debugging can say which version they describe?',
  },
  {
    id: 'G11',
    component: 'Leads',
    kind: 'gap',
    severity: 'low',
    evidence: 'verified',
    title: 'One screen, three configuration layers',
    detail:
      'The Leads screen is shaped by the manifest (lists, recipes, nav), a frontend view template (`LEADS_VIEW`: hidden stages, defaults, the org pin, columns) and seeded rows. The view template is code in synapse-v3, so other clients of the same API (hydra-os, MCP, exports) do not get its rules — e.g. the 496 pin or "hide closed".',
    ask: 'Which of these belong in the manifest (and therefore on the server) vs in presentation only?',
    files: ['apps/synapse-v3/src/components/entity-list/resourceViews/leads.ts'],
  },
  {
    id: 'G12',
    component: 'CREAM-PQL & generic API',
    kind: 'gap',
    severity: 'low',
    evidence: 'verified',
    title: 'N+1 count requests per list screen',
    detail:
      '`useStageCounts` fires one `pageSize=1` request per stage tab plus "All" — 13 requests for leads, each re-running the full where and middleware chain. The code comment acknowledges the missing aggregate endpoint on the generic route (`/synapse/lists/aggregate` exists separately).',
    ask: 'Route tab counts through one `groupBy` aggregate?',
    files: ['apps/synapse-v3/src/components/entity-list/useStageCounts.ts'],
  },
  {
    id: 'G13',
    component: 'Infrastructure',
    kind: 'gap',
    severity: 'medium',
    evidence: 'verified',
    resolved:
      'Mostly done on stage: the workspace has a manifest (`modules/infrastructure/module.json`, Oct 27) and the Backups screens became recipes and a target detail (Nov 3, `517549e9f1`), deleting `/infrastructure`. The scorecard on Modules → Infrastructure describes the earlier state.',
    title: 'Infrastructure is entirely outside the architecture',
    detail:
      'No manifest, hand-written nav, hardcoded tab sets, 8 TS enums with colour maps, duplicated fetch hooks, bespoke tables, and the generic API explicitly blocked for backup models. See Modules → Infrastructure for the scorecard.',
    ask: 'Is there a plan/owner for the D51/D52 migration of this workspace, and should new tabs (Storage) wait for it?',
  },
  {
    id: 'G14',
    component: 'Lists & vocabulary',
    kind: 'gap',
    severity: 'info',
    evidence: 'verified',
    title: 'Two ListTypes without a real consumer',
    detail:
      'TRANSFORM: middleware mounted, 0 lists. EVENT: one list (`eventInvocationMethod`) and no runtime reader found. Both are taught as core concepts but are not exercised by the product.',
    ask: 'Keep them on the ListType axis, or move TRANSFORM out (SEEDED-LISTS §3.2) and document EVENT as reserved?',
  },

  // ── docs ─────────────────────────────────────────────────────────────────
  {
    id: 'D1',
    component: 'Docs',
    kind: 'docs',
    severity: 'low',
    evidence: 'verified',
    title: '`when[rel][some][field][op]` is not the URL grammar',
    detail:
      'DOCTRINE §3 presents relation traversal as `when[campaignMembers][some][campaignId][eq]=8`. `fromSearchParams` and `parseWhenQuery` only understand `when[field][op]`; the working form is the dotted field `when[campaignMembers.campaignId][eq]=8`, and `some` is what the compiler emits. The bracketed form would most likely be rejected (op "some").',
    ask: 'Update the doctrine example to the dotted (and, after the edges fold, `edges.*`) form?',
    files: ['libs/cream-pie/src/lib/when-query.ts', 'docs/architecture/DOCTRINE.md §3'],
  },
  {
    id: 'D2',
    component: 'Docs',
    kind: 'docs',
    severity: 'info',
    evidence: 'verified',
    title: 'SEEDED-LISTS says TRANSFORM reads list.values',
    detail: 'The middleware reads active `ListItem.label`s ordered by position (platform tier only), not `List.values`.',
    ask: 'Fix the doc line (SEEDED-LISTS.md:517)?',
  },

  {
    id: 'D3',
    component: 'Docs',
    kind: 'docs',
    severity: 'medium',
    evidence: 'verified',
    title: 'Four architecture docs were deleted — the onboarding reading list points at nothing',
    detail:
      'Stage commit `7c34c5b50a` (Oct 25, "delete the archive and stale docs") removed `docs/CREAM-PIE.md`, `docs/LOADED-CREAM-PIE-STRATEGY.md`, `docs/architecture/DECISIONS-resource-views.md` and `docs/architecture/ERP-PRIMITIVES.md` (history stays in git). `docs/architecture/CREAM-PIE.md` now says the C and D numbers "are kept as labels" and code comments still cite them (C10 in `subscriberExecutionService.ts`, …). Onboarding reading lists written before Oct 25 still name the deleted files as required reading, and the decisions themselves — the template ceiling, the user tier never shadowing — are still how the code behaves.',
    ask: 'Should the still-binding decisions (V1, V5–V7, V9, V10, C2, C3, C10, C19) be folded into DOCTRINE.md or docs/architecture/CREAM-PIE.md, so a label in a code comment has a living definition?',
    files: ['docs/architecture/CREAM-PIE.md', 'docs/architecture/DOCTRINE.md'],
  },

  // ── whole architecture ───────────────────────────────────────────────────
  {
    id: 'W1',
    component: 'Whole architecture',
    kind: 'gap',
    severity: 'info',
    evidence: 'verified',
    title: 'One generic route = one blast radius',
    detail:
      'Every model, every list screen and every client go through one middleware chain. That is the architecture\'s strength (one place to secure) and its risk (one regression affects all models). The Schema-B reviews use a 6.2M-cell ability snapshot and a CASL matrix for exactly this reason.',
    ask: 'Does the CASL matrix also cover the read-side query surface — `when[]`, `sort`, `populate`, `lists=` — per role, the way it covers writes?',
  },
  {
    id: 'W4',
    component: 'CREAM-PQL & generic API',
    kind: 'security',
    severity: 'low',
    evidence: 'verified',
    title: 'The generic chain is now also reachable anonymously',
    detail:
      'New on stage: `modules/onboarding/publicReferenceReads.ts` mounts the same `genericCrudChain` for unauthenticated GETs of platform reference subjects (decks, catalog products, platforms, industries, lists), replacing an API token that shipped in the onboard bundle — a clear improvement. It uses a fixed read-only ability, narrows tenant scope to platform rows, caps page size and rate-limits per IP. The flip side: every `when[…]` / `populate` / `lists=` behaviour of the chain is now exposed to the internet for those subjects, including the field resolver in S1.',
    ask: 'Is there a test that `when[…]` on a public subject cannot traverse a relation into a non-public model (e.g. a list item → its organization → users)?',
    files: ['apps/web-services/src/modules/onboarding/publicReferenceReads.ts', 'apps/web-services/src/routes/genericCrudChain.ts'],
  },
  {
    id: 'W5',
    component: 'Recipes & navigation',
    kind: 'gap',
    severity: 'info',
    evidence: 'verified',
    title: 'Recipes can now gate any authenticated route (MIDDLEWARE bindings)',
    detail:
      'docs/architecture/CREAM-PIE.md §6.4: `installCreamPieRouteGate` puts a gate in front of each of ~1,221 authenticated routes; a `MIDDLEWARE` binding attaches a recipe to a route id (`GET /api/v1/billing/invoices/:id/plan-breakdown`) and the route answers 403 `CREAM_PIE_ROUTE_DENIED` when the recipe does not match. Bindings are tenant-scoped and fail closed. It is the doctrine\'s "one dialect for RBAC injection" made real — and a powerful lever stored as rows.',
    ask: 'Who may create MIDDLEWARE bindings (they can deny any route to an organization), and are they listed anywhere an operator would look when a route suddenly 403s?',
    files: ['apps/web-services/src/modules/cream-pie/creamPie.middleware.ts', 'docs/architecture/CREAM-PIE.md §6.4'],
  },
  {
    id: 'W2',
    component: 'Whole architecture',
    kind: 'gap',
    severity: 'info',
    evidence: 'verified',
    title: 'Integrity moved from foreign keys to triggers',
    detail:
      'Folding junction tables into ListResource replaced FKs and unique keys with partial indexes and triggers on `list_items` / `ListResource`. That keeps one storage model but makes integrity rules less visible to developers reading Prisma.',
    ask: 'Is there a single generated reference of the trigger-enforced rules per predicate/list (what used to be readable as FKs)?',
  },
  {
    id: 'W3',
    component: 'Whole architecture',
    kind: 'gap',
    severity: 'info',
    evidence: 'suspected',
    title: 'Who governs production vocabulary?',
    detail:
      'If values are data, stakeholders edit them in production (as with leadType on Oct 19–20). There is no visible review/approval step or change log surfaced in the Lists admin.',
    ask: 'Is there an audit trail of List/ListItem edits (who, when, before/after), and a policy for which lists non-developers may edit?',
  },
  // ── modules & availability (added Nov 16 2026, stage de81a84533) ─────────
  {
    id: 'G15',
    component: 'Modules & availability',
    kind: 'gap',
    severity: 'medium',
    evidence: 'verified',
    title: 'The menu\'s module gate caches across tenant switches (and breaks doctrine §7)',
    detail:
      '`useDisabledNavRoots` fetches `modules/enabled` with `useEffect` + `fetch` and keeps the answer in a module-level `let cache`, keyed by nothing. Doctrine §7 forbids both ("no useEffect+fetch, no module-level fetched-once singletons"). Because the tenant switcher no longer reloads the page (`ErpProvider.setOrganization` invalidates TanStack queries instead), the sidebar keeps hiding the *previous* tenant\'s disabled modules until a reload. Meanwhile `ErpProvider` already fetches the same data correctly (`useEnabledModules(organizationId)`, query key `[\'erp\', \'modules\', organizationId]`). Read in the code, not reproduced.',
    ask: 'Should the sidebar read modules from the ERP context (`useErp().modules`) and `useDisabledNavRoots` be deleted? That is also the natural first step for the menu restructuring.',
    files: ['apps/synapse-v3/src/hooks/useDisabledNavRoots.ts', 'apps/synapse-v3/src/erp/useErpBootstrap.ts:202-226', 'apps/synapse-v3/src/components/dashboard/UnifiedSidebar.tsx:252'],
  },
  {
    id: 'G16',
    component: 'Modules & availability',
    kind: 'gap',
    severity: 'low',
    evidence: 'verified',
    title: 'Module dependencies are checked at build time only',
    detail:
      '`dependencies.requires / conflicts` in a manifest are validated by `tools/build-modules` (unknown slugs, a module both required and conflicting) and set the build order. Nothing reads them at run time: `resolveModulesForOrg` and `PATCH /synapse/v1/modules/:slug/org/:orgId` let a tenant have `billing` on while a module it requires is off, and the menu then shows places whose prerequisites are missing.',
    ask: 'Should enabling a module for an organization refuse (or cascade) when a required module is disabled, and should the resolver report `source: "DEPENDENCY"`?',
    files: ['tools/build-modules/lib/validate.mjs:112-118', 'apps/web-services/src/modules/synapse/moduleRegistry.ts:69-150'],
  },
  {
    id: 'G17',
    component: 'Modules & availability',
    kind: 'gap',
    severity: 'info',
    evidence: 'verified',
    title: 'No single capability resolver',
    detail:
      'Whether a person may use something is decided in four places: `resolveModulesForOrg` (module availability), CASL abilities (`/me/ability`, prefix cascade), recipe `availableWhen`, and `config/staffOnly.ts`. Each is sound, and the server enforces abilities independently, but no one call answers "can this principal do X on this record here, and if not, why". That is the third design decision in the ERP write-up Chris shared (`resolveCapability({ module, capability, tenantId, principalId, resourceId })`).',
    ask: 'Is a shared `resolveCapability` with an explicit reason part of the ERP planning, or is the current split intended?',
  },
  // ── pubsub & events ──────────────────────────────────────────────────────
  {
    id: 'G18',
    component: 'PubSub & events',
    kind: 'gap',
    severity: 'low',
    evidence: 'verified',
    title: 'Two PubSub behaviours worth knowing: emit is outside the write\'s transaction, and sync subtopics fire after a FAILED delivery',
    detail:
      '1) `emitPubSubEvent(modelName, action, payload)` takes no transaction client, so on the generic write path the `PubSubEvent` row is written after the business write commits. A crash in between loses the event: an outbox in shape, not a transactional outbox. 2) `executeSubscriber` runs `deliverToSubscriber` and then `fireSubTopics(…, "sync")` unconditionally, so a subscriber whose delivery FAILED still fires its sync subtopics. Either may be intended; neither is written down.',
    ask: 'Are both intended? If sync subtopics mean "after a successful delivery", should they be gated on DELIVERED?',
    files: ['apps/web-services/src/services/pubsubService.ts:48', 'apps/web-services/src/services/subscriberExecutionService.ts:692-698'],
  },
  {
    id: 'D4',
    component: 'Docs',
    kind: 'docs',
    severity: 'low',
    evidence: 'verified',
    title: 'docs/pubsub/README.md leaves out the CREAM-PIE recipe-binding gate',
    detail:
      'The README\'s pipeline lists idempotency → shape → MTEL conditions → async subtopics → deliver → sync subtopics. The code has one more gate between conditions and subtopics, which its own header comment also omits: recipes bound to the subscriber or its topic (multitenancy P3) can veto a delivery, recorded as SKIPPED "CREAM-PIE recipe gate not met", failing closed on error. Pattern subscribers (`topicPattern`, e.g. `helpdesk:ticket:*:stage-changed:*`) are also missing from the doc.',
    ask: 'Add the recipe-binding gate and `topicPattern` subscribers to the README (and to the header comment of `subscriberExecutionService.ts`)?',
    files: ['docs/pubsub/README.md', 'apps/web-services/src/services/subscriberExecutionService.ts:615-690'],
  },
];
