import { useState } from 'react';
import './games.css';

// "Predict the rows": for each query, tick the leads you think match, then
// reveal. Trains the some / ne / notExists / every intuition.

export interface SemijoinActivity {
  kind: 'semijoin';
  prompt: string;
  leads: { id: string; name: string; campaignId: string | null }[];
  members: { lead: string; campaign: number }[];
  rounds: { url: string; plain: string; answer: string[]; lesson: string }[];
}

export default function SemijoinGame({ activity, onComplete }: { activity: SemijoinActivity; onComplete: () => void }) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const r = activity.rounds[round]!;
  const done = round >= activity.rounds.length - 1 && revealed;

  function toggle(id: string) {
    if (revealed) return;
    setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function reveal() {
    const correct = activity.leads.every(l => picked.has(l.id) === r.answer.includes(l.id));
    if (correct) setScore(s => s + 1);
    setRevealed(true);
  }
  function next() {
    setRound(x => x + 1);
    setPicked(new Set());
    setRevealed(false);
  }
  const exact = activity.leads.every(l => picked.has(l.id) === r.answer.includes(l.id));

  return (
    <div className="activity game">
      <p className="activity__prompt">{activity.prompt}</p>
      <div className="game__progress">Round {round + 1} / {activity.rounds.length} · score {score}</div>

      <div className="game__query">
        <code>{r.url}</code>
        <span>{r.plain}</span>
      </div>

      <div className="sjg">
        <div className="sjg__table">
          <div className="sjg__th">leads — tick the ones that match</div>
          {activity.leads.map(l => {
            const isAns = r.answer.includes(l.id);
            const cls = revealed ? (picked.has(l.id) === isAns ? (isAns ? 'sjg__row--hit' : '') : 'sjg__row--wrong') : picked.has(l.id) ? 'sjg__row--picked' : '';
            return (
              <button key={l.id} className={`sjg__row ${cls}`} onClick={() => toggle(l.id)}>
                <span className="sjg__box">{picked.has(l.id) ? '☑' : '☐'}</span>
                <span>{l.id}</span>
                <span>{l.name}</span>
                <span className="sjg__dim">campaign_id: {l.campaignId ?? 'NULL'}</span>
                {revealed && <span className="sjg__ans">{isAns ? 'matches' : '—'}</span>}
              </button>
            );
          })}
        </div>
        <div className="sjg__table">
          <div className="sjg__th">campaign_members</div>
          {activity.members.map((m, i) => (
            <div key={i} className="sjg__mrow"><span>lead {m.lead}</span><span>campaign {m.campaign}</span></div>
          ))}
          {activity.leads.filter(l => !activity.members.some(m => m.lead === l.id)).map(l => (
            <div key={l.id} className="sjg__mrow sjg__dim"><span>lead {l.id}</span><span>(no rows)</span></div>
          ))}
        </div>
      </div>

      {!revealed ? (
        <button className="activity__check-btn activity__check-btn--ready" onClick={reveal}>Reveal</button>
      ) : (
        <div className="activity__result">
          <div className="activity__result-score" style={exact ? undefined : { color: 'var(--pink)' }}>{exact ? '✓ Exactly right' : '✗ Not quite'}</div>
          <p className="activity__result-text">{r.lesson}</p>
          {!done ? (
            <button className="activity__next-btn" onClick={next}>Next query →</button>
          ) : (
            <>
              <p className="activity__result-text"><strong>{score}/{activity.rounds.length}</strong> rounds exact. The rule to remember: you write the path, the compiler adds <code>some</code>, and negation stays <em>inside</em> it.</p>
              <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
