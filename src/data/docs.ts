// ─────────────────────────────────────────────────────────────────────────────
// Documentation content — the full CI Connect architecture docs, rendered for
// reading. Each doc is a set of sections; each section body is markdown-ish text
// consumed by the Markdown renderer in DocumentationPage.
//
// Source files (in ci-connect repo):
//   docs/architecture/DOCTRINE.md
//   docs/api/polymorphic-lists.md
//   docs/architecture/SEEDED-LISTS.md
//   docs/architecture/DECISIONS-resource-views.md
//   docs/architecture/MODULE-STRUCTURE.md
//   docs/CREAM-PIE.md
//   docs/LOADED-CREAM-PIE-STRATEGY.md
//   docs/architecture/ERP-PRIMITIVES.md
//   modules/_schema/module.schema.json  (reference)
//   modules/crm/module.json             (reference)
// ─────────────────────────────────────────────────────────────────────────────

export interface DocSection {
  id: string;
  title: string;
  /** Markdown-ish body. Supports #/##/### headings, paragraphs, lists,
   * fenced ``` code blocks, inline `code`, **bold**, tables, and > blockquotes. */
  body: string;
}

export interface Doc {
  id: string;
  title: string;
  /** short label shown in the sidebar */
  short: string;
  /** one-line summary under the title */
  summary: string;
  icon: string;
  color: string;
  /** source path in the ci-connect repo */
  source: string;
  sections: DocSection[];
}

