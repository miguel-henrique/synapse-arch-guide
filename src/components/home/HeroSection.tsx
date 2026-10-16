import { useState, useEffect } from 'react';
import './HeroSection.css';

type Page = 'home' | 'course' | 'glossary';

// CREAM-PIE acronym — from docs/CREAM-PIE.md
// C=Context, R=Rules, E=Engine, A=Application, M=Matrix, P=Polymorphic, I=Injection, E=Execution
const ACRONYM = [
  { letter: 'C', word: 'Context' },
  { letter: 'R', word: 'Rules' },
  { letter: 'E', word: 'Engine' },
  { letter: 'A', word: 'Application' },
  { letter: 'M', word: 'Matrix' },
  { letter: 'P', word: 'Polymorphic' },
  { letter: 'I', word: 'Injection' },
  { letter: 'E', word: 'Execution' },
];

// ListType values from the official docs (STAGE, TAXONOMY, RELATIONSHIP, EVENT, TRANSFORM)
const LIST_TYPES = ['STAGE', 'TAXONOMY', 'RELATIONSHIP', 'EVENT', 'TRANSFORM'];

export default function HeroSection({ setPage }: { setPage: (p: Page) => void }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRevealed(r => {
        if (r >= ACRONYM.length) { clearInterval(timer); return r; }
        return r + 1;
      });
    }, 130);
    return () => clearInterval(timer);
  }, []);

  function scrollToArch() {
    document.getElementById('arch-overview')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section className="hero">
      {/* ── ambient background — full bleed ── */}
      <div className="hero__bg">
        <div className="hero__blob hero__blob--1" />
        <div className="hero__blob hero__blob--2" />
        <div className="hero__blob hero__blob--3" />
      </div>
      <div className="hero__fade" />

      {/* ── width-constrained inner ── */}
      <div className="hero__inner">

        {/* ── Left: copy ── */}
        <div className="hero__content">
          <div className="hero__eyebrow">
            <span className="badge badge--purple">CI Connect</span>
            <span className="badge badge--teal">Synapse v3</span>
          </div>

          <h1 className="hero__title">
            One engine.<br />
            <span className="hero__title-accent">Infinite context.</span>
          </h1>

          <p className="hero__desc">
            A deep-dive into the CREAM-PIE architecture — the Context Rules Engine
            that drives Synapse's Template Engine, state machines, RBAC, and every
            List-driven surface in CI Connect.
          </p>

          {/* CREAM-PIE acronym reveal */}
          <div className="hero__acronym">
            {ACRONYM.map((item, i) => (
              <div
                key={i}
                className={`hero__acronym-row ${i < revealed ? 'hero__acronym-row--visible' : ''}`}
                style={{ transitionDelay: `${i * 0.04}s` }}
              >
                <span className="hero__acronym-letter">{item.letter}</span>
                <span className="hero__acronym-word">{item.word}</span>
              </div>
            ))}
          </div>

          <div className="hero__ctas">
            <button className="hero__cta hero__cta--primary" onClick={() => setPage('course')}>
              Start the Course
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="hero__cta hero__cta--secondary" onClick={scrollToArch}>
              Explore Architecture
            </button>
          </div>
        </div>

        {/* ── Right: animated diagram ── */}
        <div className="hero__diagram">
          <div className="hero__diagram-box">
            {/* Static ring */}
            <div className="hero__diag-ring" />

            {/* Center node */}
            <div className="hero__diag-node--center">LIST</div>

            {/* Orbiting satellites */}
            <div className="hero__diag-orbit">
              {LIST_TYPES.map((t, i) => (
                <div key={t} className={`hero__diag-sat hero__diag-sat--${i + 1}`}>{t}</div>
              ))}
            </div>

            {/* SVG connector lines */}
            <svg className="hero__diag-lines" viewBox="0 0 340 340">
              {[
                { x1: 170, y1: 170, x2: 170, y2: 20 },
                { x1: 170, y1: 170, x2: 306, y2: 100 },
                { x1: 170, y1: 170, x2: 296, y2: 240 },
                { x1: 170, y1: 170, x2: 170, y2: 318 },
                { x1: 170, y1: 170, x2: 38,  y2: 100 },
              ].map((line, i) => (
                <line key={i} {...line}
                  stroke="rgba(124,108,255,0.18)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />
              ))}
            </svg>
          </div>
        </div>

      </div>

      {/* scroll hint */}
      <div className="hero__scroll-hint" onClick={scrollToArch}>
        <span>scroll</span>
        <div className="hero__scroll-arrow" />
      </div>
    </section>
  );
}
