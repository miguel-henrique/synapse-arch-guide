import { useState } from 'react';
import './RealCodeSection.css';

const CODE_TABS = [
  {
    label: 'Before (hardcoded)',
    lang: 'typescript',
    color: 'var(--pink)',
    code: `// ❌ OLD WORLD: private "drawer" of vocabulary
// This lives in /apps/web-services/src/backup/backup.service.ts

const TERMINAL_STATUSES = ['cancelled', 'fired', 'removed'];

function shouldBackupClient(client: Client): boolean {
  return !TERMINAL_STATUSES.includes(client.customerStatus);
}

// Problem: if someone adds "churned" to customerStatus in the DB,
// this code never knows. It drifts. Silently.
// The anatomy ratchet counted 78 of these copies across the codebase.`,
  },
  {
    label: 'After (reads the List)',
    lang: 'typescript',
    color: 'var(--green)',
    code: `// ✅ NEW WORLD: reads from the central List
// Same file — same behavior — but now reads from the database vocabulary

async function shouldBackupClient(client: Client): Promise<boolean> {
  const statusList = await listService.findByKey('customerStatus');
  
  // ListItems with isTerminal: true are terminal stages
  const terminalSlugs = statusList.items
    .filter(item => item.isTerminal === true)
    .map(item => item.slug);
  
  // 'removed' is not a stage — it means the record was deleted
  const explicitExceptions = ['removed'];
  
  const inactiveStatuses = [...terminalSlugs, ...explicitExceptions];
  return !inactiveStatuses.includes(client.customerStatus);
}

// Now: add "churned" as a terminal ListItem in the DB →
// behavior updates everywhere. Zero code change.
// The anatomy ratchet went from 78 → 76 with just 2 files changed.`,
  },
  {
    label: 'List Model (Prisma)',
    lang: 'prisma',
    color: 'var(--purple-l)',
    code: `// From the actual Prisma schema — the List + ListItem primitive
// (simplified; real schema has additional fields)

model List {
  id           String      @id @default(cuid())
  key          String      @unique   // e.g. "customerStatus" — permanent identifier
  name         String                // e.g. "Customer Status" — display name
  type         ListType              // STAGE | TAXONOMY | RELATIONSHIP | EVENT | TRANSFORM
  system       Boolean    @default(false)  // if true, key is read-only (anatomy ratchet)
  selectionType SelectionType @default(SINGLE) // SINGLE or MULTIPLE
  resources    String[]              // resource keys this list applies to
  items        ListItem[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model ListItem {
  id          String     @id @default(cuid())
  slug        String                // e.g. "cancelled" — IMMUTABLE machine identifier
  label       String                // e.g. "Cancelled" — human display name
  listId      String
  list        List       @relation(fields: [listId], references: [id])
  isInitial   Boolean    @default(false)   // STAGE: starting point
  isTerminal  Boolean    @default(false)   // STAGE: end state
  metadata    Json?                 // { transitions, color, icon, stageGroup, ... }
  order       Int        @default(0)
}

// Sub-lists attach via ResourceMeta, not a direct FK:
// ResourceMeta(resource: 'ListItem', resourceId: item.id, key: 'holdReasons',
//              dataType: RELATION, listId: holdReason.id)

enum ListType {
  STAGE         // governed lifecycle with transitions
  TAXONOMY      // free classification, no journey
  RELATIONSHIP  // labels on edges between records
  EVENT         // occurrence vocabulary, no resource
  TRANSFORM     // response-shaping rules (parsed by middleware)
}`,
  },
  {
    label: 'CREAM-PIE Recipe',
    lang: 'json',
    color: 'var(--orange-l)',
    code: `// A CREAM-PIE recipe — stored in the DB, loaded at login
// to build the navigation, context, and query parameters.
// From docs/LOADED-CREAM-PIE-STRATEGY.md §5.3

{
  "slug": "crm.organizations.customers",
  "primaryResource": "organizations",
  
  // conditions in CREAM-PQL — values are ListItem keys, not labels
  "conditions": {
    "logic": "AND",
    "rules": [
      {
        "field": "lists.customerStatus",
        "op": "in",
        "value": ["customer", "at_risk"]
      }
    ]
  },
  
  // RBAC — who can access this recipe
  "availableWhen": { "roles": ["admin", "account_manager"] },
  
  // scope: system | organization | user
  "scope": "system",
  
  // The Template Engine reads this to build the UI:
  // TAXONOMY lists → primaryTabs/chipToggles
  // STAGE list with 4+ items → Kanban option exposed
  "presentation": {
    "primaryTabs": ["industry"],
    "chipToggles": ["brandTone"]
  }
}`,
  },
];

export default function RealCodeSection() {
  const [activeTab, setActiveTab] = useState(0);
  const tab = CODE_TABS[activeTab]!;

  return (
    <section className="section">
      <div className="section__label">Real Code</div>
      <h2 className="section__title">From theory to code</h2>
      <p className="section__desc">
        These are simplified but structurally accurate examples from the actual codebase and official architecture docs.
        The before/after shows a real migration that lowered the anatomy ratchet count.
      </p>

      <div className="code-viewer">
        <div className="code-viewer__tabs">
          {CODE_TABS.map((t, i) => (
            <button
              key={i}
              className={`code-viewer__tab ${activeTab === i ? 'code-viewer__tab--active' : ''}`}
              style={{ '--tab-color': t.color } as React.CSSProperties}
              onClick={() => setActiveTab(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="code-viewer__body">
          <pre className="code-viewer__pre"><code style={{ color: 'var(--text-dim)' }}>{tab.code}</code></pre>
        </div>
      </div>

      {/* how it connects */}
      <div className="connection-flow">
        <div className="connection-flow__title">How everything connects — one value, six consumers</div>
        <div className="connection-flow__steps">
          {[
            { icon: '📋', label: 'List', detail: 'customerStatus: STAGE', color: 'var(--purple-l)' },
            { icon: '↓', label: '', detail: '', color: 'var(--text-faint)' },
            { icon: '🍰', label: 'CREAM-PIE', detail: '"customer" → filter recipe', color: 'var(--orange-l)' },
            { icon: '↓', label: '', detail: '', color: 'var(--text-faint)' },
            { icon: '⚡', label: 'Execution', detail: '6 consumers at once', color: 'var(--teal)' },
          ].map((step, i) => (
            <div key={i} className="connection-flow__step">
              {step.label ? (
                <div className="connection-flow__node" style={{ '--node-color': step.color } as React.CSSProperties}>
                  <span className="connection-flow__node-icon">{step.icon}</span>
                  <span className="connection-flow__node-label">{step.label}</span>
                  <span className="connection-flow__node-detail">{step.detail}</span>
                </div>
              ) : (
                <div className="connection-flow__arrow">{step.icon}</div>
              )}
            </div>
          ))}

          <div className="connection-flow__consumers">
            {[
              { icon: '🗄️', label: 'SQL filter' },
              { icon: '🖥️', label: 'UI tabs/Kanban' },
              { icon: '🔐', label: 'RBAC policy' },
              { icon: '📡', label: 'Pub/Sub topic' },
              { icon: '🔄', label: 'State machine' },
              { icon: '📊', label: 'Report filter' },
            ].map(c => (
              <div key={c.label} className="connection-flow__consumer">
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
