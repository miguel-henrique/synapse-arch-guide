import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Files, Pill, Section } from '../kit/Kit';

// The Synapse ticket board ("Get started"), end to end. Code facts are read
// from origin/stage (Nov 4 2026); in-flight facts from the working branches
// that have not reached a PR yet. Production numbers are counts only, read
// through the read-only synapse-crm MCP on Nov 4 2026 (active tickets, i.e.
// not archived).

// ── anatomy diagram ─────────────────────────────────────────────────────────
const groups: DiagramGroup[] = [
  { id: 'def', x: 16, y: 16, w: 254, h: 520, label: '1 · Definition (repo)', color: 'var(--orange-l)' },
  { id: 'db', x: 286, y: 16, w: 262, h: 520, label: '2 · Rows (PostgreSQL)', color: 'var(--green)' },
  { id: 'api', x: 564, y: 16, w: 236, h: 520, label: '3 · API (web-services)', color: 'var(--purple-l)' },
  { id: 'ui', x: 816, y: 16, w: 268, h: 520, label: '4 · Screen (synapse-v3)', color: 'var(--blue)' },
];

const nodes: DiagramNode[] = [
  { id: 'core', x: 32, y: 56, w: 222, h: 96, label: 'modules/core/module.json', sub: 'model Todo (resource "todos")\ncolumns bound to Lists:\ntypeSlug · statusSlug · prioritySlug\nqueueSlug · assigneeUserId',
    detail: <><p>The core manifest adopts the <code>Todo</code> model and says which columns hold the key of a List item: <code>typeSlug → todoType</code>, <code>statusSlug → todoStatus</code>, <code>prioritySlug → todoPriority</code>, <code>queueSlug → helpdeskDepartment</code>. It also declares the dates the grid and the chart engine can use (<code>dueAt</code>, <code>startedAt</code>, <code>completedAt</code>).</p><p><code>todoStatus</code>, <code>todoPriority</code> and <code>helpdeskDepartment</code> are <em>mirrors</em>: the manifest names them so recipes can resolve, but another seeder still owns their rows.</p></>,
    color: 'var(--orange-l)', files: ['modules/core/module.json (Todo model)', 'libs/prisma/src/schema/core/Todo.prisma'] },
  { id: 'ops', x: 32, y: 172, w: 222, h: 112, label: 'modules/operations/module.json', sub: 'list helpdeskTicketStage (STAGE)\nrecipe operations.department.synapse\n5 chart recipes (parent = the board)\nnav node operations.synapse',
    detail: <><p>The operations manifest owns the ticket lifecycle (<code>helpdeskTicketStage</code>), the Synapse perspective (<code>operations.department.synapse</code>: <code>lists.todoType eq ticket</code> AND <code>queueSlug eq synapse</code>, with its nine columns), the five seeded charts that hang off it, and the menu node.</p></>,
    color: 'var(--orange-l)', files: ['modules/operations/module.json (helpdeskTicketStage, recipes, navigation)'] },
  { id: 'view', x: 32, y: 304, w: 222, h: 100, label: 'resourceViews/todos.ts', sub: 'TICKET_QUEUE_VIEWS\nkanban pivots on helpdeskTicketStage\nStatus · Priority dropdowns\nAssignee picker',
    detail: <p>The presentation template for every department queue. The board has six columns, one per ticket stage, and a drop is checked against the stage transitions. It is frontend code, not a manifest row.</p>,
    color: 'var(--orange-l)', files: ['apps/synapse-v3/src/components/entity-list/resourceViews/todos.ts'] },
  { id: 'seed', x: 32, y: 424, w: 222, h: 80, label: 'pnpm seed:modules', sub: 'upserts lists, recipes, nav\nNOT run by the deploy',
    detail: <p>The step that turns the manifests above into rows. Nothing in the deploy runs it, so a manifest change is invisible in an environment until someone runs it there. See the production callout below.</p>,
    color: 'var(--pink)', variant: 'danger', files: ['libs/prisma/src/seeders/modules/_runner.ts', 'libs/prisma/src/seeders/modules/_moduleSeeder.ts', 'docs/devops/post-deploy-web-services-stage.md'] },

  { id: 'lists', x: 302, y: 56, w: 230, h: 96, label: 'List rows', sub: 'helpdeskTicketStage (STAGE, 6 items)\ntodoStatus · todoPriority\nhelpdeskDepartment (16 queues)\ntodoType',
    detail: <p>What production holds today. <code>helpdeskTicketStage</code> has six items; <code>helpdeskDepartment</code> has sixteen, of which <code>synapse</code> ("Synapse (getstarted)") is the one this board filters on.</p>,
    color: 'var(--green)' },
  { id: 'recipes', x: 302, y: 172, w: 230, h: 84, label: 'Recipe items', sub: 'operations.department.synapse\n(+ the five charts once seeded)',
    detail: <p>Items of the <code>creamPieRecipe</code> list. On production only the board recipe exists; the five chart recipes are missing until the seed runs there.</p>,
    color: 'var(--green)' },
  { id: 'navrows', x: 302, y: 276, w: 230, h: 70, label: 'Navigation item', sub: 'operations.synapse (CreamPie)\nparent: operations · position 160',
    detail: <p>The menu node. It has no route of its own: it points at the recipe, and the screen is reached at <code>/backoffice/operations/synapse</code>.</p>,
    color: 'var(--green)' },
  { id: 'todos', x: 302, y: 366, w: 230, h: 88, label: 'todos table', sub: 'a ticket = typeSlug "ticket"\nqueueSlug "synapse"\nsubtask = parent_todo_id child',
    detail: <p>One table for every unit of work. A ticket is a row whose <code>type_slug</code> is <code>ticket</code>; a subtask is a row of type <code>helpdesk_task</code> whose <code>parent_todo_id</code> points at the ticket.</p>,
    color: 'var(--green)' },
  { id: 'adminui', x: 302, y: 474, w: 230, h: 46, label: 'Lists admin UI', sub: '/backoffice/admin/lists',
    detail: <p>Edits List rows with no deploy. Right for tags and other admin-owned values; for a manifest-owned list (the stages) the manifest is the source and the next seed wins.</p>,
    color: 'var(--blue)' },

  { id: 'route', x: 580, y: 56, w: 204, h: 70, label: 'GET /api/v1/todos', sub: 'generic smart route\n(no tickets controller)',
    detail: <p>The board reads tickets through the same catch-all route as every model.</p>, files: ['apps/web-services/src/routes/genericCrudChain.ts'], color: 'var(--purple-l)' },
  { id: 'vf', x: 580, y: 146, w: 204, h: 80, label: 'viewFilterMiddleware', sub: 'resolve ?recipe=\nAND when[] → compile',
    detail: <p>Looks the recipe up and ANDs its conditions with the URL filters. A recipe narrows; it never widens what you may see.</p>, files: ['apps/web-services/src/modules/cream-pie/viewFilter.ts'], color: 'var(--purple-l)' },
  { id: 'stage', x: 580, y: 246, w: 204, h: 84, label: 'POST /todos/:id/stage', sub: 'the only way a ticket changes\nstage: checks transitions,\nstamps completedAt, audits',
    detail: <p>The generic PATCH refuses lifecycle columns and points here. Moving a ticket to Resolved stamps <code>completedAt</code> (from the item's <code>stamp</code> metadata), writes the audit row and emits the stage-changed event. Reopening clears it.</p>, files: ['apps/web-services/src/modules/lifecycle/stage.routes.ts', 'apps/web-services/src/modules/lifecycle/stage.service.ts'], color: 'var(--purple-l)' },
  { id: 'notes', x: 580, y: 350, w: 204, h: 70, label: '/api/v1/tickets/:id/notes', sub: 'comments · staff only',
    detail: <p>A ticket's comments are the notes of its Todo: Message rows on the <code>note</code> channel. Staff only; the author comes from the session; only the author edits or deletes.</p>, files: ['apps/web-services/src/modules/record-notes/recordNotes.routes.ts', 'apps/web-services/src/modules/record-notes/recordNotes.service.ts'], color: 'var(--purple-l)' },
  { id: 'agg', x: 580, y: 440, w: 204, h: 80, label: 'listAggregate', sub: 'group · bucket · sum\nmeasure dateField + cumulative',
    detail: <p>The chart engine. It buckets a date, groups by a field, and (since #1368) can chart a second date and a running total.</p>, files: ['apps/web-services/src/modules/cream-pie/listAggregate.service.ts'], color: 'var(--purple-l)' },

  { id: 'sidebar', x: 832, y: 56, w: 236, h: 70, label: 'Sidebar › Operations › Synapse', sub: 'WorkspaceScreen → Browse',
    detail: <p><code>router.tsx</code> sends <code>/backoffice/&lt;workspace&gt;/&lt;node&gt;</code> to <code>WorkspaceScreen</code>, which renders <code>Browse</code> for the node.</p>, files: ['apps/synapse-v3/src/pages/WorkspaceScreen.tsx', 'apps/synapse-v3/src/pages/Browse.tsx'], color: 'var(--blue)' },
  { id: 'el', x: 832, y: 146, w: 236, h: 92, label: '<EntityList resource="todos">', sub: 'grid or board (6 stage columns)\ncolumn filters · people picker\ndrag a card = stage move',
    detail: <p>The universal list surface, with the Synapse template applied. A staff column (Assignee) opens a searchable people picker.</p>, files: ['apps/synapse-v3/src/components/entity-list/EntityList.tsx', 'apps/synapse-v3/src/components/entity-list/useStaffFilterItems.ts'], color: 'var(--blue)' },
  { id: 'charts', x: 832, y: 258, w: 236, h: 84, label: 'Charts button', sub: '/backoffice/operations/synapse/charts\nchart library over the board',
    detail: <p>A perspective node over a resource that has charts gets a <code>/charts</code> library under its own URL, narrowed to its recipe. Every saved chart whose parent is the board draws live.</p>, files: ['apps/synapse-v3/src/components/chart-composer/chartScope.ts', 'apps/synapse-v3/src/pages/ResourceChartLibrary.tsx'], color: 'var(--blue)' },
  { id: 'detail', x: 832, y: 362, w: 236, h: 100, label: 'HelpdeskTicketPage', sub: 'HelpdeskTicketDetail\nsubtasks · comments · attachments\nrich description · assignee',
    detail: <p>Clicking a row opens <code>/backoffice/operations/tickets/:id</code>. The page holds the sections that were built one at a time (see the timeline).</p>, files: ['apps/synapse-v3/src/pages/HelpdeskTicketPage.tsx', 'apps/synapse-v3/src/components/helpdesk/HelpdeskTicketDetail.tsx', 'apps/synapse-v3/src/components/helpdesk/ticketRecordPath.ts'], color: 'var(--blue)' },
];

const edges: DiagramEdge[] = [
  { from: 'core', to: 'seed', color: 'var(--orange-l)', curve: -30 },
  { from: 'ops', to: 'seed', color: 'var(--orange-l)' },
  { from: 'seed', to: 'lists', label: 'upsert', color: 'var(--orange-l)', dashed: true },
  { from: 'seed', to: 'recipes', color: 'var(--orange-l)', dashed: true },
  { from: 'seed', to: 'navrows', color: 'var(--orange-l)', dashed: true },
  { from: 'adminui', to: 'lists', label: 'edit rows', color: 'var(--blue)' },
  { from: 'navrows', to: 'sidebar', color: 'var(--green)', curve: -40 },
  { from: 'sidebar', to: 'el', color: 'var(--blue)' },
  { from: 'view', to: 'el', label: 'template', color: 'var(--orange-l)', dashed: true, curve: 70 },
  { from: 'el', to: 'route', label: 'GET', color: 'var(--blue)' },
  { from: 'el', to: 'stage', label: 'drag', color: 'var(--blue)', dashed: true },
  { from: 'route', to: 'vf', color: 'var(--purple-l)' },
  { from: 'vf', to: 'recipes', label: 'lookup', color: 'var(--purple-l)' },
  { from: 'vf', to: 'todos', label: 'findMany', color: 'var(--purple-l)' },
  { from: 'stage', to: 'lists', color: 'var(--purple-l)', dashed: true, curve: 40 },
  { from: 'charts', to: 'agg', color: 'var(--blue)' },
  { from: 'detail', to: 'notes', color: 'var(--blue)' },
];

// ── real production vocabulary (read-only MCP, counts only, Nov 4 2026) ─────
const STAGES = [
  { key: 'open', label: 'Open', color: 'sky', group: 'open', initial: true, count: 16, to: 'in_progress, waiting_on_client, escalated, resolved' },
  { key: 'in_progress', label: 'In Progress', color: 'indigo', group: 'open', count: 4, to: 'waiting_on_client, pending_review, escalated, resolved, open' },
  { key: 'waiting_on_client', label: 'Waiting on Client', color: 'amber', group: 'held', count: 2, to: 'in_progress, resolved, escalated' },
  { key: 'pending_review', label: 'Pending Review', color: 'violet', group: 'open', count: 4, to: 'in_progress, resolved, escalated' },
  { key: 'escalated', label: 'Escalated', color: 'red', group: 'open', count: 0, to: 'in_progress, pending_review, resolved' },
  { key: 'resolved', label: 'Resolved', color: 'green', group: 'closed', terminal: true, count: 27, to: 'open' },
];
const TW: Record<string, string> = { sky: '#38bdf8', indigo: '#818cf8', red: '#f87171', violet: '#a78bfa', amber: '#fbbf24', green: '#4ade80' };

const TIMELINE: { when: string; pr: string; title: string; what: React.ReactNode; files: string }[] = [
  { when: 'Oct 7', pr: '#1071', title: 'Create and move tickets from the Operations department pages', what: <>The starting point: the department queues (including Synapse) exist, and a ticket can be created and moved from them.</>, files: 'apps/synapse-v3/src/components/helpdesk/' },
  { when: 'Oct 26', pr: '#1250', title: 'Operations ticket routing and todo typeSlug', what: <>A row clicked on a department page opens the ticket page, not the generic todo record. The list now always asks for <code>typeSlug</code> so a task is never mistaken for a ticket.</>, files: 'apps/synapse-v3/src/components/helpdesk/ticketRecordPath.ts' },
  { when: 'Oct 28', pr: '#1259', title: 'Ticket attachments and rich description', what: <>Attach files to a ticket (images and PDFs preview) and write the description in a rich editor. The description is stored as markdown on the ticket.</>, files: 'apps/synapse-v3/src/components/helpdesk/TicketAttachmentsField.tsx' },
  { when: 'Oct 28', pr: '#1308', title: 'Subtasks and inline title editing', what: <>A Subtasks card on the ticket page: add, complete or reopen, rename, assign, set a due date. Subtasks are <code>helpdesk_task</code> todos under the ticket through <code>parentTodoId</code>, so they stay out of the queues. Click the title to rename the ticket.</>, files: 'apps/synapse-v3/src/components/helpdesk/TicketSubtasksSection.tsx' },
  { when: 'Oct 29', pr: '#1313', title: 'Board columns, assignee names and filters', what: <>The Synapse list grew from one Title column to nine (status, priority, queue, assignee, about, created, due, completed), shows assignee names, and gained Status, Priority and Assignee filters. The columns come from each recipe's <code>presentation</code>; the dropdowns from <code>todos.ts</code>.</>, files: 'modules/operations/module.json · resourceViews/todos.ts' },
  { when: 'Nov 2', pr: '#1349', title: 'Staff-only ticket comments', what: <>A Comments section under Subtasks: newest first, Ctrl+Enter sends, only the author edits or deletes. No migration: comments are notes of the ticket's Todo.</>, files: 'apps/synapse-v3/src/components/helpdesk/TicketCommentsSection.tsx · apps/web-services/src/modules/record-notes/' },
  { when: 'Nov 2', pr: '#1367', title: 'Drag to Resolved goes through the stage transition', what: <>Dragging a card used to fail with a 400, because the server refuses to PATCH a ticket's status. The board now pivots on the six ticket stages (not the long todoStatus list) and a drop calls the stage endpoint, so <code>completedAt</code> and the audit row are written. Velocity charts need that stamp.</>, files: 'resourceViews/todos.ts (TICKET_QUEUE_VIEWS) · modules/lifecycle/stage.routes.ts' },
  { when: 'Nov 3', pr: '#1368', title: 'Chartable Todo dates, running totals, charts as module recipes', what: <>Todo declares <code>dueAt</code>, <code>startedAt</code> and <code>completedAt</code> as chartable. A measure in <code>listAggregate</code> can name its own <code>dateField</code> and ask for a <code>cumulative</code> running total. A saved chart is now a recipe whose presentation is a chart and whose <code>parent</code> is the board, so a manifest can ship it. Five charts were added.</>, files: 'listAggregate.service.ts · modules/_schema/module.schema.json · _moduleSeeder.ts' },
  { when: 'Nov 3', pr: '#1369', title: 'Charts dashboard on the board', what: <>A Charts button on the board opens a library that draws every saved chart live (velocity, created vs done, burn-up, open by status, workload by assignee). The chart composer can compare two dates and turn a series into a running total. A bug where the composer's filter was silently ignored by the aggregate endpoint is fixed.</>, files: 'chart-composer/chartScope.ts · pages/ResourceChartLibrary.tsx' },
  { when: 'Nov 3', pr: '#1387', title: 'People picker in a staff column header filter', what: <>The Assignee column (and Sales rep and similar staff columns on other lists) opens a searchable picker of internal staff, with "Is empty" and "Has a value", instead of a text search on the name.</>, files: 'entity-list/useStaffFilterItems.ts · services/userDirectory.ts (listStaffProfiles)' },
  { when: 'Nov 3', pr: '#1415', title: 'Promote to main', what: <>Carried the work above to the production branch. It shipped the code, not the seeded rows (see the callout near the end).</>, files: '—' },
];

export default function SynapseModule() {
  return (
    <>
      <Section
        label="Case study · built, still growing"
        title="Synapse (Get started), end to end"
        intro={
          <>
            <p>
              <strong>In plain English:</strong> Operations → Synapse is the team's ticket board. Each card is a
              ticket; the six columns are the ticket stages; you can open a ticket to add subtasks, comments and
              attachments, and press <em>Charts</em> to see how fast the team is closing work.
            </p>
            <p>
              Technically it is a <strong>CREAM-PIE perspective</strong> (a stored, named filter called a{' '}
              <em>recipe</em>) over the <code>todos</code> table: <code>operations.department.synapse</code> means
              "todos where type is ticket and queue is synapse". The screen at{' '}
              <code>/backoffice/operations/synapse</code> is the universal <code>EntityList</code> pointed at that
              recipe, not a dedicated board. Click through the four columns: definition → rows → API → screen.
            </p>
          </>
        }
      >
        <SvgDiagram width={1100} height={552} nodes={nodes} edges={edges} groups={groups} minWidth={900} />
      </Section>

      <Section
        label="Data model"
        title="A ticket is a Todo, not a ticket table"
        intro={
          <p>
            There is no <code>tickets</code> table. Every unit of work (task, ticket, reminder, subtask) is a row of{' '}
            <code>todos</code>, told apart by a <em>discriminator</em> column (doctrine §2: a discriminator beats a
            duplicate model). The columns below are what the board reads.
          </p>
        }
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Column</th><th>Holds</th><th>Why it matters here</th></tr></thead>
            <tbody>
              <tr><td><code>type_slug</code></td><td>key of a <code>todoType</code> item</td><td><code>ticket</code> makes it a ticket; <code>helpdesk_task</code> makes it a subtask</td></tr>
              <tr><td><code>queue_slug</code></td><td>key of a <code>helpdeskDepartment</code> item</td><td><code>synapse</code> puts it on this board</td></tr>
              <tr><td><code>status_slug</code></td><td>for a ticket, a <code>helpdeskTicketStage</code> key</td><td>the column on the board. Moved only through the stage endpoint, never by PATCH</td></tr>
              <tr><td><code>priority_slug</code></td><td>key of a <code>todoPriority</code> item</td><td>priority chip and filter</td></tr>
              <tr><td><code>assignee_user_id</code></td><td>a User id</td><td>the Assignee column and the workload chart</td></tr>
              <tr><td><code>parent_todo_id</code></td><td>another Todo id</td><td>makes a subtask a child of its ticket</td></tr>
              <tr><td><code>due_at</code> · <code>started_at</code> · <code>completed_at</code></td><td>timestamps</td><td><code>completed_at</code> is stamped by the move to Resolved and drives velocity and burn-up</td></tr>
            </tbody>
          </table>
        </div>
        <Files
          title="Where the model lives"
          items={[
            { path: 'libs/prisma/src/schema/core/Todo.prisma', note: 'the table; typeSlug, queueSlug, parentTodoId, dates' },
            { path: 'modules/core/module.json', note: 'Todo field declarations and the List bindings' },
            { path: 'apps/synapse-v3/src/pages/HelpdeskTicketPage.tsx', note: 'the ticket page (HelpdeskTicketDetail inside)' },
          ]}
        />
      </Section>

      <Section
        label="Vocabulary"
        title="The Lists behind Synapse — with production counts"
        intro={
          <p>
            Counts are of active (not archived) Synapse tickets in production on Nov 4 2026: <strong>53</strong>{' '}
            tickets. Counts only; no names or ticket text. The <strong>key</strong> is what the column stores; the{' '}
            <strong>label</strong> is what the board shows.
          </p>
        }
      >
        <h3>helpdeskTicketStage <Pill color="var(--orange-l)">STAGE</Pill> <Pill color="var(--text-dim)">SINGLE · system · column todos.status_slug</Pill></h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>pos</th><th>key (stored)</th><th>label (shown)</th><th>flags</th><th>stageGroup</th><th>can move to</th><th>tickets</th></tr></thead>
            <tbody>
              {STAGES.map((s, i) => (
                <tr key={s.key}>
                  <td>{(i + 1) * 10}</td>
                  <td><code>{s.key}</code></td>
                  <td><span className="lm-swatch" style={{ background: TW[s.color] }} /> {s.label}</td>
                  <td>
                    {s.initial && <Pill color="var(--green)">isInitial · default</Pill>}{' '}
                    {s.terminal && <Pill color="var(--pink)">isTerminal · stamps completedAt</Pill>}
                  </td>
                  <td>{s.group}</td>
                  <td><code>{s.to}</code></td>
                  <td>{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="info" title="Two status lists, one column">
          <code>status_slug</code> is bound to the long shared <code>todoStatus</code> list (30 items on production,
          for every todo type), but a ticket only ever holds one of the six <code>helpdeskTicketStage</code> keys. The
          board pivots on the stage list for that reason: pivoting on <code>todoStatus</code> offered columns no ticket
          may enter (#1367).
        </Callout>

        <h3>The other lists</h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>List</th><th>ListType</th><th>Bound to</th><th>Items on prod</th><th>Role on this board</th><th>Synapse tickets</th></tr></thead>
            <tbody>
              <tr><td><code>todoStatus</code></td><td><Pill color="var(--blue)">TAXONOMY</Pill> mirror</td><td><code>status_slug</code></td><td>30</td><td>shared vocabulary for all todos; the board does not pivot on it</td><td>—</td></tr>
              <tr><td><code>todoPriority</code></td><td><Pill color="var(--blue)">TAXONOMY</Pill> mirror</td><td><code>priority_slug</code></td><td>4 (low, medium, high, urgent)</td><td>priority column and dropdown</td><td>low 3 · medium 45 · high 4 · urgent 1</td></tr>
              <tr><td><code>helpdeskDepartment</code></td><td><Pill color="var(--blue)">TAXONOMY</Pill> mirror</td><td><code>queue_slug</code></td><td>16 queues</td><td>the queue: <code>synapse</code> is this board; each item's metadata can carry a default assignee</td><td>all 53</td></tr>
              <tr><td><code>todoType</code></td><td><Pill color="var(--blue)">TAXONOMY</Pill> mirror</td><td><code>type_slug</code></td><td>50</td><td><code>ticket</code> vs <code>helpdesk_task</code> (subtask)</td><td>all 53 are <code>ticket</code></td></tr>
              <tr><td><code>storyPoints</code> <Pill color="var(--yellow)">in flight</Pill></td><td><Pill color="var(--blue)">TAXONOMY</Pill> · SINGLE</td><td><code>story_points</code> (number)</td><td>not on prod yet (1, 2, 3, 5, 8, 13 on the working branch)</td><td>the sizing scale; each item's <code>metadata.points</code> is the number stored</td><td>column not deployed</td></tr>
            </tbody>
          </table>
        </div>

        <h3>Who holds the tickets, and what is on them</h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Measure</th><th>Production count</th></tr></thead>
            <tbody>
              <tr><td>Active tickets in the Synapse queue</td><td>53 (2 more are archived)</td></tr>
              <tr><td>By assignee (3 people and unassigned)</td><td>36 · 9 · 6 · 2 unassigned</td></tr>
              <tr><td>Tickets with at least one comment</td><td>0 (comments shipped to prod on Nov 3)</td></tr>
              <tr><td>Tickets with at least one subtask</td><td>0</td></tr>
              <tr><td>Tickets with story points</td><td>not measurable: the column does not exist on production yet</td></tr>
            </tbody>
          </table>
        </div>
        <Callout kind="real" title="What the numbers say">
          One person holds about two thirds of the active tickets, and more than half of all tickets are already
          resolved, which is exactly the history the velocity chart will draw. Comments and subtasks exist in the
          product but nobody has used them on this queue yet, so any chart or rule built on them starts from zero.
        </Callout>
      </Section>

      <Section
        label="Perspectives"
        title="The recipes over the board"
        intro={<p>Each is a stored CREAM-PQL condition. The five charts have <code>parent: operations.department.synapse</code>, so they read the board's filters at apply time; their own conditions restate the Synapse scope only because a recipe needs at least one rule.</p>}
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Slug</th><th>What it is</th><th>Shape</th></tr></thead>
            <tbody>
              <tr><td><code>operations.department.synapse</code></td><td>The board</td><td><code>lists.todoType eq ticket</code> AND <code>queueSlug eq synapse</code>; nine columns, newest first</td></tr>
              <tr><td><code>operations.synapse.chart.velocity</code></td><td>Tickets done per week</td><td>bar · count bucketed by <code>completedAt</code> (week)</td></tr>
              <tr><td><code>operations.synapse.chart.created-vs-done</code></td><td>Created vs done per week</td><td>line · weekly buckets of <code>createdAt</code>, plus a second series counted by <code>completedAt</code></td></tr>
              <tr><td><code>operations.synapse.chart.burn-up</code></td><td>Burn-up</td><td>line · the same two series as running totals (<code>cumulative</code>)</td></tr>
              <tr><td><code>operations.synapse.chart.open-by-status</code></td><td>Open by status</td><td>bar · count grouped by stage, resolved excluded</td></tr>
              <tr><td><code>operations.synapse.chart.workload-by-assignee</code></td><td>Open workload by assignee</td><td>bar · open tickets grouped by the assignee relation (labelled by name)</td></tr>
            </tbody>
          </table>
        </div>
        <Files
          items={[
            { path: 'modules/operations/module.json', note: 'helpdeskTicketStage, the recipes, the navigation node operations.synapse' },
            { path: 'apps/web-services/src/modules/cream-pie/listAggregate.service.ts', note: 'dateField and cumulative measures' },
            { path: 'libs/prisma/src/seeders/modules/_moduleSeeder.ts', note: 'seeds parentless recipes first, then charts with their parent' },
          ]}
        />
      </Section>

      <Section
        label="History"
        title="What we built so far, in order"
        intro={<p>By merge date. Each row says what changed for someone using the board.</p>}
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Merged</th><th>PR</th><th>Change</th><th>In practice</th><th>Look at</th></tr></thead>
            <tbody>
              {TIMELINE.map(t => (
                <tr key={t.pr}>
                  <td>{t.when}</td>
                  <td><code>{t.pr}</code></td>
                  <td>{t.title}</td>
                  <td>{t.what}</td>
                  <td><code>{t.files}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        label="In flight"
        title="Written on Nov 4, not merged yet"
        intro={
          <p>
            Three changes are finished on working branches. As of this writing they have <strong>no pull request
            number yet</strong> (only the mentions API branch is pushed), so the descriptions below come from the
            commit messages and the code on the branch, not from a PR body.
          </p>
        }
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Change</th><th>What it does</th><th>How it is built</th></tr></thead>
            <tbody>
              <tr>
                <td>Any staff member can be assigned a ticket</td>
                <td>The ticket page and the New ticket dialog listed only Helpdesk-role holders, so staff without that role could not be picked. Both now list all internal staff.</td>
                <td>The API never had the restriction; it lived in the two pickers, which filtered on <code>is_helpdesk_agent</code>. Helpdesk access and the agent performance reports still key on the role. Files: <code>HelpdeskTicketDetail.tsx</code>, <code>AdminNewTicketDialog.tsx</code>.</td>
              </tr>
              <tr>
                <td>@mentions in ticket comments</td>
                <td>Type <code>@</code> in a comment (or while editing one) to pick a staff member. The comment shows a name chip, and the person gets a push notification linking to the ticket. The author and non-staff are never notified; an edit notifies only people it newly names; a failed push never fails the comment.</td>
                <td>Reuses team chat's <code>@[Name](id)</code> token: the parser moved to <code>apps/web-services/src/modules/chat/mentions.ts</code>; ticket comments read it in <code>record-notes/noteMentions.ts</code> and notify through <code>createInAppNotifications</code>. On the screen, team chat's autocomplete became <code>useMentionAutocomplete</code> and its chips come from <code>MessageBody</code>.</td>
              </tr>
              <tr>
                <td>Story points</td>
                <td>Size a ticket on a 1, 2, 3, 5, 8, 13 scale from a Points picker beside Priority; see a Points column on the board; two new charts (points velocity per week, points burn-up per day).</td>
                <td>A nullable number column <code>Todo.storyPoints</code> (migration <code>20261231996000_todo_story_points</code>), the scale as List <code>storyPoints</code> declared in <code>modules/core/module.json</code> (each item's <code>metadata.points</code> is the stored number; no CHECK constraint or code list), and two chart recipes plus the column in <code>modules/operations/module.json</code>. The picker is <code>StoryPointsPicker.tsx</code>.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout kind="warn" title="Story points need the seed on production, twice over">
          The column arrives with a migration, but the scale (List <code>storyPoints</code>), the Points column and the
          points charts are rows. After this deploys, <code>seed:modules --only core,operations</code> has to run on
          production, or the Points picker has no options and the points charts do not appear.
        </Callout>
      </Section>

      <Section
        label="Next"
        title="What comes next"
        intro={<p>Sprints are designed and already built on a working branch, but not yet reviewed. The other three are small follow-ups that are not started.</p>}
      >
        <h3>Sprints</h3>
        <div className="kit-prose">
          <ul>
            <li>
              <strong>A sprint is a Project of type <code>sprint</code></strong>, with its start day, end day and goal in its data. No
              new model (doctrine §2).
            </li>
            <li>
              <strong>A ticket joins a sprint through a <code>sprintMember</code> edge</strong> (Todo → Project), the same mechanism as
              campaign membership. The board filters with <code>when[edges.sprintMember.Project][eq]=&lt;id&gt;</code> and no new evaluator
              (doctrine §3).
            </li>
            <li>
              <strong>One sprint at a time.</strong> Only the new <code>/api/v1/sprints</code> routes write these edges, and moving a ticket
              replaces its edge in one transaction. Staff only.
            </li>
            <li>
              <strong>Nightly rollover.</strong> A <code>sprint-rollover</code> cron moves an ended sprint's open tickets to the earliest sprint that
              starts after it, once per sprint. Done and archived tickets stay where they finished. Kill switch:{' '}
              <code>SPRINT_ROLLOVER_ENABLED</code>.
            </li>
            <li>
              <strong>Per-sprint charts for free.</strong> The Charts button carries the board's <code>when[...]</code> filters to the dashboard, so
              filtering the board to a sprint and opening Charts gives that sprint's burn-up. A <em>Sprints</em> button plans sprints; a Sprint
              filter, a "Move to sprint" bulk action and a Sprint picker on the ticket page place tickets. The picker's options come from the recipe{' '}
              <code>operations.sprints</code> (<code>lists.projectType eq sprint</code>).
            </li>
          </ul>
        </div>
        <Files
          title="Where the sprint work lives (working branch)"
          items={[
            { path: 'apps/web-services/src/modules/sprints/sprints.routes.ts', note: '/api/v1/sprints' },
            { path: 'apps/web-services/src/modules/sprints/sprints.service.ts', note: 'one sprint per ticket, in a transaction' },
            { path: 'apps/web-services/src/modules/cron/cronProducers.ts', note: "registerCronProducer('sprint-rollover')" },
            { path: 'libs/prisma/src/seeders/seed-CronJobs.ts', note: 'the sprint-rollover job row' },
            { path: 'apps/synapse-v3/src/components/sprints/', note: 'SprintsDialog, SprintPicker, useSprints' },
            { path: 'apps/synapse-v3/src/components/action-surface/adapters/MoveToSprintAction.tsx', note: 'bulk action' },
          ]}
        />

        <h3>Smaller follow-ups</h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Item</th><th>Plain English</th><th>Touches</th></tr></thead>
            <tbody>
              <tr><td>Ticket notifications</td><td>Tell people when a ticket is assigned to them or changes status. Two notification templates already exist (<code>helpdesk-ticket-assigned</code>, <code>helpdesk-status-change</code>) and need wiring through pubsub.</td><td>web-services pubsub, notification templates, helpdesk</td></tr>
              <tr><td>Mention chip actions</td><td>Clicking an @mention chip in a comment opens a small menu: the staff profile, or a direct message in the team's chat tool.</td><td>ticket comments, team chat <code>MessageBody</code> chip</td></tr>
              <tr><td>Composer shows @Name</td><td>After picking a person, the comment box shows the readable name instead of the raw <code>@[Name](id)</code> token, while the saved body keeps the token. Team chat uses the same composer, so both improve.</td><td><code>useMentionAutocomplete</code>, <code>TicketCommentsSection</code>, <code>TeamChatComposer</code></td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        label="Map"
        title="If you want to change X, go to Y"
        intro={<p>Most Synapse board changes are a Lists row or one entry in a manifest.</p>}
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>I want to…</th><th>Go to</th><th>Kind</th></tr></thead>
            <tbody>
              <tr><td>Add or rename a ticket stage</td><td>Lists admin → <code>helpdeskTicketStage</code>. For the permanent version, the item in <code>modules/operations/module.json</code> (the seed owns label, colour, position and transitions)</td><td><Pill color="var(--green)">Lists admin</Pill> <Pill color="var(--purple-l)">manifest</Pill></td></tr>
              <tr><td>Add a priority or a department/queue</td><td>Lists admin → <code>todoPriority</code> / <code>helpdeskDepartment</code> (their rows are owned by seeders, not this manifest)</td><td><Pill color="var(--green)">Lists admin</Pill></td></tr>
              <tr><td>Add a story-points value</td><td>Lists admin → <code>storyPoints</code> (once deployed and seeded): an item with <code>metadata.points</code></td><td><Pill color="var(--green)">Lists admin</Pill></td></tr>
              <tr><td>Add a chart</td><td>A recipe with <code>presentation.view: "chart"</code> and <code>parent: "operations.department.synapse"</code> in <code>modules/operations/module.json</code> → <code>pnpm build:modules</code> → <code>seed:modules --only operations</code> in each environment. Or build it in the Charts composer, which saves it as a recipe in that one environment</td><td><Pill color="var(--purple-l)">manifest + seed</Pill></td></tr>
              <tr><td>Change the board's columns or default sort</td><td>The <code>presentation</code> of <code>operations.department.synapse</code> in the manifest, then seed</td><td><Pill color="var(--purple-l)">manifest + seed</Pill></td></tr>
              <tr><td>Change the board layout (stage columns, dropdowns, the Assignee picker)</td><td><code>resourceViews/todos.ts</code> (TICKET_QUEUE_VIEWS)</td><td><Pill color="var(--blue)">frontend code</Pill></td></tr>
              <tr><td>Change who can be assigned a ticket</td><td><code>listStaffProfiles</code> in <code>apps/synapse-v3/src/services/userDirectory.ts</code> is the roster; the two pickers (<code>HelpdeskTicketDetail.tsx</code>, <code>AdminNewTicketDialog.tsx</code>) decide whom to show from it</td><td><Pill color="var(--blue)">frontend code</Pill></td></tr>
              <tr><td>Change who can comment or what a comment can hold</td><td><code>recordNotes.routes.ts</code> / <code>recordNotes.service.ts</code> (<code>NOTE_OWNERS.tickets</code>)</td><td><Pill color="var(--blue)">backend code</Pill></td></tr>
              <tr><td>Add a field to tickets</td><td>The Todo model in <code>modules/core/module.json</code> + <code>Todo.prisma</code> + a migration; if it is a vocabulary, a new List declared in the manifest. Then <code>pnpm build:modules</code> and the seed</td><td><Pill color="var(--pink)">manifest + migration</Pill></td></tr>
              <tr><td>A personal filtered view</td><td>The board → filter → Save view</td><td><Pill color="var(--green)">UI only</Pill></td></tr>
              <tr><td>Filter tickets by something related (sprint, campaign…)</td><td>A declared relation or an <code>edges.*</code> path, never a bespoke resolver</td><td><Pill color="var(--pink)">schema</Pill></td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        label="Gotcha"
        title="Why the board charts did not appear on production"
        intro={<p>Worth reading before shipping anything that adds a List, a recipe or a menu node.</p>}
      >
        <Callout kind="danger" title="Module recipes and Lists are rows, and no deploy step creates them">
          <p>
            Charts, recipes, List items and menu nodes live in <code>modules/*/module.json</code>, but the screen reads them from{' '}
            <strong>database rows</strong>. Those rows only exist after <code>pnpm seed:modules</code> has run against that database, and{' '}
            <strong>no step of the deploy runs it</strong>. The repo's own notes say the same
            (<code>docs/architecture/LIFECYCLES.md</code>, finding L7, and <code>docs/devops/post-deploy-web-services-stage.md</code>:
            a deploy applies migrations and swaps the container, nothing more).
          </p>
          <p>
            That is exactly what happened to the board charts. #1368 (five chart recipes) and #1369 (the Charts button) reached the production
            branch with the Nov 3 promote (#1415), so the button and the code are live. But production's <code>creamPieRecipe</code> list holds{' '}
            <code>operations.department.synapse</code> and none of the five <code>operations.synapse.chart.*</code> items (read-only check, Nov 4),
            so the library opens empty.
          </p>
          <p>
            <strong>Fix:</strong> run the scoped seed, <code>cd libs/prisma &amp;&amp; pnpm seed:modules --only operations</code>, against the
            production database (the scoped form leaves the Pub/Sub subscribers alone, unlike the full post-deploy script for staging). After story
            points deploy, run <code>--only core,operations</code>. The seed is idempotent: a second run reports every row unchanged. A
            lasting fix is a deploy step that runs it.
          </p>
        </Callout>
      </Section>
    </>
  );
}
