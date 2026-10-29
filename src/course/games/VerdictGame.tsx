import { useState } from 'react';
import './games.css';

// "Be the referee": a stack of scenario cards; for each, choose the verdict
// and read why. Used for the resource-view decisions and for request triage.

export interface VerdictActivity {
  kind: 'verdict';
  prompt: string;
  /** Short title of the role the player takes, e.g. "Referee". */
  role: string;
  cards: { scenario: string; options: string[]; correct: number; why: string; ref?: string }[];
}

export default function VerdictGame({ activity, onComplete }: { activity: VerdictActivity; onComplete: () => void }) {
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const card = activity.cards[i]!;
  const last = i === activity.cards.length - 1;

  function pick(o: number) {
    if (choice !== null) return;
    setChoice(o);
    if (o === card.correct) setScore(s => s + 1);
  }

  return (
    <div className="activity game">
      <p className="activity__prompt">{activity.prompt}</p>
      <div className="game__progress">{activity.role} · card {i + 1} / {activity.cards.length} · score {score}</div>

      <div className="vg__card animate-fade-in" key={i}>
        <p className="vg__scenario">{card.scenario}</p>
        <div className="vg__options">
          {card.options.map((o, k) => {
            let cls = 'vg__opt';
            if (choice !== null) {
              if (k === card.correct) cls += ' vg__opt--ok';
              else if (k === choice) cls += ' vg__opt--no';
              else cls += ' vg__opt--dim';
            }
            return <button key={k} className={cls} onClick={() => pick(k)}>{o}</button>;
          })}
        </div>
        {choice !== null && (
          <div className={`vg__why ${choice === card.correct ? 'vg__why--ok' : 'vg__why--no'}`}>
            {choice === card.correct ? '✓ ' : '✗ '}{card.why}
            {card.ref && <div className="vg__ref">{card.ref}</div>}
          </div>
        )}
      </div>

      {choice !== null && (
        <div className="activity__result">
          {!last ? (
            <button className="activity__next-btn" onClick={() => { setI(x => x + 1); setChoice(null); }}>Next card →</button>
          ) : (
            <>
              <div className="activity__result-score">{score}/{activity.cards.length}</div>
              <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
