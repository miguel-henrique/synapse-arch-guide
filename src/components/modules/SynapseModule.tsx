import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Files, Pill, Section } from '../kit/Kit';

// The Synapse ticket board ("Get started"), end to end. Code facts are read
// from origin/stage (Nov 5 2026, merge a4349a9315); work that has not reached
// stage lives on the working branches feat/sprints-api, feat/sprints-board,
// feat/ticket-notifications and fix/comms-email-delivery-subscriber and is
// labelled "Not merged yet". Production numbers are counts only, read through
// the read-only synapse-crm MCP (active, i.e. not archived, tickets).

// ── anatomy diagram ─────────────────────────────────────────────────────────
const groups: DiagramGroup[] = [
  { id: 'def', x: 16, y: 16, w: 254, h: 520, label: '1 · Definition (repo)', color: 'var(--orange-l)' },
  { id: 'db', x: 286, y: 16, w: 262, h: 520, label: '2 · Rows (PostgreSQL)', color: 'var(--green)' },
  { id: 'api', x: 564, y: 16, w: 236, h: 520, label: '3 · API (web-services)', color: 'var(--purple-l)' },
  { id: 'ui', x: 816, y: 16, w: 268, h: 520, label: '4 · Screen (synapse-v3)', color: 'var(--blue)' },
];

