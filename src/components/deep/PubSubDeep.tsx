import { useMemo, useState } from 'react';
import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Files, Pill, Section } from '../kit/Kit';

// ─────────────────────────────────────────────────────────────────────────────
// PubSub, end to end. Source: docs/pubsub/README.md (the doc Marcos pinned in
// Slack) checked against the code on origin/stage de81a84533 (Nov 16 2026):
// services/subscriberExecutionService.ts, services/pubsubService.ts,
// workers/pubsubWorker.ts, modules/pubsub/*, and the Schema B fold migration
// 20261113000500_pubsub_fold (topics and subscribers became List items).
// ─────────────────────────────────────────────────────────────────────────────

const WS = 'apps/web-services/src';

// ── 1. the pipeline ─────────────────────────────────────────────────────────
const pGroups: DiagramGroup[] = [
  { id: 'emit', x: 16, y: 16, w: 252, h: 368, label: '1 · something emits', color: 'var(--purple-l)' },
  { id: 'pg', x: 284, y: 16, w: 228, h: 368, label: '2 · Postgres (durable)', color: 'var(--green)' },
  { id: 'relay', x: 528, y: 16, w: 236, h: 368, label: '3 · relay to Kafka', color: 'var(--teal)' },
  { id: 'run', x: 780, y: 16, w: 304, h: 368, label: '4 · deliver', color: 'var(--orange-l)' },
];
const pNodes: DiagramNode[] = [
  { id: 'crud', x: 32, y: 56, w: 220, h: 70, label: 'CRUD hooks', sub: 'a generic write finishes\n→ topicBroadcast / model hook', color: 'var(--purple-l)',
    detail: <p>Every write through the generic API can emit. <code>emitPubSubEvent</code> only emits when an existing topic for that model has the matching <code>onCreate</code> / <code>onUpdate</code> / <code>onDelete</code> flag, and it never auto-creates the topic. The payload carries only the essentials (id, before/after); the full record is loaded at delivery time.</p>,
    files: [`${WS}/services/pubsubService.ts:48`, `${WS}/middleware/topicBroadcast.ts`] },
  { id: 'code', x: 32, y: 140, w: 220, h: 70, label: 'server code', sub: 'emitTopicEvent · emitExplicitTopics\nstage announce after commit', color: 'var(--purple-l)',
    detail: <p>Business code emits <em>domain events</em> by name: <code>emitTopicEvent('comms:email:requested', …)</code>, the stage machine's <code>&lt;domain&gt;:&lt;resource&gt;:stage-changed</code>, a module action's topic. Server code may emit to an unregistered name: that creates a <strong>dynamic</strong> topic.</p>,
    files: [`${WS}/services/pubsubService.ts:113-178`, `${WS}/services/stageTransitionService.ts`] },
  { id: 'publish', x: 32, y: 224, w: 220, h: 70, label: 'POST /pubsub/v1/publish/…', sub: 'outside callers · topic chains\nnever creates a topic (404)', color: 'var(--purple-l)',
    detail: <p>The external door. One topic or a chain (<code>/publish/a/b/c</code>). Auth is per topic (see the table below). An unknown topic name refuses the whole chain, so the outside world can never invent a topic. A registered topic marked <code>isSynchronous</code> skips the relay: its subscribers run inline, before the next topic in the chain.</p>,
    files: [`${WS}/modules/pubsub/pubsub-v1.routes.ts`, `${WS}/modules/pubsub/topicPublishAuth.ts`] },
  { id: 'admin', x: 32, y: 308, w: 220, h: 60, label: 'Admin → Emit / ?publish=', sub: 'verified staff only', color: 'var(--purple-l)', variant: 'ghost',
    detail: <p><code>POST /api/pubsub/emit</code> and <code>?publish=a,b</code> on a generic-API <em>write</em> (ignored on GET). Both need verified internal staff and follow the same per-topic rules.</p> },

  { id: 'event', x: 300, y: 96, w: 196, h: 86, label: 'PubSubEvent row', sub: 'topicId · payload (+_chain)\nenqueuedAt = NULL', color: 'var(--green)',
    detail: <p>The event is written to Postgres <strong>first</strong>. That makes it durable and inspectable (Admin → PubSub → Events) before Kafka ever sees it. <code>topicId</code> now points at a <code>list_items</code> row (the topic item).</p>,
    files: ['libs/prisma/src/schema/pubsub/PubSubEvent.prisma'] },
  { id: 'idx', x: 300, y: 214, w: 196, h: 70, label: 'PubSubEvent_pending_idx', sub: 'partial index:\nWHERE enqueuedAt IS NULL', color: 'var(--green)', variant: 'ghost',
    detail: <p>A partial index over only the not-yet-enqueued rows, so the relay's claim query stays cheap however large the event history grows.</p> },

  { id: 'loop', x: 544, y: 70, w: 204, h: 110, label: 'enqueue loop', sub: 'claim ≤100 rows\nFOR UPDATE SKIP LOCKED\nproduce → mark → commit\nidle 5 s', color: 'var(--teal)',
    detail: <><p>One pass at a time: claim up to 100 pending rows inside a transaction, produce them to Kafka, set <code>enqueuedAt</code>, commit. A full batch (or one cut short by <code>PUBSUB_MAX_BATCH_BYTES</code>) loops again immediately, otherwise it waits 5 s.</p><p><strong>SKIP LOCKED</strong> is what lets any number of web-services replicas run this loop without producing the same event twice. On SIGTERM it starts no new pass and gives a running one 8 s to commit.</p></>,
    files: [`${WS}/workers/pubsubWorker.ts`] },
  { id: 'kafka', x: 544, y: 214, w: 204, h: 70, label: 'Redpanda topic', sub: '"pubsub-events"', color: 'var(--teal)',
    detail: <p>One Kafka (Redpanda) topic carries every PubSub event. PubSub "topics" are <em>not</em> Kafka topics: they are names inside the payload, resolved to List items.</p> },

  { id: 'consumer', x: 796, y: 56, w: 272, h: 60, label: 'deliverLoop', sub: 'consumer group "pubsub-deliver"', color: 'var(--orange-l)',
    detail: <p>Consumes <code>pubsub-events</code> and hands each event to the execution service.</p>, files: [`${WS}/workers/pubsubWorker.ts`] },
  { id: 'exec', x: 796, y: 136, w: 272, h: 84, label: 'executeEventSubscribers', sub: 'active subscribers of the topic\n→ executeSubscriber() each', color: 'var(--orange-l)',
    detail: <p>Loads the topic's active subscribers (List items whose <code>parentItemId</code> is the topic, plus pattern subscribers) and runs the per-subscriber pipeline. Step through it in the simulator below.</p>,
    files: [`${WS}/services/subscriberExecutionService.ts:852`] },
  { id: 'deliv', x: 796, y: 240, w: 272, h: 70, label: 'PubSubDelivery', sub: 'unique (eventId, subscriberId)\nDELIVERED · FAILED · SKIPPED …', color: 'var(--orange-l)',
    detail: <p>One row per (event, subscriber), unique. Kafka is at-least-once (a commit that fails after the send re-produces the batch); this unique row is what makes a redelivery harmless.</p>,
    files: ['libs/prisma/src/schema/pubsub/PubSubDelivery.prisma'] },
  { id: 'out', x: 796, y: 324, w: 272, h: 48, label: 'EMAIL · TEXT · API · CODE · JOB', color: 'var(--orange-l)', variant: 'ghost',
    detail: <p>The subscriber's <code>type</code> decides how it delivers: an email, an SMS, a webhook POST (<code>API</code>), a registered in-process handler (<code>CODE</code>) or a queued job (<code>JOB</code>).</p> },
];
const pEdges: DiagramEdge[] = [
  { from: 'crud', to: 'event', color: 'var(--purple-l)' },
  { from: 'code', to: 'event', color: 'var(--purple-l)' },
  { from: 'publish', to: 'event', label: 'async topic', color: 'var(--purple-l)' },
  { from: 'admin', to: 'event', color: 'var(--purple-l)', dashed: true },
  { from: 'event', to: 'loop', label: 'claim', color: 'var(--green)' },
  { from: 'idx', to: 'loop', color: 'var(--green)', dashed: true },
  { from: 'loop', to: 'kafka', label: 'produce', color: 'var(--teal)' },
  { from: 'kafka', to: 'consumer', color: 'var(--teal)' },
  { from: 'consumer', to: 'exec', color: 'var(--orange-l)' },
  { from: 'exec', to: 'deliv', color: 'var(--orange-l)' },
  { from: 'deliv', to: 'out', color: 'var(--orange-l)' },
];

// ── 3. the per-subscriber simulator ─────────────────────────────────────────
type Cond = 'pass' | 'fail' | 'error';
interface Sim {
  dup: boolean;
  shape: boolean;
  cond: Cond;
  recipe: boolean;
  asyncSub: boolean;
  syncSub: boolean;
  delivery: boolean;
}
interface Row { step: string; what: string; tone: 'ok' | 'skip' | 'stop' | 'fail' | 'side' }

function runSim(s: Sim): { rows: Row[]; status: string; tone: Row['tone'] } {
  const rows: Row[] = [];
  if (s.dup) {
    rows.push({ step: '1 · Idempotency', what: 'A DELIVERED / SKIPPED / FAILED row already exists for (event, subscriber). Kafka redelivered the event. Nothing is sent again.', tone: 'stop' });
    return { rows, status: 'unchanged (existing row kept)', tone: 'stop' };
  }
  rows.push({ step: '1 · Idempotency', what: 'No terminal delivery row yet, carry on.', tone: 'ok' });
  if (!s.shape) {
    rows.push({ step: '2 · Data shape', what: 'The payload cannot hydrate the subscriber\'s effective shape (its own, or the topic\'s when inheritShape). lastError = "Payload cannot hydrate subscriber data shape (missing: …)".', tone: 'skip' });
    return { rows, status: 'SKIPPED', tone: 'skip' };
  }
  rows.push({ step: '2 · Data shape', what: 'Every required field of the shape is present in the payload.', tone: 'ok' });
  if (s.cond === 'fail') {
    rows.push({ step: '3 · Conditions', what: 'The subscriber\'s delivery conditions (compiled through CREAM-PQL) are false. lastError = "Conditions not met".', tone: 'skip' });
    return { rows, status: 'SKIPPED', tone: 'skip' };
  }
  if (s.cond === 'error') {
    rows.push({ step: '3 · Conditions', what: 'The conditions could not be evaluated. The gate fails CLOSED (decision C10): "a gate that fails open is how a recipient gets an email they were excluded from".', tone: 'skip' });
    return { rows, status: 'SKIPPED', tone: 'skip' };
  }
  rows.push({ step: '3 · Conditions', what: 'Delivery conditions pass (or the subscriber has none).', tone: 'ok' });
  if (!s.recipe) {
    rows.push({ step: '4 · Recipe bindings', what: 'A CREAM-PIE recipe bound to this subscriber or its topic vetoes the delivery. lastError = "CREAM-PIE recipe gate not met". Errors here also fail closed.', tone: 'skip' });
    return { rows, status: 'SKIPPED', tone: 'skip' };
  }
  rows.push({ step: '4 · Recipe bindings', what: 'No bound recipe vetoes it (deployments with no bindings skip this through a 15 s cached check).', tone: 'ok' });
  rows.push(s.asyncSub
    ? { step: '5 · Async subtopics', what: 'Fired now, fire-and-forget, BEFORE the delivery. Each one builds its payload through payloadFilter, must hydrate its target topic\'s shape, must pass its own conditions, and goes through loop protection.', tone: 'side' }
    : { step: '5 · Async subtopics', what: 'None configured.', tone: 'ok' });
  rows.push(s.delivery
    ? { step: '6 · Deliver', what: 'The type-specific sender succeeded (EMAIL / TEXT / API / CODE / JOB). The row is upserted as DELIVERED.', tone: 'ok' }
    : { step: '6 · Deliver', what: 'The sender threw or returned an error. The row is upserted as FAILED with lastError, and an SMS alert goes out if one is configured. Admin → PubSub → Deliveries can Resend it.', tone: 'fail' });
  rows.push(s.syncSub
    ? { step: '7 · Sync subtopics', what: `Awaited one by one, honouring delayMs. Note: they run after the delivery ${s.delivery ? 'succeeded' : 'FAILED. The code does not gate them on success, so a failed delivery still fires them'}.`, tone: s.delivery ? 'side' : 'fail' }
    : { step: '7 · Sync subtopics', what: 'None configured.', tone: 'ok' });
  return { rows, status: s.delivery ? 'DELIVERED' : 'FAILED', tone: s.delivery ? 'ok' : 'fail' };
}

const TONE: Record<Row['tone'], string> = {
  ok: 'var(--green)', skip: 'var(--yellow)', stop: 'var(--text-dim)', fail: 'var(--pink)', side: 'var(--teal-l)',
};

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button className={`ps-tog ${on ? 'ps-tog--on' : ''}`} onClick={() => set(!on)} aria-pressed={on}>
      <span className="ps-tog__box">{on ? '✓' : ''}</span>{label}
    </button>
  );
}

