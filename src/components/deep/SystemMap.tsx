import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Section } from '../kit/Kit';

// The whole platform on one page: the browser apps, the API, the shared libs,
// the database, and the build-time pipeline that turns module manifests into
// schema, vocabulary rows and menus.

const groups: DiagramGroup[] = [
  { id: 'browser', x: 16, y: 16, w: 262, h: 608, label: 'Browser apps (apps/*)', color: 'var(--blue)' },
  { id: 'api', x: 298, y: 16, w: 432, h: 318, label: 'apps/web-services — Express API', color: 'var(--purple-l)' },
  { id: 'libs', x: 298, y: 352, w: 432, h: 272, label: 'Shared libs (libs/*)', color: 'var(--teal)' },
  { id: 'build', x: 750, y: 16, w: 334, h: 318, label: 'Build time (manifests → code)', color: 'var(--orange-l)' },
  { id: 'db', x: 750, y: 352, w: 334, h: 272, label: 'PostgreSQL', color: 'var(--green)' },
];

const nodes: DiagramNode[] = [
  {
    id: 'synapse', x: 36, y: 62, w: 222, h: 92, label: 'synapse-v3', sub: 'React + TanStack Query\nEntityList · UnifiedSidebar\nsynapse.ciwebgroup.com', color: 'var(--blue)',
    detail: (
      <>
        <p>The staff back-office SPA. Almost every list screen is the universal <code>&lt;EntityList&gt;</code>: it reads a <em>view template</em> (e.g. <code>LEADS_VIEW</code>), the URL (<code>?recipe=</code>, <code>?when[…]</code>) and the List vocabularies, then asks web-services for rows.</p>
        <p>The menu (<code>UnifiedSidebar</code>) is drawn from the navigation tree served by the API, with <code>navTree.generated.ts</code> as the offline/initial fallback.</p>
      </>
    ),
    files: ['apps/synapse-v3/src/components/entity-list/EntityList.tsx', 'apps/synapse-v3/src/components/entity-list/useEntityQuery.ts', 'apps/synapse-v3/src/components/dashboard/UnifiedSidebar.tsx', 'apps/synapse-v3/src/router.tsx'],
  },
  {
    id: 'others', x: 36, y: 186, w: 222, h: 70, label: 'hydra-os · onboard · portal', sub: 'other SPAs on the same API', color: 'var(--blue)',
    detail: <p>Other frontends (Hydra OS, the onboarding app, client portal) consume the same web-services API through <code>VITE_WEB_SERVICES</code>. They inherit the same generic route, the same CREAM-PQL grammar and the same RBAC.</p>,
    files: ['apps/hydra-os', 'apps/onboard', 'modules/portal (client portal module)'],
  },
  {
    id: 'url', x: 36, y: 290, w: 222, h: 96, label: 'The URL is the state', sub: '/backoffice/sales/leads\n?recipe=sales.vendors-partners\n&when[leadType][eq]=vendor', color: 'var(--blue)', variant: 'ghost',
    detail: <p>Doctrine §6: the filter state lives in the address bar, so every view is a shareable link. The same <code>when[field][op]=value</code> grammar travels from the browser URL to the API URL untouched — see the URL Anatomy tab.</p>,
    files: ['apps/synapse-v3/src/components/entity-list/useListUrlState.ts', 'libs/cream-pie/src/lib/when-query.ts'],
  },
  {
    id: 'admin', x: 36, y: 420, w: 222, h: 82, label: 'Lists admin UI', sub: '/backoffice/admin/lists\nListsView · ListItemsDialog', color: 'var(--blue)',
    detail: <p>Where a vocabulary <em>value</em> is added, relabelled, recoloured or retired — no code, no deploy. It talks to <code>/api/v1/synapse/lists</code> and <code>/list-items</code>. Machinery lists (recipes, navigation, PubSub, role grants) are guarded so only super admins can write them.</p>,
    files: ['apps/synapse-v3/src/components/backoffice/lists/ListsView.tsx', 'apps/synapse-v3/src/components/backoffice/lists/ListItemsDialog.tsx', 'apps/web-services/src/modules/synapse/synapse.routes.ts:214-241'],
  },
  {
    id: 'mcp', x: 36, y: 534, w: 222, h: 70, label: 'synapse-crm MCP', sub: 'read-only data gateway', color: 'var(--blue)', variant: 'ghost',
    detail: <p>The read-only MCP endpoint (<code>api.ciwebgroup.com/mcp</code>) that this guide used to pull real vocabulary rows and aggregate counts. It goes through the web-services MCP gateway, which applies the sensitive-field deny list.</p>,
    files: ['apps/web-services/src/modules/mcp/gateway/builtins/data/dataModels.ts'],
  },

  {
    id: 'generic', x: 318, y: 62, w: 392, h: 80, label: 'Generic smart route  /api/v1/:resource', sub: 'smartRoute → CASL → scope → orm → lists\n→ viewFilter → transform → controller', color: 'var(--purple-l)',
    detail: (
      <>
        <p>One catch-all route serves <em>every</em> model: <code>/api/v1/leads</code>, <code>/api/v1/organizations</code>, <code>/api/v1/list</code>… A chain of middlewares turns the query string into one Prisma call. There is no bespoke leads controller.</p>
        <p>See the <strong>Request Lifecycle</strong> tab for each middleware in order.</p>
      </>
    ),
    files: ['apps/web-services/src/routes/genericCrudChain.ts', 'apps/web-services/src/middleware/orm.ts', 'apps/web-services/src/modules/cream-pie/viewFilter.ts'],
  },
  {
    id: 'synapseapi', x: 318, y: 170, w: 186, h: 70, label: '/api/v1/synapse/*', sub: 'navigation · lists · recipes\nperspectives · saved-views', color: 'var(--purple-l)',
    detail: <p>Dedicated routers for platform machinery: the navigation tree, the Lists admin CRUD, recipes by resource, perspective counts, the user's saved views.</p>,
    files: ['apps/web-services/src/modules/synapse/synapse.routes.ts'],
  },
  {
    id: 'bespoke', x: 524, y: 170, w: 186, h: 70, label: 'Bespoke module routes', sub: 'backups · sites\ndns-history · storage', color: 'var(--pink)', variant: 'danger',
    detail: <p>Hand-written REST endpoints that do NOT go through the generic route or CREAM-PQL. The Infrastructure tab lives here — and the generic API is explicitly blocked for the backup models (<code>rejectBackupTrackingGenericApi</code>). See Modules → Infrastructure.</p>,
    files: ['apps/web-services/src/modules/backup-tracking/backupTrackingRoutes.ts', 'apps/web-services/src/middleware/backupTrackingGenericApiGuard.ts'],
  },
  {
    id: 'pubsub', x: 318, y: 256, w: 186, h: 62, label: 'PubSub + workers', sub: 'topics · subscribers · cron', color: 'var(--purple-l)',
    detail: <p>Doctrine §8: all automation goes through PubSub. A STAGE transition emits <code>&lt;domain&gt;:&lt;resource&gt;:&lt;from&gt;:stage-changed:&lt;to&gt;</code> after commit; subscribers react. Topics, subscribers and schedules are themselves ListItems (Schema B).</p>,
    files: ['apps/web-services/src/services/stageTransitionService.ts:97-149', 'libs/prisma/src/utils/pubsubItems.ts'],
  },
  {
    id: 'mcpgw', x: 524, y: 256, w: 186, h: 62, label: 'MCP gateway', sub: 'AI tools over the data', color: 'var(--purple-l)',
    detail: <p>Serves the MCP tools (including the read-only CRM data server). Uses <code>isUnqueryableField</code> from the sensitive-field registry so secrets cannot be filtered or read.</p>,
    files: ['apps/web-services/src/modules/mcp/gateway', 'apps/web-services/src/utils/sensitiveFields.ts'],
  },

  {
    id: 'creampie', x: 318, y: 398, w: 186, h: 92, label: 'libs/cream-pie', sub: 'parseWhenQuery\ncompileToPrismaWhere\ncompilePredicate\nnarrowWhere', color: 'var(--teal)',
    detail: <p>The ONE condition dialect (doctrine §3). Parses <code>when[…]</code>, normalises operators, compiles a <code>{'{logic, rules}'}</code> tree to a Prisma <code>where</code> (server) or to an in-memory predicate (client, availableWhen, PubSub conditions). An unresolvable field throws — a dropped rule would silently widen results.</p>,
    files: ['libs/cream-pie/src/lib/when-query.ts', 'libs/cream-pie/src/lib/prisma-where.ts', 'libs/cream-pie/src/lib/predicate.ts', 'libs/cream-pie/src/lib/types.ts:29-69'],
  },
  {
    id: 'prisma', x: 524, y: 398, w: 186, h: 92, label: 'libs/prisma', sub: 'schema/*.prisma · seeders\nstageMachine · edges\nList / ListItem utils', color: 'var(--teal)',
    detail: <p>The Prisma schema (part hand-written, part generated from manifests), every seeder, the STAGE state machine (<code>stageMachine.ts</code>, <code>stageTransition.ts</code>) and the helpers that read recipes, navigation and PubSub topics back out of ListItems.</p>,
    files: ['libs/prisma/src/schema/system/List.prisma', 'libs/prisma/src/utils/stageMachine.ts', 'libs/prisma/src/utils/creamPieRecipes.ts', 'libs/prisma/src/seeders/'],
  },
  {
    id: 'prbac', x: 318, y: 516, w: 186, h: 84, label: 'libs/prbac · libs/auth', sub: 'CASL abilities\nJWT org context', color: 'var(--teal)',
    detail: <p>Polymorphic RBAC: capability = action + subject + organization context + condition. Abilities are built per user; menu subjects (<code>sales.leads</code>) are RBAC subjects too, which is why nav ids are permanent and renamed via <code>formerIds</code>.</p>,
    files: ['libs/prbac', 'apps/web-services/src/middleware/caslGenericAuth.ts', 'apps/web-services/src/utils/tenantScope.ts', 'libs/prisma/src/utils/tenantRls.ts'],
  },
  {
    id: 'mtel', x: 524, y: 516, w: 186, h: 84, label: 'libs/mtel · libs/types', sub: 'merge-tag expressions\nshared TS types', color: 'var(--teal)',
    detail: <p>MTEL is the human-friendly expression syntax (<code>{'{{user.id}}'}</code>) that compiles to CREAM-PQL; recipe parameters like <code>salesRepUserId eq {'{{user.id}}'}</code> are bound from the session server-side.</p>,
    files: ['libs/mtel', 'apps/web-services/src/modules/cream-pie/viewFilter.ts:295-330'],
  },

  {
    id: 'manifest', x: 770, y: 60, w: 294, h: 70, label: 'modules/<slug>/module.json', sub: 'models · lists · recipes · navigation · seeds', color: 'var(--orange-l)',
    detail: <p>The source of truth for a module (crm, events, operations, web-presence, vocabulary…). Declares Prisma models and their list-bound fields, Lists and their items, recipes, menu nodes, actions and seed scripts. Validated against <code>modules/_schema/module.schema.json</code>.</p>,
    files: ['modules/crm/module.json', 'modules/_schema/module.schema.json'],
  },
  {
    id: 'buildmods', x: 770, y: 156, w: 294, h: 56, label: 'pnpm build:modules', sub: 'tools/build-modules/index.mjs', color: 'var(--orange-l)',
    detail: <p>Loads + validates every manifest, then emits generated artifacts. <code>pnpm check:modules</code> fails CI when someone edits a generated file by hand (drift). <code>scripts/ci/gen-synapse-nav-artifacts.mjs</code> then rebuilds the frontend nav fallback.</p>,
    files: ['tools/build-modules/index.mjs', 'tools/build-modules/lib/emit/', 'scripts/ci/gen-synapse-nav-artifacts.mjs'],
  },
  {
    id: 'generated', x: 770, y: 238, w: 294, h: 80, label: 'Generated artifacts', sub: 'modules/<slug>/generated/*-lists.ts\n*-navigation.ts · *-types.ts · prisma\nnavTree.generated.ts', color: 'var(--orange-l)',
    detail: <p>Never edit these by hand — edit the manifest and regenerate. The lists/recipes/navigation payloads are what the system seeders upsert into the database.</p>,
    files: ['modules/crm/generated/crm-lists.ts', 'modules/crm/generated/crm-navigation.ts', 'apps/synapse-v3/src/config/navTree.generated.ts'],
  },

  {
    id: 'listtables', x: 770, y: 398, w: 294, h: 96, label: 'List · ListItem · ListResource', sub: 'vocabularies + their values\n+ tags & edges (triples)\n+ recipes, nav, PubSub (Schema B)', color: 'var(--green)',
    detail: (
      <>
        <p>The vocabulary engine. <code>List</code> = a named vocabulary with a <code>ListType</code>. <code>ListItem</code> = its values (stable <code>key</code>, editable <code>label</code>, colour, position, isInitial/isTerminal, metadata). <code>ListResource</code> = an item applied to a record — or, for RELATIONSHIP lists, an edge <em>subject —predicate→ object</em>.</p>
        <p>Since "Schema B", platform machinery lives here too: recipes are items of list <code>creamPieRecipe</code>, menu nodes are items of <code>navigation</code>, saved views of <code>savedView</code>.</p>
      </>
    ),
    files: ['libs/prisma/src/schema/system/List.prisma', 'libs/prisma/src/utils/navigationItems.ts', 'libs/prisma/src/utils/creamPieRecipes.ts'],
  },
  {
    id: 'domain', x: 770, y: 522, w: 294, h: 78, label: 'Domain tables', sub: 'leads · organizations · contacts\nprojects · backups …', color: 'var(--green)',
    detail: <p>Ordinary tables — now with <strong>row-level security</strong> on every tenant-owned table: a constrained request runs as role <code>ci_tenant</code> and only sees rows in its scope. A list-bound column (e.g. <code>leads.status</code>) stores the ListItem <em>key</em> (<code>"contacted"</code>) — so the column and the List must agree. A <code>list_slot__&lt;col&gt;</code> trigger refuses a value that is not a key of the List (HTTP 400). Production still held a few lead statuses no List knows — see Questions.</p>,
    files: ['libs/prisma/src/schema/organization/Lead.prisma', 'libs/prisma/src/schema/migrations/20261231900000_tenant_row_level_security', 'docs/database/row-level-security.md'],
  },
];

