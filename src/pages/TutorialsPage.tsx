import { useState } from 'react';
import { Callout, Files, PageHeader, Pill, Steps } from '../components/kit/Kit';
import { Markdown } from '../components/Markdown';
import { TUTORIALS, VERDICT } from '../data/tutorials';
import type { Page } from '../types';
import './TutorialsPage.css';

const GROUPS = ['Getting started', 'Leads', 'Infrastructure', 'Everyday'] as const;

export default function TutorialsPage({ setPage }: { setPage?: (p: Page) => void }) {
  const [id, setId] = useState(() => {
    const sub = window.location.hash.split('/')[2];
    return TUTORIALS.some(t => t.id === sub) ? sub! : TUTORIALS[0]!.id;
  });
  const t = TUTORIALS.find(x => x.id === id)!;

  function pick(next: string) {
    setId(next);
    history.replaceState(null, '', `#/tutorials/${next}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="kit-page">
      <PageHeader
        label="Tutorials"
        title="Real changes, step by step"
        desc={
          <>
            Every tutorial starts the way the doctrine says work must start: a <strong>triage</strong> — is
            this a data change (rows), a manifest change (rows declared in code), or real code? Then the
            exact files, JSON and commands. Tick the step numbers as you go.
          </>
        }
      >
        {setPage && <button className="kit-link-btn" onClick={() => setPage('modules')}>← Background: Modules</button>}
      </PageHeader>

      <div className="tut-legend">
        {Object.values(VERDICT).map(v => <Pill key={v.label} color={v.color}>{v.label}</Pill>)}
      </div>

      <div className="tut">
        <aside className="tut__side">
          {GROUPS.map(g => (
            <div key={g} className="tut__group">
              <div className="tut__group-title">{g}</div>
              {TUTORIALS.filter(x => x.group === g).map(x => (
                <button key={x.id} className={`tut__link ${x.id === id ? 'tut__link--on' : ''}`} onClick={() => pick(x.id)}
                  style={{ '--v': VERDICT[x.verdict].color } as React.CSSProperties}>
                  <span className="tut__dot" />
                  {x.title}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <article className="tut__main" key={t.id}>
          <div className="tut__group-title">{t.group}</div>
          <h2 className="tut__title">{t.title}</h2>
          <p className="tut__goal">🎯 {t.goal}</p>

          <div className="tut__triage" style={{ '--v': VERDICT[t.verdict].color } as React.CSSProperties}>
            <div className="tut__triage-head">
              <span>Triage verdict</span>
              <Pill color={VERDICT[t.verdict].color}>{VERDICT[t.verdict].label}</Pill>
            </div>
            <Markdown source={t.triage} />
          </div>

          <Steps steps={t.steps} />

          {t.pitfalls && t.pitfalls.length > 0 && (
            <Callout kind="warn" title="Pitfalls">
              <ul className="tut__pitfalls">
                {t.pitfalls.map((p, i) => <li key={i}><Markdown source={p} /></li>)}
              </ul>
            </Callout>
          )}

          {t.files && <Files items={t.files} />}

          <div className="tut__next">
            {(() => {
              const i = TUTORIALS.findIndex(x => x.id === t.id);
              const prev = TUTORIALS[i - 1];
              const next = TUTORIALS[i + 1];
              return (
                <>
                  {prev ? <button className="kit-link-btn" onClick={() => pick(prev.id)}>← {prev.title}</button> : <span />}
                  {next && <button className="kit-link-btn" onClick={() => pick(next.id)}>{next.title} →</button>}
                </>
              );
            })()}
          </div>
        </article>
      </div>
    </div>
  );
}
