import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Compare, Files, Pill, Section } from '../kit/Kit';
import type { Page } from '../../types';

// Todos and Projects: the two discriminated tables most of Operations stands on.
// Facts read from ci-connect origin/stage (Nov 5 2026); sprint facts from the
// working branches feat/sprints-api / feat/sprints-board (not merged yet).

// ── Todo vs Project discriminator diagram ───────────────────────────────────
const groups: DiagramGroup[] = [
  { id: 'todo', x: 16, y: 16, w: 520, h: 300, label: 'one todos table · split by type_slug', color: 'var(--green)' },
  { id: 'proj', x: 552, y: 16, w: 532, h: 300, label: 'one projects table · split by type_slug', color: 'var(--purple-l)' },
];

const nodes: DiagramNode[] = [
  // Todos
  { id: 'tcol', x: 32, y: 56, w: 230, h: 64, label: 'todos.type_slug', sub: 'key of a todoType item', color: 'var(--green)',
    detail: <p>One column decides what a row <em>is</em>. There is no <code>tickets</code> table and no <code>tasks</code> table — doctrine §2, a discriminator beats a duplicate model.</p>,
    files: ['libs/prisma/src/schema/core/Todo.prisma', 'modules/core/module.json (Todo model)'] },
  { id: 'thuman', x: 32, y: 136, w: 230, h: 76, label: 'HUMAN todo types', sub: 'ticket · task · helpdesk_task\nform_submission (facade) …', color: 'var(--green)',
    detail: <><p>Work a person sees. A <strong>ticket</strong> (<code>type_slug="ticket"</code>) is what the Synapse board shows; a <strong>subtask</strong> is a <code>helpdesk_task</code> whose <code>parent_todo_id</code> points at its ticket, so it stays out of the queues.</p><p><code>HUMAN_TODOS</code> is defined as "not a machine type": <code>typeSlug notIn MACHINE_TODO_TYPES</code>.</p></>,
    files: ['libs/prisma/src/utils/coreTypeScopes.ts:105 (HUMAN_TODOS)'] },
  { id: 'tmachine', x: 282, y: 136, w: 234, h: 76, label: 'MACHINE todo types', sub: 'job · automation_run · dns_sync\nbackup_scan · health_run · social_post …', color: 'var(--green)', variant: 'ghost',
    detail: <p>Durable rows the platform writes for itself: the job queue (<code>job</code>), automation runs, DNS-sync and backup-scan passes, social posts, health findings, Hydra agent context. Listed in <code>MACHINE_TODO_TYPE</code>; never shown in a human work list.</p>,
    files: ['libs/prisma/src/utils/coreTypeScopes.ts:41-102 (MACHINE_TODO_TYPE)'] },
  { id: 'tstage', x: 32, y: 232, w: 230, h: 70, label: 'status_slug (a ticket)', sub: 'a helpdeskTicketStage key\nmoved only by POST /todos/:id/stage', color: 'var(--green)',
    detail: <p>For a ticket, <code>status_slug</code> holds one of the six <code>helpdeskTicketStage</code> keys — a STAGE (state machine). The generic PATCH refuses it; a move goes through the stage endpoint, which checks transitions, stamps <code>completedAt</code> and emits the stage-changed event.</p>,
    files: ['apps/web-services/src/modules/lifecycle/stage.routes.ts', 'apps/web-services/src/modules/lifecycle/stage.service.ts'] },
  { id: 'tqueue', x: 282, y: 232, w: 234, h: 70, label: 'queue_slug', sub: 'a helpdeskDepartment key\nsynapse · helpdesk · finance …', color: 'var(--green)',
    detail: <p>Which department board a ticket sits on. <code>synapse</code> is the Get-started board; there are sixteen queues. An item's metadata can carry a default assignee.</p> },

  // Projects
  { id: 'pcol', x: 568, y: 56, w: 240, h: 64, label: 'projects.type_slug', sub: 'key of a projectType item', color: 'var(--purple-l)',
    detail: <p>Same trick on a second table: one <code>projects</code> table, split by <code>type_slug</code>. A website build, a campaign and a sprint are all project rows.</p>,
    files: ['libs/prisma/src/utils/coreTypeScopes.ts:23-36 (PROJECT_TYPE)'] },
  { id: 'pwb', x: 568, y: 136, w: 152, h: 78, label: 'website_build', sub: 'the one generic\nProject reads show', color: 'var(--purple-l)',
    detail: <p>The original meaning of "a project". Generic reads of <code>/api/v1/projects</code> are clamped to this type, so none of the folded types leaks onto a screen not built for it.</p>,
    files: ['libs/prisma/src/utils/coreTypeScopes.ts:38 (WEBSITE_BUILD_PROJECTS)'] },
  { id: 'pfold', x: 732, y: 136, w: 170, h: 78, label: 'folded types', sub: 'campaign · sprint\nsite_workspace\nconversation · neo_operation', color: 'var(--purple-l)', variant: 'ghost',
    detail: <p>Types folded into the same table over time. Each is invisible to the generic Project surface and is read through its own <strong>typed kind</strong> or <strong>facade</strong> instead.</p> },
  { id: 'pclamp', x: 910, y: 136, w: 160, h: 78, label: 'DEFAULT_TYPE_SCOPES', sub: 'Project → website_build\nTodo → HUMAN_TODOS', color: 'var(--pink)',
    detail: <p>The clamp map. Any generic reader that does not name a type is ANDed with these, so a folded type is never returned by accident. Applied as <code>GENERIC_KIND_CLAMPS</code> in the scope filter.</p>,
    files: ['libs/prisma/src/utils/coreTypeScopes.ts:108-113', 'apps/web-services/src/utils/modelTenancy.ts:403-439'] },
  { id: 'pkind', x: 568, y: 232, w: 240, h: 70, label: 'typed kinds & facades', sub: '/api/v1/sprints · /api/v1/campaigns\nread a dedicated resource', color: 'var(--blue)',
    detail: <p>A typed kind exposes one folded type as its own read-only (or writable) resource with a SQL projection of <code>projects</code>. Sprints and campaigns both use this; see the next tab and the Synapse module page.</p>,
    files: ['libs/prisma/src/utils/typedKinds/catalog.ts', 'libs/prisma/src/utils/campaignFacade/kind.ts'] },
  { id: 'pfacade', x: 820, y: 232, w: 250, h: 70, label: 'facades (read + write helpers)', sub: 'campaignFacade · formSubmissionFacade\nconversationFacade · socialPostFacade', color: 'var(--blue)', variant: 'ghost',
    detail: <p>A facade is the server-side helper that reads and writes one folded type safely (e.g. a form submission is a <code>form_submission</code> todo read through <code>formSubmissionFacade</code>). The typed kind is its read surface over the generic API.</p> },
];

const edges: DiagramEdge[] = [
  { from: 'tcol', to: 'thuman', color: 'var(--green)' },
  { from: 'tcol', to: 'tmachine', color: 'var(--green)', curve: -20 },
  { from: 'thuman', to: 'tstage', color: 'var(--green)' },
  { from: 'thuman', to: 'tqueue', color: 'var(--green)', curve: -15 },
  { from: 'pcol', to: 'pwb', color: 'var(--purple-l)' },
  { from: 'pcol', to: 'pfold', color: 'var(--purple-l)', curve: -15 },
  { from: 'pfold', to: 'pclamp', label: 'hidden by', color: 'var(--pink)', dashed: true },
  { from: 'pfold', to: 'pkind', label: 'read via', color: 'var(--blue)' },
  { from: 'pkind', to: 'pfacade', color: 'var(--blue)', dashed: true },
];

export default function CoreObjects({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <>
      <Section
        label="Two tables, many types"
        title="Todos and Projects are discriminated tables"
        intro={
          <p>
            Most of Operations is two Postgres tables wearing many hats. A column called{' '}
            <code>type_slug</code> decides what each row is — doctrine §2: before a new model, use an
            existing model plus a discriminator. Click any box.
          </p>
        }
      >
        <SvgDiagram width={1100} height={330} nodes={nodes} edges={edges} groups={groups} minWidth={900} />
      </Section>

      <Section
        label="Todos"
        title="Everything a person (or a machine) has to do"
        intro={
          <p>
            One <code>todos</code> table holds every unit of work. <code>type_slug</code> tells a
            ticket from a task from a background job. The board you open in Operations is a filtered
            view of this table.
          </p>
        }
      >
        <Compare
          left={{
            title: 'HUMAN todo types',
            color: 'var(--green)',
            body: (
              <ul className="kit-prose">
                <li><code>ticket</code> — a Synapse / helpdesk ticket (what the board shows).</li>
                <li><code>task</code>, <code>helpdesk_task</code> — plain tasks and ticket subtasks.</li>
                <li><code>form_submission</code> — an intake, read through a facade, not as work.</li>
                <li>A <strong>subtask</strong> is a child via <code>parent_todo_id</code>, so it never appears in a queue.</li>
              </ul>
            ),
          }}
          right={{
            title: 'MACHINE todo types',
            color: 'var(--purple-l)',
            body: (
              <ul className="kit-prose">
                <li><code>job</code> — the durable platform job-queue row.</li>
                <li><code>automation_run</code>, <code>dns_sync</code>, <code>backup_scan</code>, <code>health_run</code>…</li>
                <li><code>social_post</code>, Hydra's <code>agent_change</code>/<code>agent_plan</code>/<code>agent_job</code>.</li>
                <li>Never shown in a human work list: <code>HUMAN_TODOS</code> is defined as "not a machine type".</li>
              </ul>
            ),
          }}
        />

        <h3>statusSlug vs the ticket stage machine</h3>
        <div className="kit-prose">
          <p>
            A todo's <code>status_slug</code> is bound to the long shared <code>todoStatus</code>{' '}
            TAXONOMY (any value may be applied freely). But a <strong>ticket</strong> is governed:
            its status is one of six <code>helpdeskTicketStage</code> keys, a STAGE. The server
            enforces the difference — the generic PATCH refuses to write a ticket's status, and the
            only way a ticket moves is <code>POST /todos/:id/stage</code>, which validates the
            transition, stamps <code>completed_at</code> on the terminal stage and emits the
            <code> helpdesk:ticket:*:stage-changed:*</code> event. That stamp is what the velocity and
            burn-up charts read.
          </p>
        </div>

        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Column</th><th>Bound to</th><th>What it means</th></tr></thead>
            <tbody>
              <tr><td><code>type_slug</code></td><td><code>todoType</code> (TAXONOMY)</td><td>ticket vs task vs job — the discriminator</td></tr>
              <tr><td><code>status_slug</code></td><td><code>todoStatus</code> (TAXONOMY); for a ticket, a <code>helpdeskTicketStage</code> (STAGE) key</td><td>free for tasks; a governed state machine for tickets</td></tr>
              <tr><td><code>queue_slug</code></td><td><code>helpdeskDepartment</code> (TAXONOMY)</td><td>which department board — <code>synapse</code>, <code>helpdesk</code>, <code>finance</code>…</td></tr>
              <tr><td><code>parent_todo_id</code></td><td>another Todo</td><td>makes a row a subtask of its ticket</td></tr>
            </tbody>
          </table>
        </div>
        <Files
          items={[
            { path: 'libs/prisma/src/schema/core/Todo.prisma', note: 'the table (typeSlug, queueSlug, parentTodoId, dates)' },
            { path: 'modules/core/module.json', note: 'Todo field declarations and the List bindings' },
            { path: 'libs/prisma/src/utils/coreTypeScopes.ts:41-105', note: 'MACHINE_TODO_TYPE and HUMAN_TODOS' },
            { path: 'apps/web-services/src/modules/lifecycle/stage.routes.ts', note: 'POST /todos/:id/stage — the only status writer' },
          ]}
        />
      </Section>

      <Section
        label="Projects"
        title="Website builds, campaigns — and sprints"
        intro={
          <p>
            The same pattern on a second table. <code>projects.type_slug</code> is{' '}
            <code>website_build</code>, <code>campaign</code>, <code>sprint</code>,{' '}
            <code>site_workspace</code>, <code>conversation</code> and more — one table, many
            products.
          </p>
        }
      >
        <Callout kind="info" title="The website_build clamp (why a sprint isn't in /api/v1/projects)">
          <p>
            Because so many types now share the table, a <em>generic</em> read of{' '}
            <code>/api/v1/projects</code> is clamped to the original meaning —{' '}
            <code>typeSlug = "website_build"</code> — by <code>DEFAULT_TYPE_SCOPES</code>{' '}
            (<code>coreTypeScopes.ts:108-113</code>), ANDed into every scope filter as{' '}
            <code>GENERIC_KIND_CLAMPS</code> (<code>modelTenancy.ts:403-439</code>). A campaign or a
            sprint simply isn't returned. To read one you go through its{' '}
            <strong>typed kind</strong> (a dedicated resource with a SQL projection of the table) or
            its <strong>facade</strong> (the server helper that reads and writes it safely).
          </p>
          <p>
            <code>Todo</code> is clamped the same way — to <code>HUMAN_TODOS</code> — so machine todos
            (jobs, scans) never show up in a generic todo list either.
          </p>
        </Callout>

        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Project type</th><th>Is</th><th>Read through</th></tr></thead>
            <tbody>
              <tr><td><code>website_build</code></td><td>a client website build</td><td>the generic Project surface (the only type it shows)</td></tr>
              <tr><td><code>campaign</code></td><td>a marketing/sales campaign</td><td>the Campaign typed kind / facade (writable — it has a write adapter)</td></tr>
              <tr><td><code>sprint</code> <Pill color="var(--yellow)">not merged yet</Pill></td><td>a time-boxed window with a goal (window + goal in <code>projects.data</code>)</td><td>the Sprint typed kind (read-only — no write adapter)</td></tr>
              <tr><td><code>site_workspace</code>, <code>conversation</code>, <code>neo_operation</code></td><td>Hydra workspaces, chats, portal operations</td><td>their own facades</td></tr>
            </tbody>
          </table>
        </div>
        <Callout kind="tip" title="Where to see this applied">
          The Synapse module page explains the Sprint typed kind end to end — why it is read-only,
          how a ticket joins a sprint through an edge, and the nightly rollover.{' '}
          <button className="kit-inline-link" onClick={() => setPage('modules')}>Open Modules → Synapse → Sprints</button>.
        </Callout>
        <Files
          items={[
            { path: 'libs/prisma/src/utils/coreTypeScopes.ts:20-38', note: 'PROJECT_TYPE and WEBSITE_BUILD_PROJECTS' },
            { path: 'libs/prisma/src/utils/typedKinds/catalog.ts', note: 'TYPED_KINDS registry (campaign, sprint on its branch, …)' },
            { path: 'libs/prisma/src/utils/campaignFacade/kind.ts', note: 'the Campaign typed kind — the pattern sprints copy' },
          ]}
        />
      </Section>
    </>
  );
}