function DeliverySim() {
  const [s, setS] = useState<Sim>({ dup: false, shape: true, cond: 'pass', recipe: true, asyncSub: false, syncSub: true, delivery: true });
  const set = <K extends keyof Sim>(k: K) => (v: Sim[K]) => setS(o => ({ ...o, [k]: v }));
  const r = useMemo(() => runSim(s), [s]);
  return (
    <div className="ps-sim">
      <div className="ps-sim__ctl">
        <div className="ps-sim__h">The situation</div>
        <Toggle on={s.dup} set={set('dup')} label="Kafka redelivered this event (a delivery row already exists)" />
        <Toggle on={s.shape} set={set('shape')} label="Payload has every required shape field" />
        <div className="ps-sim__radio">
          <span>Delivery conditions</span>
          {(['pass', 'fail', 'error'] as Cond[]).map(c => (
            <button key={c} className={`ps-chip ${s.cond === c ? 'ps-chip--on' : ''}`} onClick={() => set('cond')(c)}>
              {c === 'pass' ? 'pass' : c === 'fail' ? 'not met' : 'throw'}
            </button>
          ))}
        </div>
        <Toggle on={s.recipe} set={set('recipe')} label="Bound CREAM-PIE recipes allow it" />
        <Toggle on={s.asyncSub} set={set('asyncSub')} label="Subscriber has an async subtopic" />
        <Toggle on={s.syncSub} set={set('syncSub')} label="Subscriber has a sync subtopic" />
        <Toggle on={s.delivery} set={set('delivery')} label="The provider / webhook / handler succeeds" />
      </div>
      <div className="ps-sim__out">
        <div className="ps-sim__h">executeSubscriber(), step by step</div>
        <ol className="ps-steps">
          {r.rows.map(row => (
            <li key={row.step} style={{ '--tone': TONE[row.tone] } as React.CSSProperties}>
              <b>{row.step}</b>
              <span>{row.what}</span>
            </li>
          ))}
        </ol>
        <div className="ps-result" style={{ '--tone': TONE[r.tone] } as React.CSSProperties}>
          PubSubDelivery.status → <strong>{r.status}</strong>
        </div>
      </div>
    </div>
  );
}

