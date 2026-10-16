import { useState } from 'react';
import './ListPrimitive.css';

// ListType values from the official Prisma enum (SEEDED-LISTS.md):
// STAGE, TAXONOMY, RELATIONSHIP, EVENT, TRANSFORM
const LIST_TYPES = [
  {
    type: 'STAGE',
    color: 'var(--orange-l)',
    border: 'rgba(255,124,58,0.3)',
    bg: 'rgba(255,124,58,0.08)',
    icon: '🔄',
    desc: 'Governs a lifecycle. Has initial/terminal states and allowed transitions. The system can refuse a transition that isn\'t permitted.',
    example: 'customerStatus',
    values: [
      { label: 'lead',      isInitial: true,  isTerminal: false, group: 'prospect' },
      { label: 'customer',  isInitial: false, isTerminal: false, group: 'active' },
      { label: 'at_risk',   isInitial: false, isTerminal: false, group: 'active' },
      { label: 'cancelled', isInitial: false, isTerminal: true,  group: 'churned' },
      { label: 'fired',     isInitial: false, isTerminal: true,  group: 'churned' },
    ],
    question: 'Where in the journey?',
    useCase: 'A STAGE list with 4+ values → the Template Engine offers a Kanban view',
  },
  {
    type: 'TAXONOMY',
    color: 'var(--blue)',
    border: 'rgba(58,159,255,0.3)',
    bg: 'rgba(58,159,255,0.08)',
    icon: '🏷️',
    desc: 'Classification/tagging. No governed journey. Multiple values can be applied at once (when selectionType = MULTIPLE).',
    example: 'industry',
    values: [
      { label: 'Home Services',   isInitial: false, isTerminal: false, group: '' },
      { label: 'Marketing',       isInitial: false, isTerminal: false, group: '' },
      { label: 'Construction',    isInitial: false, isTerminal: false, group: '' },
      { label: 'Professional Svcs', isInitial: false, isTerminal: false, group: '' },
    ],
    question: 'What kind of thing is this?',
    useCase: 'TAXONOMY lists become primary tabs, chip toggles, and select filters in the Template Engine',
  },
  {
    type: 'RELATIONSHIP',
    color: 'var(--green)',
    border: 'rgba(58,255,140,0.3)',
    bg: 'rgba(58,255,140,0.08)',
    icon: '🕸️',
    desc: 'Labels on a connection between two records. Bidirectional — A of B implies B of A. The definition table stays authoritative; the List mirrors it.',
    example: 'organizationRelationshipType',
    values: [
      { label: 'customer',  isInitial: false, isTerminal: false, group: '' },
      { label: 'vendor',    isInitial: false, isTerminal: false, group: '' },
      { label: 'referrer',  isInitial: false, isTerminal: false, group: '' },
      { label: 'competitor', isInitial: false, isTerminal: false, group: '' },
    ],
    question: 'How are they connected?',
    useCase: 'Used in CREAM-PIE recipes to scope data and RBAC by relationship context',
  },
  {
    type: 'EVENT',
    color: 'var(--pink)',
    border: 'rgba(255,79,170,0.3)',
    bg: 'rgba(255,79,170,0.08)',
    icon: '⚡',
    desc: 'Labels an occurrence, not a record — it has no resources column by design. Provides controlled vocabulary for pub/sub topics.',
    example: 'eventInvocationMethod',
    values: [
      { label: 'User',       isInitial: false, isTerminal: false, group: '' },
      { label: 'Cron',       isInitial: false, isTerminal: false, group: '' },
      { label: 'Subscriber', isInitial: false, isTerminal: false, group: '' },
    ],
    question: 'What caused this to happen?',
    useCase: 'STAGE transitions fire Events → pub/sub consumers react (email, invoice, automation)',
  },
  {
    type: 'TRANSFORM',
    color: 'var(--yellow)',
    border: 'rgba(255,224,58,0.3)',
    bg: 'rgba(255,224,58,0.08)',
    icon: '🧮',
    desc: 'Response-shaping rules. Items are parsed as rules by the response transform middleware — not selected by users. Distinct from TAXONOMY.',
    example: 'responseTransforms',
    values: [
      { label: 'format:currency', isInitial: false, isTerminal: false, group: 'rule' },
      { label: 'format:date',     isInitial: false, isTerminal: false, group: 'rule' },
      { label: 'mask:phone',      isInitial: false, isTerminal: false, group: 'rule' },
    ],
    question: 'How should this payload be shaped?',
    useCase: 'Read by responseTransform middleware — not rendered in the UI as a filter or picker',
  },
];