const edges: DiagramEdge[] = [
  { from: 'synapse', to: 'generic', label: 'GET /api/v1/leads?…', color: 'var(--blue)' },
  { from: 'synapse', to: 'synapseapi', label: 'nav · lists', color: 'var(--blue)', curve: 20 },
  { from: 'others', to: 'generic', color: 'var(--blue)', curve: -30 },
  { from: 'admin', to: 'synapseapi', label: 'CRUD', color: 'var(--blue)' },
  { from: 'url', to: 'synapse', dashed: true, color: 'var(--blue)' },
  { from: 'mcp', to: 'mcpgw', dashed: true, color: 'var(--blue)', curve: -60 },
  { from: 'generic', to: 'creampie', label: 'compile when/recipe', color: 'var(--purple-l)', curve: -50 },
  { from: 'generic', to: 'prbac', color: 'var(--purple-l)', curve: -90 },
  { from: 'creampie', to: 'prisma', label: 'where', color: 'var(--teal)' },
  { from: 'prisma', to: 'listtables', color: 'var(--teal)' },
  { from: 'prisma', to: 'domain', color: 'var(--teal)' },
  { from: 'bespoke', to: 'prisma', color: 'var(--pink)', dashed: true, curve: 30 },
  { from: 'pubsub', to: 'prisma', color: 'var(--purple-l)', dashed: true, curve: 40 },
  { from: 'manifest', to: 'buildmods', color: 'var(--orange-l)' },
  { from: 'buildmods', to: 'generated', color: 'var(--orange-l)' },
  { from: 'generated', to: 'listtables', label: 'seeds upsert', color: 'var(--orange-l)', dashed: true },
  { from: 'generated', to: 'prisma', label: 'schema', color: 'var(--orange-l)', dashed: true },
  { from: 'generated', to: 'synapse', label: 'nav fallback · types', color: 'var(--orange-l)', dashed: true, curve: -120 },
];

