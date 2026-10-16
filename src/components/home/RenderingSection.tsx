import { useState } from 'react';
import './RenderingSection.css';

type ViewMode = 'table' | 'kanban' | 'card';

const TICKET_STAGE = ['Open', 'In Progress', 'On Hold', 'Closed'];

const TICKETS = [
  { id: 'T-001', title: 'Fix login redirect loop', stage: 'In Progress', priority: 'high', org: 'Acme HVAC' },
  { id: 'T-002', title: 'Update billing address',  stage: 'Open',        priority: 'low',  org: 'BuildPros' },
  { id: 'T-003', title: 'Export customer data',    stage: 'On Hold',     priority: 'med',  org: 'LemonSeed' },
  { id: 'T-004', title: 'SSL cert expired',        stage: 'Closed',      priority: 'high', org: 'Rapid Fix' },
  { id: 'T-005', title: 'Add new team member',     stage: 'Open',        priority: 'low',  org: 'Acme HVAC' },
  { id: 'T-006', title: 'Invoice discrepancy',     stage: 'In Progress', priority: 'med',  org: 'BuildPros' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'var(--pink)',
  med:  'var(--orange-l)',
  low:  'var(--text-faint)',
};

export default function RenderingSection() {
  const [view, setView] = useState<ViewMode>('table');

  return (
    <section className="section">
      <div className="section__label">Rendering Engine</div>
      <h2 className="section__title">The Guesser: UI from data shape</h2>
      <p className="section__desc">
        The Template Engine doesn't need custom code per resource. It reads the Lists attached
        to a resource and infers the UI. A STAGE list with 4+ values? Kanban is offered.
        Taxonomy lists? They become tabs and filters. <strong>Config over code.</strong>
      </p>

      {/* rule box */}
      <div className="render-rule-box">
        <div className="render-rule-box__rule">
          <span className="render-rule-box__if">IF</span>
          <code>resource.lists.find(l =&gt; l.type === 'STAGE')?.values.length &gt;= 4</code>
        </div>
        <div className="render-rule-box__then">
          <span className="render-rule-box__then-label">THEN</span>
          <span>offer <strong>Kanban</strong> as an optional view</span>
        </div>
      </div>

      {/* demo: ticket list with view switcher */}
      <div className="render-demo">
        <div className="render-demo__header">
          <div className="render-demo__title">
            <span className="render-demo__resource">Tickets</span>
            <span className="badge badge--orange">helpdeskTicketStage · STAGE · 4 values</span>
          </div>
          <div className="render-demo__views">
            {(['table', 'kanban', 'card'] as ViewMode[]).map(v => (
              <button
                key={v}
                className={`render-view-btn ${view === v ? 'render-view-btn--active' : ''}`}
                onClick={() => setView(v)}
              >
                {v === 'table'  ? '⊞ Table'  :
                 v === 'kanban' ? '⊟ Kanban' : '⊠ Card'}
              </button>
            ))}
          </div>
        </div>

        <div className="render-demo__body">
          {view === 'table' && (
            <div className="render-table animate-fade-in">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Title</th><th>Stage</th><th>Priority</th><th>Org</th>
                  </tr>
                </thead>
                <tbody>
                  {TICKETS.map(t => (
                    <tr key={t.id}>
                      <td><code>{t.id}</code></td>
                      <td>{t.title}</td>
                      <td><span className="render-stage-chip">{t.stage}</span></td>
                      <td><span style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span></td>
                      <td>{t.org}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'kanban' && (
            <div className="render-kanban animate-fade-in">
              {TICKET_STAGE.map(stage => (
                <div key={stage} className="render-kanban__col">
                  <div className="render-kanban__col-header">
                    {stage}
                    <span className="render-kanban__col-count">
                      {TICKETS.filter(t => t.stage === stage).length}
                    </span>
                  </div>
                  {TICKETS.filter(t => t.stage === stage).map(t => (
                    <div key={t.id} className="render-kanban__card">
                      <div className="render-kanban__card-id">{t.id}</div>
                      <div className="render-kanban__card-title">{t.title}</div>
                      <div className="render-kanban__card-org">{t.org}</div>
                      <div
                        className="render-kanban__card-priority"
                        style={{ color: PRIORITY_COLORS[t.priority] }}
                      >
                        ● {t.priority}
                      </div>
                    </div>
                  ))}
                  {TICKETS.filter(t => t.stage === stage).length === 0 && (
                    <div className="render-kanban__empty">Empty</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {view === 'card' && (
            <div className="render-cards animate-fade-in">
              {TICKETS.map(t => (
                <div key={t.id} className="render-card-item card">
                  <div className="render-card-item__id">{t.id}</div>
                  <div className="render-card-item__title">{t.title}</div>
                  <div className="render-card-item__meta">
                    <span className="render-stage-chip">{t.stage}</span>
                    <span style={{ color: PRIORITY_COLORS[t.priority], fontSize: '0.8rem' }}>● {t.priority}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>{t.org}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="render-demo__footer">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
            ↑ This view switcher appeared automatically because <code>helpdeskTicketStage</code> is
            a STAGE list with 4 values. Zero custom code.
          </span>
        </div>
      </div>
    </section>
  );
}
