import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Files, Pill, Section } from '../kit/Kit';
import type { Page } from '../../types';

// Two end-to-end paths: a read (board → Prisma) and a write (event → subscribers).
// Request-path detail is on Deep Dives → Request Lifecycle; this is the summary
// plus the event path, which Deep Dives does not draw. Facts from origin/stage.

// ── read path ───────────────────────────────────────────────────────────────
const rGroups: DiagramGroup[] = [
  { id: 'ui', x: 16, y: 16, w: 300, h: 250, label: 'Browser (synapse-v3)', color: 'var(--blue)' },
  { id: 'api', x: 332, y: 16, w: 540, h: 250, label: 'web-services — one generic chain', color: 'var(--purple-l)' },
  { id: 'db', x: 888, y: 16, w: 196, h: 250, label: 'PostgreSQL', color: 'var(--green)' },
];
const rNodes: DiagramNode[] = [
  { id: 'page', x: 32, y: 60, w: 268, h: 70, label: 'Synapse board page', sub: 'EntityList + resourceViews\n(the view template)', color: 'var(--blue)',
    detail: <p>The board is <code>EntityList</code> with a view template (<code>resourceViews/todos.ts</code>) applied. The template names the stage columns, the Status/Priority dropdowns and the Assignee picker.</p>,
    files: ['apps/synapse-v3/src/components/entity-list/EntityList.tsx', 'apps/synapse-v3/src/components/entity-list/resourceViews/todos.ts'] },
  { id: 'url', x: 32, y: 150, w: 268, h: 90, label: 'build the URL', sub: 'GET /api/v1/todos\n?recipe=operations.department.synapse\n&when[statusSlug][eq]=open', color: 'var(--blue)', variant: 'ghost',
    detail: <p>Filter state lives in the address bar (doctrine §6). The <code>when[field][op]=value</code> grammar travels unchanged from the browser URL to the API URL. Full anatomy on Deep Dives → URL Anatomy.</p> },

  { id: 'route', x: 348, y: 56, w: 240, h: 60, label: 'generic smart route', sub: '/api/v1/:resource (no controller)', color: 'var(--purple-l)',
    detail: <p>One catch-all route serves every model and typed kind. There is no tickets controller. Deep Dives → Request Lifecycle walks each middleware.</p>,
    files: ['apps/web-services/src/routes/genericCrudChain.ts'] },
  { id: 'scope', x: 348, y: 128, w: 240, h: 64, label: 'tenant scope + kind clamp', sub: 'CASL org scope ∧ GENERIC_KIND_CLAMPS', color: 'var(--purple-l)',
    detail: <p>The reader's CASL/org scope is ANDed with the kind clamp (<code>Todo → HUMAN_TODOS</code>), so machine todos and out-of-tenant rows never appear. A typed kind (sprints) names its own type and skips the clamp.</p>,
    files: ['apps/web-services/src/utils/modelTenancy.ts:403-439'] },
  { id: 'vf', x: 608, y: 56, w: 248, h: 60, label: 'viewFilter (recipe)', sub: 'resolve ?recipe= → AND conditions', color: 'var(--purple-l)',
    detail: <p>Looks the recipe up across tiers, enforces <code>availableWhen</code> server-side, and ANDs its conditions under the caller's scope. A recipe narrows; it can never widen what you may see.</p>,
    files: ['apps/web-services/src/modules/cream-pie/viewFilter.ts'] },
  { id: 'pql', x: 608, y: 128, w: 248, h: 64, label: 'CREAM-PQL compile', sub: 'parseWhenQuery → compileToPrismaWhere', color: 'var(--purple-l)',
    detail: <p>The one condition dialect (doctrine §3). The <code>{'{logic, rules}'}</code> tree compiles to a Prisma <code>where</code>. An unresolvable field throws rather than silently dropping a rule (which would widen results).</p>,
    files: ['libs/cream-pie/src/lib/when-query.ts', 'libs/cream-pie/src/lib/prisma-where.ts'] },
  { id: 'prisma', x: 904, y: 100, w: 164, h: 80, label: 'one Prisma query', sub: 'findMany(where)\n+ list labels', color: 'var(--green)',
    detail: <p>A single <code>findMany</code> with the composed where, plus the requested List vocabularies hydrated so each row carries labels and colours, not just keys.</p> },
];
const rEdges: DiagramEdge[] = [
  { from: 'page', to: 'url', color: 'var(--blue)' },
  { from: 'url', to: 'route', label: 'GET', color: 'var(--blue)' },
  { from: 'route', to: 'scope', color: 'var(--purple-l)' },
  { from: 'scope', to: 'vf', color: 'var(--purple-l)' },
  { from: 'vf', to: 'pql', color: 'var(--purple-l)' },
  { from: 'pql', to: 'prisma', label: 'where', color: 'var(--purple-l)' },
];