export default function SystemMap() {
  return (
    <Section
      label="Big picture"
      title="System map — where every piece sits"
      intro={
        <>
          <p>
            Synapse is not just a React app. It is five cooperating layers: the browser SPAs, one
            Express API (<code>apps/web-services</code>), shared libraries, PostgreSQL, and a
            build-time pipeline that turns <code>module.json</code> manifests into schema, vocabulary
            rows and menus. Click any box.
          </p>
        </>
      }
    >
      <SvgDiagram width={1100} height={640} nodes={nodes} edges={edges} groups={groups} minWidth={860} />

      <div className="kit-grid-3">
        <div className="kit-card">
          <h4>🧱 Two clocks</h4>
          <p><strong>Build time:</strong> manifests → <code>build:modules</code> → generated code + seed payloads. <strong>Run time:</strong> the browser sends a URL, the API compiles it to one Prisma query. Most confusion comes from mixing the two up.</p>
        </div>
        <div className="kit-card">
          <h4>🧩 One API, every model</h4>
          <p>There is no <code>LeadsController</code>. <code>/api/v1/leads</code>, <code>/api/v1/organizations</code> and <code>/api/v1/list</code> all run through the same middleware chain. A new model gets list/filter/sort/paginate for free.</p>
        </div>
        <div className="kit-card">
          <h4>📚 Data beats code</h4>
          <p>A new status is a <em>row</em> (Lists admin). A new perspective is a <em>row</em> (recipe). A new menu entry is a <em>row</em> (navigation item, seeded from a manifest). Code is for genuinely new structure or behaviour.</p>
        </div>
      </div>

      <Callout kind="info" title="Version note">
        File paths and line numbers in this guide were read from <code>ci-connect</code> at{' '}
        <code>origin/stage</code> (<code>0ca89c748</code>, Oct 2026) and re-checked against{' '}
        <code>403b0800f4</code> a week later. Since then stage added tenant row-level security, capped page size at
        1000, moved the generic chain to <code>routes/genericCrudChain.ts</code> and deleted four of the architecture
        docs (marked in the Docs tab); the Infrastructure, Leads and campaign-resolver findings still hold. Lines drift; search by the symbol name if a
        number is off.
      </Callout>
    </Section>
  );
}