// ── 4. loop protection ──────────────────────────────────────────────────────
const MAX_LOOP_ITERATIONS = 5;
function LoopSim() {
  const cycle = ['lead-scored', 'lead-rescored'];
  const [path, setPath] = useState<string[]>(['lead-scored']);
  const [blocked, setBlocked] = useState<string | null>(null);
  const next = cycle[path.length % 2]!;
  const count = path.filter(t => t === next).length;
  function fire() {
    if (count >= MAX_LOOP_ITERATIONS) {
      setBlocked(`"${next}" already appears ${count} times in this chain. Emission blocked and logged.`);
      return;
    }
    setPath(p => [...p, next]);
  }
  function reset() { setPath(['lead-scored']); setBlocked(null); }
  return (
    <div className="ps-loop">
      <p className="kit-prose">
        A subscriber on <code>lead-scored</code> has a subtopic <code>lead-rescored</code>, whose subscriber has a subtopic back
        to <code>lead-scored</code>. Fire the chain and watch <code>_chain</code> grow.
      </p>
      <div className="ps-loop__btns">
        <button className="ps-chip ps-chip--on" onClick={fire} disabled={!!blocked}>Fire subtopic → {next}</button>
        <button className="ps-chip" onClick={reset}>Reset</button>
      </div>
      <pre className="ps-loop__json">{JSON.stringify({ _chain: { path, depth: path.length } }, null, 2)}</pre>
      {blocked && <Callout kind="warn" title="Loop protection">{blocked} (<code>MAX_LOOP_ITERATIONS = {MAX_LOOP_ITERATIONS}</code>)</Callout>}
    </div>
  );
}

