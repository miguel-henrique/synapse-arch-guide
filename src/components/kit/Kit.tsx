import { useState, type ReactNode } from 'react';
import { Markdown } from '../Markdown';
import './Kit.css';

// ─────────────────────────────────────────────────────────────────────────────
// Shared building blocks for the content pages (Deep Dives, Modules,
// Tutorials, Questions). Kept deliberately small and dependency-free.
// ─────────────────────────────────────────────────────────────────────────────

export function PageHeader({ label, title, desc, children }: { label: string; title: string; desc: ReactNode; children?: ReactNode }) {
  return (
    <header className="kit-header">
      <div className="section__label">{label}</div>
      <h1 className="section__title">{title}</h1>
      <p className="section__desc">{desc}</p>
      {children}
    </header>
  );
}

export interface TabDef { id: string; label: string; icon?: string }

export function Tabs({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="kit-tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`kit-tab ${active === t.id ? 'kit-tab--on' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon && <span>{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  );
}

type CalloutKind = 'info' | 'tip' | 'warn' | 'danger' | 'real';
const CALLOUT_ICON: Record<CalloutKind, string> = { info: 'ℹ️', tip: '💡', warn: '⚠️', danger: '🛑', real: '📡' };

export function Callout({ kind = 'info', title, children }: { kind?: CalloutKind; title?: string; children: ReactNode }) {
  return (
    <div className={`kit-callout kit-callout--${kind}`}>
      <span className="kit-callout__icon">{CALLOUT_ICON[kind]}</span>
      <div className="kit-callout__body">
        {title && <div className="kit-callout__title">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Files({ items, title = 'Where it lives' }: { items: { path: string; note?: string }[]; title?: string }) {
  return (
    <div className="kit-files">
      <div className="kit-files__title">📁 {title}</div>
      <ul>
        {items.map(i => (
          <li key={i.path}>
            <code>{i.path}</code>
            {i.note && <span>{i.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Accordion({ items, title }: { items: { q: string; a: ReactNode }[]; title?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="kit-acc">
      {title && <div className="kit-acc__title">{title}</div>}
      {items.map((it, i) => (
        <div key={i} className={`kit-acc__item ${open === i ? 'kit-acc__item--open' : ''}`}>
          <button className="kit-acc__q" onClick={() => setOpen(o => (o === i ? null : i))} aria-expanded={open === i}>
            <span>{it.q}</span>
            <span className="kit-acc__chev">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && <div className="kit-acc__a animate-fade-in">{typeof it.a === 'string' ? <Markdown source={it.a} /> : it.a}</div>}
        </div>
      ))}
    </div>
  );
}

export type StepWhere = 'ui' | 'code' | 'cli' | 'db' | 'verify' | 'decide';
const WHERE_LABEL: Record<StepWhere, string> = {
  ui: '🖱️ Admin UI',
  code: '✍️ Code',
  cli: '⌨️ Terminal',
  db: '🗄️ Database',
  verify: '✅ Verify',
  decide: '🧭 Decide',
};

export interface Step { title: string; where: StepWhere; body: string }

/** A numbered, checkable step list. Bodies are markdown (code fences OK). */
export function Steps({ steps }: { steps: Step[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  return (
    <ol className="kit-steps">
      {steps.map((s, i) => (
        <li key={i} className={`kit-step kit-step--${s.where} ${done.has(i) ? 'kit-step--done' : ''}`}>
          <button
            className="kit-step__num"
            onClick={() => setDone(d => { const n = new Set(d); n.has(i) ? n.delete(i) : n.add(i); return n; })}
            aria-label={done.has(i) ? 'Mark step as not done' : 'Mark step as done'}
            title="Mark as done"
          >
            {done.has(i) ? '✓' : i + 1}
          </button>
          <div className="kit-step__content">
            <div className="kit-step__head">
              <span className="kit-step__where">{WHERE_LABEL[s.where]}</span>
              <span className="kit-step__title">{s.title}</span>
            </div>
            <Markdown source={s.body} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Pill({ children, color = 'var(--purple-l)' }: { children: ReactNode; color?: string }) {
  return <span className="kit-pill" style={{ '--pill-color': color } as React.CSSProperties}>{children}</span>;
}

export function Section({ id, label, title, children, intro }: { id?: string; label?: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="kit-section">
      {label && <div className="section__label">{label}</div>}
      <h2 className="kit-section__title">{title}</h2>
      {intro && <div className="kit-section__intro">{intro}</div>}
      {children}
    </section>
  );
}

/** A two-column "this vs that" comparison. */
export function Compare({ left, right }: { left: { title: string; color: string; body: ReactNode }; right: { title: string; color: string; body: ReactNode } }) {
  return (
    <div className="kit-compare">
      {[left, right].map((c, i) => (
        <div key={i} className="kit-compare__col" style={{ '--cmp-color': c.color } as React.CSSProperties}>
          <div className="kit-compare__title">{c.title}</div>
          <div className="kit-compare__body">{c.body}</div>
        </div>
      ))}
    </div>
  );
}
