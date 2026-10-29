import { useState } from 'react';
import './games.css';

// "Who wrote this parameter?": attribute every parameter of a real URL to the
// layer that produced it.

export interface UrlSourceActivity {
  kind: 'urlsource';
  prompt: string;
  sources: { id: string; label: string }[];
  urls: { title: string; context: string; params: { text: string; source: string; why: string }[] }[];
}

export default function UrlSourceGame({ activity, onComplete }: { activity: UrlSourceActivity; onComplete: () => void }) {
  const [u, setU] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const url = activity.urls[u]!;
  const all = url.params.every((_, i) => answers[i]);
  const score = url.params.filter((p, i) => answers[i] === p.source).length;
  const last = u === activity.urls.length - 1;

  return (
    <div className="activity game">
      <p className="activity__prompt">{activity.prompt}</p>
      <div className="game__progress">URL {u + 1} / {activity.urls.length} — {url.title}</div>
      <p className="game__story">{url.context}</p>

      <div className="usg">
        {url.params.map((p, i) => {
          const ok = answers[i] === p.source;
          return (
            <div key={i} className={`usg__row ${checked ? (ok ? 'usg__row--ok' : 'usg__row--no') : ''}`}>
              <code className="usg__param">{p.text}</code>
              <select value={answers[i] ?? ''} disabled={checked} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}>
                <option value="">who wrote it?</option>
                {activity.sources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              {checked && (
                <div className="usg__why">
                  {ok ? '✓ ' : `✗ ${activity.sources.find(s => s.id === p.source)?.label} — `}{p.why}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!checked ? (
        <button className={`activity__check-btn ${all ? 'activity__check-btn--ready' : ''}`} disabled={!all} onClick={() => setChecked(true)}>Check</button>
      ) : (
        <div className="activity__result">
          <div className="activity__result-score">{score}/{url.params.length}</div>
          {!last ? (
            <button className="activity__next-btn" onClick={() => { setU(x => x + 1); setAnswers({}); setChecked(false); }}>Next URL →</button>
          ) : (
            <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
          )}
        </div>
      )}
    </div>
  );
}