const nodes: DiagramNode[] = [
  { id: 'core', x: 32, y: 56, w: 222, h: 96, label: 'modules/core/module.json', sub: 'model Todo (resource "todos")\ncolumns bound to Lists:\ntypeSlug · statusSlug · prioritySlug\nqueueSlug · assigneeUserId · storyPoints',
    detail: <><p>The core manifest adopts the <code>Todo</code> model and says which columns hold the key of a List item: <code>typeSlug → todoType</code>, <code>statusSlug → todoStatus</code>, <code>prioritySlug → todoPriority</code>, <code>queueSlug → helpdeskDepartment</code>, and the sizing number <code>storyPoints</code> (the <code>storyPoints</code> List's <code>metadata.points</code>). It also declares the dates the grid and the chart engine can use (<code>dueAt</code>, <code>startedAt</code>, <code>completedAt</code>).</p><p><code>todoStatus</code>, <code>todoPriority</code> and <code>helpdeskDepartment</code> are <em>mirrors</em>: the manifest names them so recipes can resolve, but another seeder still owns their rows.</p></>,
    color: 'var(--orange-l)', files: ['modules/core/module.json:237 (Todo.storyPoints)', 'modules/core/module.json:956 (storyPoints list)', 'libs/prisma/src/schema/core/Todo.prisma'] },
  { id: 'ops', x: 32, y: 172, w: 222, h: 112, label: 'modules/operations/module.json', sub: 'list helpdeskTicketStage (STAGE)\nrecipe operations.department.synapse\n7 chart recipes (parent = the board)\nnav node operations.synapse',
    detail: <><p>The operations manifest owns the ticket lifecycle (<code>helpdeskTicketStage</code>), the Synapse perspective (<code>operations.department.synapse</code>: <code>lists.todoType eq ticket</code> AND <code>queueSlug eq synapse</code>, with its columns), the seven seeded charts that hang off it, and the menu node.</p></>,
    color: 'var(--orange-l)', files: ['modules/operations/module.json (helpdeskTicketStage, recipes, navigation)', 'modules/operations/module.json:965-1290 (7 chart recipes)'] },
  { id: 'view', x: 32, y: 304, w: 222, h: 100, label: 'resourceViews/todos.ts', sub: 'TODOS_VIEW → TICKET_QUEUE_VIEWS\nkanban pivots on helpdeskTicketStage\nStatus · Priority dropdowns\nAssignee picker',
    detail: <p>The presentation template for every department queue. <code>TICKET_QUEUE_VIEWS</code> spreads one shared <code>TODOS_VIEW</code>, so a change there reaches all nine queues. The board has six columns, one per ticket stage, and a drop is checked against the stage transitions. It is frontend code, not a manifest row.</p>,
    color: 'var(--orange-l)', files: ['apps/synapse-v3/src/components/entity-list/resourceViews/todos.ts'] },
  { id: 'seed', x: 32, y: 424, w: 222, h: 80, label: 'pnpm seed:modules', sub: 'upserts lists, recipes, nav\nNOT run by the deploy',
    detail: <p>The step that turns the manifests above into rows. Nothing in the deploy runs it, so a manifest change is invisible in an environment until someone runs it there. See the production callout below.</p>,
    color: 'var(--pink)', variant: 'danger', files: ['libs/prisma/src/seeders/modules/_runner.ts', 'libs/prisma/src/seeders/modules/_moduleSeeder.ts', 'docs/devops/post-deploy-web-services-stage.md'] },

  { id: 'lists', x: 302, y: 56, w: 230, h: 96, label: 'List rows', sub: 'helpdeskTicketStage (STAGE, 6 items)\ntodoStatus · todoPriority · storyPoints\nhelpdeskDepartment (16 queues)\ntodoType',
    detail: <p>What production holds today. <code>helpdeskTicketStage</code> has six items; <code>helpdeskDepartment</code> has sixteen, of which <code>synapse</code> ("Synapse (getstarted)") is the one this board filters on; <code>storyPoints</code> is the Fibonacci sizing scale.</p>,
    color: 'var(--green)' },
  { id: 'recipes', x: 302, y: 172, w: 230, h: 84, label: 'Recipe items', sub: 'operations.department.synapse\n+ the seven chart recipes',
    detail: <p>Items of the <code>creamPieRecipe</code> list. The board recipe plus seven <code>operations.synapse.chart.*</code> recipes — but only where the seed has run (see the callout at the end).</p>,
    color: 'var(--green)' },
  { id: 'navrows', x: 302, y: 276, w: 230, h: 70, label: 'Navigation item', sub: 'operations.synapse (CreamPie)\nparent: operations · position 160',
    detail: <p>The menu node. It is a <strong>CreamPie</strong> node: it points at the recipe and the screen is reached at <code>/backoffice/operations/synapse</code>. Since Nov 9 the sidebar lists, under it, only the views saved on this board (their <code>baseRecipe</code> is its recipe). See the Saved views section.</p>,
    color: 'var(--green)' },
  { id: 'todos', x: 302, y: 366, w: 230, h: 88, label: 'todos table', sub: 'a ticket = typeSlug "ticket"\nqueueSlug "synapse"\nsubtask = parent_todo_id child',
    detail: <p>One table for every unit of work. A ticket is a row whose <code>type_slug</code> is <code>ticket</code>; a subtask is a row of type <code>helpdesk_task</code> whose <code>parent_todo_id</code> points at the ticket. (See How it fits → Todos &amp; Projects.)</p>,
    color: 'var(--green)' },
  { id: 'adminui', x: 302, y: 474, w: 230, h: 46, label: 'Lists admin UI', sub: '/backoffice/admin/lists',
    detail: <p>Edits List rows with no deploy. Right for tags and other admin-owned values; for a manifest-owned list (the stages, the points scale) the manifest is the source and the next seed wins.</p>,
    color: 'var(--blue)' },

  { id: 'route', x: 580, y: 56, w: 204, h: 70, label: 'GET /api/v1/todos', sub: 'generic smart route\n(no tickets controller)',
    detail: <p>The board reads tickets through the same catch-all route as every model.</p>, files: ['apps/web-services/src/routes/genericCrudChain.ts'], color: 'var(--purple-l)' },
  { id: 'vf', x: 580, y: 146, w: 204, h: 80, label: 'viewFilterMiddleware', sub: 'resolve ?recipe=\nAND when[] → compile',
    detail: <p>Looks the recipe up and ANDs its conditions with the URL filters. A recipe narrows; it never widens what you may see.</p>, files: ['apps/web-services/src/modules/cream-pie/viewFilter.ts'], color: 'var(--purple-l)' },
  { id: 'stage', x: 580, y: 246, w: 204, h: 84, label: 'POST /todos/:id/stage', sub: 'the only way a ticket changes\nstage: checks transitions,\nstamps completedAt, audits',
    detail: <p>The generic PATCH refuses lifecycle columns and points here. Moving a ticket to Resolved stamps <code>completedAt</code> (from the item's <code>stamp</code> metadata), writes the audit row and emits the stage-changed event. Reopening clears it.</p>, files: ['apps/web-services/src/modules/lifecycle/stage.routes.ts', 'apps/web-services/src/modules/lifecycle/stage.service.ts'], color: 'var(--purple-l)' },
  { id: 'notes', x: 580, y: 350, w: 204, h: 70, label: '/api/v1/tickets/:id/notes', sub: 'comments · staff only · @mentions',
    detail: <p>A ticket's comments are the notes of its Todo: Message rows on the <code>note</code> channel. Staff only; the author comes from the session; only the author edits or deletes. An <code>@mention</code> notifies the named staff.</p>, files: ['apps/web-services/src/modules/record-notes/recordNotes.service.ts', 'apps/web-services/src/modules/record-notes/noteMentions.ts'], color: 'var(--purple-l)' },
  { id: 'agg', x: 580, y: 440, w: 204, h: 80, label: 'listAggregate', sub: 'group · bucket · sum\nmeasure dateField + cumulative',
    detail: <p>The chart engine. It buckets a date, groups by a field, and can chart a second date (a measure's own <code>dateField</code>) and a running total (<code>cumulative</code>).</p>, files: ['apps/web-services/src/modules/cream-pie/listAggregate.service.ts'], color: 'var(--purple-l)' },

  { id: 'sidebar', x: 832, y: 56, w: 236, h: 70, label: 'Sidebar › Operations › Synapse', sub: 'WorkspaceScreen → Browse',
    detail: <p><code>router.tsx</code> sends <code>/backoffice/&lt;workspace&gt;/&lt;node&gt;</code> to <code>WorkspaceScreen</code>, which renders <code>Browse</code> for the node.</p>, files: ['apps/synapse-v3/src/pages/Browse.tsx'], color: 'var(--blue)' },
  { id: 'el', x: 832, y: 146, w: 236, h: 92, label: '<EntityList resource="todos">', sub: 'grid or board (6 stage columns)\ncolumn filters · people picker\ndrag a card = stage move',
    detail: <p>The universal list surface, with the Synapse template applied. A staff column (Assignee) opens a searchable people picker.</p>, files: ['apps/synapse-v3/src/components/entity-list/EntityList.tsx', 'apps/synapse-v3/src/components/entity-list/useStaffFilterItems.ts'], color: 'var(--blue)' },
  { id: 'charts', x: 832, y: 258, w: 236, h: 84, label: 'Charts button', sub: '/backoffice/operations/synapse/charts\nchart library over the board',
    detail: <p>A perspective node over a resource that has charts gets a <code>/charts</code> library. The Charts button carries only the board's <code>when[...]</code> filters, so every saved chart whose parent is the board draws over the same slice.</p>, files: ['apps/synapse-v3/src/components/chart-composer/chartPaths.ts', 'apps/synapse-v3/src/pages/ResourceChartLibrary.tsx'], color: 'var(--blue)' },
  { id: 'detail', x: 832, y: 362, w: 236, h: 100, label: 'HelpdeskTicketPage', sub: 'HelpdeskTicketDetail\nsubtasks · comments · attachments\npoints · assignee',
    detail: <p>Clicking a row opens <code>/backoffice/operations/tickets/:id</code>. The page holds the sections that were built one at a time (see the timeline), including the Points picker.</p>, files: ['apps/synapse-v3/src/pages/HelpdeskTicketPage.tsx', 'apps/synapse-v3/src/components/helpdesk/HelpdeskTicketDetail.tsx', 'apps/synapse-v3/src/components/helpdesk/StoryPointsPicker.tsx'], color: 'var(--blue)' },
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

// ── the seven chart recipes on stage ────────────────────────────────────────
const CHARTS = [
  { slug: 'operations.synapse.chart.velocity', what: 'Tickets done per week', shape: 'bar · count bucketed by completedAt (week)' },
  { slug: 'operations.synapse.chart.velocity-points', what: 'Story points done per week', shape: 'bar · sum of storyPoints bucketed by completedAt (week)' },
  { slug: 'operations.synapse.chart.created-vs-done', what: 'Created vs done per week', shape: 'line · weekly count of createdAt, plus a second series counted by completedAt' },
  { slug: 'operations.synapse.chart.burn-up', what: 'Burn-up (count)', shape: 'line · the same two series as running totals (cumulative)' },
  { slug: 'operations.synapse.chart.burn-up-points', what: 'Burn-up in points: scope vs done', shape: 'line · two cumulative sum-of-storyPoints series; one keyed to createdAt (scope), one to completedAt (done) via the measure dateField' },
  { slug: 'operations.synapse.chart.open-by-status', what: 'Open by status', shape: 'bar · count grouped by stage, resolved excluded' },
  { slug: 'operations.synapse.chart.workload-by-assignee', what: 'Open workload by assignee', shape: 'bar · open tickets grouped by the assignee relation (labelled by name)' },
];

const TIMELINE: { when: string; pr: string; title: string; what: React.ReactNode; files: string }[] = [
  { when: 'Oct 7', pr: '#1071', title: 'Create and move tickets from the Operations department pages', what: <>The starting point: the department queues (including Synapse) exist, and a ticket can be created and moved from them.</>, files: 'apps/synapse-v3/src/components/helpdesk/' },
  { when: 'Oct 26', pr: '#1250', title: 'Operations ticket routing and todo typeSlug', what: <>A row clicked on a department page opens the ticket page, not the generic todo record. The list now always asks for <code>typeSlug</code> so a task is never mistaken for a ticket.</>, files: 'apps/synapse-v3/src/components/helpdesk/ticketRecordPath.ts' },
  { when: 'Oct 28', pr: '#1259', title: 'Ticket attachments and rich description', what: <>Attach files to a ticket (images and PDFs preview) and write the description in a rich editor. The description is stored as markdown on the ticket.</>, files: 'apps/synapse-v3/src/components/helpdesk/TicketAttachmentsField.tsx' },
  { when: 'Oct 28', pr: '#1308', title: 'Subtasks and inline title editing', what: <>A Subtasks card on the ticket page: add, complete or reopen, rename, assign, set a due date. Subtasks are <code>helpdesk_task</code> todos under the ticket through <code>parentTodoId</code>, so they stay out of the queues. Click the title to rename the ticket.</>, files: 'apps/synapse-v3/src/components/helpdesk/TicketSubtasksSection.tsx' },
  { when: 'Oct 29', pr: '#1313', title: 'Board columns, assignee names and filters', what: <>The Synapse list grew from one Title column to nine (status, priority, queue, assignee, about, created, due, completed), shows assignee names, and gained Status, Priority and Assignee filters. The columns come from each recipe's <code>presentation</code>; the dropdowns from <code>todos.ts</code>.</>, files: 'modules/operations/module.json · resourceViews/todos.ts' },
  { when: 'Nov 2', pr: '#1349', title: 'Staff-only ticket comments', what: <>A Comments section under Subtasks: newest first, Ctrl+Enter sends, only the author edits or deletes. No migration: comments are notes of the ticket's Todo.</>, files: 'apps/synapse-v3/src/components/helpdesk/TicketCommentsSection.tsx · apps/web-services/src/modules/record-notes/' },
  { when: 'Nov 2', pr: '#1367', title: 'Drag to Resolved goes through the stage transition', what: <>Dragging a card used to fail with a 400, because the server refuses to PATCH a ticket's status. The board now pivots on the six ticket stages (not the long todoStatus list) and a drop calls the stage endpoint, so <code>completedAt</code> and the audit row are written. Velocity charts need that stamp.</>, files: 'resourceViews/todos.ts (TICKET_QUEUE_VIEWS) · modules/lifecycle/stage.routes.ts' },
  { when: 'Nov 3', pr: '#1368', title: 'Chartable Todo dates, running totals, charts as module recipes', what: <>Todo declares <code>dueAt</code>, <code>startedAt</code> and <code>completedAt</code> as chartable. A measure in <code>listAggregate</code> can name its own <code>dateField</code> and ask for a <code>cumulative</code> running total. A saved chart is now a recipe whose presentation is a chart and whose <code>parent</code> is the board, so a manifest can ship it.</>, files: 'listAggregate.service.ts · modules/_schema/module.schema.json · _moduleSeeder.ts' },
  { when: 'Nov 3', pr: '#1369', title: 'Charts dashboard on the board', what: <>A Charts button on the board opens a library that draws every saved chart live (velocity, created vs done, burn-up, open by status, workload by assignee). The chart composer can compare two dates and turn a series into a running total. A bug where the composer's filter was silently ignored by the aggregate endpoint is fixed.</>, files: 'chart-composer/chartPaths.ts · pages/ResourceChartLibrary.tsx' },
  { when: 'Nov 3', pr: '#1387', title: 'People picker in a staff column header filter', what: <>The Assignee column (and Sales rep and similar staff columns on other lists) opens a searchable picker of internal staff, with "Is empty" and "Has a value", instead of a text search on the name.</>, files: 'entity-list/useStaffFilterItems.ts · services/userDirectory.ts (listStaffProfiles)' },
  { when: 'Nov 4', pr: '—', title: 'Any internal staff member can be assigned a ticket', what: <>The ticket page and the New ticket dialog listed only Helpdesk-role holders. Both now list all internal staff. The API never had the restriction; it lived in the two pickers. Helpdesk access and the agent reports still key on the role.</>, files: 'fix/ticket-assignee-all-staff (2afa9613b6) · HelpdeskTicketDetail.tsx · AdminNewTicketDialog.tsx' },
  { when: 'Nov 4', pr: '#1438', title: 'Story points, and @mentions in comments', what: <>Two things landed together. <strong>Story points:</strong> a nullable <code>Todo.storyPoints</code> column, the <code>storyPoints</code> Fibonacci List, a Points picker on the ticket page, a Points column on the board and two points charts. <strong>@mentions:</strong> type <code>@</code> in a comment to notify a staff member (in-app push; the author and non-staff are never notified).</>, files: 'feat/ticket-staff-mentions-points (#1438) · StoryPointsPicker.tsx · record-notes/noteMentions.ts' },
  { when: 'Nov 4', pr: '#1424', title: 'Promote to the production branch', what: <>Carried the work above to the production branch. It shipped the code, not the seeded rows — see the callout near the end.</>, files: '—' },
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
              ticket; the six columns are the ticket stages; you can open a ticket to add subtasks, comments,
              attachments and a story-point size, @mention a teammate, and press <em>Charts</em> to see how fast the
              team is closing work.
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
            duplicate model). The columns below are what the board reads; the full Todos-vs-Projects story is on the
            How it fits page.
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
              <tr><td><code>story_points</code></td><td>a number (a <code>storyPoints</code> item's <code>metadata.points</code>)</td><td>the Points picker and column; the two points charts sum it</td></tr>
              <tr><td><code>parent_todo_id</code></td><td>another Todo id</td><td>makes a subtask a child of its ticket</td></tr>
              <tr><td><code>due_at</code> · <code>started_at</code> · <code>completed_at</code></td><td>timestamps</td><td><code>completed_at</code> is stamped by the move to Resolved and drives velocity and burn-up</td></tr>
            </tbody>
          </table>
        </div>
        <Files
          title="Where the model lives"
          items={[
            { path: 'libs/prisma/src/schema/core/Todo.prisma', note: 'the table; typeSlug, queueSlug, parentTodoId, storyPoints, dates' },
            { path: 'modules/core/module.json:237, :956', note: 'Todo.storyPoints field and the storyPoints List' },
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
              <tr><td><code>storyPoints</code></td><td><Pill color="var(--blue)">TAXONOMY</Pill> · SINGLE</td><td><code>story_points</code> (number)</td><td>the Fibonacci scale (1, 2, 3, 5, 8, 13)</td><td>the sizing scale; each item's <code>metadata.points</code> is the number stored</td><td>column shipped Nov 4; no sized tickets yet</td></tr>
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
              <tr><td>Tickets with story points</td><td>0 (the column and picker shipped Nov 4; the scale needs the seed — see the callout)</td></tr>
            </tbody>
          </table>
        </div>
        <Callout kind="real" title="What the numbers say">
          One person holds about two thirds of the active tickets, and more than half of all tickets are already
          resolved, which is exactly the history the velocity chart will draw. Comments, subtasks and points exist in
          the product but nobody has used them on this queue yet, so any chart or rule built on them starts from zero.
        </Callout>
      </Section>

      <Section
        label="Story points"
        title="Sizing a ticket, and the two points charts"
        intro={
          <p>
            A ticket can be sized on a Fibonacci scale, so the team can chart throughput in points, not just ticket
            count. This is all rows and one nullable column — no CHECK constraint, no code list.
          </p>
        }
      >
        <div className="kit-prose">
          <ul>
            <li>
              <strong>The scale is a List.</strong> <code>storyPoints</code> (declared in{' '}
              <code>modules/core/module.json:956</code>) holds the values 1, 2, 3, 5, 8, 13. Each item's{' '}
              <code>metadata.points</code> is the number that gets stored — add or change a value in the Lists admin and
              the picker follows.
            </li>
            <li>
              <strong>The column.</strong> <code>Todo.storyPoints</code> is a nullable number (declared at{' '}
              <code>modules/core/module.json:237</code>); null means "not sized yet".
            </li>
            <li>
              <strong>The picker and the column.</strong> <code>StoryPointsPicker.tsx</code> sits beside Priority on the
              ticket page; a Points column appears on the board (both frontend code, merged with #1438 /{' '}
              <code>feat/ticket-staff-mentions-points</code>).
            </li>
            <li>
              <strong>Two points charts.</strong> <code>velocity-points</code> sums <code>storyPoints</code> per week by{' '}
              <code>completedAt</code>; <code>burn-up-points</code> draws two cumulative sums of <code>storyPoints</code>
              — scope (keyed to <code>createdAt</code>) against done (keyed to <code>completedAt</code> through the
              measure's <code>dateField</code>), so the gap is the points left.
            </li>
          </ul>
        </div>
        <Callout kind="warn" title="Story points need the seed on production, twice over">
          The column arrives with a migration, but the scale (List <code>storyPoints</code>) and the points charts are
          rows. After a deploy, <code>seed:modules --only core,operations</code> has to run on that database, or the
          Points picker has no options and the points charts do not appear. This is the same seed gap as the other
          charts — see the callout at the end.
        </Callout>
        <Files
          items={[
            { path: 'modules/core/module.json:237, :956', note: 'Todo.storyPoints field and the storyPoints List' },
            { path: 'apps/synapse-v3/src/components/helpdesk/StoryPointsPicker.tsx', note: 'the picker; storyPoints.ts resolves label ↔ points' },
            { path: 'modules/operations/module.json:1013 (velocity-points), :1062 (burn-up-points)', note: 'the two points chart recipes' },
          ]}
        />
      </Section>

      <Section
        label="Charts"
        title="A chart is a recipe, parented to the board"
        intro={
          <p>
            Nothing on the board is a bespoke chart component. A chart is a <strong>recipe</strong> whose{' '}
            <code>presentation.view</code> is <code>chart</code> and whose <code>parent</code> is the board recipe, so a
            manifest can ship it and the Charts library draws it live.
          </p>
        }
      >
        <h3>The engine: listAggregate</h3>
        <div className="kit-prose">
          <p>
            Every chart reads <code>listAggregate.service.ts</code>. It takes a dimension to{' '}
            <strong>bucket</strong> (a date by day/week/month, or a field to group), one or more{' '}
            <strong>measures</strong> (a <code>count</code>, or <code>sum</code> of a number like{' '}
            <code>storyPoints</code>), and two options added for these charts: a measure may name its own{' '}
            <code>dateField</code> (so one series counts by <code>createdAt</code> and another by{' '}
            <code>completedAt</code>), and a measure may be <code>cumulative</code> (a running total, which is what makes
            a burn-up).
          </p>
        </div>

        <h3>The seven recipes over the board</h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Slug</th><th>What it is</th><th>Shape</th></tr></thead>
            <tbody>
              <tr><td><code>operations.department.synapse</code></td><td>The board</td><td><code>lists.todoType eq ticket</code> AND <code>queueSlug eq synapse</code>; newest first</td></tr>
              {CHARTS.map(c => (
                <tr key={c.slug}><td><code>{c.slug.replace('operations.synapse.chart.', 'chart.')}</code></td><td>{c.what}</td><td>{c.shape}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Why the Charts button gives per-sprint charts for free</h3>
        <div className="kit-prose">
          <p>
            The Charts button links to the board's <code>/charts</code> library, but it carries <em>only</em> the
            board's <code>when[...]</code> filters in the URL (<code>boardWhenSearch</code> in{' '}
            <code>chartPaths.ts</code> keeps keys starting with <code>when[</code> and drops view/sort/page). The
            library then merges those into every saved chart's aggregate request (<code>mergeWhen</code> in{' '}
            <code>SavedChartPreview.tsx</code>: a field-wise union where the chart's own operators win). So if you
            filter the board to one sprint and open Charts, every chart — including the burn-up — is drawn over that
            sprint's slice, with no per-sprint chart definitions.
          </p>
        </div>
        <Files
          items={[
            { path: 'modules/operations/module.json:965-1290', note: 'the board recipe and the seven chart recipes' },
            { path: 'apps/web-services/src/modules/cream-pie/listAggregate.service.ts', note: 'bucket · group · sum · dateField · cumulative' },
            { path: 'apps/synapse-v3/src/components/chart-composer/chartPaths.ts', note: 'boardWhenSearch — carries only when[] to the library' },
            { path: 'apps/synapse-v3/src/components/chart-composer/SavedChartPreview.tsx', note: 'mergeWhen — narrows each chart by the board filters' },
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
                <tr key={t.title}>
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
        label="Saved views"
        title="Saved views on the Synapse board (changed Nov 9–11)"
        intro={
          <p>
            A <strong>saved view</strong> is a personal filtered view you save from a list or board. It is the <em>user tier</em>
            {' '}of a recipe: an item of the <code>savedView</code> List (the system and org tiers live in{' '}
            <code>creamPieRecipe</code>). You create one with <code>POST /synapse/v1/saved-views</code>, handled by
            cream-pie's <code>savedView.controller.ts</code>; it is ownership-gated, not admin-gated. Try it:
            Tutorials → <em>Make your own CREAM-PIE recipe</em>.
          </p>
        }
      >
        <Callout kind="real" title="Updated: views saved on the board now show under it">
          Until Nov 9 the sidebar attached no saved views to the Synapse board, because it is a <strong>CreamPie</strong>{' '}
          node and the perspectives accordion only grew under <strong>Item</strong> nodes with a{' '}
          <code>primaryResource</code>. Three stage commits changed that:
          <ul>
            <li><code>e16a3cf441</code> (cream-pie): a view saved on a recipe page stores that page's recipe as{' '}
              <code>metadata.baseRecipe</code>. Applying the view ANDs the base recipe (resolved from the shared tiers only)
              under the view's own conditions, so the view keeps the board's rows. A base that no longer resolves answers 404
              instead of silently widening.</li>
            <li><code>a4200f0d12</code> (synapse): saving on a board sends the board's recipe, and a recipe page in the sidebar
              lists <strong>only the views saved on it</strong>. Resource pages (Leads, Support Tickets) list their recipes and
              views as before, minus views that belong to a recipe page.</li>
            <li><code>90d3460611</code> (#1531): each saved view gets <em>Move up / Move down</em>. The order is yours, kept in your
              preferences per menu entry.</li>
          </ul>
        </Callout>
        <div className="kit-prose">
          <p>
            Why "only the views saved on it": every Operations department is a CreamPie over <code>todos</code>. Listing every todo
            perspective under each one drew every department's boards under every department. Keying a view to its{' '}
            <code>baseRecipe</code> gives each board exactly its own views.
          </p>
          <p>
            The dialog also gained <strong>Who can see this view</strong>: <em>Just me</em> or <em>Everyone at my company</em>{' '}
            (<code>shareScope: "private" | "organization"</code>). A shared view is still a view, not a permission: each
            reader's abilities and tenant scope still apply, and a recipe administrator of that organization may edit or
            remove it.
          </p>
        </div>
        <Files
          items={[
            { path: 'apps/synapse-v3/src/components/dashboard/navPerspectives.ts', note: 'perspectivesForNode: what a node lists beneath it' },
            { path: 'apps/synapse-v3/src/components/dashboard/UnifiedSidebar.tsx:160-176', note: 'recipe pages get an accordion keyed by baseRecipe' },
            { path: 'apps/web-services/src/modules/cream-pie/savedViewService.ts', note: 'baseRecipe check on save; shareScope' },
            { path: 'apps/web-services/src/modules/cream-pie/viewFilter.ts', note: 'applying a view ANDs its base recipe' },
          ]}
        />
      </Section>

      <Section
        label="Not merged yet"
        title="Written on the working branches, not on stage"
        intro={
          <p>
            Three bodies of work are finished on branches but have <strong>not reached <code>origin/stage</code></strong>{' '}
            and carry no merged PR number. The descriptions below come from the code on each branch; the branch name is
            cited so you can read it with <code>git show &lt;branch&gt;:&lt;path&gt;</code>.
          </p>
        }
      >
        <h3>Sprints <Pill color="var(--yellow)">feat/sprints-api · feat/sprints-board</Pill></h3>
        <div className="kit-prose">
          <ul>
            <li>
              <strong>A sprint is a Project of type <code>sprint</code></strong>, with its start day, end day and goal in{' '}
              <code>projects.data</code> (<code>{'{ startDate, endDate, goal, rolledOverAt }'}</code>). No new model
              (doctrine §2). The window and goal are validated by a JSON-schema declaration, not a new table.
            </li>
            <li>
              <strong>A ticket joins a sprint through a <code>sprintMember</code> edge</strong> — a RELATIONSHIP{' '}
              <code>ListResource</code> row, Todo → Project, exactly the mechanism campaign membership uses. The board
              filters with <code>when[edges.sprintMember.Project][eq]=&lt;id&gt;</code> and needs no new evaluator
              (doctrine §3).
            </li>
            <li>
              <strong>One sprint at a time, written only by the sprints module.</strong> The edge item's metadata marks
              it <code>writes: api</code>, so the generic ListResource API refuses to write it; moving a ticket deletes
              its old edge and creates the new one in one transaction (<code>sprints.service.ts:143-158</code>). Staff
              only.
            </li>
            <li>
              <strong>A read-only typed kind.</strong> <code>/api/v1/sprints</code> is a typed kind: it reads sprints
              like any resource (a SQL projection of <code>projects</code>), but it is read-only because it has{' '}
              <em>no write adapter</em> — the typed-kind router registers the two GETs and then stops before the write
              routes (<code>typedKindRouter.ts:339</code>). All sprint <em>writes</em> go through the sprints module's
              own routes instead. This is the same reason generic <code>/api/v1/projects</code> reads never show a
              sprint: they are clamped to <code>website_build</code> by <code>DEFAULT_TYPE_SCOPES</code>{' '}
              (<code>coreTypeScopes.ts:108-113</code>), so a folded type is only reachable through its own resource.
              Campaigns use the identical clamp and typed-kind pattern — the only difference is that a campaign{' '}
              <em>has</em> a write adapter, so it is writable there while a sprint is not.
            </li>
            <li>
              <strong>Nightly rollover.</strong> A <code>sprint-rollover</code> cron (00:10) moves an ended sprint's
              open tickets (no <code>completedAt</code>, not archived) to the earliest sprint that starts after it, once
              per sprint (guarded by <code>projects.data.rolledOverAt</code>). Done and archived tickets stay where they
              finished. Kill switch: <code>SPRINT_ROLLOVER_ENABLED</code> (default on).
            </li>
            <li>
              <strong>The board UI.</strong> A <em>Sprints</em> button opens a dialog to plan sprints
              (<code>SprintsDialog</code> via <code>useSprints</code>). A <em>Sprint</em> picker on the ticket page
              (<code>SprintPicker</code>), a <em>Sprint</em> column (<code>SprintCell</code>), a Sprint filter and a
              "Move to sprint…" bulk action all read and write through <code>sprintsApi.ts</code>. Their options come
              from the dedicated <code>sprints</code> resource (the typed kind) — <em>not</em> from a recipe over
              projects (an earlier <code>operations.sprints</code> recipe was removed, because generic project reads only
              return website builds and so never offered a sprint).
            </li>
            <li>
              <strong>Per-sprint charts for free.</strong> Because the Charts button carries the board's{' '}
              <code>when[...]</code> filters (see Charts, above), filtering the board to a sprint and opening Charts
              gives that sprint's burn-up with no extra chart definitions.
            </li>
          </ul>
        </div>
        <Callout kind="info" title="The Sprint filter and “Move to sprint” show on every ticket queue">
          Both are added to the shared <code>TODOS_VIEW</code> template, and <code>TICKET_QUEUE_VIEWS</code> builds each
          department queue by spreading <code>...TODOS_VIEW</code> (<code>resourceViews/todos.ts</code>). So the Sprint
          filter and the bulk action appear on Helpdesk, Finance and every other ticket board, not only Synapse. If
          sprints should be Synapse-only, that is the one place to narrow.
        </Callout>
        <Files
          title="Where the sprint work lives (working branches)"
          items={[
            { path: 'apps/web-services/src/modules/sprints/sprints.routes.ts', note: 'POST /sprints, PUT /sprints/tickets, PATCH /sprints/:id (writes)' },
            { path: 'apps/web-services/src/modules/sprints/sprints.service.ts:143-158', note: 'one sprint per ticket, replaced in a transaction' },
            { path: 'libs/prisma/src/utils/sprintKind.ts', note: 'the read-only Sprint typed kind (projection of projects)' },
            { path: 'libs/prisma/src/utils/coreTypeScopes.ts:108-113', note: 'DEFAULT_TYPE_SCOPES: Project → website_build clamp' },
            { path: 'apps/web-services/src/modules/cron/cronProducers.ts:216-220', note: "registerCronProducer('sprint-rollover') + kill switch" },
            { path: 'apps/synapse-v3/src/services/sprintsApi.ts', note: 'all sprint reads/writes from the UI' },
            { path: 'apps/synapse-v3/src/components/sprints/', note: 'SprintsDialog, SprintPicker, SprintCell, useSprints' },
            { path: 'apps/synapse-v3/src/components/action-surface/adapters/MoveToSprintAction.tsx', note: 'the bulk action' },
          ]}
        />

        <h3>Ticket activity notifications <Pill color="var(--yellow)">feat/ticket-notifications</Pill></h3>
        <div className="kit-prose">
          <p>
            Tell people when a ticket they care about changes — without any business code calling a mail or push
            provider directly (doctrine §8). Two <strong>CODE</strong> subscribers are ensured at boot:
          </p>
          <ul>
            <li>
              <code>core:todo:*:{'{created,updated}'}:*</code> → handler <code>helpdesk.todo.activity-notify</code>, and
            </li>
            <li>
              <code>helpdesk:ticket:*:stage-changed:*</code> → handler <code>helpdesk.ticket.status-notify</code>.
            </li>
          </ul>
          <p>
            Each handler reads the write's <strong>audit diff</strong> — the <code>AuditEvent.diff</code> rows for that
            Todo, joined to the request by <code>invocationId</code> — to decide what actually changed: a new{' '}
            <code>assigneeUserId</code> is an assignment, a new <code>statusSlug</code> is a status move. It then sends{' '}
            <strong>both</strong> an in-app push (<code>createInAppNotifications</code>) and an email
            (<code>sendTemplatedEmail</code>): <code>helpdesk-ticket-assigned</code> to the new assignee,{' '}
            <code>helpdesk-status-change</code> to the client who opened the ticket. The person who made the change is
            never notified about their own action, and a failed push never fails the write.
          </p>
        </div>
        <Files
          items={[
            { path: 'apps/web-services/src/services/bootstrapTicketActivitySubscribers.ts', note: 'ensures the two CODE subscriber rows at boot' },
            { path: 'apps/web-services/src/modules/helpdesk/ticketActivityNotifications.ts', note: 'the two handlers (push + email)' },
            { path: 'apps/web-services/src/modules/helpdesk/ticketActivity.ts', note: 'reads the audit diff: assignment vs status move' },
          ]}
        />

        <h3>Templated-email delivery fix <Pill color="var(--yellow)">fix/comms-email-delivery-subscriber</Pill></h3>
        <div className="kit-prose">
          <p>
            Those emails only send if the delivery chain is wired. A templated email travels{' '}
            <code>sendTemplatedEmail</code> → event <code>comms:email:requested</code> → a CODE subscriber{' '}
            <code>comms.email.deliver</code> that actually sends. On <code>origin/stage</code> that subscriber{' '}
            <strong>row</strong> is only created by a dev seeder (<code>seed-AutomailerSubscribers.ts</code>), which
            production never re-runs — and unlike the notification and billing subscribers, it is <em>not</em> ensured
            at boot. So on an environment seeded without that step, <code>comms:email:requested</code> events land in the
            event table and are never delivered: the handler is registered in process, but PubSub only dispatches to
            subscriber rows. The fix adds <code>bootstrapCommsSubscribers.ts</code> and a boot self-heal step that
            ensures the row, mirroring the existing notification/billing pattern.
          </p>
          <p>
            There is a second, older email path for completeness: a producer emits{' '}
            <code>system:notification:send</code> with its own rendered HTML to an <strong>EMAIL</strong>-type
            subscriber (a config-driven pass-through mailer), rather than a CODE subscriber. Both paths end at the same
            dispatcher — see How it fits → Request &amp; event paths for the subscriber-type table.
          </p>
        </div>
        <Files
          items={[
            { path: 'apps/web-services/src/modules/comms/comms.service.ts', note: 'sendTemplatedEmail → emits comms:email:requested' },
            { path: 'apps/web-services/src/modules/comms/commsPubsubHandler.ts', note: 'the comms.email.deliver CODE handler' },
            { path: 'apps/web-services/src/services/bootstrapCommsSubscribers.ts', note: 'the fix: ensure the delivery subscriber row at boot' },
            { path: 'apps/web-services/src/services/bootstrapNotificationSubscriber.ts', note: 'the EMAIL subscriber on system:notification:send (the other path)' },
          ]}
        />
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
              <tr><td>Add a story-points value</td><td>Lists admin → <code>storyPoints</code>: an item with <code>metadata.points</code>. For the permanent version, the item in <code>modules/core/module.json</code></td><td><Pill color="var(--green)">Lists admin</Pill> <Pill color="var(--purple-l)">manifest</Pill></td></tr>
              <tr><td>Add a chart</td><td>A recipe with <code>presentation.view: "chart"</code> and <code>parent: "operations.department.synapse"</code> in <code>modules/operations/module.json</code> → <code>pnpm build:modules</code> → <code>seed:modules --only operations</code> in each environment. Or build it in the Charts composer, which saves it as a recipe in that one environment</td><td><Pill color="var(--purple-l)">manifest + seed</Pill></td></tr>
              <tr><td>Change the board's columns or default sort</td><td>The <code>presentation</code> of <code>operations.department.synapse</code> in the manifest, then seed</td><td><Pill color="var(--purple-l)">manifest + seed</Pill></td></tr>
              <tr><td>Change the board layout (stage columns, dropdowns, the Assignee picker, the Sprint filter)</td><td><code>resourceViews/todos.ts</code> — <code>TODOS_VIEW</code> is shared by every queue through <code>TICKET_QUEUE_VIEWS</code></td><td><Pill color="var(--blue)">frontend code</Pill></td></tr>
              <tr><td>Change who can be assigned a ticket</td><td><code>listStaffProfiles</code> in <code>apps/synapse-v3/src/services/userDirectory.ts</code> is the roster; the two pickers (<code>HelpdeskTicketDetail.tsx</code>, <code>AdminNewTicketDialog.tsx</code>) decide whom to show</td><td><Pill color="var(--blue)">frontend code</Pill></td></tr>
              <tr><td>Change who can comment or what a comment can hold</td><td><code>recordNotes.service.ts</code> (the <code>note</code> owners); <code>noteMentions.ts</code> for who an @mention notifies</td><td><Pill color="var(--blue)">backend code</Pill></td></tr>
              <tr><td>Change who is notified when a ticket changes</td><td>The two CODE handlers in <code>ticketActivityNotifications.ts</code> and <code>ticketActivity.ts</code> (branch <code>feat/ticket-notifications</code>)</td><td><Pill color="var(--blue)">backend code</Pill></td></tr>
              <tr><td>Add a field to tickets</td><td>The Todo model in <code>modules/core/module.json</code> + <code>Todo.prisma</code> + a migration; if it is a vocabulary, a new List declared in the manifest. Then <code>pnpm build:modules</code> and the seed</td><td><Pill color="var(--pink)">manifest + migration</Pill></td></tr>
              <tr><td>A personal filtered view</td><td>The board → filter → Save view (a user-tier <code>savedView</code> recipe; it appears in the board's chip row)</td><td><Pill color="var(--green)">UI only</Pill></td></tr>
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
            <strong>no step of the deploy runs it</strong> (<code>docs/devops/post-deploy-web-services-stage.md</code>:
            a deploy applies migrations and swaps the container, nothing more).
          </p>
          <p>
            That is exactly what happened to the board charts. The chart recipes and the Charts button reached the
            production branch, so the button and the code are live. But production's <code>creamPieRecipe</code> list
            held <code>operations.department.synapse</code> and none of the <code>operations.synapse.chart.*</code>
            items until the seed was run there, so the library opened empty. The same gap applies to the{' '}
            <code>storyPoints</code> scale and the points charts.
          </p>
          <p>
            <strong>Fix:</strong> run the scoped seed, <code>cd libs/prisma &amp;&amp; pnpm seed:modules --only operations</code>{' '}
            (add <code>core</code> for story points), against the production database. The scoped form leaves the
            Pub/Sub subscribers alone. The seed is idempotent: a second run reports every row unchanged. A lasting fix
            is a deploy step that runs it.
          </p>
        </Callout>
      </Section>
    </>
  );
}
