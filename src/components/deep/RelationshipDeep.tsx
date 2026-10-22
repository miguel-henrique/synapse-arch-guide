import { useState } from 'react';
import { Callout, Compare, Files, Section } from '../kit/Kit';

// The part that is hardest to picture: how a filter reaches ACROSS a link.
// Three storage shapes, one playground that lights up which rows match.

interface LeadRow { id: string; name: string; campaignId: string | null }
interface MemberRow { campaign: number; lead: string; role: string }

const LEADS: LeadRow[] = [
  { id: 'L1', name: 'Ferguson Supply', campaignId: '8' },
  { id: 'L2', name: 'Ace Plumbing', campaignId: null },
  { id: 'L3', name: 'Delta HVAC', campaignId: '3' },
  { id: 'L4', name: 'Bright Electric', campaignId: null },
  { id: 'L5', name: 'Nova Roofing', campaignId: '8' },
];

const MEMBERS: MemberRow[] = [
  { campaign: 8, lead: 'L2', role: 'attendee' },
  { campaign: 8, lead: 'L3', role: 'prospect' },
  { campaign: 3, lead: 'L3', role: 'prospect' },
  { campaign: 8, lead: 'L5', role: 'attendee' },
];

type QueryId = 'stamp' | 'some' | 'union' | 'ne' | 'none' | 'every';