export default function PubSubDeep() {
  return (
    <>
      <Section
        label="Event pipeline"
        title="PubSub: how one event becomes deliveries"
        intro={
          <>
            <p>
              <strong>The problem it solves:</strong> doctrine §8 says <em>all automation goes through pubsub</em>. No
              business code calls a mail, SMS or webhook provider. Code announces that something happened (a domain
              event); rows in the database decide who hears about it and how. That keeps recipients, wording and
              on/off switches out of code, and gives every side effect retry, idempotency and an audit trail.
            </p>
            <p>
              This is the page for the doc Marcos pinned in Slack (also under <strong>Docs → PubSub</strong>, verbatim).
              Here each piece is a diagram or a simulator, checked against the code on stage. Click any box.
            </p>
          </>
        }
      >
        <SvgDiagram width={1100} height={400} nodes={pNodes} edges={pEdges} groups={pGroups} minWidth={940} />
        <Callout kind="tip" title="Why write to Postgres first, then Kafka?">
          It is the <strong>outbox</strong> pattern (the ChatGPT write-up Chris shared calls it the "transactional outbox").
          The event is a durable row before anything is sent, a relay moves rows to Kafka, and the unique delivery row
          absorbs duplicates, so delivery is <em>at-least-once</em> but each subscriber fires <em>effectively once</em>.
          One honest caveat: on the generic write path the event row is written <em>after</em> the business write
          commits, not inside the same transaction (<code>emitPubSubEvent</code> takes no transaction client). A crash
          between the two can lose that event. Stage moves announce "after commit" on purpose, for the opposite reason:
          never announce a change that rolled back.
        </Callout>
      </Section>

      <Section
        label="Where they live"
        title="Topics and subscribers are List items now"
        intro={
          <p>
            Since migration <code>20261113000500_pubsub_fold</code> (Schema B, Nov 13), there is no <code>PubSubTopic</code>{' '}
            or <code>PubSubSubscriber</code> table. Both are items of two platform Lists, the same move as recipes and
            navigation (Deep Dives → <em>Lists all the way down</em>). Events and deliveries stay real tables: they are
            high-volume history, not vocabulary.
          </p>
        }
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Concept</th><th>Stored as</th><th>Key fields</th></tr></thead>
            <tbody>
              <tr><td>Topic</td><td>item of List <code>pubsubTopic</code></td><td><code>key</code> = <code>label</code> = the topic name (permanent API name); <code>metadata.payloadShape / isDynamic / requiresAuth / customAuth / isSynchronous / onCreate…</code></td></tr>
              <tr><td>Subscriber</td><td>item of List <code>pubsubSubscriber</code></td><td><code>parentItemId</code> = its topic item (or a <code>topicPattern</code>); <code>metadata.type / config / conditions / resource / payloadShape / inheritShape</code>; <code>isActive</code></td></tr>
              <tr><td>Subtopic</td><td>an entry of the subscriber's <code>config.subTopics[]</code></td><td><code>topicName, isAsync, delayMs, payloadFilter, conditions</code>. Array order is run order (folded in on Nov 2)</td></tr>
              <tr><td>Event</td><td>table <code>PubSubEvent</code></td><td><code>topicId</code> → the topic item; <code>payload</code> (with <code>_chain</code>); <code>enqueuedAt</code></td></tr>
              <tr><td>Delivery</td><td>table <code>PubSubDelivery</code></td><td>unique <code>(eventId, subscriberId)</code>; <code>status, attempts, lastError</code></td></tr>
              <tr><td>Topic key</td><td>a credential of kind <code>pubsub_topic_key</code></td><td>generated / rotated from the topic form</td></tr>
            </tbody>
          </table>
        </div>
        <Callout kind="info" title="What the database still guarantees">
          The old foreign keys became triggers on <code>list_items</code>: a topic is a platform root item; a subscriber
          is bound to exactly one topic item or pattern; the type is one of EMAIL, TEXT, API, CODE, JOB; a topic with
          subscribers cannot be deleted; items never move between these lists. Topic lookups on the emit path are
          cached for 10 s per process.
        </Callout>
      </Section>

      <Section
        label="Nomenclature is API"
        title="Topic names, and registered vs dynamic topics"
        intro={
          <p>
            Topic names are permanent identifiers (doctrine §9): subscribers, recipe bindings and outside callers
            all hold the name. Name them <strong>event-shaped</strong> (<code>domain:resource:action</code>: what happened), never
            delivery-shaped (<code>send-welcome-email</code>: what someone should do about it).
          </p>
        }
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Topic</th><th>Emitted by</th></tr></thead>
            <tbody>
              <tr><td><code>core:todo:&lt;id&gt;:updated:…</code></td><td>the generic write path (topicBroadcast)</td></tr>
              <tr><td><code>helpdesk:ticket:&lt;id&gt;:stage-changed:&lt;status&gt;</code></td><td>the stage machine, after commit</td></tr>
              <tr><td><code>comms:email:requested</code></td><td><code>sendTemplatedEmail</code>, delivered by the CODE subscriber <code>comms.email.deliver</code></td></tr>
              <tr><td><code>crm:organization:enrich-requested</code></td><td>the <code>enrich</code> action declared in <code>modules/crm/module.json → actions[].topics</code></td></tr>
              <tr><td><code>system:notification:send</code></td><td>server code only. Any <code>system:*</code> topic needs a verified Super Admin, because its subscribers take <code>to</code>/<code>html</code> from the event</td></tr>
            </tbody>
          </table>
        </div>
        <Callout kind="info" title="Why topic names carry ids: pattern subscribers">
          A subscriber can bind to a <code>topicPattern</code> instead of one topic, e.g. the ticket-activity subscriber on{' '}
          <code>core:todo:*:{'{created,updated}'}:*</code> or billing on <code>agreements:service-agreement:*:stage-changed:signed</code>.
          The executor loads the exact subscribers of the topic plus every pattern that matches its name. So the name is
          structured data: put the id and the outcome in the name, and one subscriber can listen to every record.
        </Callout>
        <div className="kit-compare" style={{ marginTop: '1rem' }}>
          <div className="kit-compare__col" style={{ '--cmp-color': 'var(--green)' } as React.CSSProperties}>
            <div className="kit-compare__title">Registered topic (isDynamic: false)</div>
            <div className="kit-compare__body">Created on purpose (Synapse UI or a seeder). Can declare a <strong>payload shape</strong>, <strong>auth</strong> requirements and <strong>synchronous</strong> execution. The only kind outside callers can publish to.</div>
          </div>
          <div className="kit-compare__col" style={{ '--cmp-color': 'var(--yellow)' } as React.CSSProperties}>
            <div className="kit-compare__title">Dynamic topic (isDynamic: true)</div>
            <div className="kit-compare__body">Auto-created the first time <em>server code</em> emits it or a subscriber subscribes to it (type any name in the subscriber form's topic box). Always async. The external surfaces never create one.</div>
          </div>
        </div>
      </Section>

      <Section
        label="Simulator"
        title="Inside one delivery: the seven steps of executeSubscriber"
        intro={
          <p>
            Every subscriber of an event runs this pipeline. Flip the switches and watch where it stops and what ends up
            on the <code>PubSubDelivery</code> row. That row is the first thing to check in Admin → PubSub → Deliveries
            when "the email didn't go out".
          </p>
        }
      >
        <DeliverySim />
        <Callout kind="real" title="Step 4 is not in the README">
          Marcos's doc lists idempotency → shape → MTEL conditions → subtopics → deliver. The code has one more gate
          between conditions and subtopics: <strong>CREAM-PIE recipe bindings</strong> (multitenancy P3). A recipe can be
          bound to a subscriber or a topic and veto deliveries, using the event's organization to pick which
          organization's bindings apply. It is the same recipe system the boards use, applied to events.
        </Callout>
        <Files items={[{ path: `${WS}/services/subscriberExecutionService.ts:508-700`, note: 'executeSubscriber: the seven steps, in order' }]} />
      </Section>

      <Section
        label="Payloads"
        title="Data shapes, payload filters and merge tags"
        intro={
          <p>
            A <strong>data shape</strong> is a flat list of fields a topic promises (or a subscriber requires). It is the
            contract between who emits and who listens, the PubSub version of a typed interface.
          </p>
        }
      >
        <pre className="ps-code">{`[
  { "path": "organization.name", "label": "Organization Name", "type": "string", "required": true  },
  { "path": "contact.email",     "label": "Contact Email",     "type": "string", "required": false }
]`}</pre>
        <ul className="kit-prose">
          <li><strong>Topics</strong> declare the shape they carry. <strong>Subscribers</strong> inherit it (<code>inheritShape: true</code>, the default) or declare their own.</li>
          <li>The shape editor can <strong>import</strong> fields from a Resource (a Prisma model) or another topic, with Merge or Replace.</li>
          <li><strong>Merge tags</strong> come from the effective shape as <code>{'{{ event.path }}'}</code>. With no shape, the picker falls back to the subscriber's resource fields as <code>{'{{ record.path }}'}</code> (the record is loaded at delivery time).</li>
          <li>Also available: <code>topic.*</code>, <code>now</code>, <code>secrets.*</code>. Transforms use <code>{'{{ expr | transform }}'}</code> (MTEL, <code>libs/mtel</code>).</li>
          <li>A subtopic's <strong>payloadFilter</strong> maps output paths to MTEL expressions, so a chain can reshape the payload between topics. An empty filter passes the payload through.</li>
        </ul>
        <Callout kind="info" title="Conditions are CREAM-PQL">
          Delivery conditions are saved as <code>{'{ logic: "AND", rules: [{ field: "event.action", operator: "equals", value: "created" }] }'}</code>.
          The executor routes them through CREAM-PQL's <code>normalizeConditions → compilePredicate</code>, so the MTEL{' '}
          <code>operator:</code> form and the canonical <code>op:</code> form read the same. It is the one condition dialect (doctrine §3),
          used for boards and events alike.
        </Callout>
      </Section>

      <Section
        label="Chains"
        title="Subtopics, topic chains and loop protection"
        intro={
          <p>
            A subscriber can publish follow-up topics when it fires, so one event can drive a small workflow
            (<code>form-submitted → lead-scored → crm-sync</code>) with no code. Subtopics fire only when the parent's own shape
            and conditions pass. <strong>Async</strong> ones (the default) fire before the parent delivers. <strong>Sync</strong> ones fire after it,
            in array order, each after its <code>delayMs</code>.
          </p>
        }
      >
        <LoopSim />
        <p className="kit-prose">
          The cap is per topic per chain, not a total depth. An intentional loop under the cap (re-scoring until a
          condition settles) is allowed: use the subtopic's payloadFilter and conditions as the reducer that ends it. The
          Synapse form also walks the subscriber → subtopic graph when you add one and warns{' '}
          <em>"The potential for an infinite loop has been detected…"</em> (Dismiss / Remove Topic).
        </p>
      </Section>

      <Section
        label="From outside"
        title="/pubsub/v1/publish: chains, sync topics and per-topic auth"
        intro={
          <p>
            <code>POST /pubsub/v1/publish/lead-created/lead-scored/crm-sync</code> publishes three topics with one body. They are
            processed <strong>in order</strong>: a registered topic with <code>isSynchronous: true</code> runs its subscribers inline, and
            the next topic waits for it (middleware-style). Every other topic is written as an event and delivered later by the worker.
          </p>
        }
      >
        <pre className="ps-code">{`{ "success": true, "message": "Published 3 topic(s)",
  "results": [
    { "topic": "lead-created", "eventId": 101, "registered": true,  "mode": "sync"  },
    { "topic": "lead-scored",  "eventId": 102, "registered": true,  "mode": "async" },
    { "topic": "crm-sync",     "eventId": 103, "registered": false, "mode": "async" } ] }`}</pre>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Topic is…</th><th>Caller needs</th></tr></thead>
            <tbody>
              <tr><td><Pill color="var(--teal)">customAuth</Pill> with a generated key</td><td><code>X-API-Key: &lt;topic key&gt;</code> (or <code>Authorization: Bearer</code>)</td></tr>
              <tr><td><Pill color="var(--purple-l)">requiresAuth</Pill> (default)</td><td>API token with <code>route:pubsub-v1</code>, or a JWT, of <strong>verified internal staff</strong> (a tenant user gets 403)</td></tr>
              <tr><td><Pill color="var(--green)">public</Pill> (no auth flags)</td><td>nothing</td></tr>
              <tr><td><Pill color="var(--pink)">system:*</Pill></td><td>standard auth <strong>and</strong> a verified Super Admin</td></tr>
              <tr><td><Pill color="var(--text-dim)">not registered</Pill></td><td>refused: 404 to verified staff, 401/403 to everyone else, so nobody can probe which names exist</td></tr>
            </tbody>
          </table>
        </div>
        <p className="kit-prose">
          Across a chain the <strong>strictest</strong> rule wins, and with several custom-auth topics the key must match every
          one. The same rules guard <code>/api/pubsub/emit</code> and <code>?publish=</code> (<code>modules/pubsub/topicPublishAuth.ts</code>).
        </p>
      </Section>

      <Section label="Building with it" title="The rules, as a checklist">
        <ul className="kit-prose">
          <li>Need an email, SMS, webhook or notification? <strong>Emit a domain event</strong> and add (or seed) a subscriber. Never call SendGrid, Twilio or <code>fetch(webhook)</code> from business code.</li>
          <li>Recipients live in <strong>subscriber rows</strong> or <code>NotificationRoute</code>, never in code.</li>
          <li>Name the topic for <strong>what happened</strong> (<code>crm:lead:qualified</code>), and treat the name as permanent.</li>
          <li>Give a topic a <strong>data shape</strong> when others will subscribe to it, so a missing field shows up as a SKIPPED row instead of a blank email.</li>
          <li>Money paths whose side effect fails emit a durable <code>system:fulfillment:failure</code> event instead of logging to stdout.</li>
          <li>Testing: Preview and Test work for EMAIL / TEXT / API subscribers, not CODE. Never "Resend" old <code>comms:email:requested</code> deliveries to test, because they are real client emails.</li>
        </ul>
        <Files
          items={[
            { path: 'docs/pubsub/README.md', note: 'the reference doc (Docs → PubSub)' },
            { path: 'docs/pubsub/DECISIONS-automailer-migration.md', note: 'decisions D1–D11 behind doctrine §8' },
            { path: `${WS}/services/pubsubService.ts`, note: 'emitPubSubEvent / emitExplicitTopics / emitTopicEvent' },
            { path: `${WS}/workers/pubsubWorker.ts`, note: 'enqueue loop + deliverLoop' },
            { path: `${WS}/services/subscriberExecutionService.ts`, note: 'per-subscriber pipeline, subtopics, loop cap' },
            { path: `${WS}/services/payloadShapeService.ts`, note: 'validatePayloadAgainstShape' },
            { path: `${WS}/modules/pubsub/`, note: '/pubsub/v1 publish, /api/pubsub management, topicPublishAuth' },
            { path: 'libs/prisma/src/utils/pubsubItems.ts', note: 'topics & subscribers as List items' },
            { path: 'libs/prisma/src/schema/migrations/20261113000500_pubsub_fold/README.md', note: 'the fold, field by field' },
            { path: 'apps/synapse-v3/src/components/admin/pubsub/', note: 'Admin → PubSub screens' },
          ]}
        />
      </Section>
    </>
  );
}
