import { useState } from 'react';
import './RelationshipSection.css';

type RelType = 'owner' | 'referrer' | 'ambassador';

const CRYSTAL_RELS: Array<{ type: RelType; org: string; mrr: number }> = [
  { type: 'owner',     org: 'LemonSeed',   mrr: 12000 },
  { type: 'referrer',  org: 'Acme HVAC',   mrr: 4500 },
  { type: 'referrer',  org: 'Rapid Fix',   mrr: 3200 },
  { type: 'ambassador', org: 'BuildPros',  mrr: 1500 },
];

const REL_COLORS: Record<RelType, string> = {
  owner:     'var(--purple-l)',
  referrer:  'var(--teal)',
  ambassador: 'var(--orange-l)',
};

export default function RelationshipSection() {
  const [perspective, setPerspective] = useState<RelType | 'all'>('all');

  const filtered = CRYSTAL_RELS.filter(r => perspective === 'all' || r.type === perspective);
  const totalMrr = filtered.reduce((s, r) => s + r.mrr, 0);
  const directMrr  = CRYSTAL_RELS.filter(r => r.type === 'owner').reduce((s, r) => s + r.mrr, 0);
  const indirectMrr = CRYSTAL_RELS.filter(r => r.type !== 'owner').reduce((s, r) => s + r.mrr, 0);

  return (
    <section className="section">
      <div className="section__label">Relationships + Perspective</div>
      <h2 className="section__title">Same data. Different meaning.</h2>
      <p className="section__desc">
        In Synapse, relationships between Contacts and Organizations aren't just database joins —
        they carry semantic meaning. The <em>path</em> you traverse determines what the data means.
        This is called <strong>Perspective</strong>.
      </p>

      {/* Crystal interactive demo */}
      <div className="rel-demo">
        <div className="rel-demo__header">
          <div className="rel-demo__contact">
            <div className="rel-demo__avatar">C</div>
            <div>
              <div className="rel-demo__name">Crystal Williams</div>
              <div className="rel-demo__role">Contact in Synapse</div>
            </div>
          </div>
          <div className="rel-demo__mrrbox">
            <div className="rel-demo__mrrbox-label">Visible MRR impact</div>
            <div className="rel-demo__mrrbox-value">
              ${totalMrr.toLocaleString()}<span>/mo</span>
            </div>
            <div className="rel-demo__mrrbox-breakdown">
              <span style={{ color: 'var(--purple-l)' }}>${directMrr.toLocaleString()} direct</span>
              <span style={{ color: 'var(--text-faint)' }}>·</span>
              <span style={{ color: 'var(--teal)' }}>${indirectMrr.toLocaleString()} indirect</span>
            </div>
          </div>
        </div>

        {/* perspective filter */}
        <div className="rel-demo__filter">
          <span className="rel-demo__filter-label">View through lens:</span>
          {(['all', 'owner', 'referrer', 'ambassador'] as const).map(p => (
            <button
              key={p}
              className={`rel-filter-btn ${perspective === p ? 'rel-filter-btn--active' : ''}`}
              style={{ '--rf-color': p === 'all' ? 'var(--text-dim)' : REL_COLORS[p] } as React.CSSProperties}
              onClick={() => setPerspective(p)}
            >
              {p === 'all' ? 'All Relationships' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* relationship graph */}
        <div className="rel-graph">
          {filtered.map((rel, i) => (
            <div
              key={i}
              className="rel-edge animate-fade-up"
              style={{ animationDelay: `${i * 0.08}s`, '--rel-color': REL_COLORS[rel.type] } as React.CSSProperties}
            >
              <div className="rel-edge__label" style={{ color: REL_COLORS[rel.type] }}>
                {rel.type.toUpperCase()}
              </div>
              <div className="rel-edge__line" />
              <div className="rel-edge__org">
                <div className="rel-edge__org-name">{rel.org}</div>
                <div className="rel-edge__org-mrr">${rel.mrr.toLocaleString()}/mo</div>
              </div>
              <div className="rel-edge__meaning">
                {rel.type === 'owner'
                  ? '→ DIRECT MRR (Crystal owns this company)'
                  : rel.type === 'referrer'
                  ? '→ INDIRECT MRR (Crystal referred this customer)'
                  : '→ INDIRECT MRR (Crystal is an ambassador)'}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rel-empty">No relationships for this perspective.</div>
          )}
        </div>
      </div>

      {/* PRBAC card */}
      <div className="prbac-card">
        <div className="prbac-card__title">
          <span className="badge badge--purple">PRBAC</span>
          Polymorphic Role-Based Access Control
        </div>
        <p className="prbac-card__desc">
          It's not just <em>who you are</em> — it's <em>who you are to which organization.</em>
          A user might be an Account Manager at CI Web Group but just a Contact at another company.
          Their capabilities differ based on that organizational context, encoded in the JWT at login.
        </p>
        <div className="prbac-formula">
          <div className="prbac-formula__part">
            <span className="prbac-formula__label">Action</span>
            <code>generate</code>
          </div>
          <span className="prbac-formula__op">+</span>
          <div className="prbac-formula__part">
            <span className="prbac-formula__label">Object</span>
            <code>FinancialReport</code>
          </div>
          <span className="prbac-formula__op">+</span>
          <div className="prbac-formula__part">
            <span className="prbac-formula__label">Context</span>
            <code>CI Web Group</code>
          </div>
          <span className="prbac-formula__op">+</span>
          <div className="prbac-formula__part">
            <span className="prbac-formula__label">Condition</span>
            <code>role == Financial Officer</code>
          </div>
          <span className="prbac-formula__op">=</span>
          <div className="prbac-formula__result">
            <span className="prbac-formula__label">ALLOW</span>
          </div>
        </div>
      </div>
    </section>
  );
}