const QUERIES: Record<QueryId, {
  label: string;
  url: string;
  prisma: string;
  sql: string;
  match: (l: LeadRow) => boolean;
  why: (l: LeadRow) => string;
  lesson: string;
  tone: 'ok' | 'warn' | 'bad';
}> = {
  stamp: {
    label: 'Single FK column (the stamp)',
    url: 'when[campaignId][eq]=8',
    prisma: '{ campaignId: { equals: "8" } }',
    sql: "SELECT * FROM leads\nWHERE campaign_id = '8';",
    match: l => l.campaignId === '8',
    why: l => (l.campaignId === '8' ? 'its own campaignId column says 8' : `its campaignId is ${l.campaignId ?? 'NULL'}`),
    lesson: 'One column on the lead row, nothing to traverse. Fast and simple — but it only knows what was STAMPED. Ace Plumbing and Delta HVAC were attached to campaign 8 by membership and are invisible here. That is exactly the "leads I attached to the event don\'t show" bug.',
    tone: 'warn',
  },
  some: {
    label: 'Through the link: "some" (at least one)',
    url: 'when[campaignMembers.campaignId][eq]=8',
    prisma: '{ campaignMembers: { some: { campaignId: { equals: 8 } } } }',
    sql: 'SELECT * FROM leads l\nWHERE EXISTS (\n  SELECT 1 FROM campaign_members m\n  WHERE m.lead_id = l.id AND m.campaign_id = 8\n);',
    match: l => MEMBERS.some(m => m.lead === l.id && m.campaign === 8),
    why: l => {
      const rows = MEMBERS.filter(m => m.lead === l.id);
      if (rows.length === 0) return 'it has no membership rows at all';
      return rows.some(r => r.campaign === 8)
        ? `at least one of its ${rows.length} membership row(s) has campaign 8`
        : `none of its membership rows has campaign 8`;
    },
    lesson: 'The filter walks from each lead to its membership rows and asks "is there AT LEAST ONE row with campaign 8?" That is an EXISTS subquery — a semijoin: it returns leads, never duplicates them, and never returns the membership rows themselves. The compiler emits "some" by default for every to-many hop.',
    tone: 'ok',
  },
  union: {
    label: 'What the bespoke resolver does (stamp OR membership)',
    url: 'when[campaignId][eq]=8   (rewritten server-side)',
    prisma: '{ OR: [ { campaignId: "8" }, { id: { in: ["L2","L3","L5"] } } ] }',
    sql: "-- 1) side query:  SELECT lead_id FROM campaign_members WHERE campaign_id = 8\n-- 2) main query:\nSELECT * FROM leads\nWHERE campaign_id = '8' OR id IN ('L2','L3','L5');",
    match: l => l.campaignId === '8' || MEMBERS.some(m => m.lead === l.id && m.campaign === 8),
    why: l => (l.campaignId === '8' ? 'stamp matches' : MEMBERS.some(m => m.lead === l.id && m.campaign === 8) ? 'membership matches' : 'neither matches'),
    lesson: 'campaignMembershipFilter.ts pre-fetches member ids and silently rewrites a campaignId rule into "column OR id in (…)". The answer is right, but it is a second filter mechanism next to the compiler — the doctrine §3 anti-pattern. The doctrine fix is to make the link itself queryable and let the user (or a recipe) say which linkage they mean.',
    tone: 'warn',
  },
  ne: {
    label: '"ne" through the link — the surprise',
    url: 'when[campaignMembers.campaignId][ne]=8',
    prisma: '{ campaignMembers: { some: { campaignId: { not: 8 } } } }',
    sql: 'SELECT * FROM leads l\nWHERE EXISTS (\n  SELECT 1 FROM campaign_members m\n  WHERE m.lead_id = l.id AND m.campaign_id <> 8\n);',
    match: l => MEMBERS.some(m => m.lead === l.id && m.campaign !== 8),
    why: l => {
      const rows = MEMBERS.filter(m => m.lead === l.id);
      if (rows.length === 0) return 'it has no membership rows, so no row can be "not 8"';
      return rows.some(r => r.campaign !== 8) ? 'it has SOME membership row in another campaign' : 'every row it has is campaign 8';
    },
    lesson: 'Negation is applied at the column, INSIDE the "some": "has at least one membership in a campaign other than 8". Delta HVAC matches even though it IS in campaign 8, and leads with no memberships do not match. It does NOT mean "not in campaign 8" (prisma-where.ts nest(), comment above it).',
    tone: 'bad',
  },
  none: {
    label: '"notExists" — no link rows at all',
    url: 'when[campaignMembers][notExists]',
    prisma: '{ campaignMembers: { none: {} } }',
    sql: 'SELECT * FROM leads l\nWHERE NOT EXISTS (\n  SELECT 1 FROM campaign_members m WHERE m.lead_id = l.id\n);',
    match: l => !MEMBERS.some(m => m.lead === l.id),
    why: l => (MEMBERS.some(m => m.lead === l.id) ? 'it has at least one membership row' : 'it has no membership rows'),
    lesson: 'A bare relation as the leaf is an existence test — only exists / notExists / isNull / isNotNull are allowed there (relationLeaf). This is the anti-join: leads that were never attached to any campaign. "Not in campaign 8" specifically needs a stored recipe with an explicit rule.',
    tone: 'ok',
  },
  every: {
    label: '"every" — why the compiler refuses to default to it',
    url: '(not expressible in when[]) — shown for intuition',
    prisma: '{ campaignMembers: { every: { campaignId: { equals: 8 } } } }',
    sql: 'SELECT * FROM leads l\nWHERE NOT EXISTS (\n  SELECT 1 FROM campaign_members m\n  WHERE m.lead_id = l.id AND m.campaign_id <> 8\n);',
    match: l => MEMBERS.filter(m => m.lead === l.id).every(m => m.campaign === 8),
    why: l => {
      const rows = MEMBERS.filter(m => m.lead === l.id);
      if (rows.length === 0) return 'VACUOUSLY TRUE — it has no rows, so "all of its rows are campaign 8" holds';
      return rows.every(r => r.campaign === 8) ? 'all its rows are campaign 8' : 'one of its rows is another campaign';
    },
    lesson: '"Every membership is campaign 8" is true for a lead with NO memberships at all (vacuous truth). Ferguson and Bright Electric sneak in. A filter that silently widens is a data-leak primitive, so prisma-where.ts uses "some" for to-many hops (see the comment at lines 17-22).',
    tone: 'bad',
  },
};

