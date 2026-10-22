import { useMemo, useState } from 'react';
import { Callout, Compare, Files, Section } from '../kit/Kit';

// TRANSFORM explained by running it. The rule engine below is a faithful port
// of apps/web-services/src/middleware/responseTransform.ts (stage 0ca89c748).

type Rule = { type: string; args: string[] };

function parseRule(rule: string): Rule | null {
  if (rule === 'snake_case') return { type: 'caseConvert', args: ['snake'] };
  if (rule === 'camelCase') return { type: 'caseConvert', args: ['camel'] };
  const i = rule.indexOf(':');
  if (i === -1) return null;
  return { type: rule.slice(0, i), args: rule.slice(i + 1).split('->') };
}
const toSnake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function applyToRecord(rec: Record<string, unknown>, rules: Rule[]) {
  let r: Record<string, unknown> = { ...rec };
  for (const rule of rules) {
    switch (rule.type) {
      case 'rename': { const [a, b] = rule.args; if (a! in r) { r[b!] = r[a!]; delete r[a!]; } break; }
      case 'flatten': {
        const [path, target] = rule.args;
        let v: unknown = r;
        for (const p of path!.split('.')) { if (v && typeof v === 'object') v = (v as Record<string, unknown>)[p]; else { v = undefined; break; } }
        if (v !== undefined) r[target!] = v;
        break;
      }
      case 'omit': delete r[rule.args[0]!]; break;
      case 'coerce': {
        const [f, t] = rule.args;
        if (f! in r) { const v = r[f!]; r[f!] = t === 'string' ? String(v ?? '') : t === 'number' ? Number(v) || 0 : t === 'boolean' ? Boolean(v) : v; }
        break;
      }
      case 'default': { const [f, d] = rule.args; if (r[f!] == null) r[f!] = d; break; }
      case 'caseConvert': {
        const conv = rule.args[0] === 'snake' ? toSnake : toCamel;
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) out[conv(k)] = v;
        r = out;
        break;
      }
    }
  }
  return r;
}

function applyTransform(body: { data: Record<string, unknown>[]; meta: unknown }, rules: Rule[]): unknown {
  const wrapper = rules.find(r => r.type === 'wrapper');
  const fieldRules = rules.filter(r => r.type !== 'wrapper');
  let data: unknown = body.data;
  if (Array.isArray(data) && fieldRules.length) data = data.map(rec => applyToRecord(rec, fieldRules));
  if (!wrapper) return { data, meta: body.meta };
  if (wrapper.args[0] === 'envelope') {
    const total = (body.meta as { pagination?: { total?: number } })?.pagination?.total ?? null;
    return { data, error: null, count: total };
  }
  if (wrapper.args[0] === 'raw') return data;
  return { data, meta: body.meta };
}

const INPUT = {
  data: [
    { id: 912, businessName: 'Acme HVAC', status: 'contacted', createdAt: '2026-10-20T14:02:11Z', internalNotes: 'call after 3pm', mrr: '4500', salesRepUser: { id: 54, username: 'amy' }, nextFollowUpDate: null },
    { id: 913, businessName: 'Nova Roofing', status: 'new', createdAt: '2026-10-21T09:40:00Z', internalNotes: null, mrr: null, salesRepUser: null, nextFollowUpDate: '2026-10-25' },
  ],
  meta: { pagination: { page: 1, pageSize: 2, total: 1472 } },
};

const AVAILABLE = [
  'wrapper:envelope',
  'wrapper:raw',
  'rename:businessName->name',
  'flatten:salesRepUser.username->rep',
  'omit:salesRepUser',
  'omit:internalNotes',
  'coerce:mrr->number',
  'default:nextFollowUpDate->unscheduled',
  'snake_case',
  'camelCase',
  'nonsense-without-colon',
];