export default function ListPrimitive() {
  const [activeType, setActiveType] = useState(0);
  const [showRecursive, setShowRecursive] = useState(false);

  const lt = LIST_TYPES[activeType]!;

  return (
    <section className="section">
      <div className="section__label">The Core Primitive</div>
      <h2 className="section__title">List — The vocabulary engine</h2>
      <p className="section__desc">
        Instead of hardcoded enums scattered across the codebase, everything is a named
        <code>List</code> discriminated by a <code>ListType</code>. The type determines
        how the system interprets the values: as a state machine, a classifier, a relationship
        label, an event vocabulary, or a transform rule.
      </p>

      {/* type selector */}
      <div className="list-types">
        {LIST_TYPES.map((lt, i) => (
          <button
            key={lt.type}
            className={`list-type-btn ${i === activeType ? 'list-type-btn--active' : ''}`}
            style={{ '--ltype-color': lt.color, '--ltype-bg': lt.bg, '--ltype-border': lt.border } as React.CSSProperties}
            onClick={() => setActiveType(i)}
          >
            <span>{lt.icon}</span>
            <span>{lt.type}</span>
          </button>
        ))}
      </div>

      {/* detail panel */}
      <div className="list-detail" style={{ '--ltype-color': lt.color, '--ltype-border': lt.border } as React.CSSProperties}>
        <div className="list-detail__left">
          <div className="list-detail__meta">
            <span className="list-detail__question">{lt.question}</span>
            <p className="list-detail__desc">{lt.desc}</p>
            <div className="list-detail__usecase">
              <span className="list-detail__usecase-label">Template Engine rule:</span>
              {lt.useCase}
            </div>
          </div>
        </div>

        <div className="list-detail__right">
          <div className="list-card">
            <div className="list-card__header">
              <span className="list-card__name">{lt.example}</span>
              <span className="list-card__type" style={{ color: lt.color }}>{lt.type}</span>
            </div>
            <div className="list-card__values">
              {lt.values.map((v, i) => (
                <div key={i} className="list-card__value">
                  <span className="list-card__value-text">{v.label}</span>
                  <div className="list-card__value-badges">
                    {v.isInitial  && <span className="badge badge--green" style={{fontSize:'0.65rem'}}>initial</span>}
                    {v.isTerminal && <span className="badge badge--pink"  style={{fontSize:'0.65rem'}}>terminal</span>}
                    {v.group && <span className="list-card__value-group">{v.group}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* recursive concept */}
      <div className="list-recursive">
        <button
          className="list-recursive__toggle"
          onClick={() => setShowRecursive(!showRecursive)}
        >
          <span>🔁</span>
          <span>Lists are recursive — a ListItem can have its own sub-List attached</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-faint)' }}>
            {showRecursive ? '▲ hide' : '▼ show example'}
          </span>
        </button>

        {showRecursive && (
          <div className="list-recursive__demo animate-fade-in">
            <div className="recursive-tree">
              <RecursiveNode
                name="helpdeskTicketStage"
                type="STAGE"
                values={[
                  { label: 'Open' },
                  {
                    label: 'Waiting on Client',
                    children: {
                      name: 'holdReason',
                      type: 'TAXONOMY',
                      values: [
                        { label: 'Awaiting client response' },
                        { label: 'Awaiting third party' },
                        { label: 'Scheduled maintenance window' },
                      ],
                    },
                  },
                  { label: 'In Progress' },
                  { label: 'Resolved' },
                ]}
              />
            </div>
            <p className="list-recursive__note">
              The <code>Waiting on Client</code> item has its own <code>holdReason</code> sub-List
              attached via <code>ResourceMeta(resource: 'ListItem', key: 'holdReasons')</code>.
              The sub-list only renders as a filter when the parent stage is active — this is the
              <code>&lt;ListFilter creampie="TicketStatusOnHold" /&gt;</code> pattern from the docs.
            </p>
          </div>
        )}
      </div>

      {/* system list note */}
      <div className="list-system-note">
        <span className="list-system-note__icon">🔒</span>
        <div>
          <strong>System Lists</strong> — Lists that have hardcoded references in application code
          are flagged as <code>system: true</code> with a read-only key slug. The{' '}
          <em>anatomy ratchet</em> CI tool counts how many remain (started at 78, heading to zero).
          As the count drops, fewer Lists need the system flag.
        </div>
      </div>
    </section>
  );
}

interface RecursiveNodeProps {
  name: string;
  type: string;
  values: Array<{ label: string; children?: RecursiveNodeProps }>;
  depth?: number;
}

function RecursiveNode({ name, type, values, depth = 0 }: RecursiveNodeProps) {
  const colors = ['var(--purple-l)', 'var(--orange-l)', 'var(--teal)', 'var(--blue)'];
  const color = colors[depth % colors.length]!;

  return (
    <div className="r-node" style={{ '--r-color': color, '--r-depth': depth } as React.CSSProperties}>
      <div className="r-node__header">
        <span className="r-node__name">{name}</span>
        <span className="r-node__type" style={{ color }}>{type}</span>
      </div>
      <div className="r-node__values">
        {values.map((v, i) => (
          <div key={i} className="r-node__value-row">
            <span className="r-node__value">{v.label}</span>
            {v.children && (
              <div className="r-node__child">
                <span className="r-node__arrow">↳ sub-list via ListItem meta:</span>
                <RecursiveNode {...v.children} depth={depth + 1} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