export default function RelationshipDeep() {
  const [q, setQ] = useState<QueryId>('stamp');
  const [focus, setFocus] = useState<string | null>(null);
  const query = QUERIES[q];

  return (
    <Section
      label="Relationships"
      title="How a filter reaches across a link"
      intro={
        <>
          <p>
            "Relation list" mixes up three different things. Untangle them first, then play with the
            semijoin below.
          </p>
        </>
      }
    >
      <div className="rel3">
        <div className="rel3__card" style={{ '--c': 'var(--blue)' } as React.CSSProperties}>
          <div className="rel3__tag">1 · Foreign-key column</div>
          <h4>The link is a column on the row</h4>
          <div className="rel3__mini">
            <div className="rel3__table">
              <div className="rel3__th">leads</div>
              <div>id · name · <b>campaign_id</b></div>
              <div>L1 · Ferguson · <b>8</b></div>
            </div>
          </div>
          <code>when[campaignId][eq]=8</code>
          <p>Nothing to traverse. One lead → at most one campaign.</p>
        </div>

        <div className="rel3__card" style={{ '--c': 'var(--purple-l)' } as React.CSSProperties}>
          <div className="rel3__tag">2 · Prisma relation (junction)</div>
          <h4>The link is rows in a join table</h4>
          <div className="rel3__mini">
            <div className="rel3__table">
              <div className="rel3__th">leads</div>
              <div>L3 · Delta</div>
            </div>
            <span className="rel3__arrow">1 ─ ∗</span>
            <div className="rel3__table">
              <div className="rel3__th">campaign_members</div>
              <div><b>lead_id</b> · <b>campaign_id</b></div>
              <div>L3 · 8</div>
              <div>L3 · 3</div>
            </div>
          </div>
          <code>when[campaignMembers.campaignId][eq]=8</code>
          <p>Many-to-many. Needs a <em>declared</em> relation so the compiler can walk it. Emits <code>some</code>.</p>
        </div>

        <div className="rel3__card" style={{ '--c': 'var(--green)' } as React.CSSProperties}>
          <div className="rel3__tag">3 · RELATIONSHIP List edge</div>
          <h4>The link is a labelled triple</h4>
          <div className="rel3__mini">
            <div className="rel3__table rel3__table--wide">
              <div className="rel3__th">ListResource (edge)</div>
              <div>subject · <b>predicate</b> · object</div>
              <div>Contact 3 · <b>owner</b> · Org 7</div>
              <div>Org 7 · <b>vendor</b> · Org 12</div>
            </div>
          </div>
          <code>when[edges.organizationRole:owner.Organization.name][contains]=acme</code>
          <p>The predicate is a ListItem of a RELATIONSHIP list. Generic: any model to any model.</p>
        </div>
      </div>

      <Compare
        left={{
          title: 'A RELATIONSHIP List is a VOCABULARY',
          color: 'var(--green)',
          body: (
            <ul>
              <li>It names the <em>kinds</em> of edge: <code>owner</code>, <code>referrer</code>, <code>vendor</code>, <code>reseller</code>, <code>parent</code>…</li>
              <li>Items carry graph metadata: <code>inverseSlug</code>, <code>symmetric</code>, <code>directional</code>, <code>subjectKinds</code>.</li>
              <li>Bidirectional by declaration: store "A vendor-of B" once; reading from B's side gives the inverse label.</li>
              <li>Real ones: <code>organizationRole</code> (contact↔org), <code>organizationRelationshipType</code> (org↔org), <code>ambassadorPartnerLink</code>, <code>customerManufacturer</code>.</li>
            </ul>
          ),
        }}
        right={{
          title: 'A Prisma relation is STRUCTURE',
          color: 'var(--purple-l)',
          body: (
            <ul>
              <li>A foreign key the ORM can JOIN: <code>Lead.salesRepUser</code> → <code>User</code>.</li>
              <li>Declared in the schema (or a manifest field <code>{'{ "type": "relation", "relationTo": "User" }'}</code>).</li>
              <li>Filter with a dotted path: <code>when[salesRepUser.username][eq]=amy</code>.</li>
              <li>No label, no inverse semantics — just "this row points at that row".</li>
            </ul>
          ),
        }}
      />

      <h3>Semijoin playground — which leads match "campaign 8"?</h3>
      <p className="kit-prose">
        Five leads, four membership rows. Lead <b>L1</b> was stamped by a QR scan (column only),{' '}
        <b>L2</b> was attached to the event by hand (membership only), <b>L3</b> is in two campaigns,{' '}
        <b>L4</b> is in none, <b>L5</b> has both. Switch the query; click a lead to see why it does or
        does not match.
      </p>

      <div className="sj-queries">
        {(Object.keys(QUERIES) as QueryId[]).map(id => (
          <button key={id} className={`sj-q sj-q--${QUERIES[id].tone} ${q === id ? 'sj-q--on' : ''}`} onClick={() => { setQ(id); setFocus(null); }}>
            {QUERIES[id].label}
          </button>
        ))}
      </div>

      <div className="sj">
        <div className="sj__tables">
          <div className="sj__table">
            <div className="sj__th">leads</div>
            <div className="sj__hrow"><span>id</span><span>name</span><span>campaign_id</span><span /></div>
            {LEADS.map(l => {
              const hit = query.match(l);
              return (
                <button key={l.id} className={`sj__row ${hit ? 'sj__row--hit' : ''} ${focus === l.id ? 'sj__row--focus' : ''}`} onClick={() => setFocus(f => (f === l.id ? null : l.id))}>
                  <span>{l.id}</span>
                  <span>{l.name}</span>
                  <span className={q === 'stamp' || q === 'union' ? 'sj__col--used' : ''}>{l.campaignId ?? 'NULL'}</span>
                  <span className="sj__mark">{hit ? '✓' : '·'}</span>
                </button>
              );
            })}
          </div>
          <div className="sj__join">{q === 'stamp' ? '' : '⟵ EXISTS ⟶'}</div>
          <div className={`sj__table ${q === 'stamp' ? 'sj__table--unused' : ''}`}>
            <div className="sj__th">campaign_members</div>
            <div className="sj__hrow"><span>lead_id</span><span>campaign_id</span><span>role</span></div>
            {MEMBERS.map((m, i) => {
              const linked = focus === m.lead;
              const supports = q !== 'stamp' && (q === 'ne' ? m.campaign !== 8 : q === 'none' ? false : m.campaign === 8);
              return (
                <div key={i} className={`sj__mrow ${linked ? 'sj__mrow--linked' : ''} ${supports ? 'sj__mrow--support' : ''}`}>
                  <span>{m.lead}</span><span>{m.campaign}</span><span>{m.role}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sj__code">
          <div className="ua-out-label">URL</div>
          <pre className="ua-out">{query.url}</pre>
          <div className="ua-out-label">Prisma where</div>
          <pre className="ua-out">{query.prisma}</pre>
          <div className="ua-out-label">SQL (roughly)</div>
          <pre className="ua-out">{query.sql}</pre>
        </div>
      </div>

      <div className={`sj__lesson sj__lesson--${query.tone}`}>
        <strong>Matches: {LEADS.filter(query.match).map(l => l.name).join(', ') || 'nothing'}.</strong>{' '}
        {focus && (
          <em>
            {LEADS.find(l => l.id === focus)!.name}: {query.match(LEADS.find(l => l.id === focus)!) ? 'matches' : 'does not match'} because{' '}
            {query.why(LEADS.find(l => l.id === focus)!)}.{' '}
          </em>
        )}
        {query.lesson}
      </div>

      <h3>The <code>[some]</code> in the docs is not URL syntax</h3>
      <p className="kit-prose">
        The doctrine text writes the junction filter as <code>?when[campaignMembers][some][campaignId][eq]=8</code>. Read it as{' '}
        <em>pseudo-code for what the compiler produces</em>. The URL parser only understands{' '}
        <code>when[field][op]=value</code> (<code>when-query.ts</code> — <code>fromSearchParams</code>{' '}
        matches exactly two bracket groups). The real URL uses a <strong>dotted field</strong>:{' '}
        <code>when[campaignMembers.campaignId][eq]=8</code>; the field resolver splits the dots into
        hops, marks <code>campaignMembers</code> as to-many, and <code>nest()</code> in{' '}
        <code>prisma-where.ts</code> wraps it in <code>{'{ some: … }'}</code>. You write the path; the
        compiler picks the quantifier.
      </p>

      <Callout kind="warn" title="Reality check: the campaign example moved since the doctrine was written">
        On <code>stage</code>, <code>campaign_members</code> is no longer a table: migration{' '}
        <code>20261230000000_campaign_members_fold_into_edges</code> folded it into{' '}
        <code>ListResource</code> edges (<code>Project —campaignMember→ Lead|Contact|User</code>). So there
        is no Prisma relation to declare any more — the "relation" is now an <em>edge</em>, and the
        doctrine-shaped query would be an <code>edges.…</code> path. But the role list it uses,{' '}
        <code>campaignMemberRole</code>, is typed TAXONOMY (the edge grammar requires RELATIONSHIP), and{' '}
        <code>campaignMembershipFilter.ts</code> is still wired. This is an open question — see the
        Questions page.
      </Callout>

      <h3>Edge paths, read aloud</h3>
      <div className="kit-table-wrap">
        <table className="kit-table">
          <thead><tr><th>On resource</th><th>when field</th><th>Reads as</th></tr></thead>
          <tbody>
            <tr><td>contacts</td><td><code>edges.organizationRole:owner.Organization.name</code> contains acme</td><td>contacts who are an <b>owner</b> of an organization whose name contains "acme"</td></tr>
            <tr><td>contacts</td><td><code>edges.organizationRole:owner.Organization.billingAddress.state</code> eq TX</td><td>owners of an organization billed in Texas (the address part resolves first)</td></tr>
            <tr><td>organizations</td><td><code>edges.organizationRelationshipType:vendor.Organization</code> exists</td><td>organizations that play <b>vendor</b> toward some organization (inverse edges included)</td></tr>
            <tr><td>todos</td><td><code>edges.taskDependency.Todo</code> exists</td><td>todos that have any dependency edge to another todo</td></tr>
          </tbody>
        </table>
      </div>
      <p className="kit-prose">
        Grammar: <code>edges.&lt;listKey&gt;[:&lt;itemKey&gt;].&lt;Model&gt;[.&lt;path&gt;]</code>. The edge rule is
        resolved to a set of ids <em>before</em> compilation and becomes <code>{'{ id: { in: [...] } }'}</code> on the root
        model, ANDed under your scope — it can only narrow. Anything unresolvable (unknown list, a list that is
        not RELATIONSHIP, a model pair with no edge) fails with 422 instead of being dropped.
      </p>

      <Files
        items={[
          { path: 'apps/web-services/src/modules/cream-pie/edgePath.ts', note: 'the edges.* grammar and resolver (header comment is the best explanation)' },
          { path: 'libs/cream-pie/src/lib/prisma-where.ts:13-30, 154-203', note: 'segments, relationLeaf, nest() — where "some" comes from' },
          { path: 'apps/web-services/src/modules/cream-pie/fieldResolver.ts:322-370', note: 'dotted path → hops through the DMMF' },
          { path: 'libs/prisma/src/schema/system/List.prisma:117+', note: 'ListResource: TAXONOMY rows vs RELATIONSHIP triples' },
          { path: 'libs/prisma/src/seeders/seed-RelationshipGraphDefinitions.ts:64-118', note: 'organizationRole / organizationRelationshipType mirror seeding' },
          { path: 'apps/web-services/src/modules/cream-pie/campaignMembershipFilter.ts', note: 'the bespoke resolver still in place' },
        ]}
      />
    </Section>
  );
}