export default function TransformDeep() {
  const [active, setActive] = useState<string[]>(['flatten:salesRepUser.username->rep', 'omit:salesRepUser', 'omit:internalNotes', 'snake_case', 'wrapper:envelope']);

  const rules = useMemo(() => active.map(parseRule).filter((r): r is Rule => r !== null), [active]);
  const output = useMemo(() => applyTransform(INPUT, rules), [rules]);
  const dropped = active.filter(a => parseRule(a) === null);

  function toggle(r: string) {
    setActive(a => (a.includes(r) ? a.filter(x => x !== r) : [...a, r]));
  }
  function move(r: string, dir: -1 | 1) {
    setActive(a => {
      const i = a.indexOf(r);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= a.length) return a;
      const n = [...a];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });
  }

  return (
    <Section
      label="ListType: TRANSFORM"
      title="TRANSFORM — a List that is a program, not a vocabulary"
      intro={
        <>
          <p>
            Every other ListType holds <em>business meaning</em> a person picks or a record carries
            (a stage, a tag, an edge label, an event cause). A TRANSFORM List holds <em>instructions</em>.
            Its items are never shown in a dropdown and never attached to a record. They are rule
            strings that a middleware executes, in position order, to reshape an API response for a
            client that expects a different shape.
          </p>
        </>
      }
    >
      <Compare
        left={{
          title: 'TAXONOMY list "leadTag"',
          color: 'var(--blue)',
          body: (
            <ul>
              <li>Items: <code>warm</code>, <code>cold</code>, <code>big_fish</code></li>
              <li>A user applies them to a lead (ListResource rows)</li>
              <li>Shown as chips / filters</li>
              <li>Answers: <em>"what kind of lead is this?"</em></li>
            </ul>
          ),
        }}
        right={{
          title: 'TRANSFORM list "supabaseCompat" (example)',
          color: 'var(--yellow)',
          body: (
            <ul>
              <li>Items: <code>rename:createdAt-&gt;created_at</code>, <code>omit:internalNotes</code>, <code>wrapper:envelope</code></li>
              <li>Nobody applies them to a record — <code>resources</code> is irrelevant</li>
              <li>Read by <code>responseTransform.ts</code> when a request says <code>?transform=supabaseCompat</code></li>
              <li>Answers: <em>"what shape should this payload have?"</em></li>
            </ul>
          ),
        }}
      />

      <h3>Playground — toggle and reorder rules, watch the payload change</h3>
      <p className="kit-prose">
        This is the same algorithm as the middleware: field rules run per record, in order; at most one{' '}
        <code>wrapper:</code> decides the envelope. Only the item <code>label</code> is read. A rule with no
        colon is silently ignored.
      </p>

      <div className="tf">
        <div className="tf__rules">
          <div className="ua-out-label">Items of the TRANSFORM list (position order)</div>
          {active.map((r, i) => (
            <div key={r} className={`tf__rule tf__rule--on ${parseRule(r) ? '' : 'tf__rule--bad'}`}>
              <span className="tf__pos">{(i + 1) * 10}</span>
              <code>{r}</code>
              <span className="tf__btns">
                <button onClick={() => move(r, -1)} aria-label="Move up">↑</button>
                <button onClick={() => move(r, 1)} aria-label="Move down">↓</button>
                <button onClick={() => toggle(r)} aria-label="Remove">✕</button>
              </span>
            </div>
          ))}
          <div className="ua-out-label" style={{ marginTop: '1rem' }}>Add a rule</div>
          <div className="tf__pool">
            {AVAILABLE.filter(r => !active.includes(r)).map(r => (
              <button key={r} className="tf__add" onClick={() => toggle(r)}>+ {r}</button>
            ))}
          </div>
          {dropped.length > 0 && (
            <Callout kind="warn">
              <code>{dropped.join(', ')}</code> has no colon → <code>parseRule</code> returns null and the
              rule is dropped without an error. Nobody is told a rule was ignored.
            </Callout>
          )}
        </div>
        <div className="tf__io">
          <div className="ua-out-label">Input — what the generic route returns</div>
          <pre className="ua-out tf__json">{JSON.stringify(INPUT, null, 2)}</pre>
          <div className="ua-out-label">Output — with <code>?transform=…</code></div>
          <pre className="ua-out tf__json tf__json--out">{JSON.stringify(output, null, 2)}</pre>
        </div>
      </div>

      <h3>Things to notice while playing</h3>
      <ul className="kit-prose">
        <li><strong>Order matters.</strong> Put <code>snake_case</code> before <code>omit:internalNotes</code> and the omit stops working — the key is now <code>internal_notes</code>.</li>
        <li><strong><code>flatten</code> then <code>omit</code></strong> lifts a nested value up and drops the object — the usual way to give a flat client a related field.</li>
        <li><strong><code>coerce:mrr-&gt;number</code></strong> turns <code>null</code> into <code>0</code> (<code>Number(v) || 0</code>) — data changes meaning silently.</li>
        <li><strong><code>wrapper:envelope</code></strong> produces <code>{'{ data, error: null, count }'}</code> — the shape Supabase-style clients expect, which is the evident motivation.</li>
        <li>Case conversion is <strong>shallow</strong>: keys inside nested objects keep their case.</li>
      </ul>

      <Callout kind="real" title="In the real system today">
        <p>
          The <code>TRANSFORM</code> enum value exists (<code>List.prisma:247-253</code>), the middleware is mounted
          on the generic route (<code>apiRoutes.ts:326</code>), but <strong>zero TRANSFORM lists are seeded</strong>{' '}
          — <code>SEEDED-LISTS.md</code> counts 0 and the read-only production view shows 75 TAXONOMY, 11 STAGE,
          9 RELATIONSHIP and no TRANSFORM lists. The docs (SEEDED-LISTS §3.2) even propose that TRANSFORM
          should <em>leave</em> the ListType axis, because it is "not a business vocabulary at all".
        </p>
        <p>
          So if TRANSFORM never clicked for you: that is a fair reaction. It is a payload-shaping feature that
          happens to be stored in the List tables, it is currently unused, and the architects themselves
          flag it as a misfit.
        </p>
      </Callout>

      <Files
        items={[
          { path: 'apps/web-services/src/middleware/responseTransform.ts', note: 'grammar (header), parseRule :35-47, applyTransform :119-159, 60s cache' },
          { path: 'libs/prisma/src/schema/system/List.prisma:231-253', note: 'ListType enum and the TRANSFORM doc comment' },
          { path: 'docs/architecture/SEEDED-LISTS.md:507-529', note: '"0 TRANSFORM lists" and the proposal to retire it from the axis' },
        ]}
      />
    </Section>
  );
}
