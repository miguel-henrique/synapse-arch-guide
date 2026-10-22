// Step-by-step tutorials. Bodies are markdown rendered by components/Markdown.
// Paths are relative to the ci-connect repo (origin/stage 0ca89c748).
import type { Step } from '../components/kit/Kit';

export type Verdict = 'ui' | 'manifest' | 'code' | 'mixed' | 'decide';

export interface Tutorial {
  id: string;
  group: 'Leads' | 'Infrastructure' | 'Everyday';
  title: string;
  verdict: Verdict;
  goal: string;
  /** Why this verdict — the triage reasoning (GATE A style). */
  triage: string;
  steps: Step[];
  pitfalls?: string[];
  files?: { path: string; note?: string }[];
}

export const VERDICT: Record<Verdict, { label: string; color: string }> = {
  ui: { label: 'Data · Lists admin only', color: 'var(--green)' },
  manifest: { label: 'Manifest change (rows from code)', color: 'var(--purple-l)' },
  code: { label: 'Code + schema', color: 'var(--pink)' },
  mixed: { label: 'Mixed: UI now, manifest after', color: 'var(--yellow)' },
  decide: { label: 'Design fork — decide first', color: 'var(--orange-l)' },
};

export const TUTORIALS: Tutorial[] = [
  // ───────────────────────────────────────────────────────────────── LEADS
  {
    id: 'relabel-stage',
    group: 'Leads',
    title: 'Rename or recolour a lead stage',
    verdict: 'manifest',
    goal: 'Make the "qualified" stage read "Hot Lead" in red — which is exactly what production shows today.',
    triage:
      'It is a vocabulary change (no new structure), so the instinct is "Lists admin". But `leadStatus` is a **system list declared in `modules/crm/module.json`**, and the CRM system seed owns the item columns `label, position, color, icon, isDefault, isInitial, isTerminal, metadata` (`_moduleSeeder.ts:37-50`). An edit made only in the admin is overwritten on the next deploy. So: change the manifest; the seed applies it.',
    steps: [
      {
        where: 'decide',
        title: 'Check who owns the list',
        body: 'Open the list in **Lists admin** (`/backoffice/admin/lists`, search `leadStatus`). If it shows **system**, it is manifest-owned. Then search the manifests:\n\n```bash\ngrep -n \'"key": "leadStatus"\' modules/*/module.json\n```\n\nFound in `modules/crm/module.json:578` → manifest-owned.',
      },
      {
        where: 'code',
        title: 'Edit the item in the manifest — never the key',
        body: '```json\n{\n  "key": "qualified",          // stays: code, URLs and leads.status store this\n  "label": "Hot Lead",         // was "Qualified"\n  "color": "red",\n  "position": 30,\n  "metadata": { "stageGroup": "open", "transitions": [ … ] }\n}\n```\n\nThe **key is API** — `leads.status`, recipes, `when[status][eq]=qualified` and PubSub topic names all reference it. Only `label`, `color`, `position`, `icon` are safe to change.',
      },
      {
        where: 'cli',
        title: 'Regenerate and check',
        body: '```bash\npnpm build:modules      # rewrites modules/crm/generated/crm-lists.ts\npnpm check:modules      # fails if generated files drift from manifests\n```\n\nCommit `module.json` **and** the regenerated `crm-lists.ts` together.',
      },
      {
        where: 'db',
        title: 'Apply it',
        body: 'On deploy the system seed (`libs/prisma/src/seeders/modules/seed-crm.system.ts`) upserts the item by key. Locally you can run that file directly with `tsx` against your task database.',
      },
      {
        where: 'verify',
        title: 'Verify on the screen',
        body: 'Open `/backoffice/sales/leads`: the tab, the kanban column and the status chips all read "Hot Lead" — none of them hardcode the label, they read the List. The URL still says `status=qualified`.',
      },
    ],
    pitfalls: [
      'Relabelling only in the admin "works" until the next deploy, then silently reverts.',
      'Changing the key orphans every lead that stores the old key (they fall out of every tab — like the 3 production leads with `partner_referral`, `Converted`, `contact`).',
    ],
    files: [
      { path: 'modules/crm/module.json:578', note: 'leadStatus' },
      { path: 'libs/prisma/src/seeders/modules/_moduleSeeder.ts:37-50', note: 'LIST_ITEM_OWNED_COLUMNS' },
    ],
  },
  {
    id: 'add-lead-type',
    group: 'Leads',
    title: 'Add a new Lead type value (e.g. "Employment application")',
    verdict: 'mixed',
    goal: 'Let the team classify job-seekers who fill out the public lead form, and filter them out of the active pipeline.',
    triage:
      'A new **value** of an existing vocabulary — no new column, no new behaviour. The Lead-type dropdown and bulk edit read the live List, so a new item appears with no code. But `leadType` is system/manifest-owned, so the durable home is the manifest. The admin is fine for trying it today **if you use the same slug key the manifest will use**. This is a real production case: on Oct 20 someone added key `"Employment Application"` in the admin while stage\'s manifest added key `employment` — two values, one label.',
    steps: [
      {
        where: 'ui',
        title: 'Option A (fast): add the item in Lists admin',
        body: 'Lists admin → `leadType` → Items → **Add item**:\n\n| field | value |\n|---|---|\n| key | `employment` — lowercase slug, never a display string |\n| label | Employment Application |\n| position | 40 |\n| color | slate |\n\nIt appears immediately in the Lead-type dropdown and in "Edit selected".',
      },
      {
        where: 'code',
        title: 'Option B (durable): add it to the manifest with the SAME key',
        body: '```json\n// modules/crm/module.json → lists[] → leadType → items[]\n{ "key": "employment", "label": "Employment Application", "position": 40, "color": "slate" }\n```\n\n```bash\npnpm build:modules && pnpm check:modules\n```\n\nIf you did Option A first, the seed now finds the item by key and adopts it — no duplicate.',
      },
      {
        where: 'decide',
        title: 'Should these leads leave the default list?',
        body: 'The Leads view opens on `leadType = prospect` (`LEADS_VIEW.defaultWhen`), so new non-prospect types are already held out. If leadership wants a page for them, add a **recipe** (next tutorial) — not a menu entry.',
      },
      {
        where: 'verify',
        title: 'Verify',
        body: 'Pick the new value in the dropdown. The request should carry `when[leadType][eq]=employment`. Check the Deep Dives → URL Anatomy decoder with the URL from your network tab.',
      },
    ],
    pitfalls: [
      'Keys with capitals or spaces (`"Employment Application"`) work but are a trap: they are what lands in `leads.lead_type`, the URL and every recipe.',
      'Do not add the value to a TypeScript `LeadTypeSchema` or a "Mark as X" action — the first version of this feature did exactly that and fix #1090 had to remove it.',
    ],
    files: [
      { path: 'modules/crm/module.json:990', note: 'leadType list' },
      { path: 'apps/synapse-v3/src/components/entity-list/resourceViews/leads.ts', note: 'selectFilters / defaultWhen' },
    ],
  },
  {
    id: 'add-stage',
    group: 'Leads',
    title: 'Add a new pipeline stage (e.g. "Nurture")',
    verdict: 'manifest',
    goal: 'A stage between Follow-Up and Unresponsive for leads that are long-term warm.',
    triage:
      'Still a vocabulary value, but of a **STAGE** list: the item carries lifecycle semantics (`isInitial`, `isTerminal`, `metadata.transitions`, `stageGroup`) that the state machine and the Open/closed tab logic read. Those are seed-owned columns → manifest.',
    steps: [
      {
        where: 'code',
        title: 'Add the item with its lifecycle metadata',
        body: '```json\n{\n  "key": "nurture",\n  "label": "Nurture",\n  "position": 85,                 // between follow_up (70) / needs_rescheduled (80) and unresponsive (90)\n  "color": "teal",\n  "isTerminal": false,            // true would hide it from the default "Open" list\n  "metadata": {\n    "stageGroup": "open",\n    "transitions": ["new", "contacted", "qualified", "booked", "follow_up", "unresponsive", "converted", "not_interested"]\n  }\n}\n```',
      },
      {
        where: 'code',
        title: 'Let the other stages move INTO it',
        body: 'Transitions are per source item. Add `"nurture"` to the `transitions` array of every stage that may move to it. `stageMachine.ts` refuses a move the source item does not declare (`StageMachineError`).',
      },
      {
        where: 'decide',
        title: 'Should it be on the default list?',
        body: 'Default list = all stages except `isTerminal` ones and `LEADS_VIEW.openHidesStages` (today `["unresponsive"]`). To hide Nurture by default without making it terminal, add it to `openHidesStages` in `resourceViews/leads.ts`.',
      },
      {
        where: 'cli',
        title: 'Regenerate, test, deploy',
        body: '```bash\npnpm build:modules && pnpm check:modules\n# the stage-list guard: libs/prisma/src/seeders/modules/_stageLists.spec.ts\n```',
      },
      {
        where: 'verify',
        title: 'What appears without code',
        body: '- a "Nurture" tab with its own count (one more `pageSize=1` request)\n- a Kanban column\n- the option in status pickers and bulk edit\n- PubSub topics `…:lead:<from>:stage-changed:nurture` when a lead moves',
      },
    ],
    files: [
      { path: 'libs/prisma/src/utils/stageMachine.ts:104-175', note: 'transition rules' },
      { path: 'apps/synapse-v3/src/components/entity-list/EntityList.tsx:503-533', note: 'closed-stage hiding' },
    ],
  },
  {
    id: 'add-perspective',
    group: 'Leads',
    title: 'Add a shared perspective: "Hot leads with no follow-up"',
    verdict: 'manifest',
    goal: 'Give every rep a one-click view of hot leads nobody has scheduled.',
    triage:
      'A perspective is a **recipe** (doctrine §4), shown as a chip / accordion entry — not a new menu node (§5) and not new filter code. Personal version: a saved view (UI only). Shared version for everyone: a system recipe in the manifest (or an org-tier recipe).',
    steps: [
      {
        where: 'ui',
        title: 'Personal version (no code)',
        body: 'On `/backoffice/sales/leads`: click the **Hot Lead** tab, add the filter *Next follow-up is empty*, then **Save view**. It is a user-tier recipe in list `savedView`, visible only to you, under Leads in the sidebar.',
      },
      {
        where: 'code',
        title: 'Shared version: add a recipe row',
        body: '```json\n// modules/crm/module.json → recipes[]\n{\n  "slug": "sales.hot-unscheduled",\n  "displayName": "Hot, no follow-up",\n  "description": "Hot leads with no next follow-up date.",\n  "primaryResource": "leads",\n  "conditions": {\n    "logic": "AND",\n    "rules": [\n      { "field": "status", "op": "eq", "value": "qualified" },\n      { "field": "nextFollowUpDate", "op": "isNull" },\n      { "field": "organizationId", "op": "eq", "value": 496 }\n    ]\n  }\n}\n```\n\nNeed it for managers only? Add `"availableWhen"` — enforced **server-side** (403), never a role enum.',
      },
      {
        where: 'cli',
        title: 'Regenerate',
        body: '```bash\npnpm build:modules && pnpm check:modules\n```',
      },
      {
        where: 'verify',
        title: 'Where it shows up',
        body: 'In the Leads accordion (because `primaryResource` is `leads`) and at `/backoffice/sales/leads?recipe=sales.hot-unscheduled`. **Do not** also add a `CreamPie` navigation node next to Leads — that is how the double "Vendors & Partners" happened.',
      },
    ],
    pitfalls: [
      'OR / nested logic cannot travel in `when[…]` (flat AND only) — that is precisely when you need a recipe.',
      'Copying `organizationId eq 496` into one more recipe adds to the hardcoded-tenant debt (see Questions). Prefer the view\'s `fixedWhen` until there is a context binding.',
    ],
  },
  {
    id: 'add-field',
    group: 'Leads',
    title: 'Add a new classification field to leads (e.g. budget tier)',
    verdict: 'code',
    goal: 'A single-select "Budget tier" on every lead, filterable, bulk-editable, in the grid.',
    triage:
      'This one is genuinely code: a new **column** needs a Prisma migration, and the manifest must bind the column to a **new List**. Everything after that (picker, filter, chip, bulk edit, URL) is generated. This is exactly how `leadType` was added (commit `1f2dd673a`) — including the mistake to avoid.',
    steps: [
      {
        where: 'decide',
        title: 'Check the vocabulary does not already exist',
        body: 'Search `docs/architecture/SEEDED-LISTS.md` §1 and `modules/*/module.json` for an existing budget / tier list. Spine taxonomies are shared, never per-module copies (§1). A multi-select tag would need **no column at all** (ListResource rows) — consider `leadTag` first.',
      },
      {
        where: 'code',
        title: 'Column on the adopted Prisma model',
        body: '`Lead` is `adopted: true` with `sourceFile: libs/prisma/src/schema/organization/Lead.prisma`, so the column goes there:\n\n```prisma\nbudgetTier String? @map("budget_tier")\n```\n\nThen create the migration (`pnpm prisma:migrate:dev`) against your task database.',
      },
      {
        where: 'code',
        title: 'Declare the List and bind the field',
        body: '```json\n// lists[]\n{ "key": "leadBudgetTier", "name": "Lead Budget Tier", "type": "TAXONOMY",\n  "resources": ["leads"], "selectionType": "SINGLE", "dataType": "STRING",\n  "fieldType": "RADIO", "system": true, "required": false, "other": false,\n  "items": [\n    { "key": "small",  "label": "< $2k/mo",   "position": 10 },\n    { "key": "medium", "label": "$2–5k/mo",   "position": 20 },\n    { "key": "large",  "label": "> $5k/mo",   "position": 30 }\n  ] }\n\n// models[] → Lead → fields[]\n{ "name": "budgetTier", "type": "list", "list": "leadBudgetTier",\n  "filterable": true, "sortable": true, "inList": true, "label": "Budget tier" }\n\n// models[] → Lead → taxonomies[]  add "leadBudgetTier"\n```',
      },
      {
        where: 'code',
        title: 'Presentation (optional)',
        body: 'In `resourceViews/leads.ts`: add `budgetTier` to `columns` and `bulkEditFields`; add `{ list: "leadBudgetTier", label: "Budget" }` to `selectFilters` if it deserves a toolbar control.',
      },
      {
        where: 'cli',
        title: 'Generate everything',
        body: '```bash\npnpm build:modules\npnpm check:modules\npnpm check:nav-subjects   # also regenerates entity-field / column checks\npnpm prisma:generate\n```',
      },
      {
        where: 'verify',
        title: 'Verify',
        body: '`/api/v1/leads?when[budgetTier][eq]=large` returns only large leads; the grid shows labels (via `lists=`), the filter is derived from the List.',
      },
    ],
    pitfalls: [
      'The first leadType version added a `LeadTypeSchema` with 3 hardcoded values and "Mark as Vendor/Partner" actions. They had to be deleted (fix #1090) because new values added in the admin never reached them. Never mirror the List in TypeScript.',
      'Forgetting `taxonomies[]` means `lists=` will not hydrate the field\'s labels.',
    ],
    files: [
      { path: 'libs/prisma/src/schema/organization/Lead.prisma' },
      { path: 'modules/_schema/module.schema.json:541-657', note: 'field grammar' },
    ],
  },
  {
    id: 'fix-menu-dup',
    group: 'Leads',
    title: 'Fix the double "Vendors & Partners" in the menu',
    verdict: 'manifest',
    goal: 'One way into the vendors/partners perspective, as doctrine §5 intends.',
    triage:
      'No new code. The recipe is right; the extra `CreamPie` navigation node is the problem (Modules → Leads → Menu). Two valid shapes — pick one with the stakeholder.',
    steps: [
      {
        where: 'decide',
        title: 'Choose',
        body: '| option | effect |\n|---|---|\n| **A. Remove the nav node** | Only the accordion entry under Leads (and the chip) remain. Cleanest per §5. |\n| **B. Re-parent it under Leads** | Set `"parent": "sales.leads"`. The sidebar\'s dedupe rule (`UnifiedSidebar.tsx:203-208`) then folds it into the accordion. |\n\nSame question for `sales.reporting` (a CreamPie over leads at position 100).',
      },
      {
        where: 'code',
        title: 'Option A: delete the node, keep the subject alive',
        body: 'Remove the `sales.vendors-partners` object from `navigation[]` in `modules/crm/module.json` (lines ~2965-2976). Keep the **recipe**. Because nav keys are RBAC subjects, check grants referencing `sales.vendors-partners`; if you want an old URL to keep working, list it in `formerIds` of `sales.leads`.',
      },
      {
        where: 'cli',
        title: 'Regenerate nav artifacts',
        body: '```bash\npnpm build:modules\nnode scripts/ci/gen-synapse-nav-artifacts.mjs     # rewrites navTree.generated.ts\nnode scripts/ci/gen-nav-subject-migration.mjs     # subject / role_abilities migration if needed\npnpm check:modules && pnpm check:nav-subjects\n```',
      },
      {
        where: 'db',
        title: 'Roll out',
        body: 'The nav seed applies it on deploy. The original commit (`53f4c5501`) notes the rollout needs a nav seed and a response-cache bump for the navigation item.',
      },
      {
        where: 'verify',
        title: 'Verify',
        body: 'The sidebar shows Vendors & Partners once, indented under Leads, linking to `/backoffice/sales/leads?recipe=sales.vendors-partners`.',
      },
    ],
  },
  {
    id: 'campaign-filter',
    group: 'Leads',
    title: 'Make the Campaign filter doctrine-compliant',
    verdict: 'decide',
    goal: 'Replace `campaignMembershipFilter.ts` (a bespoke side-query resolver) with the engine.',
    triage:
      'The doctrine\'s worked example says "declare the Prisma relation, delete the resolver". But on stage `campaign_members` has been folded into ListResource **edges** (`20261230000000_campaign_members_fold_into_edges`), so there is no table to relate to. This is a real design fork — present it, do not pick silently.',
    steps: [
      {
        where: 'decide',
        title: 'Option 1 — traverse the edge with the stock grammar',
        body: 'Make the membership predicate traversable by `edges.*` (it requires a RELATIONSHIP list; `campaignMemberRole` is TAXONOMY today), then the Campaign picker writes:\n\n```\nwhen[edges.<campaignMemberList>.Project.id][eq]=8\n```\n\nPro: zero filter code, the same grammar as every other edge. Con: needs the list-type decision and a picker change.',
      },
      {
        where: 'decide',
        title: 'Option 2 — make the two linkages one',
        body: 'Every attach path writes both the stamp and the edge (or a backfill makes `Lead.campaignId` derived). Then `when[campaignId][eq]=8` is complete and the resolver can go. Pro: simple queries. Con: two sources of truth to keep in sync.',
      },
      {
        where: 'decide',
        title: 'Option 3 — keep the resolver, but as a declared field',
        body: 'Register the union as a manifest-declared computed/relation field so it is visible and named, instead of silently rewriting `campaignId`. Pro: smallest change. Con: still a second mechanism (§3).',
      },
      {
        where: 'verify',
        title: 'Whatever you choose: the acceptance test',
        body: 'Use the semijoin playground leads: a lead stamped only (L1), attached only (L2), both (L5) — all three must appear under campaign 8, and the URL must say what it means.',
      },
    ],
    files: [
      { path: 'apps/web-services/src/modules/cream-pie/campaignMembershipFilter.ts' },
      { path: 'apps/web-services/src/modules/cream-pie/edgePath.ts' },
      { path: 'modules/events/module.json:1521', note: 'campaignMemberRole (TAXONOMY)' },
    ],
  },

  // ────────────────────────────────────────────────────────── INFRASTRUCTURE
  {
    id: 'infra-refactor',
    group: 'Infrastructure',
    title: 'Refactor Infrastructure onto the List architecture',
    verdict: 'code',
    goal: 'Make /infrastructure a normal manifest-driven workspace, in phases that each ship on their own.',
    triage:
      'Code: there is no manifest, no Lists for its states, and the generic API is blocked for its models. But each phase *removes* code. Order matters: vocabulary first (no UI change), then menu, then screens.',
    steps: [
      {
        where: 'code',
        title: 'Phase 0 — create the module manifest',
        body: '```json\n// modules/infrastructure/module.json\n{\n  "slug": "infrastructure",\n  "displayName": "Infrastructure",\n  "description": "Servers, sites, DNS, backups and storage.",\n  "version": "1.0.0",\n  "dependencies": ["core", "web-presence"],\n  "models": [], "lists": [], "navigation": [], "recipes": [],\n  "seeds": { "system": "libs/prisma/src/seeders/modules/seed-infrastructure.system.ts" }\n}\n```\n\nCopy the seeder shape from `seed-crm.system.ts` (it is ~20 lines). Validate with `pnpm build:modules`.',
      },
      {
        where: 'code',
        title: 'Phase 1 — vocabularies become Lists',
        body: 'For each enum in `libs/types/src/lib/backup-tracking/index.ts:28-88`, add a List with `replaces`:\n\n```json\n{ "key": "backupRunStatus", "name": "Backup Run Status", "type": "STAGE",\n  "resources": ["backup_runs"], "selectionType": "SINGLE", "system": true,\n  "replaces": ["BackupRun.status"],\n  "items": [\n    { "key": "started",   "label": "Started",   "isInitial": true, "color": "sky",\n      "metadata": { "transitions": ["succeeded", "partial", "failed", "abandoned"] } },\n    { "key": "succeeded", "label": "Succeeded", "isTerminal": true, "color": "green" },\n    { "key": "partial",   "label": "Partial",   "isTerminal": true, "color": "amber" },\n    { "key": "failed",    "label": "Failed",    "isTerminal": true, "color": "red" },\n    { "key": "abandoned", "label": "Abandoned", "isTerminal": true, "color": "slate" }\n  ] }\n```\n\nSame for `backupFindingState` (STAGE: open → acknowledged → resolved), `backupTargetState`, `backupFindingType` (severity in item `metadata`, replacing `CRITICAL_FINDING_TYPES`). Follow the existing `backupIngestEventType` in `web-presence`. Check `SEEDED-LISTS.md` §1 first.',
      },
      {
        where: 'code',
        title: 'Phase 1b — badges read the List',
        body: 'Replace `RUN_STATUS_CLASSES` / `FINDING_STATE_CLASSES` in `backupPresentation.ts` and the raw `{status}` in `BackupBadges.tsx` with the List item\'s `label` + `color` (the same lookup EntityList uses). Delete the colour maps.',
      },
      {
        where: 'code',
        title: 'Phase 2 — menu from the manifest',
        body: '```json\n"navigation": [\n  { "subjectId": "infrastructure", "label": "Infrastructure", "navigationType": "Workspace",\n    "icon": "Server", "position": 90 },\n  { "subjectId": "infrastructure.dns", "parent": "infrastructure", "label": "DNS",\n    "navigationType": "Item", "route": "/infrastructure/dns", "icon": "Server", "position": 10,\n    "formerIds": ["infrastructure.dns.cloudflare"] },\n  { "subjectId": "infrastructure.sites", "parent": "infrastructure", "label": "Sites",\n    "navigationType": "Item", "route": "/infrastructure/sites", "icon": "Globe", "position": 20,\n    "formerIds": ["infrastructure.sites.grid"] },\n  { "subjectId": "infrastructure.backups", "parent": "infrastructure", "label": "Backups",\n    "navigationType": "Item", "route": "/infrastructure/backups", "icon": "DatabaseBackup", "position": 30,\n    "formerIds": ["infrastructure.backups.tracking"] }\n]\n```\n\n`formerIds` migrates role abilities and redirects. Then run the nav generators.',
      },
      {
        where: 'code',
        title: 'Phase 2b — delete the legacy wiring',
        body: 'Delete `infrastructureTree` (`navRegistry.ts:1115-1166`, `:1488`), the `registryToGroups(\'infrastructure\')` branch (`UnifiedSidebar.tsx:147-171`), the `DASHBOARDS` legacy entry (`DashboardSwitcher.tsx:89-106`), and move the four routes in `router.tsx:573-610` under the workspace shell. The `canRead` gate now applies — fixing the RBAC gap.',
      },
      {
        where: 'code',
        title: 'Phase 3 — screens on EntityList',
        body: '1. Declare the backup models in `models[]` with list-bound fields and relations (`BackupTarget.domain → Domain`).\n2. Replace the wholesale `rejectBackupTrackingGenericApi` block with a read-only rule (writes stay on the ingest pipeline).\n3. Turn the WordPress / infrastructure sub-tabs into recipes `backups.wordpress`, `backups.infra-hosts` (chips).\n4. Mount `<EntityList resource="backup_targets">` with a small view template; keep `/summary` and the coverage strip as CustomView widgets.\n5. Delete `BACKUP_SECTIONS`, both duplicated resource hooks and the bespoke tables.',
      },
      {
        where: 'verify',
        title: 'Done when',
        body: '- `grep -rn "infrastructureTree\\|INFRASTRUCTURE_TABS\\|BACKUP_SECTIONS" apps/` returns nothing\n- `pnpm check:modules && pnpm check:nav-subjects` pass\n- a backup list URL looks like `/backoffice/infrastructure/backups?when[status][eq]=failed`',
      },
    ],
    pitfalls: [
      'Phase 3 touches an auth guard on the generic API — that is a security change: write the read-only rule, add tests, and get it reviewed.',
      'Do not rename enum values while folding them; keys must equal what the columns already store.',
    ],
  },
  {
    id: 'infra-storage',
    group: 'Infrastructure',
    title: 'Add a "Storage" tab to Infrastructure',
    verdict: 'code',
    goal: 'See every server\'s volumes / buckets with capacity and usage, and spot the ones running out.',
    triage:
      'Code: no storage-inventory model exists (`libs/storage` is S3/MinIO object storage for content). A new model is structure. But after it exists, every remaining piece is rows: two Lists, one recipe, one nav Item, and the stock EntityList. If Phase 2 of the refactor is not done yet, do it first — adding a fourth hardcoded tab grows the debt.',
    steps: [
      {
        where: 'decide',
        title: 'Name what is missing (the doctrine\'s first question)',
        body: '| missing | kind |\n|---|---|\n| a `StorageVolume` model | code (Prisma + manifest) |\n| `storageVolumeKind` (disk, lvm, nfs, s3_bucket) | TAXONOMY list |\n| `storageVolumeState` (healthy, warning, critical, retired) | STAGE list |\n| "near capacity" view | recipe |\n| the tab | navigation Item |\n\nCheck for overlap with existing `Server` (seeded by `seed-Server-do.ts`), `Domain`, `Asset` models (§2: discriminator before a new model).',
      },
      {
        where: 'code',
        title: 'The model',
        body: '```json\n// modules/infrastructure/module.json → models[]\n{ "name": "StorageVolume", "resource": "storage_volumes", "labelField": "name",\n  "supportedViews": ["datagrid", "kanban"], "defaultView": "datagrid",\n  "taxonomies": ["storageVolumeKind", "storageVolumeState"],\n  "fields": [\n    { "name": "name",       "type": "string",   "required": true, "inList": true },\n    { "name": "serverId",   "type": "relation", "relationTo": "Server", "filterable": true },\n    { "name": "mountPoint", "type": "string",   "inList": true },\n    { "name": "kind",       "type": "list", "list": "storageVolumeKind",  "filterable": true },\n    { "name": "state",      "type": "list", "list": "storageVolumeState", "filterable": true },\n    { "name": "capacityGb", "type": "decimal",  "inList": true, "sortable": true },\n    { "name": "usedGb",     "type": "decimal",  "inList": true, "sortable": true },\n    { "name": "usedPct",    "type": "float",    "inList": true, "sortable": true, "filterable": true },\n    { "name": "observedAt", "type": "datetime", "inList": true }\n  ] }\n```',
      },
      {
        where: 'code',
        title: 'The two Lists',
        body: '```json\n{ "key": "storageVolumeKind", "name": "Storage Volume Kind", "type": "TAXONOMY",\n  "resources": ["storage_volumes"], "selectionType": "SINGLE", "system": true,\n  "items": [ { "key": "disk", "label": "Disk", "position": 10 },\n             { "key": "lvm", "label": "LVM volume", "position": 20 },\n             { "key": "nfs", "label": "NFS share", "position": 30 },\n             { "key": "s3_bucket", "label": "S3 bucket", "position": 40 } ] },\n{ "key": "storageVolumeState", "name": "Storage Volume State", "type": "STAGE",\n  "resources": ["storage_volumes"], "selectionType": "SINGLE", "system": true,\n  "items": [ { "key": "healthy",  "label": "Healthy",  "isInitial": true, "color": "green",\n               "metadata": { "transitions": ["warning", "critical", "retired"] } },\n             { "key": "warning",  "label": "≥ 80%",    "color": "amber",\n               "metadata": { "transitions": ["healthy", "critical", "retired"] } },\n             { "key": "critical", "label": "≥ 95%",    "color": "red",\n               "metadata": { "transitions": ["healthy", "warning", "retired"] } },\n             { "key": "retired",  "label": "Retired",  "isTerminal": true, "color": "slate" } ] }\n```\n\nA STAGE list with ≥ 3 values ⇒ the Guesser offers a Kanban board for free.',
      },
      {
        where: 'code',
        title: 'Recipe + nav Item',
        body: '```json\n// recipes[]\n{ "slug": "infrastructure.storage.near-capacity", "displayName": "Near capacity",\n  "primaryResource": "storage_volumes",\n  "conditions": { "logic": "AND", "rules": [\n    { "field": "usedPct", "op": "gte", "value": 80 },\n    { "field": "state",   "op": "ne",  "value": "retired" } ] } }\n\n// navigation[]\n{ "subjectId": "infrastructure.storage", "parent": "infrastructure", "label": "Storage",\n  "navigationType": "Item", "route": "/infrastructure/storage", "icon": "HardDrive",\n  "position": 40, "primaryResource": "storage_volumes" }\n```\n\nBecause the Item has a `primaryResource`, "Near capacity" shows up in its accordion automatically.',
      },
      {
        where: 'cli',
        title: 'Generate + migrate',
        body: '```bash\npnpm build:modules            # emits the Prisma model, lists, nav, types\npnpm prisma:migrate:dev       # creates storage_volumes in your task DB\nnode scripts/ci/gen-synapse-nav-artifacts.mjs\nnode scripts/ci/gen-nav-subject-migration.mjs\npnpm check:modules && pnpm check:nav-subjects\n```',
      },
      {
        where: 'code',
        title: 'Feed it data (the only behaviour you write)',
        body: 'A collector writes rows. Two candidates: a cron/PubSub subscriber that pulls disk usage from the servers\' agents, or the existing backup inventory scan for the S3 buckets. All automation goes through PubSub (§8): e.g. topic `infrastructure:storage-volume:observed`; a subscriber computes `usedPct` and moves the state with `transitionAndAnnounce` (so `…:stage-changed:critical` can page someone).',
      },
      {
        where: 'verify',
        title: 'Verify',
        body: '`/backoffice/infrastructure/storage` renders the stock EntityList with Healthy / ≥80% / ≥95% tabs and counts; `?recipe=infrastructure.storage.near-capacity` works; nobody wrote a page component.',
      },
    ],
    pitfalls: [
      'The legacy way (a 4th entry in `INFRASTRUCTURE_TABS` + another `if` branch + `useStorageResource.ts`) works in an afternoon and makes the refactor harder. If you must, write the Lists and the model anyway so the screen can be swapped later.',
      'Server disks are infrastructure data from a different system of record — decide whether Synapse stores observations or reads them live.',
    ],
  },

  // ─────────────────────────────────────────────────────────────── EVERYDAY
  {
    id: 'debug-missing',
    group: 'Everyday',
    title: 'Debug "my lead does not show up"',
    verdict: 'ui',
    goal: 'Find out, without code, why a specific record is missing from a list.',
    triage: 'Almost always data: a value outside the List, a stage hidden by default, the org pin, or a filter in the URL.',
    steps: [
      {
        where: 'verify',
        title: 'Copy the request from the network tab',
        body: 'DevTools → Network → filter `leads?` → copy the request URL. Paste it into **Deep Dives → URL Anatomy** to see every rule.',
      },
      {
        where: 'verify',
        title: 'Walk the usual suspects',
        body: '1. **Stage hidden?** `when[status][notIn]=…` — click **All**.\n2. **Lead type?** `when[leadType][eq]=prospect` — the dropdown defaults to prospects.\n3. **Org pin?** `organizationId=496` — client-website leads never appear here.\n4. **Unknown value?** its `status` is not a leadStatus key (3 such leads in prod today) — it matches no tab.\n5. **Campaign?** stamped vs attached (see the semijoin playground).',
      },
      {
        where: 'ui',
        title: 'Fix the data, not the code',
        body: 'Re-set the record\'s status to a valid stage (bulk edit), or add the missing value to the List the right way (see the Lead-type tutorial).',
      },
    ],
  },
];
