import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Files, Pill, Section } from '../kit/Kit';
import type { Page } from '../../types';

// The Operations workspace: how one manifest becomes a whole area of boards,
// and the four words that get confused (recipe, perspective, menu node, filter).
// Facts from ci-connect origin/stage (Nov 5 2026).

// ── manifest → rows → menu pipeline ─────────────────────────────────────────
const groups: DiagramGroup[] = [
  { id: 'def', x: 16, y: 16, w: 300, h: 470, label: '1 · modules/operations/module.json', color: 'var(--orange-l)' },
  { id: 'gen', x: 332, y: 16, w: 250, h: 470, label: '2 · generated + seed', color: 'var(--pink)' },
  { id: 'rows', x: 598, y: 16, w: 240, h: 470, label: '3 · rows (PostgreSQL)', color: 'var(--green)' },
  { id: 'screen', x: 854, y: 16, w: 230, h: 470, label: '4 · the Operations menu', color: 'var(--blue)' },
];

const nodes: DiagramNode[] = [
  { id: 'mlists', x: 32, y: 56, w: 268, h: 76, label: 'lists[]', sub: 'helpdeskTicketStage (STAGE)\nstoryPoints (TAXONOMY)', color: 'var(--orange-l)',
    detail: <p>The vocabularies this module owns. The ticket lifecycle is a STAGE list with transitions in item metadata; the sizing scale is a TAXONOMY. Shared spine lists (priority, trade…) are declared elsewhere and reused, never copied.</p>,
    files: ['modules/operations/module.json (lists)'] },
  { id: 'mrec', x: 32, y: 144, w: 268, h: 92, label: 'recipes[]', sub: 'operations.department.synapse (board)\noperations.department.helpdesk …\noperations.synapse.chart.* (charts)', color: 'var(--orange-l)',
    detail: <p>Seeded perspectives. Each department board is a recipe (<code>type ticket</code> AND <code>queue &lt;dept&gt;</code>). A chart is also a recipe — one whose presentation is a chart and whose <code>parent</code> is the board.</p>,
    files: ['modules/operations/module.json (recipes)'] },
  { id: 'mnav', x: 32, y: 248, w: 268, h: 100, label: 'navigation[]', sub: 'operations (Workspace)\noperations.synapse (CreamPie)\noperations.support (Item → todos)', color: 'var(--orange-l)',
    detail: <><p>Where the module appears. One Workspace node; each department is a <strong>CreamPie</strong> node pointing at its recipe; a few plain <strong>Item</strong> nodes carry a route and a <code>primaryResource</code>.</p><p>This distinction is the whole reason saved views show under some entries and not others — see below.</p></>,
    files: ['modules/operations/module.json (navigation)'] },
  { id: 'mmodels', x: 32, y: 360, w: 268, h: 64, label: 'models[]', sub: 'Todo & Project adopted from core', color: 'var(--orange-l)', variant: 'ghost',
    detail: <p>Operations mostly adopts the core <code>Todo</code> and <code>Project</code> models rather than declaring new ones. New structure is a last resort (doctrine §2).</p> },
  { id: 'mschema', x: 32, y: 436, w: 268, h: 40, label: 'validated by module.schema.json', sub: 'additionalProperties: false', color: 'var(--orange-l)', variant: 'ghost',
    detail: <p>An unknown key is a build error, not a silent no-op. Nineteen top-level properties are allowed; renaming any identifier (slug, List key, subjectId, recipe slug) is a data migration, never a refactor.</p>,
    files: ['modules/_schema/module.schema.json'] },

  { id: 'build', x: 348, y: 70, w: 218, h: 80, label: 'pnpm build:modules', sub: 'validate → emit generated/*\ncheck:modules fails on drift', color: 'var(--pink)',
    detail: <p>Turns the manifest into <code>modules/operations/generated/*-lists.ts</code>, <code>-navigation.ts</code>, <code>-types.ts</code> and (for non-adopted models) Prisma text. You edit the manifest; you never edit the generated file — <code>check:modules</code> fails the build if they drift.</p>,
    files: ['tools/build-modules/index.mjs', 'modules/operations/generated/'] },
  { id: 'seed', x: 348, y: 240, w: 218, h: 92, label: 'pnpm seed:modules', sub: 'upserts lists, recipes, nav rows\nNOT run by the deploy', color: 'var(--pink)', variant: 'danger',
    detail: <p>The step that writes the generated payloads into the database as rows. Idempotent (upsert by key). Crucially, <strong>no step of the deploy runs it</strong>, so a manifest change is invisible in an environment until someone runs <code>seed:modules</code> there. This is the production gotcha on the Synapse page.</p>,
    files: ['libs/prisma/src/seeders/modules/_moduleSeeder.ts', 'docs/devops/post-deploy-web-services-stage.md'] },

  { id: 'rlist', x: 614, y: 70, w: 208, h: 70, label: 'List / ListItem', sub: 'helpdeskTicketStage items\nstoryPoints items', color: 'var(--green)',
    detail: <p>The vocabulary rows. The Lists admin UI can add or relabel values with no deploy — but for a manifest-owned (system) list the manifest is the source and the next seed wins.</p> },
  { id: 'rrec', x: 614, y: 162, w: 208, h: 70, label: 'creamPieRecipe items', sub: 'one row per recipe', color: 'var(--green)',
    detail: <p>Recipes live as items of the <code>creamPieRecipe</code> List (platform + org tiers); a user's saved views live in the separate <code>savedView</code> List (user tier). Same shape, different tier.</p> },
  { id: 'rnav', x: 614, y: 254, w: 208, h: 70, label: 'navigation items', sub: 'one row per menu node', color: 'var(--green)',
    detail: <p>Menu nodes are rows too (Schema B). Each carries a <code>navigationType</code> (Workspace, Heading, Item, CreamPie, Relationship) that decides how the sidebar treats it.</p> },

  { id: 'side', x: 870, y: 70, w: 198, h: 90, label: 'UnifiedSidebar', sub: 'draws the workspace\nfrom the nav rows', color: 'var(--blue)',
    detail: <p>Reads the navigation tree and renders the Operations workspace: a Dashboard, the department boards, Projects, Support Tickets, Reporting and the settings headings.</p>,
    files: ['apps/synapse-v3/src/components/dashboard/UnifiedSidebar.tsx'] },
  { id: 'board', x: 870, y: 184, w: 198, h: 80, label: 'a department board', sub: '/backoffice/operations/synapse\nEntityList over todos', color: 'var(--blue)',
    detail: <p>A CreamPie node routes to the universal <code>EntityList</code> pointed at its recipe. The Synapse board is <code>operations.department.synapse</code> over <code>todos</code>.</p>,
    files: ['apps/synapse-v3/src/pages/Browse.tsx', 'apps/synapse-v3/src/components/entity-list/EntityList.tsx'] },
  { id: 'chips', x: 870, y: 290, w: 198, h: 80, label: 'chips + filters', sub: 'perspectives = chips\n?lists= / when[] = filters', color: 'var(--blue)',
    detail: <p>On the board itself, other perspectives over the same resource appear as a chip row, and refinements live in the URL. Menu nodes are places; chips are perspectives; filters are refinements.</p> },
];

const edges: DiagramEdge[] = [
  { from: 'mlists', to: 'build', color: 'var(--orange-l)' },
  { from: 'mrec', to: 'build', color: 'var(--orange-l)' },
  { from: 'mnav', to: 'build', color: 'var(--orange-l)' },
  { from: 'build', to: 'seed', color: 'var(--pink)' },
  { from: 'seed', to: 'rlist', label: 'upsert', color: 'var(--pink)', dashed: true },
  { from: 'seed', to: 'rrec', color: 'var(--pink)', dashed: true },
  { from: 'seed', to: 'rnav', color: 'var(--pink)', dashed: true },
  { from: 'rnav', to: 'side', color: 'var(--green)' },
  { from: 'side', to: 'board', color: 'var(--blue)' },
  { from: 'rrec', to: 'board', label: 'recipe', color: 'var(--green)', dashed: true, curve: 30 },
  { from: 'board', to: 'chips', color: 'var(--blue)' },
];

// ── the four words ──────────────────────────────────────────────────────────
const WORDS = [
  { term: 'Menu node', one: 'a place', is: 'A row in the navigation List. Has a position in the tree and a navigationType. An Item node has a route; a CreamPie node points at a recipe.', eg: 'operations.synapse, operations.support' },
  { term: 'Recipe', one: 'a saved point of view', is: 'A named CREAM-PQL condition (+ presentation), stored as a row. System/org tiers in creamPieRecipe; the user tier in savedView. Narrows, never widens.', eg: 'operations.department.synapse' },
  { term: 'Perspective', one: 'a recipe, shown as a chip', is: 'What a recipe looks like on screen: a chip in the EntityList toolbar, fed by usePerspectives (system + org + your saved views). Not a menu entry.', eg: 'the chip row over a board' },
  { term: 'Filter', one: 'a refinement', is: 'A live narrowing in the URL: ?lists=<tag> chips or when[field][op]=value. Shareable by link. Added on top of whatever recipe is active.', eg: 'when[statusSlug][eq]=open' },
];

export default function OperationsArea({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <>
      <Section
        label="One manifest, a whole area"
        title="How modules/operations/module.json becomes the Operations menu"
        intro={
          <p>
            Operations is not hand-built screens. It is one manifest that declares the ticket
            lifecycle, the department boards, the charts and the menu — compiled to generated code,
            then seeded into the database as rows the app reads. Click any box.
          </p>
        }
      >
        <SvgDiagram width={1100} height={500} nodes={nodes} edges={edges} groups={groups} minWidth={940} />
        <Callout kind="danger" title="The seed is not part of the deploy">
          A deploy applies migrations and swaps the container — it does not run{' '}
          <code>seed:modules</code>. So a new List item, recipe or chart is invisible in an
          environment until someone runs the seed there (<code>pnpm seed:modules --only operations</code>).
          This is exactly why the board charts were live in code but drew nothing on production. The
          full story is on the Synapse module page.{' '}
          <button className="kit-inline-link" onClick={() => setPage('modules')}>Modules → Synapse → the gotcha</button>.
        </Callout>
      </Section>

      <Section
        label="Vocabulary"
        title="Menu = places · chips = perspectives · filters = refinements"
        intro={
          <p>
            Four words get mixed up constantly. Doctrine §5 keeps them apart: navigation never
            enumerates saved queries or vocabulary values — a recipe is a perspective (a chip), not a
            menu entry.
          </p>
        }
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Word</th><th>In one line</th><th>Really is</th><th>Example</th></tr></thead>
            <tbody>
              {WORDS.map(w => (
                <tr key={w.term}>
                  <td><strong>{w.term}</strong></td>
                  <td>{w.one}</td>
                  <td>{w.is}</td>
                  <td><code>{w.eg}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        label="Node kinds"
        title="Every Operations department is a CreamPie node"
        intro={
          <p>
            The Operations workspace has one <code>Workspace</code> node, a <code>Dashboard</code>{' '}
            Item, nine department <code>CreamPie</code> nodes (each pointing at an{' '}
            <code>operations.department.*</code> recipe over <code>todos</code>), plus plain Item
            nodes like <code>Projects</code> and <code>Support Tickets</code>.
          </p>
        }
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Node</th><th>navigationType</th><th>Points at</th><th>Gets a saved-views accordion?</th></tr></thead>
            <tbody>
              <tr><td><code>operations.synapse</code> and the other departments</td><td><Pill color="var(--purple-l)">CreamPie</Pill></td><td>recipe <code>operations.department.synapse</code> (resource <code>todos</code>)</td><td><Pill color="var(--pink)">No</Pill> — it <em>is</em> one perspective</td></tr>
              <tr><td><code>operations.support</code> ("Support Tickets")</td><td><Pill color="var(--green)">Item</Pill> + <code>primaryResource: todos</code></td><td>a route, plus every recipe over <code>todos</code></td><td><Pill color="var(--green)">Yes</Pill></td></tr>
              <tr><td><code>operations.projects</code></td><td><Pill color="var(--green)">Item</Pill></td><td>a route</td><td>only if it declares a <code>primaryResource</code></td></tr>
            </tbody>
          </table>
        </div>
        <Callout kind="info" title="Why this matters for saved views">
          The sidebar only grows a perspectives/saved-views accordion under a node whose{' '}
          <code>navigationType === 'item'</code> and which has a <code>primaryResource</code>{' '}
          (<code>UnifiedSidebar.tsx</code>, <code>nodeToItem</code>). A CreamPie node is deliberately
          excluded — otherwise every department board would list the same accordion of all todo
          perspectives under it. That is the whole reason the Synapse board shows no saved views in
          the sidebar while Leads (an Item) does. The Synapse module page traces this line by line.
        </Callout>
        <Files
          items={[
            { path: 'modules/operations/module.json (navigation)', note: 'operations.synapse = CreamPie; operations.support = Item over todos' },
            { path: 'apps/synapse-v3/src/components/dashboard/UnifiedSidebar.tsx', note: 'nodeToItem: resource attached only for navigationType === item' },
          ]}
        />
      </Section>
    </>
  );
}
