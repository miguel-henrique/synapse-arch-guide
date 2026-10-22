import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Files, Section } from '../kit/Kit';

// "Schema B": platform machinery folded into List / ListItem / ListResource.

const groups: DiagramGroup[] = [
  { id: 'vocab', x: 20, y: 16, w: 330, h: 420, label: 'Business vocabularies', color: 'var(--blue)' },
  { id: 'core', x: 370, y: 16, w: 300, h: 420, label: 'The three tables', color: 'var(--green)' },
  { id: 'mach', x: 690, y: 16, w: 390, h: 420, label: 'Platform machinery (Schema B fold)', color: 'var(--orange-l)' },
];

const nodes: DiagramNode[] = [
  { id: 'stage', x: 40, y: 60, w: 290, h: 60, label: 'STAGE lists', sub: 'leadStatus · helpdeskTicketStage', color: 'var(--orange-l)',
    detail: <p>Governed lifecycles. Items carry <code>isInitial</code>, <code>isTerminal</code> and <code>metadata.transitions</code>; <code>stageMachine.ts</code> refuses moves the list does not declare.</p>,
    files: ['libs/prisma/src/utils/stageMachine.ts', 'libs/prisma/src/utils/stageTransition.ts'] },
  { id: 'tax', x: 40, y: 140, w: 290, h: 60, label: 'TAXONOMY lists', sub: 'leadType · leadOrigin · trade · leadTag', color: 'var(--blue)',
    detail: <p>Free classification. Either a column holds the item key (<code>leads.lead_type = "vendor"</code>) or ListResource rows attach items to a record (multi-select tags).</p> },
  { id: 'rel', x: 40, y: 220, w: 290, h: 60, label: 'RELATIONSHIP lists', sub: 'organizationRole · organizationRelationshipType', color: 'var(--green)',
    detail: <p>Edge labels. Each edge is one ListResource triple: subject —item→ object. Items carry inverse/symmetric metadata.</p> },
  { id: 'evt', x: 40, y: 300, w: 140, h: 60, label: 'EVENT', sub: 'eventInvocationMethod', color: 'var(--pink)',
    detail: <p>Labels an occurrence (user / cron / subscriber). <code>resources: []</code> on purpose.</p> },
  { id: 'tf', x: 190, y: 300, w: 140, h: 60, label: 'TRANSFORM', sub: '0 seeded', color: 'var(--yellow)', variant: 'ghost',
    detail: <p>Response-shaping rules. Mounted, unused. See the TRANSFORM tab.</p> },
  { id: 'list', x: 390, y: 60, w: 260, h: 70, label: 'List', sub: 'key · type · resources\nselectionType · system', color: 'var(--green)',
    detail: <p>One row per vocabulary. Platform tier (<code>organizationId NULL</code>) or org tier; key unique per tier.</p>, files: ['libs/prisma/src/schema/system/List.prisma'] },
  { id: 'item', x: 390, y: 170, w: 260, h: 80, label: 'ListItem', sub: 'key (stable) · label (editable)\ncolor · position · parentItem\nisInitial · isTerminal · metadata', color: 'var(--green)',
    detail: <p>One row per value. The <code>key</code> is API — code, recipes, URLs and data columns reference it. The <code>label</code> is display. <code>parentItem</code> gives trees (a recipe's bindings, a nav node's children).</p> },
  { id: 'lr', x: 390, y: 290, w: 260, h: 80, label: 'ListResource', sub: 'resource · resourceId · listItem\n(+ relatedResource · relatedId)\nstatus · visibility · data', color: 'var(--green)',
    detail: <p>Applies an item to a record (tag) or, with <code>related*</code> set, stores an edge triple. Partial unique indexes keep tags and edges consistent; DB triggers hold integrity the old junction tables held as FKs.</p> },
  { id: 'recipe', x: 710, y: 56, w: 170, h: 70, label: 'creamPieRecipe', sub: 'key = recipe slug\nplatform / org tier', color: 'var(--orange-l)',
    detail: <p>A recipe IS a ListItem of list <code>creamPieRecipe</code>; its conditions, availableWhen and presentation live in <code>metadata</code>. <code>toCreamPieRecipe()</code> turns the item back into the recipe shape.</p>, files: ['libs/prisma/src/utils/creamPieRecipes.ts', 'migration 20261113000300_cream_pie_fold'] },
  { id: 'saved', x: 890, y: 56, w: 170, h: 70, label: 'savedView', sub: 'key = <userId>/<slug>\nthe user tier', color: 'var(--orange-l)',
    detail: <p>Personal saved views — the user tier of recipes — in their own list so a shared-tier read can never pick someone's personal view up.</p> },
  { id: 'nav', x: 710, y: 146, w: 170, h: 70, label: 'navigation', sub: 'key = subjectId\nparentItem = parent node', color: 'var(--orange-l)',
    detail: <p>Every menu node is a ListItem of list <code>navigation</code>. The key is the permanent RBAC subject (<code>sales.leads</code>). Seeded from manifests' <code>navigation</code> blocks.</p>, files: ['libs/prisma/src/utils/navigationItems.ts', 'migration 20261113000400_navigation_fold'] },
  { id: 'binding', x: 890, y: 146, w: 170, h: 70, label: 'creamPieBinding', sub: 'child items of a recipe', color: 'var(--orange-l)',
    detail: <p>Bindings attach a recipe to a surface; they are child items (<code>parentItem</code>) of the recipe.</p> },
  { id: 'pubsub', x: 710, y: 236, w: 170, h: 70, label: 'pubsubTopic · Subscriber', sub: 'automation wiring', color: 'var(--orange-l)',
    detail: <p>PubSub topics and subscribers as items; their auth flags used to be Super-Admin-only, so the guard keeps them that way.</p>, files: ['libs/prisma/src/utils/pubsubItems.ts'] },
  { id: 'sched', x: 890, y: 236, w: 170, h: 70, label: 'schedule', sub: 'cron gates', color: 'var(--orange-l)',
    detail: <p>Cron schedules as list items.</p>, files: ['libs/prisma/src/utils/scheduleItems.ts'] },
  { id: 'grants', x: 710, y: 326, w: 350, h: 80, label: 'Role grants as edges', sub: 'User —userRole(granted)→ Role\nRole —rolePermission→ Permission · token grants', color: 'var(--pink)',
    detail: <p>Even RBAC grants became ListResource edges (<code>20261203000000_user_roles_fold_into_edges</code>). That is why <code>edgeWriteGuard.ts</code> exists: every staff tier may write <code>list-resource</code>, so without it a Sales Rep could grant themselves Super Admin. The security review proves the guard live.</p>,
    files: ['apps/web-services/src/middleware/edgeWriteGuard.ts', 'docs/security/schema-b-auth-review.md'] },
];

const edges: DiagramEdge[] = [
  { from: 'stage', to: 'list', color: 'var(--blue)' },
  { from: 'tax', to: 'list', color: 'var(--blue)' },
  { from: 'rel', to: 'lr', label: 'edges', color: 'var(--green)' },
  { from: 'list', to: 'item', label: '1 ─ ∗', color: 'var(--green)' },
  { from: 'item', to: 'lr', label: 'applied as', color: 'var(--green)' },
  { from: 'recipe', to: 'item', color: 'var(--orange-l)', curve: 30 },
  { from: 'nav', to: 'item', color: 'var(--orange-l)' },
  { from: 'pubsub', to: 'item', color: 'var(--orange-l)' },
  { from: 'grants', to: 'lr', color: 'var(--pink)' },
  { from: 'binding', to: 'recipe', label: 'parentItem', color: 'var(--orange-l)', curve: -40 },
];

export default function SchemaB() {
  return (
    <Section
      label="Schema B"
      title="Lists all the way down — recipes, menus and grants are ListItems too"
      intro={
        <>
          <p>
            The doctrine says "schema is data". The "Schema B" migrations took that literally: the
            tables that used to hold CREAM-PIE recipes, saved views, the navigation tree, PubSub
            topics, cron schedules and even role grants were <strong>folded into List / ListItem /
            ListResource</strong>. One mental model now explains the whole platform: a named list, its
            items, and items applied to things.
          </p>
        </>
      }
    >
      <SvgDiagram width={1100} height={450} nodes={nodes} edges={edges} groups={groups} minWidth={860} initial="recipe" />

      <div className="kit-grid-2">
        <div className="kit-card">
          <h4>🧠 What this buys</h4>
          <p>One storage model, one admin, one cache, one set of tenancy rules, one seeding path. A recipe and a menu node are "just items", so the same tools (tiers, parent items, metadata schemas, triggers) work for both.</p>
        </div>
        <div className="kit-card">
          <h4>🔒 What it costs</h4>
          <p>Lists that used to be protected by their own API permission are now reachable through the generic List API. <code>managedListWrites.ts</code> therefore refuses writes to machinery lists (recipes, navigation, PubSub, schedules, role/token predicates…) unless the caller is a super admin. Every new machinery list must be added to that set.</p>
        </div>
      </div>

      <Callout kind="real" title="Production check (read-only MCP, Oct 22 2026)">
        The production view returned 95 Lists (75 TAXONOMY · 11 STAGE · 9 RELATIONSHIP) and did not
        return <code>creamPieRecipe</code>, <code>navigation</code> or <code>savedView</code>. Either
        production is behind <code>stage</code> on the Schema B fold, or the MCP view hides those
        lists. Worth confirming before relying on this picture for prod debugging.
      </Callout>

      <Files
        items={[
          { path: 'apps/web-services/src/middleware/managedListWrites.ts', note: 'MANAGED_LIST_KEYS and the super-admin rule' },
          { path: 'libs/prisma/src/utils/creamPieRecipes.ts', note: 'recipes / saved views / bindings as items' },
          { path: 'libs/prisma/src/utils/navigationItems.ts', note: 'nav nodes as items' },
          { path: 'docs/security/schema-b-*.md', note: 'adversarial reviews of each fold' },
        ]}
      />
    </Section>
  );
}
