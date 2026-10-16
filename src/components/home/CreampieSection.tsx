import { useState } from 'react';
import './CreampieSection.css';

const RECIPE_EXAMPLE = {
  name: 'Customers',
  url: '/crm/customers',
  rbac: ['Admin', 'Account Manager'],
  recipe: {
    crm: {
      organization: {
        customerStatus: 'Customer',
      },
    },
  },
};

const SURFACES = [
  { icon: '🖥️', label: 'Query Params', desc: 'Translates to GET /organizations?customerStatus=Customer' },
  { icon: '📋', label: 'Menu Item', desc: 'Creates the "Customers" nav entry with this URL' },
  { icon: '🎨', label: 'List View', desc: 'Configures which tabs, filters, and Kanban cols to show' },
  { icon: '🔐', label: 'RBAC', desc: 'Only Admin and Account Manager can see this recipe' },
  { icon: '📊', label: 'Action Buttons', desc: 'Which buttons appear on list and single views' },
  { icon: '🔄', label: 'State Machine', desc: 'Which stage transitions are allowed from this context' },
];

export default function CreampieSection() {
  const [activeSurface, setActiveSurface] = useState<number | null>(null);
  const [showDecoded, setShowDecoded] = useState(false);

  return (
    <section className="section">
      <div className="section__label">CREAM-PIE</div>
      <h2 className="section__title">
        <span style={{ color: 'var(--orange-l)' }}>C</span>ontext{' '}
        <span style={{ color: 'var(--orange-l)' }}>R</span>ules{' '}
        <span style={{ color: 'var(--orange-l)' }}>E</span>ngine{' '}
        <span style={{ color: 'var(--orange-l)' }}>A</span>pplication{' '}
        <span style={{ color: 'var(--orange-l)' }}>M</span>atrix<br />
        <span style={{ color: 'var(--orange-l)' }}>P</span>olymorphic{' '}
        <span style={{ color: 'var(--orange-l)' }}>I</span>njection {'&'}{' '}
        <span style={{ color: 'var(--orange-l)' }}>E</span>xecution
      </h2>
      <p className="section__desc">
        A Recipe is a named, stored set of conditions. One recipe configures the query,
        the UI, the RBAC, the menu placement, and the available actions — all at once.
        It translates the List vocabulary into actual application behavior via the Template Engine.
      </p>

      {/* recipe card → surfaces */}
      <div className="creampie-layout">
        <div className="creampie-recipe-card">
          <div className="creampie-recipe-card__header">
            <span className="creampie-recipe-card__title">Recipe: {RECIPE_EXAMPLE.name}</span>
            <span className="badge badge--orange">CREAM-PIE</span>
          </div>

          <div className="creampie-recipe-card__body">
            <pre className="creampie-json">{JSON.stringify(RECIPE_EXAMPLE.recipe, null, 2)}</pre>
          </div>

          <div className="creampie-recipe-card__footer">
            <div>
              <span className="creampie-recipe-card__meta-label">Route</span>
              <code>{RECIPE_EXAMPLE.url}</code>
            </div>
            <div>
              <span className="creampie-recipe-card__meta-label">RBAC</span>
              {RECIPE_EXAMPLE.rbac.map(r => (
                <span key={r} className="badge badge--purple" style={{ marginRight: '0.25rem', fontSize: '0.7rem' }}>{r}</span>
              ))}
            </div>
          </div>

          <button className="creampie-decode-btn" onClick={() => setShowDecoded(!showDecoded)}>
            {showDecoded ? '▲ Hide what this translates to' : '▼ Show what this translates to'}
          </button>

          {showDecoded && (
            <div className="creampie-decoded animate-fade-in">
              <div className="creampie-decoded__item">
                <span className="creampie-decoded__label">SQL WHERE</span>
                <code>WHERE organization.customer_status_id = (SELECT id FROM list_items WHERE slug = 'customer')</code>
              </div>
              <div className="creampie-decoded__item">
                <span className="creampie-decoded__label">API Request</span>
                <code>GET /api/synapse/v1/organizations?list[customerStatus]=customer</code>
              </div>
              <div className="creampie-decoded__item">
                <span className="creampie-decoded__label">Context Set</span>
                <code>{'{ resource: "organization", filter: { customerStatus: "customer" } }'}</code>
              </div>
            </div>
          )}
        </div>

        {/* surfaces */}
        <div className="creampie-surfaces">
          <p className="creampie-surfaces__title">One recipe. Six surfaces.</p>
          <div className="creampie-surfaces__grid">
            {SURFACES.map((s, i) => (
              <div
                key={i}
                className={`creampie-surface ${activeSurface === i ? 'creampie-surface--active' : ''}`}
                onClick={() => setActiveSurface(activeSurface === i ? null : i)}
              >
                <span className="creampie-surface__icon">{s.icon}</span>
                <div>
                  <div className="creampie-surface__label">{s.label}</div>
                  {activeSurface === i && (
                    <div className="creampie-surface__desc animate-fade-in">{s.desc}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The analogy */}
      <div className="creampie-analogy">
        <div className="creampie-analogy__icon">🍰</div>
        <div>
          <p className="creampie-analogy__text">
            As Chris put it: <em>"Cream Pie translates the ingredients into something edible."</em>
            The <strong>Lists</strong> are the ingredients (raw vocabulary).
            The <strong>Recipe</strong> is the instructions.
            The <strong>Template Engine</strong> bakes it into a UI surface.
          </p>
        </div>
      </div>

      {/* MTEL note */}
      <div className="creampie-formats">
        <p className="creampie-formats__title">Recipe input formats:</p>
        <div className="grid-3">
          {[
            { fmt: 'JSON', example: '{ "organization": { "status": "customer" } }', color: 'var(--purple-l)' },
            { fmt: 'MTEL', example: '{{organization.status}} == "customer"', color: 'var(--teal)' },
            { fmt: 'Query Params', example: '?list[customerStatus]=customer', color: 'var(--orange-l)' },
          ].map(f => (
            <div key={f.fmt} className="creampie-format-card card">
              <div className="creampie-format-card__label" style={{ color: f.color }}>{f.fmt}</div>
              <code className="creampie-format-card__code">{f.example}</code>
            </div>
          ))}
        </div>
        <p className="creampie-formats__note">
          MTEL = Merge Tag Expression Language — like writing Excel formulas but for your ERP context.
          All formats compile to the same internal representation.
        </p>
      </div>
    </section>
  );
}
