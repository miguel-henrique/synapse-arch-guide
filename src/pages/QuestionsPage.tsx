import { useMemo, useState } from 'react';
import { Callout, PageHeader, Pill } from '../components/kit/Kit';
import { Markdown } from '../components/Markdown';
import { COMPONENTS, QUESTIONS, type Evidence, type Kind, type Severity } from '../data/questions';
import './QuestionsPage.css';

const SEV: Record<Severity, { label: string; color: string; rank: number }> = {
  high: { label: 'High', color: 'var(--pink)', rank: 0 },
  medium: { label: 'Medium', color: 'var(--orange-l)', rank: 1 },
  low: { label: 'Low', color: 'var(--yellow)', rank: 2 },
  info: { label: 'Info', color: 'var(--blue)', rank: 3 },
};
const KIND: Record<Kind, { label: string; icon: string }> = {
  security: { label: 'Security', icon: '🔐' },
  gap: { label: 'Architectural gap', icon: '🧩' },
  data: { label: 'Data quality', icon: '📡' },
  docs: { label: 'Docs', icon: '📄' },
};
const EVID: Record<Evidence, { label: string; color: string; tip: string }> = {
  verified: { label: 'verified in code', color: 'var(--green)', tip: 'Read in the source; not executed.' },
  observed: { label: 'observed in prod', color: 'var(--teal)', tip: 'Seen in production data through the read-only MCP.' },
  suspected: { label: 'suspected', color: 'var(--orange-l)', tip: 'Inferred from code; needs confirmation.' },
};

export default function QuestionsPage() {
  const [component, setComponent] = useState<string>('all');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [open, setOpen] = useState<string | null>('S1');

  const list = useMemo(
    () =>
      QUESTIONS.filter(q => (component === 'all' || q.component === component) && (kind === 'all' || q.kind === kind))
        .sort((a, b) => SEV[a.severity].rank - SEV[b.severity].rank),
    [component, kind],
  );

  const counts = (Object.keys(SEV) as Severity[]).map(s => ({ s, n: QUESTIONS.filter(q => q.severity === s).length }));

  return (
    <div className="kit-page">
      <PageHeader
        label="Questions"
        title="Gaps, risks and open questions"
        desc={
          <>
            What did not add up while reading the docs, the code and production data side by side. Each
            item says how it was established and ends with the question worth asking the team. Use it
            as a review checklist — and as a way to test your understanding: you should be able to
            explain <em>why</em> each one matters.
          </>
        }
      />

      <Callout kind="info" title="How to read this">
        <strong>Verified</strong> = read in <code>ci-connect</code> <code>origin/stage</code> (not executed).{' '}
        <strong>Observed</strong> = seen in production through the read-only CRM MCP (aggregates only).{' '}
        <strong>Suspected</strong> = inferred; confirm in a local/task environment before raising it as a bug.
        Nothing here was tested against a live system. Severities are a reviewer's first guess.
      </Callout>

      <div className="q-stats">
        {counts.map(c => (
          <div key={c.s} className="q-stat" style={{ '--sev': SEV[c.s].color } as React.CSSProperties}>
            <span className="q-stat__n">{c.n}</span>
            <span>{SEV[c.s].label}</span>
          </div>
        ))}
      </div>

      <div className="q-filters">
        <div className="q-filter-row">
          <span className="q-filter-label">Component</span>
          {['all', ...COMPONENTS].map(c => (
            <button key={c} className={`q-chip ${component === c ? 'q-chip--on' : ''}`} onClick={() => setComponent(c)}>
              {c === 'all' ? 'All' : c}
              <span className="q-chip__n">{c === 'all' ? QUESTIONS.length : QUESTIONS.filter(q => q.component === c).length}</span>
            </button>
          ))}
        </div>
        <div className="q-filter-row">
          <span className="q-filter-label">Kind</span>
          {(['all', 'security', 'gap', 'data', 'docs'] as const).map(k => (
            <button key={k} className={`q-chip ${kind === k ? 'q-chip--on' : ''}`} onClick={() => setKind(k)}>
              {k === 'all' ? 'All' : `${KIND[k].icon} ${KIND[k].label}`}
            </button>
          ))}
        </div>
      </div>

      <div className="q-list">
        {list.map(q => {
          const isOpen = open === q.id;
          return (
            <div key={q.id} className={`q-item ${isOpen ? 'q-item--open' : ''}`} style={{ '--sev': SEV[q.severity].color } as React.CSSProperties}>
              <button className="q-item__head" onClick={() => setOpen(o => (o === q.id ? null : q.id))} aria-expanded={isOpen}>
                <span className="q-item__id">{q.id}</span>
                <span className="q-item__title">{q.title}</span>
                <span className="q-item__tags">
                  <Pill color={SEV[q.severity].color}>{SEV[q.severity].label}</Pill>
                  <Pill color="var(--text-dim)">{KIND[q.kind].icon} {q.component}</Pill>
                  <span title={EVID[q.evidence].tip}><Pill color={EVID[q.evidence].color}>{EVID[q.evidence].label}</Pill></span>
                </span>
              </button>
              {isOpen && (
                <div className="q-item__body animate-fade-in">
                  <Markdown source={q.detail} />
                  <div className="q-ask">
                    <span className="q-ask__label">❓ Ask the team</span>
                    <Markdown source={q.ask} />
                  </div>
                  {q.files && (
                    <ul className="q-files">
                      {q.files.map(f => <li key={f}><code>{f}</code></li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="q-empty">Nothing matches these filters.</p>}
      </div>
    </div>
  );
}
