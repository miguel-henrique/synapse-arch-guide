import { useState } from 'react';
import './ArchOverview.css';

const LAYERS = [
  {
    id: 'data',
    label: 'Domain Data',
    color: 'var(--blue)',
    icon: '🗃️',
    items: ['Contact', 'Organization', 'Invoice', 'Ticket', 'Project'],
    desc: 'The actual business records. Row-level data. Everything that exists.',
  },
  {
    id: 'list',
    label: 'List Primitive',
    color: 'var(--purple-l)',
    icon: '📋',
    items: ['STAGE', 'TAXONOMY', 'RELATIONSHIP', 'EVENT', 'TRANSFORM'],
    desc: 'The vocabulary engine. Replaces hardcoded enums. Defines what concepts exist and how they behave. Every List has a key, a type, and a set of ListItems.',
  },
  {
    id: 'relationship',
    label: 'Relationships + Perspective',
    color: 'var(--green)',
    icon: '🕸️',
    items: ['Contact↔Org', 'Org↔Org', 'PRBAC', 'Organization Context'],
    desc: 'How everything is connected and what it means depending on who\'s looking.',
  },
  {
    id: 'creampie',
    label: 'CREAM-PIE',
    color: 'var(--orange-l)',
    icon: '🍰',
    items: ['Recipes', 'MTEL', 'Conditions', 'Query Params', 'RBAC'],
    desc: 'The context rules engine. Named Recipes translate the List vocabulary into behavior: query parameters, UI configuration, RBAC, menu items, and pub/sub conditions — all from one stored JSON recipe.',
  },
  {
    id: 'execution',
    label: 'Execution Engines',
    color: 'var(--teal)',
    icon: '⚡',
    items: ['Rendering Engine', 'Query Engine', 'Pub/Sub', 'State Machine'],
    desc: 'What the system actually does. UI renders, queries run, events fire, states transition.',
  },
];

export default function ArchOverview() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="section" id="arch-overview">
      <div className="section__label">The Big Picture</div>
      <h2 className="section__title">Five layers. One coherent system.</h2>
      <p className="section__desc">
        Synapse-v3 is not a collection of features — it's a data-and-rules operating system.
        Every layer feeds into the next. Click a layer to understand its role.
      </p>

      <div className="arch-stack">
        {LAYERS.map((layer, i) => {
          const isActive = active === layer.id;
          return (
            <div
              key={layer.id}
              className={`arch-layer ${isActive ? 'arch-layer--active' : ''}`}
              style={{ '--layer-color': layer.color, '--delay': `${i * 0.08}s` } as React.CSSProperties}
              onClick={() => setActive(isActive ? null : layer.id)}
            >
              <div className="arch-layer__left">
                <span className="arch-layer__icon">{layer.icon}</span>
                <div>
                  <div className="arch-layer__num">Layer {i + 1}</div>
                  <div className="arch-layer__name">{layer.label}</div>
                </div>
              </div>

              <div className="arch-layer__tags">
                {layer.items.map(item => (
                  <span key={item} className="arch-layer__tag">{item}</span>
                ))}
              </div>

              <span className="arch-layer__chevron">{isActive ? '▲' : '▼'}</span>

              {isActive && (
                <div className="arch-layer__desc animate-fade-in">
                  {layer.desc}
                </div>
              )}
            </div>
          );
        })}

        {/* flow arrows */}
        <div className="arch-arrows">
          {LAYERS.slice(0, -1).map((_, i) => (
            <div key={i} className="arch-arrow">▼</div>
          ))}
        </div>
      </div>

      {/* the one sentence */}
      <blockquote className="arch-quote">
        <span className="arch-quote__mark">"</span>
        Data describes what exists.
        Lists describe the vocabulary.
        CREAM-PIE describes the rules.
        Relationships describe context.
        Generic engines interpret all of that to produce behavior.
        <span className="arch-quote__mark">"</span>
      </blockquote>
    </section>
  );
}