export const DOCS: Doc[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // 1. DOCTRINE
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'doctrine',
    title: 'Architecture Doctrine',
    short: 'Doctrine',
    summary:
      'The normative patterns every developer and AI agent follows. These override framework defaults and whatever the file next to yours does.',
    icon: '📜',
    color: 'var(--purple-l)',
    source: 'docs/architecture/DOCTRINE.md',
    sections: [
      {
        id: 'doctrine-intro',
        title: 'Audience & intent',
        body: `**Audience: every developer and every AI agent working in this repo.** These are normative patterns, not suggestions — they override framework defaults, tutorial habits, and whatever the file next to yours does. The goal is stated by the owner: *drastically reduce shit code; highly reusable DRY code.* When code you find contradicts this document, the code is the legacy and this is the target.

Deeper sources of truth (read when working in the area):

- List/Taxonomy/CREAM-PIE overhaul plan: \`~/.claude/plans/glistening-bouncing-kitten.md\` (decisions D1–D20) — Chris's copy; ask for it if you can't read it.
- Automailer→pubsub decisions: \`docs/pubsub/DECISIONS-automailer-migration.md\` (D1–D11).
- Learned operational preferences: \`AGENTS.md\` (repo root).
- Lifecycles (STAGE lists as state machines, the primary resources' seeded lists, what each ListType renders, Opportunity = Service Agreement stage): \`docs/architecture/LIFECYCLES.md\`.`,
      },
      {
        id: 'doctrine-1',
        title: '§1 — One vocabulary layer: List / ListItem / ListResource',
        body: `**The List system is THE canonical vocabulary layer — decided by Chris, 2026-08-13.** \`EntityStatus\` / \`CortexEntityStatus\` and every free-text \`statusSlug\` are transitional: they mirror INTO Lists during the overhaul and retire at their cutover wave. No new code consumes them; no new vocabulary mechanism gets invented beside Lists.

Business vocabularies (statuses, stages, types, taxonomies, relationship labels) live in the **List system** — the WordPress-taxonomy shape on Postgres (\`List\` ≈ wp_term_taxonomy, \`ListItem\` ≈ wp_terms, \`ListResource\` ≈ wp_term_relationships, \`ResourceMeta(resource='ListItem')\` ≈ wp_termmeta).

**Never hardcode a business vocabulary.** No new Prisma enums, no \`*_STATUSES\` constant arrays, no option lists inlined in components, no SQL CHECK constraints on status columns. If users could plausibly want to add, rename, recolor, or reorder the values — it's a List.

- The \`ListType\` axis asks one question: **is movement between the values governed?** **STAGE** = yes, a state machine whose moves are gated (\`isInitial\`/\`isTerminal\`, transitions in item metadata), so a guard may refuse one. **TAXONOMY** = no, any value may be applied freely, and how many may apply at once is \`selectionType\`'s question. **RELATIONSHIP** = label on an edge between two entities. **TRANSFORM** = response reshape rules, not a business vocabulary at all. Coarse pipeline groupings are *derived* from item \`metadata.stageGroup\`, never from a second vocabulary.
- **STATUS, TYPE and CATEGORY are retired** and hold no rows (\`20260920120000\` for the first two, \`20260813141000\` for the third). STATUS gated nothing, so it was a taxonomy named after a condition; TYPE was indistinguishable from TAXONOMY and nothing branched on it. Postgres cannot drop an enum value, so all three stay declared on the enum and stay in the TS mirrors that \`scripts/ci/check-listtype-mirrors.mjs\` checks against it. They are refused at every authoring surface instead: \`modules/_schema/module.schema.json\`, \`modules/_runtime/lists.ts\` and \`LIST_TYPES\` in the Lists admin.
- Behavior groupings are **item metadata flags**, not code sets: \`metadata.signable\`, \`metadata.billable\`, \`metadata.renewable\`. Server code asks the item.
- Machine/infra states (queue, sync, delivery, migration) stay Prisma enums but must be registered in the plan's Appendix B. Anything else that looks like an enum is a smell.
- System vocabularies referenced by code are seeded \`system: true\`, \`organizationId: null\`; org additions ride \`organizationId\` overlays. Seeders upsert-by-key and never touch org or non-system rows.
- **One item id means the same thing everywhere**: the same \`trade:hvac\` item gates a recipe, filters a report, selects platform modules, and labels a distributor. Spine taxonomies (\`trade\`, \`serviceLine\`, \`tag\`, \`priority\`) are shared across ALL entities — never invent a per-module copy.`,
      },
      {
        id: 'doctrine-2',
        title: '§2 — Discriminators over duplicate models',
        body: `Before creating a Prisma model, check whether an existing model + a type discriminator covers it. The proven house patterns:

- \`EntityNote\` replaced three note tables with one discriminated table.
- \`FormSubmission\` (formSlug + \`data Json\`) is the shape for "a customer filled out a form" — Media Requests, Quote Requests, and Leads are perspectives on intake, not separate schemas.
- Genuinely divergent workflow halves become **satellite models FK'd to the shared core** (e.g. a \`Quote\` satellite), never a parallel near-duplicate.

A new model whose field set overlaps an existing one >60% needs a written justification in its doc comment. The \`Cortex*\` shadow layer (37 duplicated models) is the cautionary tale, not a precedent.`,
      },
      {
        id: 'doctrine-3',
        title: '§3 — One condition dialect: CREAM-PQL',
        body: `All conditional logic — display gating, query filtering, middleware guards, pubsub delivery conditions, cron gates, RBAC condition injection — speaks **one dialect**: the MTEL \`ConditionConfig\` (\`{logic: 'AND'|'OR', rules: [...]}\`, nestable), evaluated by the cream-pie core (\`evaluateConditions\`, \`compilePredicate\`, \`toPrismaWhere\`, \`parseWhenQuery\`/\`serializeWhenQuery\`).

Do not invent a new condition format, a bespoke \`visibleIf\`, or an ad-hoc filter DSL. List keys are the field namespace (\`lists.trade\`); the token grammar \`{listName}\` / \`{listName}_{metaKey}\` / \`{listName}_{itemKey}_{metaKey}\` is identical from URL param to Prisma where to JSX.`,
      },
      {
        id: 'doctrine-4',
        title: '§4 — CREAM-PIE recipes: named queries, tiered, condition-shared',
        body: `A **recipe** is a named ConditionConfig (+ presentation hints) — the platform's unit of "a saved point of view." Tiers: System (seeded), Organization, User. Sharing is **conditional availability** (\`availableWhen\` — itself a ConditionConfig), never role-enums: "visible to my company," "visible to CSRs," "visible where org.trade contains hvac."

**Security invariants (non-negotiable):**

- Recipes **narrow, never widen**: recipe where-clauses are ANDed *under* the caller's CASL/org scoping. A recipe must never be able to return rows the caller couldn't already see.
- \`availableWhen\` is enforced **server-side at apply time**. A recipe slug is not a capability token.
- User-tier recipes are additive picker entries; they never shadow org/system recipes by slug.`,
      },
      {
        id: 'doctrine-5',
        title: '§5 — Perspectives: menu = places, chips = perspectives, filters = refinements',
        body: `Navigation must never enumerate values of a vocabulary ("11 subscriber-type menu items") **or** saved queries ("Customers", "Vendors" as separate menu entries). A nav section whose children are values-of-one-vocabulary or queries-over-one-resource collapses to ONE route:

- vocabulary values → \`<TaxonomyFilterBar>\` chips wired to \`?lists=\` filters;
- saved queries → \`<RecipeChips>\` (System + Org + user's own recipes).

A raw list of all organizations or all contacts is nearly useless; the value is the **perspective** — and perspectives are recipes, saved and shared per job function, not baked into menus or bespoke views.`,
      },
      {
        id: 'doctrine-6',
        title: '§6 — The universal entity surface',
        body: `New list/table screens are built on the universal \`<EntityList>\` surface (ReactAdmin-inspired: provider + \`useEntityList\` / \`useRecord\` / \`useEntityFilters\` / \`useRecipe\`), not bespoke per-view fetch+table code.

- **The URL is the filter state.** Filters serialize to \`?lists=\` / \`when[field][op]=\` params; every filtered view is shareable by link; a recipe is a named URL state. (Precedent: the Hydra tracker's param scheme.)
- **Filter widgets are derived, not hand-built**: explicit \`List.fieldType\` → \`metadata.filterWidget\` override → heuristics (type × selectionType × item count × hierarchy × dataType). The Hydra-style pill bar is the STAGE/STATUS small-single-select case, colors/icons from ListItem.
- **Filtering is server-side push-down** through the smart-route pseudo-column grammar. Client-side filtering over a fully-materialized array is legacy.`,
      },
      {
        id: 'doctrine-7',
        title: '§7 — TanStack, used properly',
        body: `- **TanStack Query owns ALL client server-state.** No \`useEffect\`+\`fetch\`, no hand-rolled caches, no module-level "fetched once" singletons. Query keys are structured arrays (\`['entity', resource, {filters, recipe, page}]\`); invalidation rides the server's model-version counters; mutations invalidate by key prefix. Bulk-fetch + client evaluation (the onboard \`creamPieRecipes.ts\` pattern) beats N round-trips — never one HTTP call per recipe/list/row.
- Table rendering: the EntityList contract is **headless** — data/filter/sort state comes from the provider; the renderer is pluggable (AG Grid is the standing preference for heavy grids; keep MUI/React-Admin out of new code).
- Virtualize long lists (TanStack Virtual) instead of paginating client-side over huge arrays.`,
      },
      {
        id: 'doctrine-8',
        title: '§8 — All automation through pubsub',
        body: `No business code calls a mail/SMS/notification provider directly. Producers emit domain events (\`domain:resource:action\` topic names — event-shaped, never delivery-shaped); DB-seeded subscribers own recipients and delivery; the delivery engine owns retry, idempotency, env-scoped BCC, and the non-prod staff-mail redirect. Recipients live in subscriber rows or \`NotificationRoute\` — never in code. Best-effort side effects in money paths emit durable \`system:fulfillment:failure\` events instead of vanishing into stdout. Full decisions: \`docs/pubsub/DECISIONS-automailer-migration.md\`.`,
      },
      {
        id: 'doctrine-9',
        title: '§9 — Platform hygiene laws',
        body: `- **Secrets fail fast**: \`requireSecret()\` (\`apps/web-services/src/config/secrets.ts\`); never \`process.env.X || "literal"\` for anything secret-shaped. Critical env is validated at boot (\`validateEnvAtBoot\`); production Vite builds refuse to build without \`VITE_WEB_SERVICES\`.
- **Idempotency at the boundary**: webhook-driven money paths run behind the shared \`ProcessedStripeEvent\` claim; multi-model writes that must land together use \`$transaction\` (a child row and its parent link are one write).
- **Nomenclature is API.** Topic names, nav subject ids, List keys, ListItem keys, and recipe slugs are permanent identifiers; renames are data migrations. Nav ids must stay prefix-consistent with their tree position (RBAC cascade is string-prefix based).
- Migrations are hand-written SQL in hand-timestamped folders under \`libs/prisma/src/schema/migrations\`, applied via \`migrate deploy\` (\`prisma migrate dev\` is blocked by a known broken shadow-DB migration).
- **Seeders are idempotent, always.** Production is populated by re-running seeders against a live database, so every seeder upserts by its natural key (or skips-if-exists) and NEVER creates duplicates of critical rows. System rows refresh on re-run; org-owned and non-system rows are never touched. **A migration that rewrites a column a seeder also writes must change the seed constants in the same commit**, or the next seeder run converges on the stale constant and undoes it. Idempotency is no defence: converging is what it means. This has happened twice to \`List.type\` (\`20260813141000\`, reverted; \`20260920120000\`, shipped with its constants). Where partial unique indexes break \`findUnique\`, resolve by \`findFirst\`-then-update/create (the CreamPie precedent). A create-only seeder is a bug.`,
      },
      {
        id: 'doctrine-10',
        title: '§10 — How to work here (for agents)',
        body: `Before designing anything: check this doctrine, then \`AGENTS.md\`, then the relevant decision log. Prefer extending a proven house pattern (EntityNote discriminator, CreamPie partial-index family, pass-through pubsub subscriber, smart-route pseudo-columns) over inventing a parallel mechanism — eight condition dialects and three role systems is how the legacy got here. If you believe a pattern here is wrong for your case, write the decision down (the D-numbered log style) rather than silently deviating.`,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. POLYMORPHIC LISTS (API)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'polymorphic-lists',
    title: 'Polymorphic Lists System',
    short: 'Polymorphic Lists',
    summary:
      'Database-driven, CRUD-manageable field definitions that replace Prisma enums. Add list values via the admin UI, not migrations.',
    icon: '🗂️',
    color: 'var(--blue)',
    source: 'docs/api/polymorphic-lists.md',
    sections: [
      {
        id: 'pl-note',
        title: 'Superseded-in-part note',
        body: `> **Superseded in part (2026-09-17).** The model shapes and ListType values below predate the List/ListItem overhaul (\`key\` is no longer \`@unique\`, \`ROLE\` is gone, \`TAXONOMY\`/\`RELATIONSHIP\` exist). For the current ListTypes, what each renders, and the seeded lifecycle lists see \`docs/architecture/LIFECYCLES.md\`; for the schema see the doc comments in \`libs/prisma/src/schema/system/List.prisma\`.

**Source:** \`libs/prisma/src/schema/List.prisma\``,
      },
      {
        id: 'pl-overview',
        title: 'Overview',
        body: `The Polymorphic Lists system replaces traditional Prisma enums with database-driven, CRUD-manageable field definitions. Lists control both data storage and UI rendering, enabling dynamic field management without schema migrations.`,
      },
      {
        id: 'pl-models',
        title: 'Core models',
        body: `### List Model

Defines a list configuration:

\`\`\`prisma
model List {
  id            Int            @id @default(autoincrement())
  key           String         @unique          // e.g., "organizationType"
  resources     String[]                        // Models that use this list
  name          String                          // Display name
  description   String?
  type          ListType                        // STAGE, STATUS, CATEGORY, etc.
  values        String[]                        // Available options
  valueDefault  String?                         // Default value
  selectionType SelectionType                   // SINGLE or MULTIPLE
  dataType      DataType                         // STRING, INT, FLOAT, BOOLEAN
  fieldType     FieldType                        // CHECKBOX, RADIO, AUTOCOMPLETE
  other         Boolean        @default(false)   // Allow "Other" option
  system        Boolean        @default(false)   // System-managed list
  // ... validation fields
}
\`\`\`

### ListResource Model

Stores polymorphic list values for any resource:

\`\`\`prisma
model ListResource {
  id         Int      @id @default(autoincrement())
  listId     Int                      // Reference to List
  resource   String                   // Model name (e.g., "Organization")
  resourceId Int                      // Record ID
  values     String[]                 // Selected values
}
\`\`\``,
      },
      {
        id: 'pl-types',
        title: 'List Types',
        body: `**STAGE** — Lifecycle stages (e.g., "Lead", "Prospect", "Customer", "Churned").

**STATUS** — Current state (e.g., "Active", "Inactive", "Pending").

**CATEGORY** — Classification (e.g., "Enterprise", "SMB", "Startup").

**TYPE** — Entity type (e.g., "Customer", "Vendor", "Partner").

**ROLE** — User/entity roles (e.g., "Admin", "User", "Viewer").

**RELATIONSHIP** — Relationship types (e.g., "Parent", "Child", "Sibling").

**TRANSFORM** — Response transformation rules (see Response Transforms).

> Note: the current live set is STAGE, TAXONOMY, RELATIONSHIP, TRANSFORM and EVENT. STATUS, TYPE and CATEGORY were retired into TAXONOMY and ROLE is gone — see the Seeded Lists and ERP Primitives docs.`,
      },
      {
        id: 'pl-how',
        title: 'How it works',
        body: `### 1. List Definition

Create a List record defining available values:

\`\`\`typescript
await prisma.list.create({
  data: {
    key: 'organizationType',
    resources: ['Organization'],
    name: 'Organization Type',
    type: 'TYPE',
    values: ['Customer', 'Prospect', 'Vendor'],
    selectionType: 'SINGLE',
    dataType: 'STRING',
    fieldType: 'RADIO'
  }
})
\`\`\`

### 2. Value Storage

Store selected values in \`ListResource\`:

\`\`\`typescript
await prisma.listResource.create({
  data: {
    listId: list.id,
    resource: 'Organization',
    resourceId: org.id,
    values: ['Customer']
  }
})
\`\`\`

### 3. Data Enrichment

Query with \`?lists=organizationType\` to automatically merge list values into response:

\`\`\`json
{
  "id": 1,
  "name": "Acme Corp",
  "organizationType": "Customer"
}
\`\`\``,
      },
      {
        id: 'pl-benefits',
        title: 'Benefits',
        body: `### 1. No Schema Migrations

Add new list values via admin UI, not Prisma migrations.

### 2. Polymorphic Joins

One list can serve multiple models via \`resources[]\` array.

### 3. UI Control

\`fieldType\` determines rendering:

- \`RADIO\`: Single selection radio buttons
- \`CHECKBOX\`: Multiple selection checkboxes
- \`AUTOCOMPLETE\`: Searchable dropdown

### 4. Validation

Built-in validation via \`minLength\`, \`maxLength\`, \`regex\`, \`required\`.

### 5. Filtering

Filter by list values using query parameters:

\`\`\`
?lists[organizationType][$eq]=Customer
?lists[organizationType][$in]=Customer,Prospect
\`\`\``,
      },
      {
        id: 'pl-usage',
        title: 'Usage examples',
        body: `### Creating a List

\`\`\`typescript
const list = await prisma.list.create({
  data: {
    key: 'customerStatus',
    resources: ['Organization', 'Contact'],
    name: 'Customer Status',
    type: 'STATUS',
    values: ['Active', 'Inactive', 'Churned'],
    selectionType: 'SINGLE',
    dataType: 'STRING',
    fieldType: 'RADIO',
    valueDefault: 'Active'
  }
})
\`\`\`

### Storing List Values

\`\`\`typescript
// Single value
await prisma.listResource.create({
  data: {
    listId: list.id,
    resource: 'Organization',
    resourceId: org.id,
    values: ['Active']
  }
})

// Multiple values
await prisma.listResource.create({
  data: {
    listId: list.id,
    resource: 'Organization',
    resourceId: org.id,
    values: ['Enterprise', 'High-Value']
  }
})
\`\`\`

### Querying with Lists

\`\`\`
GET /api/v1/organizations?lists=customerStatus
→ Enriches response with customerStatus field

GET /api/v1/organizations?lists[customerStatus][$eq]=Active
→ Filters by list value AND enriches response
\`\`\``,
      },
      {
        id: 'pl-integration',
        title: 'Integration points & best practices',
        body: `### Integration Points

- **ORM Middleware**: Parses \`lists\` query parameter, stores in \`_metadata.lists\`
- **Data Enrichment**: Merges \`ListResource\` values into response objects
- **Schema Validator**: Recognizes list-based fields, stores in \`ResourceMeta\` with \`listId\`
- **Filtering**: Supports filtering by list values via \`listFilters\` metadata

### Best Practices

1. **Use descriptive keys**: \`organizationType\` not \`orgType\`
2. **Set resources explicitly**: Only include models that actually use the list
3. **Choose appropriate type**: Use \`STATUS\` for states, \`TYPE\` for classifications
4. **Set defaults**: Use \`valueDefault\` for common selections
5. **Validate values**: Use \`regex\` or \`minLength\`/\`maxLength\` for data quality`,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SEEDED LISTS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'seeded-lists',
    title: 'Seeded Lists',
    short: 'Seeded Lists',
    summary:
      'The catalogue of controlled vocabularies the platform ships. Check it before adding any column, enum or value — the vocabulary may already exist.',
    icon: '📚',
    color: 'var(--teal)',
    source: 'docs/architecture/SEEDED-LISTS.md',
    sections: [
      {
        id: 'sl-intro',
        title: 'What a List is',
        body: `A List is a controlled vocabulary. Standard practice calls it a concept scheme (SKOS) or a taxonomy (WordPress); this codebase calls it a List, its terms ListItems, and the binding between a term and a row a ListResource. Those names are permanent identifiers under doctrine §9 and this document uses them.

The single unusual thing the system does is use one vocabulary mechanism for four jobs at once: classification, relationship labelling, state machines, and computed sets. That is where nearly all the DRY benefit comes from, because one item id means the same thing in a filter, a report, a recipe and a state transition. It is also where the pressure on \`ListType\` comes from.

**One decision and one proposal run through this document.**

The decision is **settled and applied**, by migration \`20260920120000_listtype_retire_status_and_type\`: \`STATUS\` and \`TYPE\` have retired into \`TAXONOMY\`, leaving \`STAGE\`, \`TAXONOMY\`, \`RELATIONSHIP\` and \`TRANSFORM\`. The litmus is whether movement between a vocabulary's values is governed. A \`STAGE\` gates its transitions with \`isInitial\`, \`isTerminal\` and a \`transitions\` array on each item, so code is entitled to refuse a move; anything a caller may apply freely is a \`TAXONOMY\`, and how many may apply at once is \`selectionType\`'s question rather than the type axis's.

**\`EVENT\` joined the live set on 2026-09-20**, by migration \`20260920130000_listtype_add_event\`, making the set \`STAGE\`, \`TAXONOMY\`, \`RELATIONSHIP\`, \`TRANSFORM\` and \`EVENT\`. The type asks **what does this vocabulary label?** A \`TAXONOMY\` labels a record. A \`RELATIONSHIP\` labels an edge between two records. A \`STAGE\` labels a governed position a record occupies. A \`TRANSFORM\` labels a payload shape. An \`EVENT\` labels an **occurrence** rather than a record — it is not applied to an entity, it names no edge, and nothing transitions through it. The first one is \`eventInvocationMethod\` (User, Cron, Subscriber). An \`EVENT\` list has no resources.

The proposal, still labelled PROPOSED:

- **Meta is bounded at one level.** It attaches to a List, a ListType or a ListItem. A meta *value* may reference another List (how dependent sub-lists work), but nothing attaches to a meta. There is no MetaMeta.`,
      },
      {
        id: 'sl-catalogue',
        title: '§1 — The catalogue',
        body: `Format, one line per list: \`Name:Type:Multi:Resource(s):Values\`. \`Multi\` is \`Y\` when \`selectionType\` is \`MULTIPLE\`. An empty resource column means the list declares no resources (true of exactly one list — the \`EVENT\` list).

**The second column used to look broken and no longer does.** One of the \`ListType\` values was itself called \`TYPE\`, and 59 of 104 seeded lists were it. \`20260920120000\` closed this: every list that read \`STATUS\` or \`TYPE\` now reads \`TAXONOMY\`. Ten lists moved from \`STATUS\` and fifty-nine from \`TYPE\`.

Four seeders create Lists:

| Seeder | Lists | Notes |
| --- | --- | --- |
| \`libs/prisma/src/seeders/seed-List.ts\` | 59 | All \`system: true\`, all platform scope (\`organizationId: null\`) |
| \`modules/*/module.json\` with inline \`items[]\` | 24 | Via \`createModuleSeeder\`; do **not** run on deploy |
| \`libs/prisma/src/seeders/run-vocab-mirrors-only.ts\` | 6 created, 7 declared | \`projectRole\` skipped because \`project_roles\` has no rows |
| \`libs/prisma/src/seeders/seedOnboardingTaxonomy.ts\` | 9 | Create-only; existing rows never refreshed |`,
      },
      {
        id: 'sl-seed-list',
        title: '§1.1 — From seed-List.ts (59)',
        body: `Values below are verbatim, machine-extracted from the seed file. Type distribution: \`TAXONOMY\` 55, \`CATEGORY\` 2, \`RELATIONSHIP\` 1, \`EVENT\` 1, \`STAGE\` 0. Fourteen are \`MULTIPLE\`.

\`\`\`
OrganizationStatus:TAXONOMY:N:organization:Sample, Imported, Needs Booked, Booked, Called, Proposal Sent, Needs Rescheduled, Awaiting Payment, Customer, Paused, At Risk, Cancelled, Lost, Churned
OrganizationStage:TAXONOMY:N:organization:Lead Qualification, Discovery, Proposal, Decision, Closed Won, Onboarding, Active Fulfillment, QBR Review, Expansion, Renewal, Cancellation, Offboarding, Closed Lost
LeadSource:TAXONOMY:N:organization:Scrapped, Imported, Referred, TSM, ASM, Ambassador, Existing Customer, Internal, Affiliate Organization, VIP Referral Program, Webinar, Training, Podcast, AI Search, Social Media, Search Engine, Website, Other
OrganizationType:TAXONOMY:N:organization:Competitor, Customer, Distributor, Manufacturer, Non-Profit, Prospect, Reseller, Sponsor, Vendor, Organization, Internal
ContactType:TAXONOMY:N:contact:Customer, Prospect, Lead, Vendor, Referee, Other
OrganizationRoleOrTitle:TAXONOMY:N:organizationContact:Owner, Employee, Member, Vendor, Referrer, Sales Rep, Account Manager, Other
ReferralSource:TAXONOMY:N:organization, organizationOnboarding:AI Search, Google Search, Partner/Reseller, Referral from CI Web Client, Referral from Distributor Sales Rep, Social Media, Trade Show/Event, Webinar/Podcast, Other
BrandTone:TAXONOMY:Y:organization, organizationBrand:Professional, Friendly, Authoritative, Casual, Luxurious, Playful, Technical
TodoType:TAXONOMY:N:todo:Task, Ticket, Reminder, Checklist Item, Agent Queue, Service Task, Follow-Up Call, Follow-Up Email, Demo, Strategy Session, Proposal Review, Check-In, Other, Tracker Feedback, Deadline Extension, Helpdesk Task
TodoStatus:TAXONOMY:N:todo:Open, Pending, Scheduled, In Progress, At Risk, Blocked, Pending Review, Awaiting Client, Completed, Rescheduled, Cancelled, No-Show, Skipped, Expired, Resolved, Approved, Denied
TodoPriority:TAXONOMY:N:todo:Low, Medium, High, Urgent
TransactionType:TAXONOMY:N:transaction:Payment, Refund, Fee, Credit Purchase, Credit Spend, Credit Allocation, Reward, Commission, Commission Installment, Override, Rollup, Bonus, Withdrawal, Pack Reward, Adjustment
TransactionStatus:TAXONOMY:N:transaction:Scheduled, Pending, Processing, Succeeded, Completed, Paid, Failed, Cancelled, Refunded, Disputed
Emoji:CATEGORY:Y:message:👍, 🎉, ✅, 👀, ❤️, 😄, 🚀, 🙏
ChatCommand:CATEGORY:N:conversation:
SavedItem:RELATIONSHIP:N:user:Saved
EventInvocationMethod:EVENT:N::User, Cron, Subscriber
\`\`\`

(The full block has 59 lists; the above is the representative subset including every non-TAXONOMY line.)

Seven things worth naming: \`OrganizationStage\` survived a duplicate pair with the now-deleted \`AccountStage\`. \`ChatCommand\` is deliberately empty (every slash string stays literal text). \`Emoji\` forced \`itemKeys[]\` to exist (slugifying an emoji yields an empty string, so all eight would collide). \`EventInvocationMethod\` is the one line whose resource column is empty — that is the point, not a gap. And \`seed-List.ts\` cannot express \`isInitial\`, \`isTerminal\`, \`metadata\`, \`color\` or \`icon\`, which is why every state machine lives in a module manifest.`,
      },
      {
        id: 'sl-manifests',
        title: '§1.1 — From module manifests, inline items (24)',
        body: `The lifecycle (STAGE) lists live here because they carry \`isInitial\`, \`isTerminal\`, \`color\`, \`icon\` and a \`metadata.transitions\` array per item.

\`\`\`
ServiceAgreementStage:STAGE:N:service_agreements, organization_service_contracts:Opportunity, Proposal, Signed, Active, Paused, Completed, Superseded, Expired, Cancelled, Lost
InvoiceStage:STAGE:N:invoices:Draft, Processing, Open, Partially Paid, Overdue, Paid, Void, Cancelled, Uncollectible, Written Off
PaymentStage:STAGE:N:payments:Pending, Processing, Succeeded, Disputed, Refunded, Failed, Cancelled
BillingScheduleStage:STAGE:N:billing_schedules:Scheduled, Active, Dunning, Unpaid, Paused, Cancelled, Expired
CustomerStatus:STAGE:N:organization, organizations:Lead, Opportunity, Customer, At Risk, Cancelled, Fired
CampaignStage:STAGE:N:campaigns:Draft, Submitted for Approval, Rejected, Approved, Active, Completed, Cancelled
CampaignType:TAXONOMY:N:campaigns:Event, Giveaway
EventType:TAXONOMY:N:campaigns:Live Speaking, Booth Conference, Open House, TSM Training, TSM Referral, Dealer Meeting, Podcast, Webinar
CampaignChannel:TAXONOMY:Y:campaigns:Social Media, Email, Podcast, Webinar
CampaignTaskStage:STAGE:N:campaign_tasks:To Do, In Progress, Blocked, Done, Cancelled
AttendeeStatus:TAXONOMY:N:campaign_members:Invited, Confirmed, Declined, Attended, No Show
CampaignMemberRole:TAXONOMY:N:campaign_members:Prospect, TSM Attendee, Speaker, Booth Staff, Host, Support, Observer
CampaignPartnerType:TAXONOMY:N:campaign_partners:Distributor, Manufacturer, Sponsor, Venue, Vendor
GiveawayEntryStage:STAGE:N:giveaway_entries:Entered, Qualified, Disqualified, Won, Not Selected
TicketStage:STAGE:N:event_tickets:Reserved, Issued, Checked In, Cancelled, Refunded
HelpdeskTicketStage:STAGE:N:helpdesk_tickets:Open, In Progress, Waiting on Client, Pending Review, Escalated, Resolved
NavigationType:TAXONOMY:N:navigation_items:Workspace, Heading, Item, CREAM-PIE, Relationship, Custom View
PaymentMethodType:TAXONOMY:N:payments, payment_methods:Card, ACH / bank debit, Wire / bank transfer, Check, PayPal, Cash, Other
\`\`\`

(The lead and campaign vocabularies — \`leadStatus\`, \`leadType\`, \`leadOrigin\`, \`campaignStage\`, \`campaignType\`, \`campaignMemberRole\`, etc. — are the ones around lines 241–275 of the source. \`TicketStage\` is event admission tickets, unrelated to \`HelpdeskTicketStage\`.)`,
      },
      {
        id: 'sl-mirror',
        title: '§1.1 — From the mirror runner (6 created, 7 declared)',
        body: `A mirror list is one-way. The definition table stays authoritative; the runner writes \`listItemId\` back onto the definition row, and item keys are the source \`slug\` verbatim.

\`\`\`
Trade:TAXONOMY:Y:organization, contact, campaign, service:<mirrored from Trade>
Industry:TAXONOMY:N:organization, contact, campaign, service:<mirrored from Industry>
OrganizationRole:RELATIONSHIP:N:contact, organization:<mirrored from PartyRoleDefinition, platform rows only>
OrganizationRelationshipType:RELATIONSHIP:N:organization, contact:<mirrored from RelationshipTypeDefinition>
PlatformRole:TAXONOMY:N:user:<mirrored from Role, platform rows only>
JobTypes:TAXONOMY:N:job:<mirrored from JobTypeDefinition, keys verbatim including UPPER_SNAKE>
ProjectRole:RELATIONSHIP:N:project:<declared, not created: project_roles has no rows>
\`\`\`

#### A note on resource keys

\`seed-List.ts\` writes singular camelCase resource keys (\`organization\`, \`contact\`, \`todo\`), while the manifests write plural snake_case keys that \`RESOURCE_DESCRIPTORS\` uses (\`organizations\`, \`invoices\`, \`helpdesk_tickets\`). \`customerStatus\` hedges by declaring both. This is not cosmetic: \`ListResource.resource\` and \`ResourceMeta.resource\` are free-text columns with no allowlist, so a list bound to \`organization\` and a descriptor keyed \`organizations\` simply never meet, and nothing errors.`,
      },
      {
        id: 'sl-proposed',
        title: '§1.2 — Proposed',
        body: `Everything here is **PROPOSED**. Each closes a specific gap the current tree makes visible.

\`\`\`
ListType:TAXONOMY:N:lists:Stage, Taxonomy, Relationship, Transform
ProjectStage:STAGE:N:projects:Admin/Onboarding, Neo to Do, Viber, Client Review, Vibe Changes, Client Approved, Ops - Pre Live, Ops Approved for Go Live, Ops - SEO Post Live, Ops - Live
ProjectMilestone:TAXONOMY:Y:projects:<29 items, from RAW_MILESTONE_CATALOG>
HelpdeskDepartment:TAXONOMY:N:helpdesk_tickets:<mirrored from HelpdeskDepartment, 15 rows>
TrackerBucket:TAXONOMY:N:projects, helpdesk_tickets:<mirrored from KanbanColumn, 41 rows>
Priority:TAXONOMY:N:helpdesk_tickets, todos, projects:Low, Medium, High, Urgent
HoldReason:TAXONOMY:Y:helpdesk_tickets:Awaiting client response, Awaiting third party, Awaiting parts, Scheduled maintenance window, Blocked by another ticket
\`\`\`

\`ListType\` as a self-describing List is the §3 proposal and the precondition for ListTypeMeta existing at all. \`ProjectStage\` and \`ProjectMilestone\` replace \`STAGE_ORDER\`, \`STAGE_GATE_FIELD\` and \`RAW_MILESTONE_CATALOG\` in \`projectStateMachine.ts\`. \`Priority\` closes a stated gap: \`LIFECYCLES.md\` §3 names \`priority\` and \`tag\` as spine taxonomies, but no \`priority\` or \`tag\` List is seeded anywhere. \`HoldReason\` carries the dependent sub-list example.`,
      },
      {
        id: 'sl-meta',
        title: '§2–§4 — Meta, sub-lists, and worked examples (summary)',
        body: `**§2 ListMeta: pairs on a whole list.** A ListMeta is a key/value attached to a List as a whole. The storage already exists: \`ResourceMeta\` is polymorphic over \`(resource, resourceId | resourceUid, key, ordinal)\`, its \`resource\` column is a free-text \`VarChar(100)\` with no allowlist, and it already carries a \`listId Int?\`. So \`ListMeta\` is \`ResourceMeta(resource: 'List', resourceId: <List.id>, key, value)\` and nothing needs widening. The test that keeps this honest: if you would have to repeat the value on every item, it is ListMeta; if it differs per item, it is ListItemMeta.

Worked on \`helpdeskTicketStage\`: \`filterWidget: tab-strip\` replaces the implicit "first STAGE list with at least two items wins" guess that \`StageTabs\` makes today.

**§4.2 — Dependent sub-lists.** The "Waiting on Client" stage item carries a \`holdReason\` sub-list, shown only when that stage filter is active. The sub-list attaches via \`ResourceMeta(resource: 'ListItem', key: 'holdReasons', listId: holdReason.id)\` — a meta whose value is a pointer to another List. Depth is one level: there is no MetaMeta.

**Membership** (\`extensional\` when items are stated, \`intensional\` when they are whatever a predicate selects) survives as a separate axis and is still proposed. It is what the intensional example needs and is not part of the type axis.`,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. DECISIONS — resource views & saved views
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'resource-views',
    title: 'Decisions — Resource Views & Saved Views',
    short: 'Resource Views',
    summary:
      'How every list screen is driven from one DRY template config, and why saved views are the user tier of recipes — shown as chips, not menu entries.',
    icon: '🗃️',
    color: 'var(--orange-l)',
    source: 'docs/architecture/DECISIONS-resource-views.md',
    sections: [
      {
        id: 'rv-intro',
        title: 'The request & the governing prior art',
        body: `**Branch:** \`feat/dry-resource-views\` · **Started:** 2026-09-18

The request: let a user save their list views on the primary resources, name and describe them; drive every list screen from one DRY template config (tabs, chips, filters, bulk edit, bulk actions, list actions, record actions, field lists, where a record opens); surface a user's Organization-derived saved views as an accordion under "Organizations"; and quarantine every not-yet-DRY view under a new global **WET** menu without losing its custom code.

These are numbered from **V1** to keep them distinct from the Cream-Pie plan's D-series, which they build on.

**Governing prior art.** \`DOCTRINE.md\` §5–§7 and the Cream-Pie Taxonomy Overhaul plan's **Part G** (D15–D20) already designed most of this: \`<EntityList>\` as the universal surface, recipes as tiered saved perspectives, URL-as-filter-state, and the narrowing invariant. Part G's own words: *"CREAM-PIE recipes promoted to saved, shareable, tiered filter views."* What Part G did **not** have is a declarative per-screen template, a record-open target, an action model, or any treatment of the bespoke views. Those are what V1–V8 add.`,
      },
      {
        id: 'rv-v1',
        title: 'V1 — The template is a ceiling; a saved view only lowers it',
        body: `**Question.** A \`SavedView extends ResourceView\` would let a stored row carry the full template. Should it?

**Decision.** No. A saved view persists a **\`ResourceViewPresentation\`** — a JSON-safe subset naming only what to *keep*: list keys, action keys, column names, booleans. \`applyPresentation()\` treats every array as a filter over the template's array and every boolean as one that may be cleared but not set. Unknown names are dropped, never appended.

**Why.** A shared view is input from another user. If a presentation could introduce an action, a filter or a bulk-edit field, then accepting a colleague's view would be a privilege decision. Under the narrowing rule it never can, so sharing is safe by construction.

**Tested.** \`resolveView.test.ts\`, 15 cases, including the adversarial ones: a presentation naming an action the template lacks, a flag it tries to turn on, a layout it tries to add.`,
      },
      {
        id: 'rv-v5',
        title: 'V5 — Saved views are the user tier of CREAM-PIE recipes, not a new model',
        body: `**Decision.** A saved view is a \`CreamPieRecipe\` row with a new \`ownerUserId Int?\` column. Same table, same dialect, same apply-time middleware.

**Why.** Part G's D16 called for exactly this. A separate \`SavedView\` model with its own query format would be a ninth condition dialect, and the codebase has already paid that bill once.

**Deviation from D16, logged.** D16 specified \`resource\`, \`availableWhen\` and \`presentation\` as columns too. The shipped implementation put those in \`metadata\` JSON — but **\`ownerUserId\` is a real column**, because only a column gives the partial unique index \`(slug, ownerUserId) WHERE ownerUserId IS NOT NULL\` and an indexed "views I own" lookup that does not scan JSONB.`,
      },
      {
        id: 'rv-v6',
        title: 'V6 — The user tier is additive and never shadows',
        body: `**Decision.** \`resolveForUser()\` asks the platform tier, then the organization tier, then the caller's own rows. A user-tier row is reached only when both shared tiers miss. Uniqueness is per-user, so two people may each keep a \`my-followups\`.

**Why.** D16: *"User recipes are additive picker entries and NEVER shadow by slug."* Saving a view called \`customers\` must give you a second chip, not silently change what \`?recipe=customers\` means.

**Trap closed.** A saved view is stored with \`organizationId: null\` so it cannot be picked up by the org-tier resolution path. That made it match the platform-tier arm of the \`/perspectives\` query, which would have served every user's private views to everybody. The query now requires \`ownerUserId: null\` on both shared arms. This was a real leak introduced and closed within this change.`,
      },
      {
        id: 'rv-v7',
        title: 'V7 — Sharing travels as an intent, not a finished condition',
        body: `**Decision.** The client sends \`shareScope: 'private' | 'organization'\`. The server turns that into the \`availableWhen\` condition using the organization id on the request.

**Why.** An audience is the last field you want the caller naming for itself. It also removed a dead end: the frontend's auth user is Supabase's, which carries no organization id, so the client could not have built the condition correctly even if it were trusted to.

**Unchanged.** \`availableWhen\` is still enforced server-side at apply time (D18), not merely filtered in the picker, and sharing widens who sees the chip, never what the chip returns.`,
      },
      {
        id: 'rv-v9',
        title: 'V9 — Saved views in the menu: reconciling with doctrine §5 / D13 / G.4',
        body: `**This is the one decision that appears to contradict standing doctrine, so it is written out in full.**

**The conflict.** The request asks that a user's Organization-derived saved views accordion out under "Organizations" — Customers, Distributors, Referral Partners. Doctrine §5 says navigation *"must never enumerate values of a vocabulary **or** saved queries ('Customers', 'Vendors' as separate menu entries)"*.

**What the doctrine is actually protecting.** The objection is to *hardcoding* queries in the manifest: it *"hardcodes vocabulary in navRegistry (11 entries + 11 routes for subscription types alone), breaks when admins add values, and duplicates filter UI the toolbar already owns."* Three concrete harms — a second source of truth, staleness when the vocabulary grows, and a duplicated surface.

**Decision.** Render the accordion, and give it none of those three properties:

- **Not manifest entries.** The children are fetched at runtime from the same recipe rows the chip row reads. Nothing is added to \`module.json\`. A view saved at 09:00 appears at 09:00; one deleted disappears.
- **Not separate places.** Every child links to the node's own route with \`?recipe=<slug>\` — the identical URL the chip produces. The node remains one place.
- **Not a duplicated surface.** There is one source (the recipe rows), one applier (\`viewFilterMiddleware\`), one narrowing rule.

So the tree still holds exactly one node per place, which is what §5's "menu = places" means. What is new is that a place may advertise the perspectives it already offers.

**Scope limit, deliberate.** Only the reader's **own** views accordion out. System and organization recipes stay chips. **If this is judged wrong,** the fix is one line — drop \`savedViews\` from \`nodeToItem\` — and the chips continue to work unchanged.`,
      },
      {
        id: 'rv-v10',
        title: 'V10 — WET: quarantine by alias, never by rename',
        body: `**Decision.** Non-DRY views move under a new global \`WET\` workspace by **creating new nodes** whose \`subjectId\` carries the old path under a \`wet.\` prefix, with \`formerIds: ["<old id>"]\`, and deactivating the old node — rather than editing the old node's \`parent\`.

**Why.** \`subjectId\` *is* the CASL subject and the permission cascade is pure string prefix (\`subjectAncestors\`). Re-parenting a node without changing its id breaks the cascade; changing its id orphans every existing grant. \`formerIds\` is the sanctioned migration path.

**No code moves.** Not one component file is relocated or deleted. Only its place in the menu changes.

**Scale.** The inventory found ~66 list surfaces, ~15 already on the universal surface and ~51 bespoke, totalling roughly 45,000 lines.`,
      },
      {
        id: 'rv-deferred',
        title: 'Deferred, and honestly so',
        body: `- **Card renderer.** \`listOptions\` accepts \`card\` and the descriptors declare it, but nothing renders one; it degrades to the table. *Updated: \`table\`, \`calendar\` and now \`kanban\` render. The board is derived by the rule layer. It is read-only by design, because moving a card is a state transition with guards and a topic to publish.*
- **\`target: 'drawer'\`.** The type is defined, carried through resolution and persisted, but the record-open path still routes to the record page everywhere.
- **\`bulkEditFields\`.** Declared and narrowed correctly; no bulk-edit form renders from it yet.
- **The G.2 widget matrix.** Filter widgets are still a select per vocabulary.
- **The five Organizations grids.** CustomersView, Distributor, Franchise, Manufacturer and PE are ~8,000 lines across five grids that the nav tree itself already describes as one view with chips.`,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 5. MODULE STRUCTURE
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'module-structure',
    title: 'Module Structure & Nomenclature',
    short: 'Module Structure',
    summary:
      'What a module.json declares — lists, recipes, navigation, seeds — and the standard the app follows so a licensee can drop a module in without touching core.',
    icon: '🧩',
    color: 'var(--pink)',
    source: 'docs/architecture/MODULE-STRUCTURE.md',
    sections: [
      {
        id: 'ms-1',
        title: '§1 — A module',
        body: `A module is **one hand-written file plus generated output**. That is the whole contract, and it is already how all ten modules work.

\`\`\`
modules/<slug>/
  module.json                     the only file a human edits
  generated/
    <slug>-types.ts               vocabulary key unions + entity interfaces
    <slug>-navigation.ts          NavigationItemSeed[] + Subject union + FormerSubjects
    <slug>-lists.ts               List + recipe + registeredMeta seed payloads
    <slug>-actions.ts             Action[] seed payloads          (new, §3)
    *.migration-stub.sql          per non-adopted model
\`\`\`

Prisma text does **not** land here. It goes to \`libs/prisma/src/schema/modules/\`, because that is the only directory the Prisma client reads — a model beside its manifest would typecheck and never reach the database.

Regenerate with \`pnpm build:modules\`. \`pnpm check:modules\` fails the build when a committed artifact differs from generator output, so a hand-edited generated file is caught rather than merged.

### What a manifest declares

\`module.json\` is validated by \`modules/_schema/module.schema.json\`, which is \`additionalProperties: false\` — an unknown key is an error, not a silent no-op. The nineteen top-level properties in the order that matters:

| Property | Holds |
| --- | --- |
| \`slug\`, \`displayName\`, \`version\` | required. \`slug\` becomes \`PlatformModule.slug\`; renaming is a migration |
| \`optional\`, \`defaultEnabled\`, \`platformAdminOnly\` | tenancy gating. \`optional: false\` means platform core |
| \`dependencies\` | other modules that must be enabled |
| \`models\` | Prisma models and their resource slugs, fields, field groups, taxonomies, calendar placement |
| \`lists\` | the vocabularies this module owns |
| \`meta\` | registered meta keys, by what they expand (\`Model\`, \`List\`, \`ListItem\`) |
| \`actions\` | non-CRUD verbs, their topics and their permission recipes |
| \`navigation\` | where the module appears |
| \`recipes\` | seeded perspectives |
| \`seeds\` | fixture data |

### The four permanent identifier spaces

Renaming any of these is a data migration, never a refactor:

- \`module.slug\`
- \`List.key\` and \`ListItem.key\`
- \`subjectId\` — and it must stay prefix-consistent with its position in the tree, because the RBAC cascade is string-prefix matching
- topic names, recipe slugs, and now **action names** and **component registry keys**`,
      },
      {
        id: 'ms-2',
        title: '§2 — What a licensee module may not do',
        body: `A module is additive or it is not a module:

- It may declare models, lists, actions, navigation and recipes.
- It may **not** edit another module's manifest, patch a core component, or add a route outside its own subject prefix.
- It may not introduce a second condition dialect, a second vocabulary mechanism, or a second permission system. If it needs a new verb, that is an \`action\`; if it needs a new state, that is a List.

Everything a module contributes to the running app arrives through data or through the registries in §3. Nothing arrives by editing core.`,
      },
      {
        id: 'ms-3',
        title: '§3 — The three registries a module writes into',
        body: `These are the seams that let configuration reach code without a fork. All three are keyed by permanent string identifiers.

| Registry | Key | Populated by |
| --- | --- | --- |
| Component registry | \`MountAction.component\` | \`registerActionComponents()\` at module scope |
| Resource view registry | \`resource\` | \`registerResourceView()\`, optional — a derived default exists |
| View rules | rule \`name\` | \`DEFAULT_VIEW_RULES\`, extended per licensee |

A key that resolves to nothing renders an explained gap rather than throwing, because the usual cause is configuration outliving its code and the person who can fix it needs to be told which key is missing.`,
      },
      {
        id: 'ms-app',
        title: '§4 — The app directory standard (summary)',
        body: `The current layout has grown four ways of doing several things. This is the target.

\`\`\`
apps/synapse-v3/src/
  erp/            the context machine: store, identity, tenancy, view state
  features/       one directory per feature slice, owning its own hooks,
                  components and API access
  components/
    ui/           vendored primitives only. Nothing app-specific
    <shared>/     genuinely cross-feature components
  hooks/          cross-cutting hooks only
  api/            one way to reach the API
  config/         generated descriptors
  types/
\`\`\`

### The five rules

1. **A hook lives with what it serves.** Cross-cutting in \`hooks/\`, feature-local beside the feature.
2. **One API access idiom.** \`authFetch\` plus the \`buildEntityQuery\` parameter grammar, through TanStack Query. Today there are four idioms; the Supabase-compat shim should shrink, never grow.
3. **\`lib/\`, \`services/\` and \`utils/\` are not three things.** Pure helpers are \`utils/\`; anything that talks to the API is \`api/\`; nothing else earns a top-level directory.
4. **\`components/backoffice/\` is a second \`pages/\` and should not exist.** Feature slices belong in \`features/\`.
5. **One naming convention.** \`useThing.ts\`, camel, always.`,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 6. CREAM-PIE (Chris's original design)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'cream-pie',
    title: "CREAM-PIE — The Original Design",
    short: 'CREAM-PIE',
    summary:
      "Chris's conceptual design: the Context Store anatomy, the Context Engine (the Context Machine), and the Rendering Engine.",
    icon: '🍰',
    color: 'var(--purple)',
    source: 'docs/CREAM-PIE.md',
    sections: [
      {
        id: 'cp-abstract',
        title: 'CREAM-PIE abstract',
        body: `A CREAM-PIE is a _named_ (stored) set of conditions considering values, taxonomy and relationship(s) of one or more of the following context (recursive and hierarchical):

- perspective
  - user
  - organization
- event
- subject (resource)
- scope

\`context + subjectMatter (e.g. Organization) + query\`

\`\`\`typescript
interface CreamPie {
    id: number
    title: string
    slug: string
    menu: boolean
    list: boolean
    prop: boolean
    subscriber: boolean
    scope: 'system' | 'user' | 'organization'
    conditions: CreamPieQl
}
\`\`\`

**Used For/As**
- Main Menu (e.g. \`/organization?cream-pie=at-risk-customers\`)
- Pubsub Topic Generation
- Setting Context Store
  - Data Provider's Query Parameter Generation
  - Template Engine (Stateful Rendering)

**Features:** Sharable. **Applied Directly To:** \`List\`

**Scenario.** A Helpdesk Ticket's \`TicketStatus\` (List / STAGE): Open, In Progress, On Hold, Pending Review, Escalated, Resolved. It also had \`OnHoldReason\` (List / TAXONOMY): Awaiting client response, Awaiting third party, Awaiting parts, Scheduled maintenance window, Blocked by another ticket. In this scenario the \`OnHoldReason\` should only apply to an \`On Hold\` Ticket. It should only render in the list view as a taxonomy filter IF the filter "On Hold" is already being applied:

\`\`\`tsx
<ListFilter name={'OnHoldReason'} creampie={'TicketStatusOnHold'} />
\`\`\``,
      },
      {
        id: 'cp-dry',
        title: 'Mission: Lets Get 100% DRY!',
        body: `**Frontend Inspiration:** ReactAdmin's "Guesser" that creates rendering based on **rules** applied to **data types** as **_CONTEXT_**. E.g. a rule could be: if on a resource list view where the given resource has only 1 \`List\` of the \`ListType\` "stage", and there are 3 or more values, apply the View Toggle to toggle between Kanban view (pivoting on the 1 stage with > 3 values).

**Backend Inspiration:** Strapi 5+ API Parameters.

**List & ListTypes.** A replacement for static, rigid, hard-coded enum values that can be extended without redeployment, representing status/stage (states), StatedTaxonomy, FormulaicTaxonomy (rule/formula based), StatedRelationship, FormulaicRelationship, and others.

The \`List\` Model drives many things based on type and value. Selected \`List\` values can be applied as store/state context for:

- CREAMPIE-Recipes
  - Query Parameter Generation
  - CASL Component Generation
- Data Adapter's query parameters (Meta Query)
- State Machine transitions via PubSub
- Dry/abstracted store accessors
- Topic nomenclature standardization with seeded defaults

Basically the \`List\` model applies DRY structured context to backend and frontend architecture consumption.`,
      },
      {
        id: 'cp-store-anatomy',
        title: 'Context Store Anatomy',
        body: `This is how the ERP System anatomy is visualized:

\`\`\`typescript
interface ErpStore {
	title: string
	description: string
	logo: Logo					// Note: May want to just pull this from the Organization's Brand
	owner: Organization
	globalMenu: GlobalMenuItem[]
	modulesActive: Module[]
}

interface ErpModuleStore extends Omit<ErpStore, 'owner' | 'modulesActive'> {
	menuItems: MenuItem[]
}

// Contains react context like navigation history
viewState {
	resources: resourceObjects[]
}

// Contains react context for the resource/list/etc
type ListViewOptions = 'table' | 'kanban' | 'card'

ResourceView: {
	name: string
	description: string
	search: boolean
	selectMultiple: boolean
	listOptions: ListViewOptions[]
	primaryTabs: TaxonomyList[]
	chipToggles: TaxonomyList[]
	selectFilters: TaxonomyList[]
	bulkEditFields: Fields[]
	bulkSelectActions > Modal + ObjectIds[]
	listActions: Action[]
	recordActions: Action[]
	fieldLists: Lists[]
}

action {
	name: string // e.g.: edit | delete | bulkEdit
	description: string
	icon: string | SVG | Icon
	type: ActionType
}

type ActionType = MountAction | NavigateAction | ApiAction

MountAction {
	target: 'drawer' | 'modal' | 'context-modal'
	toggle: boolean
	context: <SendEmail />
}

NavigateAction {
	route: string
	addToNavigationHistory: boolean
	target: 'main' | 'window'
}

interface ApiAction {
	endpoint: string
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
}

SavedView extends ResourceView {
	author: User
	permissions?	// share views per company's RBAC: canShareViewWithCompany
}

interface MenuItem {
	parent: GlobalMenuItem
	route: string
	render: ResourceView | SavedView
}
\`\`\``,
      },
      {
        id: 'cp-context-engine',
        title: 'Context Engine — The Context Machine',
        body: `Memo/State Setting Flow to support a secure multi-tenancy platform with polymorphic relationships and CREAMPIE recipes.

\`\`\`typescript
getPage()
login()
	getUser()
	getContact()
	getOrganizations()
		setOrganization()
			setBrand()		// Allow white-label override
		setIdentity()		// sets role: RBAC Context Applied after this point
		getModules()
		getMenu()
			setActiveModule()
			setActiveResources()
			setActiveView()
				setViewOptions()
\`\`\``,
      },
      {
        id: 'cp-rendering-engine',
        title: 'Rendering Engine',
        body: `\`\`\`tsx
<App>

	{ ! isLoggedIn() ? (
		<Page ... />
		<Login />
	) : (
		<Resource name="" />

		<Sidebar />
		<Main>
			<TopBar>
				<ToggleSidebarButton />
				<TitleBar>
					<!-- Left -->
					<Title />

					<!-- Right -->
					<ActionButton title={false} outline="none" />
					<ImpersonateToggle render={<UserSelectCard />} />
					<AiAssistantToggle target="right-drawer" render={<AiAssistant />} />
					<NotificationsToggle target="context-modal" render={<ActivityCard />} />
					<ProfileToggle target="context-modal" render={<ProfileMenu />} />
				</TitleBar>
			</TopBar>
			<Custom>...</Custom>
			<List>
				<Drawer />
				<Modal />
			</List>
			<Single>
				<Drawer />
				<Modal />
			</Single>
		</Main>
</App>
\`\`\`

\`\`\`tsx
<SaveViewDialog>
	Included Filters:
	  [ ] Taxonomy List 1
	  [ ] Taxonomy List 2
	  [ ] Taxonomy List 3

	Include Search
</SaveViewDialog>
\`\`\`

**Topic Syntax:** \`organization:opportunity:created\``,
      },
      {
        id: 'cp-primitives',
        title: 'Polymorphic Meta Data & primitives (concept)',
        body: `To support reusable access controls, state machines, rendering engines, query builders abstracted through CREAM-PIE.

1. **Polymorphic Meta Data:** A named set or array of name/value pairs applied to a specific List, ListType, ListValue, ListMetaName or ListMetaValue.
2. **Polymorphic Hierarchy of Lists:** ListLists / List of Lists could be a filtered/reduced list (e.g. ProjectStage could have a list of PossibleNextProjectStages) or an expanded list. A list that applies to a list value is a SubList (e.g. OnHoldReason applies to a ProjectStatus value of onhold).

\`\`\`typescript
interface ListValue {
	value: string | number | boolean | string[] | number[] | boolean[]
	required: boolean
	meta: Meta[]
	list: List[]
}
interface ListType {
	name: "Taxonomy" | "Relationship" | "State" | "Formula"
	description: string
}
interface List {
	name: string
	description: string
	type: ListType
	joins: Join[]
	appliesTo: ApplicationSet
	values: ListValue[]
	meta: MetaValue[]
	list: List[]
}
\`\`\`

Examples:
- ListValueList: TicketStatus > OnHold > OnHoldReasons['Customer Nonpayment', ...]
- ListValueMeta: TicketStatus > Closed > ClosedBy : 2835

> "I feel like I am re-describing my own version of primitives... my concept of ListType is the subtle variable differences between what would otherwise simply be a list of values. It reminded me a lot of prototypical recursion." The overall mission: **DRY AS POSSIBLE. REUSABILITY. ISOLATED BUSINESS LOGIC. SINGLE RESPONSIBILITY PRINCIPLES.**`,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 7. LOADED CREAM-PIE STRATEGY
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'loaded-cream-pie',
    title: 'Loaded CREAM-PIE — Consolidation & Go-Live Strategy',
    short: 'Loaded Strategy',
    summary:
      'The analysis that reconciles the CREAM-PIE vision with what actually exists in code, the C-decisions, and the new menu expressed as manifests.',
    icon: '🚀',
    color: 'var(--green)',
    source: 'docs/LOADED-CREAM-PIE-STRATEGY.md',
    sections: [
      {
        id: 'lcp-finding',
        title: 'The one finding that reorders everything',
        body: `**Status:** approved with C21–C27 (Stage 3 done); executing Stage 4 · **Date:** 2026-09-21 · **Branch:** \`feat/loaded-cream-pie\`

The template engine you are asking me to confirm **exists, and is in three places at once**:

- **\`stage\`** (live, tested): \`<EntityList>\` / \`Browse\` / URL-as-filter-state (\`?recipe=\`, \`?when[field][op]=\`, \`?q=\`) / stage tabs / recipe chips / AG Grid / DB-driven nav / manifests / CREAM-PQL compiler + \`narrowWhere\` + \`viewFilterMiddleware\`. 66 cream-pie tests, 13 viewFilter tests pass.
- **PR #875** \`feat/dry-resource-views\` (draft, CONFLICTING): \`ResourceView\` template + \`applyPresentation\` narrowing, saved views as user-tier recipes (\`ownerUserId\`, \`/synapse/v1/saved-views\`), \`SaveViewDialog\`, saved-view accordion, the WET quarantine (81 nodes).
- **PR #878** \`feat/erp-context-architecture\` (draft, CONFLICTING, stacked on #875): \`ErpProvider\` (the context machine), the guesser (\`DEFAULT_VIEW_RULES\` / \`resolveResourceView\`), the one action surface (\`MountAction\` / \`NavigateAction\` / \`ApiAction\`), \`EntityBoard\` (kanban), \`activityLogMiddleware\`, \`topicBroadcastMiddleware\`, 5-segment topic grammar, \`eventInvocationMethod\`, STATUS/TYPE → TAXONOMY retirement, \`EVENT\` ListType.

**Consequence.** "Consolidate" is not "build a template engine". It is: (1) land the stack — rebase #875 + #878 onto current \`stage\` as one branch, resolve conflicts, apply the seven migrations, run seeders, exercise against a running server; (2) fill the real gaps the audits found; (3) fix the money path independently. Re-implementing any of this from \`CREAM-PIE.md\` would be a fourth copy.`,
      },
      {
        id: 'lcp-decisions',
        title: '§3 — Decisions (C1–C20)',
        body: `**C1 — Land the stack; do not re-implement.** One landing branch merges \`dry-resource-views\` then \`erp-context-architecture\` onto current \`stage\`. Every Stage 1 item is ≥80% built there.

**C2 — Recipe scope stays tiered, not flagged.** No \`menu / list / prop / subscriber\` booleans on \`CreamPieRecipe\`. Where a recipe is *used* is a binding or a nav node; who may *see* it is \`availableWhen\`; who *owns* it is the tier.

**C3 — The URL parameter is \`recipe\`.** Not \`cream-pie\`. It ships, it is in stored links, and nomenclature is API.

**C4 — Your CSV's "Renders With" column is the nav node's \`navigationType\`.** \`TemplateEngine\` = \`Item\` with \`primaryResource\` (or \`CreamPie\` when filtered); \`CustomComponent\` = \`CustomView\` with a \`reason\`.

**C5 — Every named finance resource gets a \`primaryResource\` node.** \`transactions\` and \`journal_entries\` have manifest models and \`<EntityList>\` can already render them; they only lack nav bindings.

**C7 — Mount \`ErpProvider\`, make org-switch invalidate rather than reload.** Provider order: \`Query → Auth → Erp → Ability → ActionSurface → Router\`.

**C8 — Activity + broadcast cover every mutating route, and every publish.** Mount at \`app.use\` level before the dedicated routers; remove the catch-all mount.

**C9 — One topic grammar: five segments, empties legal, legacy names aliased.** \`{scope}:{resource}:{resourceContext}:{event}:{eventContext}\`. Collapses 118 \`advanced-to-*\` names into one pattern.

**C10 — Gates fail closed.** An evaluation error skips delivery and emits \`system:fulfillment:failure\`. Fail-open on a delivery gate is how a recipient gets an email they were excluded from.

**C12 — Conditional filters and the \`<CreamPie>\` gate.** \`ListBinding.visibleWhen?: ConditionConfig\` — \`OnHoldReason\` renders only when \`filters['lists.helpdeskTicketStage'] === 'on_hold'\`.

**C14 — Invoices are generated on signature, by a subscriber.** Seeded CODE subscriber \`billing.invoice.issue-for-agreement\` on pattern \`agreements:service-agreement:*:stage-changed:signed\`, idempotent on \`(serviceAgreementId, periodKey)\`.

**C15 — "Proposal Sent" is a stage transition with a seeded EMAIL subscriber.** Recipients resolve from the payload's organization primary contact, never from the request body.

**C16 — Recurring billing has one engine and a sentinel.** A daily \`billing.sentinel\` cron emits \`system:fulfillment:failure\` for any \`active\` + \`billable\` agreement with no biller. Tax wires to \`libs/tax\` with \`TAX_MODE=off|log|enforce\`.

**C19 — The CSV recipe grammar is translated, not adopted.** \`{"crm":{"organization":{"customerStatus":"Customer"}}}\` becomes \`{ primaryResource: 'organizations', conditions: { logic: 'AND', rules: [{ field: 'lists.customerStatus', op: 'eq', value: 'customer' }] } }\`. Values are **item keys**, not labels.

**C20 — The final test is a repeatable harness, not a session.** \`pnpm erp:final-test\` runs against staging with Stripe test mode and asserts rows, topics, deliveries, journal balance and commission entries for every active deck.`,
      },
      {
        id: 'lcp-menu',
        title: '§5 — The new menu, as manifests',
        body: `Type key: **I** Item+\`primaryResource\` (TemplateEngine) · **★** CreamPie (recipe) · **★★** Relationship · **C** CustomView (bespoke, \`reason\` required) · **H** Heading.

### §5.1 Workspaces

| CSV module | Workspace \`subjectId\` | \`formerIds\` |
| --- | --- | --- |
| CRM | \`crm\` | \`global\` |
| Finance | \`finance\` | — |
| Sales & Marketing | \`sales\` | — |
| Tools | \`tools\` | \`communication\` |
| Operations | \`operations\` | — |
| Admin | \`admin\` | — |

### §5.2 Nodes (selected)

| CSV | \`subjectId\` | type | primaryResource / recipeSlug |
| --- | --- | --- | --- |
| CRM › Organization | \`crm.organizations\` | I | \`organizations\` (stage tabs + chips) |
| — Customer | recipe \`crm.organizations.customers\` | | \`lists.customerStatus in [customer, at_risk]\` |
| — Lead / Prospect | \`.leads\` / \`.opportunities\` | | \`lists.customerStatus eq lead\` / \`eq opportunity\` |
| — Distributor / Reseller / Vendor | \`crm.organizations.<x>\` | | \`lists.organizationRelationshipType contains <x>\` |
| CRM › Contacts | \`crm.contacts\` | I | \`contacts\` |
| Finance › Invoices | \`finance.invoices\` | I | \`invoices\` |
| Finance › Payments | \`finance.payments\` | I | \`payments\` |
| Finance › Journal & Trial Balance | \`finance.journal\` | I | \`journal_entries\` |
| Sales › Leads | \`sales.leads\` | I | \`pipeline_leads\` |
| Admin › PubSub › Manage Topics | \`admin.pubsub.topics\` | I | \`pub_sub_topics\` |

### §5.3 Recipes — the CSV translated (selected)

All values are **item keys** as the seeder slugifies them (\`'In Progress'\` → \`in_progress\`).

| Recipe slug | primaryResource | conditions |
| --- | --- | --- |
| \`crm.tasks.in-progress\` | \`todos\` | \`lists.todoStatus eq in_progress\` |
| \`crm.tasks.high-priority\` | \`todos\` | \`lists.todoPriority in [high, urgent]\` |
| \`crm.organizations.customers\` | \`organizations\` | \`lists.customerStatus in [customer, at_risk]\` |
| \`sales.pipeline\` | \`service_agreements\` | \`lists.serviceAgreementStage in [opportunity, proposal, signed]\` |
| \`finance.billable-organizations\` | \`organizations\` | \`lists.customerStatus in [customer, at_risk] AND exists(serviceAgreements where lists.serviceAgreementStage eq active)\` |

**Four CSV rows that do not survive translation:** rows with no condition are plain \`Item\` nodes, not recipes; \`Opportunities → organizationType = opportunity\` is wrong (opportunity is a stage of \`service_agreements\`); Resellers/Vendors/Distributors are RELATIONSHIP views; \`My Followups → leadStatus = Followed\` has no such list.

### §5.4 Seeds this needs

- \`organizationRelationshipType\` items: \`distributor\`, \`sponsor\`, \`competitor\`.
- \`organizationType\` items: \`manufacturer\`, \`non_profit\`, \`internal\` if absent.
- \`todoType\` item \`marketing\` (absent today).
- \`PubSubTopic\`, \`PubSubSubscriber\`, \`PubSubEvent\`, \`PubSubDelivery\` declared as adopted models in \`modules/core/module.json\`.`,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 8. ERP PRIMITIVES
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'erp-primitives',
    title: 'The List Primitives',
    short: 'ERP Primitives',
    summary:
      'What the primitives are, what they are called elsewhere (SKOS, RDF, statecharts), and why type is three orthogonal axes, not one.',
    icon: '🔱',
    color: 'var(--yellow)',
    source: 'docs/architecture/ERP-PRIMITIVES.md',
    sections: [
      {
        id: 'ep-intro',
        title: 'What the sketch is',
        body: `This answers the modelling question directly: *"If I am recreating a wheel here, feel free to suggest a more proper name."*

Short version: **you are not recreating a wheel, you are recreating four of them, and they are good wheels.** Every primitive in the sketch has an established name and a body of prior art.`,
      },
      {
        id: 'ep-1',
        title: '§1 — The sketch in existing vocabulary',
        body: `| Your term | Established name | Where it comes from |
| --- | --- | --- |
| \`List\` | **Concept scheme** | SKOS (W3C). WordPress calls it a taxonomy. |
| \`ListValue\` | **Concept** / term | SKOS \`skos:Concept\`; \`wp_terms\`. |
| \`ListValueList\` (sub-list under a value) | **Dependent** (cascading) **picklist**; \`skos:narrower\` | Salesforce calls it a dependent picklist. |
| \`ListMeta\` / \`ListValueMeta\` | **Qualified statement**; EAV attribute | RDF reification, now RDF-star. |
| \`MetaMeta\` | **Annotation of an annotation** | RDF-star quoted triples. See §4 — recommended against. |
| Stated vs Formulaic | **Extensional vs intensional** | Set theory. |
| \`ListType\` = State | **State machine** / lifecycle | Statecharts. |
| \`ListType\` = Relationship | **Predicate** in a triple | RDF. |
| \`ListType\` = Event | **Domain event** / occurrent | Event sourcing and DDD. |
| The whole system | **Reference Data Management** with org overlays | Standard MDM practice. |

The one genuinely unusual thing: using a *single* vocabulary mechanism for taxonomy, relationship labels, state machines and derived sets at once. That is unusual but not wrong, and it is the source of most of the DRY benefit. Keep it.`,
      },
      {
        id: 'ep-2',
        title: '§2 — Why type is three orthogonal axes, not one',
        body: `> **SUPERSEDED for the type axis, 2026-09-20.** The product owner took the diagnosis and rejected the remedy. \`STATUS\` and \`TYPE\` retired into \`TAXONOMY\` in migration \`20260920120000\`; no \`STATE\` type and no \`monotonic\` flag were created.
>
> **The litmus is whether movement between a vocabulary's values is GOVERNED.** When transitions are gated, by an entry state, a terminal state and a \`transitions\` array, the vocabulary is a \`STAGE\` and code is entitled to refuse a move. When any value may be applied freely, it is a \`TAXONOMY\`.
>
> **Amended 2026-09-20 by \`20260920130000\`, which added \`EVENT\`.** The axis asks **what does this vocabulary label?** A \`TAXONOMY\` labels a record, a \`RELATIONSHIP\` labels an edge, a \`STAGE\` labels a governed position, a \`TRANSFORM\` labels a payload shape, and an \`EVENT\` labels an occurrence. \`EVENT\` lists declare no resources. \`eventInvocationMethod\` is the first one.
>
> Why the litmus beats monotonicity: §4.3 of \`SEEDED-LISTS.md\` found that eight of the ten seeded \`STAGE\` lists have backward transitions, so a \`monotonic\` flag would be \`false\` on almost every machine and would not separate \`STAGE\` from \`STATUS\` at all. Governance does separate them.

The sketch lists \`Taxonomy, Relationship, State, Formula\` as \`ListType\`, and elsewhere \`StatedTaxonomy, FormulaicTaxonomy, StatedRelationship, FormulaicRelationship\`. Those are not six types. They are **two types times two membership modes**. Three independent axes cover everything:

\`\`\`
type      : TAXONOMY | RELATIONSHIP | STATE     — what the vocabulary means
membership: extensional | intensional            — stated, or defined by a rule
selection : SINGLE | MULTIPLE                    — how many may apply
\`\`\`

plus one flag that only \`STATE\` reads: \`monotonic : boolean\` — a stage, or a status.

What this buys: **\`Formula\` stops being a type** (an intensional list's members are whatever a CREAM-PQL predicate selects); **STAGE and STATUS collapse into STATE**; **Milestones need no model** (a monotonic STATE list with ordered items *is* a milestone catalogue).`,
      },
      {
        id: 'ep-3',
        title: '§3 — ListType should itself be a List',
        body: `You sensed recursion and then stopped short of it. Follow it one more step and it closes.

\`ListTypeMeta\` is currently impossible, because \`ListType\` is a Postgres enum and an enum value has no row to hang meta on. Make \`listType\` a system List whose values are the live set (\`STAGE\`, \`TAXONOMY\`, \`RELATIONSHIP\`, \`TRANSFORM\` and \`EVENT\`) and the problem disappears: \`ListTypeMeta\` becomes ordinary \`ListValueMeta\` on that list, and the system describes itself with no new mechanism.

This is exactly what WordPress does, and it is why \`wp_term_taxonomy\` is a table rather than an enum column. The recursion terminates because the self-describing list is seeded and system.`,
      },
      {
        id: 'ep-4',
        title: '§4 — Do not build MetaMeta',
        body: `This is the one place to push back firmly.

Meta on List, on ListType and on ListValue is three targets and is bounded. Meta on a meta *name*, and meta on a meta *value*, opens unbounded recursion — no query is predictable, and no reader can tell what depth a fact lives at.

Every example in the sketch fits **one** level:

- \`TicketStatus > Closed > ClosedBy : 2835\` — meta on a value. Depth one.
- \`TicketStatus > OnHold > OnHoldReasons[…]\` — a meta *whose value is a List reference*: a dependent picklist. Depth one, with a pointer.

> Meta attaches to a List, a ListType or a ListValue. A meta **value** may be a scalar, an array, or a reference to another List. Nothing attaches to a meta.

**You already have the storage.** \`ResourceMeta(resource, resourceId, key, value)\` is the polymorphic meta table; it needs \`'List'\` and \`'ListItem'\` added to its allowlist and nothing else.`,
      },
      {
        id: 'ep-5',
        title: '§5 — Naming',
        body: `Keep \`List\` / \`ListItem\` / \`ListResource\`. They are permanent identifiers under doctrine §9. Use the standard names (concept scheme, concept) in documentation so the prior art is findable, and keep the code as it is.

Two smaller naming calls:

- \`ListValue\` → **\`ListItem\`**, which is what the schema already calls it. "Value" invites confusion with \`ListItem.value\`, the optional stored value.
- Stated/Formulaic → **extensional/intensional** in docs, \`membership\` in code.`,
      },
      {
        id: 'ep-6',
        title: '§6 — The one question I cannot answer for you',
        body: `**Where is the licensee boundary enforced?**

Two tenancies are in play and today's schema models one: the **licensee** who bought the ERP, and the **organizations** that licensee serves (what \`organizationId\` scopes now). A licensee's staff move between their customers freely and must never cross into another licensee.

The honest options are a \`platformId\` column on every tenant-owned table, a database per licensee, or a deployment per licensee. They differ enormously in operational cost and in blast radius. Until the choice is made, \`PlatformContext\` is **descriptive only** — branding and module enablement. Do not build an isolation guarantee on it.`,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 9. REFERENCE — module.schema.json
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'ref-module-schema',
    title: 'Reference — module.schema.json',
    short: 'module.schema.json',
    summary:
      'What a module.json may contain. additionalProperties: false — an unknown key is an error. The field grammar, list rules, and the ListType enum definition.',
    icon: '📐',
    color: 'var(--text-dim)',
    source: 'modules/_schema/module.schema.json',
    sections: [
      {
        id: 'rms-top',
        title: 'Top-level shape',
        body: `\`\`\`json
{
  "$id": "https://ci-connect.dev/schema/module.schema.json",
  "title": "ci-connect module manifest",
  "type": "object",
  "additionalProperties": false,
  "required": ["slug", "displayName", "version"],
  "properties": {
    "slug":            "Permanent module id → PlatformModule.slug. Renaming is a migration.",
    "version":         "Semver. Minor for additive, major for a breaking id/key rename.",
    "optional":        "false = platform core, always enabled, not tenant-gateable.",
    "dependencies":    "{ requires[], optional[], conflicts[] } — acyclic, validated.",
    "models":          "Prisma models + resource slugs, fields, field groups, taxonomies.",
    "lists":           "The vocabularies this module owns.",
    "meta":            "Registered meta keys, by what they expand (Model | List | ListItem).",
    "actions":         "Non-CRUD verbs, their topics and permission recipes.",
    "navigation":      "Where the module appears.",
    "recipes":         "Seeded perspectives.",
    "seeds":           "{ system, demo } — repo-relative seeder paths."
  }
}
\`\`\``,
      },
      {
        id: 'rms-condition',
        title: 'conditionConfig — the one dialect (CREAM-PQL)',
        body: `The single condition dialect (doctrine §3) — nestable \`{logic, rules}\`.

\`\`\`json
"conditionConfig": {
  "required": ["logic", "rules"],
  "properties": {
    "logic": { "enum": ["AND", "OR"] },
    "rules": {
      "items": {
        "oneOf": [
          {
            "required": ["field", "op"],
            "properties": {
              "field": { "type": "string" },
              "op": { "enum": [
                "eq","ne","gt","gte","lt","lte","in","notIn",
                "contains","notContains","startsWith","endsWith",
                "isNull","isNotNull","within","newerThan","olderThan",
                "exists","notExists"
              ]},
              "value": {}
            }
          },
          { "$ref": "#/$defs/conditionConfig" }
        ]
      }
    }
  }
}
\`\`\``,
      },
      {
        id: 'rms-field',
        title: 'field — the field grammar',
        body: `A field \`type\` of \`relation\` requires \`relationTo\`; a \`type\` of \`list\` requires \`list\` (the vocabulary key).

\`\`\`json
"field": {
  "required": ["name", "type"],
  "properties": {
    "name": { "type": "string" },
    "type": { "enum": [
      "string","text","int","float","decimal","boolean",
      "date","datetime","json","list","relation","array"
    ]},
    "list":       "Required when type is 'list' — the vocabulary it draws from.",
    "relationTo": "Required when type is 'relation' — the target model.",
    "required":   "boolean",
    "filterable": "boolean",
    "sortable":   "boolean",
    "inList":     "Show as a column in the default datagrid.",
    "format":     "'cents' (integer minor units) | 'dollars' (major-unit decimal)."
  }
}
\`\`\`

The \`{ "type": "relation", "relationTo": "<Model>" }\` grammar is how you declare a navigable relationship — the piece the campaign-filter bug needed. With the relation declared, CREAM-PQL traverses it (\`when[campaignMembers][some][campaignId][eq]=8\`) with zero new filter code.`,
      },
      {
        id: 'rms-list',
        title: 'list — the ListType definition & rules',
        body: `The schema's own description of \`type\` is the canonical definition:

> The question is what the vocabulary labels. A **TAXONOMY** labels a record and any value may be applied freely. A **RELATIONSHIP** labels the edge between two records. A **STAGE** labels a governed position a record occupies and gates its transitions with isInitial, isTerminal and a transitions array. A **TRANSFORM** labels a payload shape. An **EVENT** labels an occurrence rather than a record, so it is applied to nothing and declares no resources. STATUS and TYPE were retired into TAXONOMY by migration 20260920120000 and are no longer accepted here, and CATEGORY has been unacceptable since TAXONOMY replaced it. All three still exist on the Postgres enum, which cannot drop a value, so old rows are readable and new declarations are not.

\`\`\`json
"type": { "enum": ["STAGE", "TAXONOMY", "RELATIONSHIP", "TRANSFORM", "EVENT"] }
\`\`\`

Conditional rules the schema enforces:

- **A mirrored vocabulary** (\`source: "mirror"\`) must name its authoritative table (\`mirrorOf\`) and must **not** restate its rows (\`items\` maxItems 0). A manifest-owned vocabulary must declare at least one item.
- **A STAGE list is a state machine:** it needs at least two items and exactly one with \`isInitial: true\` (plus at least one terminal).
- **An EVENT list** must declare the empty \`resources\` array — "inventing a resource to satisfy the shape would misfile the vocabulary as a taxonomy."

Item shape: \`key\` (machine slug, stable across label renames), \`label\`, optional \`value\`, \`parent\`, \`position\`, \`color\`, \`icon\`, \`isDefault\`, \`isInitial\`, \`isTerminal\`, and \`metadata\` (behaviour flags: \`billable\`, \`signable\`, \`stageGroup\`, \`transitions\`…).`,
      },
      {
        id: 'rms-action',
        title: 'action & navigationItem',
        body: `An \`action\` is a non-CRUD verb that extends the RBAC subject space without inventing a second permission system (D32):

\`\`\`json
"action": {
  "required": ["name", "description", "topics", "context"],
  "properties": {
    "topics":  "Pubsub topics published in order. Event-shaped (domain:resource:action).",
    "context": "Models whose records this action operates on.",
    "permissionsDefault": "CreamPieRecipe slug bound with bindingType RBAC_CONDITION.",
    "confirm": "Prompt before running — for destructive or outward-facing actions."
  }
}
\`\`\`

A \`navigationItem\` requires \`subjectId\`, \`label\` and \`navigationType\`. \`formerIds\` lists old subject ids this node replaces — it drives the \`role_abilities\` migration and the redirect aliases (D24). The \`subjectId\` cascade is string-prefix based, so a node id must stay prefix-consistent with its tree position.`,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 10. REFERENCE — crm/module.json
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'ref-crm-manifest',
    title: 'Reference — modules/crm/module.json',
    short: 'crm manifest',
    summary:
      'The CRM manifest. Shows the distributor/relationship pattern, the customerStatus STAGE machine, and how lead vocabularies are declared as rows — the right pattern to imitate.',
    icon: '🏢',
    color: 'var(--purple-l)',
    source: 'modules/crm/module.json',
    sections: [
      {
        id: 'crm-header',
        title: 'Module header',
        body: `\`\`\`json
{
  "$schema": "../_schema/module.schema.json",
  "slug": "crm",
  "displayName": "CRM",
  "description": "Organizations, the people attached to them, and the edges between them. The records the rest of the platform hangs off.",
  "version": "1.0.0",
  "optional": false,
  "defaultEnabled": true,
  "sortOrder": 20,
  "dependencies": { "requires": ["core", "vocabulary"] }
}
\`\`\``,
      },
      {
        id: 'crm-org',
        title: 'Organization model — perspectives, not five entities',
        body: `The key architectural point: "Customers", "Distributors", "Franchises", "Manufacturers" and "PE Firms" are **perspectives on this one entity, not five of them.**

\`\`\`json
{
  "name": "Organization",
  "resource": "organizations",
  "resourceAliases": ["customers"],
  "labelField": "name",
  "taxonomies": [
    "customerStatus", "trade", "industry",
    "organizationType", "organizationStatus"
  ],
  "relationships": [
    {
      "name": "organizationEdge",
      "listKey": "organizationRelationshipType",
      "to": ["Organization", "Contact"],
      "description": "Reseller, ambassador, affiliate, vendor, parent/child — every org↔org and org↔contact edge label."
    }
  ]
}
\`\`\`

This is the distributor pattern: a distributor is not a model, it is a value of \`organizationRelationshipType\` (or \`organizationType\`) applied to an \`Organization\`. The relationship edge is declared once; CREAM-PQL filters it with no bespoke resolver. *This is the right pattern to imitate — a recipe/relationship row, not code.*`,
      },
      {
        id: 'crm-customerstatus',
        title: 'customerStatus — a STAGE state machine',
        body: `The organization's primary lifecycle. Written only through \`transitionStage\`. Each item carries \`isInitial\`/\`isTerminal\`, a \`color\`, and a \`metadata.transitions\` array naming the legal next moves.

\`\`\`json
{
  "key": "customerStatus",
  "name": "Customer Status",
  "type": "STAGE",
  "resources": ["organization", "organizations"],
  "selectionType": "SINGLE",
  "fieldType": "AUTOCOMPLETE",
  "system": true,
  "items": [
    { "key": "lead",        "isInitial": true, "isDefault": true, "color": "slate",
      "metadata": { "stageGroup": "lead",     "transitions": ["opportunity","customer","cancelled"] } },
    { "key": "opportunity", "color": "sky",
      "metadata": { "stageGroup": "prospect", "transitions": ["customer","lead","cancelled"] } },
    { "key": "customer",    "color": "green",
      "metadata": { "stageGroup": "customer", "customer": true, "transitions": ["at_risk","cancelled","fired"] } },
    { "key": "at_risk",     "color": "orange",
      "metadata": { "stageGroup": "customer", "customer": true, "transitions": ["customer","cancelled","fired"] } },
    { "key": "cancelled",   "isTerminal": true, "color": "red",
      "metadata": { "stageGroup": "former",   "winBack": true, "transitions": ["lead","opportunity","customer"] } },
    { "key": "fired",       "isTerminal": true, "color": "zinc",
      "metadata": { "stageGroup": "former" } }
  ]
}
\`\`\`

The \`replaces\` array documents provenance — \`customerStatus\` folded \`organizationLifecycleStage\`, the old STATUS \`customerStatus\`, \`accountStatus\`/\`accountStage\`, and \`Organization.customerStatusSlug\`.`,
      },
      {
        id: 'crm-leads',
        title: 'Lead vocabularies — rows, not enums',
        body: `The Lead model's intake vocabularies demonstrate "if it can be rows, it is rows." \`leadStatus\` is a STAGE (pipeline); \`leadType\` is an orthogonal TAXONOMY (prospect / vendor / partner / employment); \`leadOrigin\` records how the lead found CI Web Group.

\`\`\`json
{
  "key": "leadStatus", "type": "STAGE", "resources": ["leads"], "required": true,
  "items": [
    { "key": "new",            "isInitial": true, "label": "New",             "metadata": { "stageGroup": "open" } },
    { "key": "contacted",      "label": "Contacted",       "metadata": { "stageGroup": "open" } },
    { "key": "qualified",      "label": "Hot Lead",        "metadata": { "stageGroup": "open" } },
    { "key": "booked",         "label": "Booked",          "metadata": { "stageGroup": "open" } },
    { "key": "proposal_sent",  "label": "Proposal Out",    "metadata": { "stageGroup": "open" } },
    { "key": "msa_sent",       "label": "MSA Sent",        "metadata": { "stageGroup": "open" } },
    { "key": "follow_up",      "label": "Follow-Up",       "metadata": { "stageGroup": "open" } },
    { "key": "unresponsive",   "label": "Unresponsive",    "metadata": { "stageGroup": "open" } },
    { "key": "converted",      "isTerminal": true, "label": "Converted",       "metadata": { "stageGroup": "won" } },
    { "key": "not_interested", "isTerminal": true, "label": "Not Interested",  "metadata": { "stageGroup": "lost" } }
  ]
}
\`\`\`

\`leadType\` is a separate TAXONOMY precisely because it is *orthogonal to the pipeline stage*: vendors, partners and job-seekers fill out the public lead form like anyone else, and this vocabulary holds them out of the active pipeline for leadership to review — without a second table or an enum.

\`leadTag\` is \`system: false\` (org-editable): "a rep who may manage lists adds a new tag here by typing it on a lead." That is the DRY mission in one line — a new tag is a row, created from the UI, never a deploy.`,
      },
      {
        id: 'crm-rule',
        title: 'The governing rule',
        body: `**Before writing code for a request, name the List, ListItem or recipe row that is missing. If it can be rows, it is rows.**

The distributor recipe fix (commit \`87b8972eb\`) is the canonical example of the right pattern: the need was expressed as a relationship/recipe row, not a new resolver, model, column or enum. Reach for the Lists admin first; reach for code only when rows genuinely cannot express the need (a new relation, a new model, a new recipe wired into a manifest, or real new behaviour).

Lists admin: \`synapse.ciwebgroup.com/backoffice/admin/lists\``,
      },
    ],
  },
];
