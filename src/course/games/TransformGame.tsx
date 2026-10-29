import { useMemo, useState } from 'react';
import './games.css';

// "Make the payload match": pick and order TRANSFORM rules until the output
// equals the target shape. Same algorithm as responseTransform.ts.

export interface TransformActivity {
  kind: 'transform';
  prompt: string;
  puzzles: {
    story: string;
    input: Record<string, unknown>[];
    total: number;
    target: unknown;
    pool: string[];
    solutionHint: string;
  }[];
}

type Rule = { type: string; args: string[] };
function parse(rule: string): Rule | null {
  if (rule === 'snake_case') return { type: 'case', args: ['snake'] };
  if (rule === 'camelCase') return { type: 'case', args: ['camel'] };
  const i = rule.indexOf(':');
  if (i === -1) return null;
  return { type: rule.slice(0, i), args: rule.slice(i + 1).split('->') };
}
const snake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function run(input: Record<string, unknown>[], total: number, ruleStrs: string[]): unknown {
  const rules = ruleStrs.map(parse).filter((r): r is Rule => r !== null);
  const wrapper = rules.find(r => r.type === 'wrapper');
  const field = rules.filter(r => r.type !== 'wrapper');
  const data = input.map(rec => {
    let r: Record<string, unknown> = { ...rec };
    for (const rule of field) {
      const [a, b] = rule.args;
      if (rule.type === 'rename' && a! in r) { r[b!] = r[a!]; delete r[a!]; }
      if (rule.type === 'omit') delete r[a!];
      if (rule.type === 'flatten') {
        let v: unknown = r;
        for (const p of a!.split('.')) { if (v && typeof v === 'object') v = (v as Record<string, unknown>)[p]; else { v = undefined; break; } }
        if (v !== undefined) r[b!] = v;
      }
      if (rule.type === 'coerce' && a! in r) { const v = r[a!]; r[a!] = b === 'string' ? String(v ?? '') : b === 'number' ? Number(v) || 0 : Boolean(v); }
      if (rule.type === 'default' && r[a!] == null) r[a!] = b;
      if (rule.type === 'case') { const c = a === 'snake' ? snake : camel; const o: Record<string, unknown> = {}; for (const [k, v] of Object.entries(r)) o[c(k)] = v; r = o; }
    }
    return r;
  });
  const meta = { pagination: { total } };
  if (!wrapper) return { data, meta };
  if (wrapper.args[0] === 'envelope') return { data, error: null, count: total };
  if (wrapper.args[0] === 'raw') return data;
  return { data, meta };
}

/** Key-order-insensitive deep equality. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (typeof a === 'object') {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every(k => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

export default function TransformGame({ activity, onComplete }: { activity: TransformActivity; onComplete: () => void }) {
  const [idx, setIdx] = useState(0);
  const [rules, setRules] = useState<string[]>([]);
  const [hint, setHint] = useState(false);
  const p = activity.puzzles[idx]!;
  const out = useMemo(() => run(p.input, p.total, rules), [p, rules]);
  const solved = same(out, p.target);
  const last = idx === activity.puzzles.length - 1;

  function add(r: string) { setRules(x => [...x, r]); }
  function remove(i: number) { setRules(x => x.filter((_, j) => j !== i)); }
  function up(i: number) { if (i === 0) return; setRules(x => { const n = [...x]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; return n; }); }

  return (
    <div className="activity game">
      <p className="activity__prompt">{activity.prompt}</p>
      <div className="game__progress">Puzzle {idx + 1} / {activity.puzzles.length}</div>
      <p className="game__story">{p.story}</p>

      <div className="tfg">
        <div>
          <div className="game__label">Your TRANSFORM list (runs top → bottom)</div>
          {rules.length === 0 && <div className="tfg__empty">Add rules from the pool below.</div>}
          {rules.map((r, i) => (
            <div key={i} className="tfg__rule">
              <span className="tfg__pos">{(i + 1) * 10}</span>
              <code>{r}</code>
              <button onClick={() => up(i)} aria-label="Move up">↑</button>
              <button onClick={() => remove(i)} aria-label="Remove">✕</button>
            </div>
          ))}
          <div className="game__label">Pool</div>
          <div className="tfg__pool">
            {p.pool.map(r => <button key={r} className="tfg__add" onClick={() => add(r)}>+ {r}</button>)}
          </div>
          <button className="game__hint" onClick={() => setHint(h => !h)}>{hint ? 'Hide hint' : 'Hint'}</button>
          {hint && <p className="game__hint-text">{p.solutionHint}</p>}
        </div>
        <div>
          <div className="game__label">Target</div>
          <pre className="tfg__json">{JSON.stringify(p.target, null, 2)}</pre>
          <div className="game__label">Your output {solved ? '✓' : ''}</div>
          <pre className={`tfg__json ${solved ? 'tfg__json--ok' : 'tfg__json--no'}`}>{JSON.stringify(out, null, 2)}</pre>
        </div>
      </div>

      {solved && (
        <div className="activity__result">
          <div className="activity__result-score">Payload matches ✓</div>
          {!last ? (
            <button className="activity__next-btn" onClick={() => { setIdx(i => i + 1); setRules([]); setHint(false); }}>Next puzzle →</button>
          ) : (
            <>
              <p className="activity__result-text">You just wrote three TRANSFORM lists. Notice none of them is a vocabulary anyone picks from — they are programs stored as ListItems.</p>
              <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
            </>
          )}
        </div>
      )}
      {!solved && <button className="game__skip" onClick={onComplete}>Skip to quiz</button>}
    </div>
  );
}