// ── write / event path ──────────────────────────────────────────────────────
const eGroups: DiagramGroup[] = [
  { id: 'w', x: 16, y: 16, w: 300, h: 290, label: 'a write happens', color: 'var(--purple-l)' },
  { id: 'store', x: 332, y: 16, w: 300, h: 290, label: 'PubSub store', color: 'var(--green)' },
  { id: 'sub', x: 648, y: 16, w: 436, h: 290, label: 'subscribers (by type)', color: 'var(--orange-l)' },
];
const eNodes: DiagramNode[] = [
  { id: 'patch', x: 32, y: 60, w: 268, h: 70, label: 'generic write', sub: 'PATCH/POST → res.on("finish")\n→ topicBroadcast', color: 'var(--purple-l)',
    detail: <p>After a successful mutating request, <code>topicBroadcastMiddleware</code> fires a <code>core:&lt;resource&gt;:*:{'{created,updated}'}:*</code> event (not awaited).</p>,
    files: ['apps/web-services/src/middleware/topicBroadcast.ts'] },
  { id: 'stage', x: 32, y: 150, w: 268, h: 70, label: 'stage move', sub: 'transitionAndAnnounce\n→ announce after commit', color: 'var(--purple-l)',
    detail: <p>A STAGE transition emits <code>&lt;domain&gt;:&lt;resource&gt;:stage-changed</code> (e.g. <code>helpdesk:ticket:*:stage-changed:*</code>) and an <code>advanced-to-&lt;to&gt;</code> event — only when the status actually changed.</p>,
    files: ['apps/web-services/src/services/stageTransitionService.ts'] },
  { id: 'audit', x: 32, y: 240, w: 268, h: 56, label: 'AuditEvent diff', sub: 'before/after per field · invocationId', color: 'var(--purple-l)', variant: 'ghost',
    detail: <p>The change is also recorded as an <code>AuditEvent</code> with a per-field <code>diff</code>, joined to the request by <code>invocationId</code>. A CODE subscriber reads this diff to tell <em>what</em> changed (an assignment vs a status move).</p>,
    files: ['libs/prisma/src/schema/lifecycle/AuditEvent.prisma'] },

  { id: 'event', x: 348, y: 70, w: 268, h: 70, label: 'PubSubEvent', sub: 'topicId + JSON payload', color: 'var(--green)',
    detail: <p>The emitted event row. A topic auto-creates if dynamic.</p>,
    files: ['libs/prisma/src/schema/pubsub/PubSubEvent.prisma'] },
  { id: 'deliv', x: 348, y: 170, w: 268, h: 76, label: 'PubSubDelivery', sub: 'one row per (event, subscriber)\nunique → idempotent', color: 'var(--green)',
    detail: <p>One row per <code>(eventId, subscriberId)</code>, unique — the idempotency gate against redelivery. Status is PENDING / ENQUEUED / DELIVERED / FAILED / RETRYING / SKIPPED.</p>,
    files: ['libs/prisma/src/schema/pubsub/PubSubDelivery.prisma'] },

  { id: 'disp', x: 664, y: 56, w: 404, h: 56, label: 'subscriberExecutionService', sub: 'switch on subscriber type', color: 'var(--orange-l)',
    detail: <p>The dispatcher. It reads each subscriber row and runs it by type, then records DELIVERED/FAILED on the delivery row.</p>,
    files: ['apps/web-services/src/services/subscriberExecutionService.ts'] },
  { id: 'code', x: 664, y: 128, w: 196, h: 70, label: 'CODE subscriber', sub: 'runs a registered handler', color: 'var(--orange-l)',
    detail: <p>Binds a topic to a named in-process handler (e.g. <code>comms.email.deliver</code>, or the ticket-activity handlers). This is how "when a ticket changes, notify people" is wired without business code calling a provider.</p> },
  { id: 'email', x: 872, y: 128, w: 196, h: 70, label: 'EMAIL subscriber', sub: 'config renders the message', color: 'var(--orange-l)',
    detail: <p>A pass-through mailer: the subscriber row's config (Jinja/merge tags over the event payload) renders and sends. Used by the <code>system:notification:send</code> path.</p> },
  { id: 'api2', x: 664, y: 210, w: 196, h: 70, label: 'API subscriber', sub: 'POSTs a webhook', color: 'var(--orange-l)', variant: 'ghost',
    detail: <p>The "webhook" type is named <code>API</code> — it delivers to an external URL. (<code>TEXT</code> = SMS, <code>JOB</code> = enqueue a job.)</p> },
  { id: 'push', x: 872, y: 210, w: 196, h: 70, label: 'in-app push', sub: 'createInAppNotifications', color: 'var(--orange-l)', variant: 'ghost',
    detail: <p>A CODE handler can also create in-app notifications directly, so ticket activity shows both a push and an email.</p> },
];
const eEdges: DiagramEdge[] = [
  { from: 'patch', to: 'event', label: 'emit', color: 'var(--purple-l)' },
  { from: 'stage', to: 'event', color: 'var(--purple-l)' },
  { from: 'audit', to: 'code', label: 'read by', color: 'var(--purple-l)', dashed: true, curve: 40 },
  { from: 'event', to: 'deliv', color: 'var(--green)' },
  { from: 'deliv', to: 'disp', color: 'var(--green)' },
  { from: 'disp', to: 'code', color: 'var(--orange-l)' },
  { from: 'disp', to: 'email', color: 'var(--orange-l)' },
  { from: 'disp', to: 'api2', color: 'var(--orange-l)' },
  { from: 'code', to: 'push', color: 'var(--orange-l)', dashed: true },
];

export default function RequestAndEvents({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <>
      <Section
        label="The read path"
        title="From a board to one Prisma query"
        intro={
          <p>
            A list screen never has its own controller. The board builds a URL; the generic chain
            scopes it, resolves the recipe, compiles the conditions and runs a single query. This is
            the summary — Deep Dives walks every middleware in order.
          </p>
        }
      >
        <SvgDiagram width={1100} height={280} nodes={rNodes} edges={rEdges} groups={rGroups} minWidth={900} />
        <Callout kind="tip" title="Want the middleware-by-middleware version?">
          Deep Dives → <strong>Request Lifecycle</strong> expands this chain step by step, and{' '}
          <strong>URL Anatomy</strong> dissects the <code>when[field][op]=value</code> grammar.{' '}
          <button className="kit-inline-link" onClick={() => setPage('deepdives')}>Open Deep Dives</button>.
        </Callout>
      </Section>

      <Section
        label="The write path"
        title="A write becomes an event, and subscribers react"
        intro={
          <p>
            All automation goes through PubSub (doctrine §8). No business code calls a mail, SMS or
            notification provider directly. A write emits an event; database-seeded subscribers own
            recipients and delivery.
          </p>
        }
      >
        <SvgDiagram width={1100} height={320} nodes={eNodes} edges={eEdges} groups={eGroups} minWidth={940} />

        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Subscriber type</th><th>Delivers by</th><th>Used for</th></tr></thead>
            <tbody>
              <tr><td><Pill color="var(--orange-l)">CODE</Pill></td><td>a registered in-process handler</td><td>ticket-activity notifications; templated-email delivery (<code>comms.email.deliver</code>)</td></tr>
              <tr><td><Pill color="var(--orange-l)">EMAIL</Pill></td><td>config-rendered message</td><td>the generic <code>system:notification:send</code> mailer</td></tr>
              <tr><td><Pill color="var(--orange-l)">API</Pill></td><td>an outbound webhook POST</td><td>external integrations (the "webhook" type)</td></tr>
              <tr><td><Pill color="var(--text-dim)">TEXT · JOB</Pill></td><td>SMS · enqueue a job</td><td>SMS, and fanning an event into the job queue</td></tr>
            </tbody>
          </table>
        </div>

        <Callout kind="info" title="Two email paths (both end at the dispatcher)">
          The ticket board uses <strong>both</strong>. Templated email goes{' '}
          <code>sendTemplatedEmail → comms:email:requested →</code> a <strong>CODE</strong> subscriber{' '}
          <code>comms.email.deliver</code>. The older generic path emits{' '}
          <code>system:notification:send</code> to an <strong>EMAIL</strong> subscriber. The Synapse
          module page covers how ticket activity uses these, and a real bug where the templated-email
          delivery subscriber row was missing on production.
        </Callout>
        <Files
          items={[
            { path: 'apps/web-services/src/services/subscriberExecutionService.ts', note: 'the dispatcher: switch on EMAIL / TEXT / API / CODE / JOB' },
            { path: 'libs/prisma/src/utils/pubsubItems.ts', note: 'the subscriber-type set' },
            { path: 'apps/web-services/src/middleware/topicBroadcast.ts', note: 'emits core:<resource>:*:{created,updated}:*' },
            { path: 'apps/web-services/src/services/stageTransitionService.ts', note: 'emits <domain>:<resource>:stage-changed after commit' },
          ]}
        />
      </Section>
    </>
  );
}
