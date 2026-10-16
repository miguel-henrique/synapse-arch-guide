import { useState, useRef, useEffect } from 'react';
import './PasswordGate.css';

interface Props { onAuth: (pw: string) => boolean; }

export default function PasswordGate({ onAuth }: Props) {
  const [value, setValue]   = useState('');
  const [error, setError]   = useState(false);
  const [shake, setShake]   = useState(false);
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = onAuth(value);
    if (!ok) {
      setError(true);
      setShake(true);
      setValue('');
      setTimeout(() => setShake(false), 600);
      setTimeout(() => setError(false), 3000);
    }
  }

  return (
    <div className="gate">
      <div className="gate__bg">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="gate__particle" style={{
            '--delay': `${Math.random() * 4}s`,
            '--x': `${Math.random() * 100}%`,
            '--size': `${2 + Math.random() * 4}px`,
            '--dur': `${3 + Math.random() * 4}s`,
          } as React.CSSProperties} />
        ))}
      </div>

      <div className={`gate__card ${shake ? 'shake' : ''}`}>
        <div className="gate__logo">
          <div className="gate__logo-ring" />
          <div className="gate__logo-ring gate__logo-ring--2" />
          <span className="gate__logo-text">C</span>
        </div>

        <h1 className="gate__title">
          Synapse Architecture Guide
        </h1>
        <p className="gate__subtitle">
          A guide to CREAM-PIE, the Template Engine,<br />
          and the List-driven architecture of CI Connect.
        </p>

        <form onSubmit={handleSubmit} className="gate__form">
          <div className={`gate__input-wrap ${error ? 'gate__input-wrap--error' : ''}`}>
            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter password"
              className="gate__input"
              autoComplete="off"
            />
            <button type="submit" className="gate__btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          {error && (
            <p className="gate__error animate-fade-in">
              Incorrect password. Try again.
            </p>
          )}
        </form>

        <p className="gate__hint">Hint: The name of the engine 🍰</p>
      </div>
    </div>
  );
}
