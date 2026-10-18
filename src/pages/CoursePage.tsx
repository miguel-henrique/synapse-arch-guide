import { useState } from 'react';
import './CoursePage.css';

const PROGRESS_KEY = 'sag_course_progress_v2';

// ─────────────────────────────────────────────────────────────────────────────
// DATA — Levels
// Each level has: intro content, an interactive activity, and knowledge-check Qs
// ─────────────────────────────────────────────────────────────────────────────

interface Question {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

type ActivityType =
  | { kind: 'sort'; prompt: string; items: { id: string; label: string; bucket: string }[]; buckets: { id: string; label: string; color: string }[] }
  | { kind: 'match'; prompt: string; pairs: { term: string; def: string }[] }
  | { kind: 'build'; prompt: string; slots: { id: string; label: string; options: string[]; correct: string }[] }
  | { kind: 'trace'; prompt: string; steps: { id: string; label: string; detail: string; color: string }[] };

interface Level {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  intro: {
    headline: string;
    body: string[];
    highlight: string;
  };
  activity: ActivityType;
  questions: Question[];
}

const LEVELS: Level[] = [
  // ── LEVEL 1 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'The Big Picture',
    subtitle: 'Why the DRY mission exists',
    icon: '🗺️',
    color: 'var(--blue)',
    intro: {
      headline: 'The problem: vocabulary drift',
      body: [
        'Imagine the system has a concept: "customer status." A customer can be a lead, a customer, at risk, or cancelled. Simple enough.',
        'Now imagine 78 different files each have their own private copy of that list. When the business adds a new status called "churned," someone updates the database — but forgets most of those 78 files. Now parts of the system behave as if "churned" doesn\'t exist.',
        'This is called drift. It\'s silent. Nothing crashes. The system just quietly stops working correctly in places you haven\'t touched recently.',
        'The DRY mission ("Don\'t Repeat Yourself") has one answer: put every vocabulary definition in the database once, as a List, and make every consumer read from it instead of maintaining its own copy. The anatomy ratchet CI tool counts how many copies still remain. It started at 78 and the goal is zero.',
      ],
      highlight: 'One List in the database. Zero private copies. Every consumer reads from the same source.',
    },
    activity: {
      kind: 'sort',
      prompt: 'Sort these into: "Hardcoded copy (drift risk)" vs "Reads from the List (DRY)"',
      buckets: [
        { id: 'hardcoded', label: '❌ Hardcoded copy', color: 'var(--pink)' },
        { id: 'dry', label: '✅ Reads from List', color: 'var(--green)' },
      ],
      items: [
        { id: 'a', label: "const STATUSES = ['lead', 'customer', 'cancelled']", bucket: 'hardcoded' },
        { id: 'b', label: "list.items.filter(i => i.isTerminal)", bucket: 'dry' },
        { id: 'c', label: "if (status === 'customer')", bucket: 'hardcoded' },
        { id: 'd', label: "listService.findByKey('customerStatus')", bucket: 'dry' },
        { id: 'e', label: "const TERMINAL = ['cancelled', 'fired']", bucket: 'hardcoded' },
        { id: 'f', label: "items.find(i => i.slug === activeSlug)", bucket: 'dry' },
      ],
    },
    questions: [
      {
        q: 'What is "drift" in the context of the DRY mission?',
        options: [
          'When database migrations run out of order',
          'When multiple copies of the same vocabulary definition silently fall out of sync',
          'When the UI renders differently on different browsers',
          'When TypeScript types don\'t match the Prisma schema',
        ],
        correct: 1,
        explanation: 'Drift happens when many files each maintain their own copy of a vocabulary list. When the canonical definition changes, not all copies get updated — the system develops inconsistencies silently.',
      },
      {
        q: 'What does the anatomy ratchet measure?',
        options: [
          'The number of active users in Synapse',
          'The number of TypeScript errors in the codebase',
          'The count of hardcoded vocabulary copies still remaining',
          'The number of database migrations applied',
        ],
        correct: 2,
        explanation: 'The anatomy ratchet is a CI tool counting every remaining place where vocabulary is hardcoded instead of reading from a List. Started at 78, heading to 0.',
      },
      {
        q: 'What is the DRY mission\'s solution to vocabulary drift?',
        options: [
          'Add TypeScript enums to a shared library so only one file needs updating',
          'Store vocabulary in the database as a List and make every consumer read from it',
          'Use environment variables to configure vocabulary at runtime',
          'Generate vocabulary files from the Prisma schema automatically',
        ],
        correct: 1,
        explanation: 'TypeScript enums still require a code change and redeployment to update. A database-backed List lets business vocabulary evolve without touching code at all — every consumer reads the current state automatically.',
      },
    ],
  },

  // ── LEVEL 2 ──────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'The List Primitive',
    subtitle: 'Types, items, metadata, and recursion',
    icon: '📋',
    color: 'var(--purple-l)',
    intro: {
      headline: 'One primitive. Five semantic types.',
      body: [
        'A List is a named, typed vocabulary. "Named" means it has a key slug like customerStatus. "Typed" means the system knows what kind of vocabulary it is — and behaves differently depending on that type.',
        'There are five types. STAGE is for governed lifecycles — the system can refuse an invalid transition (you can\'t go from "Closed" back to "Open" if the machine doesn\'t allow it). TAXONOMY is for free classification — apply as many labels as you want, no rules. RELATIONSHIP labels the edge between two records.',
        'EVENT labels an occurrence, not a record. The eventInvocationMethod list (User, Cron, Subscriber) has no resources column — because it doesn\'t attach to any row, it names what caused something to happen.',
        'TRANSFORM is a rule table parsed by middleware, not something users ever select. It shapes API responses.',
        'ListItems are the values inside a List. Each item has a stable, immutable slug (the machine identifier) and a display label. Rename the label freely — never rename the slug, because code references it.',
        'And Lists are recursive: a ListItem can have its own sub-List attached via metadata. The "Waiting on Client" stage item has a holdReason sub-list — but only shown in the UI when that stage filter is active.',
      ],
      highlight: 'STAGE governs transitions. TAXONOMY classifies freely. RELATIONSHIP labels edges. EVENT labels occurrences. TRANSFORM shapes responses.',
    },
    activity: {
      kind: 'match',
      prompt: 'Match each List to its correct ListType',
      pairs: [
        { term: 'customerStatus', def: 'STAGE' },
        { term: 'industry', def: 'TAXONOMY' },
        { term: 'organizationRelationshipType', def: 'RELATIONSHIP' },
        { term: 'eventInvocationMethod', def: 'EVENT' },
        { term: 'helpdeskTicketStage', def: 'STAGE' },
        { term: 'brandTone', def: 'TAXONOMY' },
      ],
    },
    questions: [
      {
        q: 'What is the key difference between a STAGE list and a TAXONOMY list?',
        options: [
          'STAGE lists have more values than TAXONOMY lists',
          'STAGE lists govern transitions — the system can refuse an invalid move. TAXONOMY lists allow free application of any value.',
          'STAGE lists are stored in a separate table from TAXONOMY lists',
          'TAXONOMY lists can only have one value selected at a time',
        ],
        correct: 1,
        explanation: 'The defining property of STAGE is governed movement. A ticket can\'t move from Resolved back to Open if the state machine forbids it. TAXONOMY has no such rules — you can apply or remove any label freely.',
      },
      {
        q: 'Why does the eventInvocationMethod LIST have no resources column?',
        options: [
          'It\'s a bug — every List should have resources',
          'It\'s a TRANSFORM list, not an EVENT list',
          'An EVENT list labels an occurrence, not a record — there\'s nothing to attach it to',
          'Resources are optional on all Lists',
        ],
        correct: 2,
        explanation: 'EVENT is the only ListType that doesn\'t attach to a record. It labels what caused something to happen (User, Cron, Subscriber). The resources column is intentionally empty — filling it would misclassify it as a TAXONOMY.',
      },
      {
        q: 'A ListItem\'s slug is changed from "at_risk" to "atrisk". What breaks?',
        options: [
          'Nothing — the slug is just a display value',
          'Only the URL filters break',
          'All code that references the old slug string, all CREAM-PIE recipes, all report filters — everything using "at_risk" as an identifier',
          'Only the Kanban board column headers',
        ],
        correct: 2,
        explanation: 'The slug is the stable machine identifier. Code, recipes, filters, state machine rules, pub/sub topics — all reference it. The label ("At Risk") is the display name and can be changed safely. The slug never should be.',
      },
      {
        q: 'A ListItem has its own sub-List attached. How is this sub-List stored?',
        options: [
          'As a foreign key column on the ListItem table',
          'As a nested JSON object inside the ListItem row',
          'Via ResourceMeta — a metadata record pointing from the ListItem to another List',
          'As a separate List with a parentListId column',
        ],
        correct: 2,
        explanation: 'From SEEDED-LISTS.md §4.2: sub-lists attach via ResourceMeta(resource: \'ListItem\', key: \'holdReasons\', listId: holdReason.id). The depth is one level — the meta value is a pointer to another List.',
      },
    ],
  },

  // ── LEVEL 3 ──────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'CREAM-PIE Recipes',
    subtitle: 'Context, rules, and the engine that binds everything',
    icon: '🍰',
    color: 'var(--orange-l)',
    intro: {
      headline: 'One recipe. Six surfaces.',
      body: [
        'CREAM-PIE stands for: Context Rules Engine Application Matrix — Polymorphic Injection & Execution. The name describes what it does: it takes context (who you are, what organization, what resource) and applies rules to produce behavior across multiple execution surfaces.',
        'A Recipe is a named, stored condition set. The simplest example: { lists.customerStatus: "customer" }. That one object does six things at once:',
        '1. Query: generates the WHERE clause for the data fetch. 2. Menu: creates the "Customers" nav item. 3. URL: the ?recipe= parameter. 4. RBAC: gates who can access it. 5. UI: tells the Template Engine which tabs and filters to show. 6. Pub/Sub: can gate subscriber conditions.',
        'Recipes have three scopes. System recipes are seeded in module manifests — they\'re part of the product. Organization recipes are created by an org admin for their own context. User recipes are personal saved views.',
        'MTEL (Merge Tag Expression Language) is one way to write conditions: {{organization.customerStatus}} == "customer". JSON is another. Both compile to CREAM-PQL, the internal representation.',
      ],
      highlight: '"Cream Pie translates the ingredients into something edible." Lists are the ingredients. The Recipe is the instructions. The Template Engine bakes it.',
    },
    activity: {
      kind: 'build',
      prompt: 'Complete this CREAM-PIE recipe for a "High Priority Open Tickets" view',
      slots: [
        {
          id: 'resource',
          label: 'primaryResource',
          options: ['organizations', 'helpdesk_tickets', 'invoices', 'contacts'],
          correct: 'helpdesk_tickets',
        },
        {
          id: 'stage_field',
          label: 'Filter field (stage)',
          options: ['lists.customerStatus', 'lists.helpdeskTicketStage', 'lists.invoiceStage', 'lists.campaignStage'],
          correct: 'lists.helpdeskTicketStage',
        },
        {
          id: 'stage_value',
          label: 'Stage value',
          options: ['resolved', 'open', 'cancelled', 'draft'],
          correct: 'open',
        },
        {
          id: 'priority_field',
          label: 'Filter field (priority)',
          options: ['lists.brandTone', 'lists.industry', 'lists.todoPriority', 'lists.todoStatus'],
          correct: 'lists.todoPriority',
        },
        {
          id: 'priority_value',
          label: 'Priority value',
          options: ['medium', 'low', 'high', 'urgent'],
          correct: 'high',
        },
      ],
    },
    questions: [
      {
        q: 'What does CREAM-PIE stand for?',
        options: [
          'Content Rendering Engine for All Multi-Perspective Integrated Experiences',
          'Context Rules Engine Application Matrix — Polymorphic Injection & Execution',
          'Client Resource Entity Access Management Platform with Integrated Events',
          'Configurable Rendering Engine for APIs, Models, Policies, Integrations & Events',
        ],
        correct: 1,
        explanation: 'C=Context, R=Rules, E=Engine, A=Application, M=Matrix, P=Polymorphic, I=Injection, E=Execution. Defined in docs/CREAM-PIE.md.',
      },
      {
        q: 'A CREAM-PIE recipe with scope "system" vs scope "user" — what\'s the key difference?',
        options: [
          'System recipes use JSON, user recipes use MTEL',
          'System recipes are seeded in module manifests and are part of the product; user recipes are personal saved views',
          'System recipes can only be read by admins',
          'There is no difference — scope is just a label',
        ],
        correct: 1,
        explanation: 'From the strategy docs: system recipes are seeded via module manifests (they ARE the product\'s navigation). Organization recipes are admin-created for the tenant. User recipes (ownerUserId) are personal saved views — additive, never shadowing system ones.',
      },
      {
        q: 'MTEL, JSON, and query params are all Recipe input formats. What do they all compile to?',
        options: [
          'A SQL string stored in the database',
          'A TypeScript object in memory',
          'CREAM-PQL — the canonical internal condition representation',
          'A React component prop object',
        ],
        correct: 2,
        explanation: 'All three input formats (MTEL expressions like {{x}} == y, JSON conditions, ?when[] query params) compile to a CreamPqlGroup — the internal { logic, rules } structure evaluated by compilePredicate in libs/cream-pie.',
      },
    ],
  },

  // ── LEVEL 4 ──────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'Relationships & Perspective',
    subtitle: 'Multi-tenancy, graph traversal, and Polymorphic RBAC',
    icon: '🕸️',
    color: 'var(--green)',
    intro: {
      headline: 'The same data. Different meaning.',
      body: [
        'Most SaaS systems partition data with a simple organization_id column: Org A\'s data is completely separate from Org B\'s. CI Connect works differently.',
        'Here, organizations and contacts are connected by typed, bidirectional relationships. A contact can be the Owner of one company, a Referrer of another, and an Ambassador to a third — simultaneously. These are edges in a graph, and the path you take changes what the data means.',
        'This is called Perspective. Crystal owns LemonSeed, which pays $12k/month. She also referred Acme HVAC, which pays $4.5k/month. Her total MRR impact is $16.5k — but the attribution is different: Owner = Direct MRR, Referrer = Indirect MRR. Same payment records, different Perspective based on the relationship edge traversed.',
        'The multi-tenancy model follows from this. When a user logs in, they pick an organization context. That context is encoded in the JWT and determines their role, their visible data, and their capabilities. The same user has different abilities at different organizations.',
        'This is Polymorphic RBAC (PRBAC): capability = Action + Object + Organization Context + Condition. It\'s not just "what role do you have" — it\'s "what role do you have at which organization."',
      ],
      highlight: 'Perspective: the path you traverse to reach data determines what it means. Same records, different relationship edge, different truth.',
    },
    activity: {
      kind: 'trace',
      prompt: 'Trace how a user\'s organization context determines their capability. Click each step to reveal what happens.',
      steps: [
        { id: 'login', label: 'User logs in', detail: 'Authentication succeeds. The user has a contact record linked to multiple organizations.', color: 'var(--blue)' },
        { id: 'orgpick', label: 'Organization context selected', detail: 'User picks "CI Web Group" from their org list. This context is encoded in the JWT.', color: 'var(--purple-l)' },
        { id: 'identity', label: 'Identity resolved', detail: 'The system reads the user\'s role at CI Web Group: "Account Manager". RBAC abilities are now computed for this org context.', color: 'var(--teal)' },
        { id: 'request', label: 'User requests a resource', detail: 'User navigates to Finance > Invoices. The request carries the org context from the JWT.', color: 'var(--orange-l)' },
        { id: 'gate', label: 'PRBAC gate evaluated', detail: 'Can(read, Invoice, { org: CI_WEB_GROUP, role: account_manager }) → ALLOW. Deny-first policy: allowed only because an explicit policy grants it.', color: 'var(--green)' },
        { id: 'scope', label: 'Data scoped to context', detail: 'The query is narrowed to invoices where organizationId = CI Web Group, plus any related orgs the user\'s perspective includes.', color: 'var(--yellow)' },
      ],
    },
    questions: [
      {
        q: 'Crystal owns LemonSeed ($12k MRR) and referred Acme HVAC ($4.5k MRR). What is her DIRECT MRR?',
        options: ['$16,500', '$4,500', '$12,000', '$0'],
        correct: 2,
        explanation: 'Only the OWNER relationship path counts as Direct MRR. REFERRER paths are Indirect. Same payment records — different Perspective based on which relationship edge you traversed to find them.',
      },
      {
        q: 'Why is CI Connect\'s multi-tenancy described as "Community Commerce" rather than standard SaaS multi-tenancy?',
        options: [
          'Because it uses a community forum feature built into the platform',
          'Because data is dynamically partitioned by relationships between orgs and contacts, not statically by organization_id',
          'Because all customer data is shared publicly across all tenants',
          'Because it uses a graph database instead of PostgreSQL',
        ],
        correct: 1,
        explanation: 'Standard SaaS multi-tenancy fully partitions data by org. Here, contacts can belong to multiple orgs, orgs have typed relationships with each other, and data visibility depends on the relationship graph traversed — not a simple column filter.',
      },
      {
        q: 'PRBAC capability = Action + Object + ??? + Condition. What fills the blank?',
        options: ['User', 'Role', 'Organization Context', 'Module'],
        correct: 2,
        explanation: 'Organization Context is the "polymorphic" part. The same user at CI Web Group has Account Manager abilities; at another company they might only be a Contact. Same person, different org context, different capabilities — encoded in the JWT at login.',
      },
      {
        q: 'The deny-first policy means:',
        options: [
          'Users are denied access by default, and only explicitly granted permissions allow access',
          'The first deny rule in the list always wins',
          'New users are denied until an admin approves their account',
          'API requests are denied if they don\'t include a CREAM-PIE recipe',
        ],
        correct: 0,
        explanation: 'Deny-first means the default answer to "can this user do this?" is NO. Access is only granted when an explicit CASL ability policy says ALLOW and all conditions are met. This is the safe default for any system handling financial and customer data.',
      },
    ],
  },

  // ── LEVEL 5 ──────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'The Template Engine',
    subtitle: 'Config over code — UI from data shape',
    icon: '⚡',
    color: 'var(--teal)',
    intro: {
      headline: 'The system that writes its own UI.',
      body: [
        'Traditional ERP development: a developer writes a React component for every screen. Tickets list, Customers list, Campaigns list — each gets its own component, its own filters, its own view logic. When requirements change, code changes.',
        'The Template Engine inverts this. Instead of writing per-resource components, you declare the resource in a module manifest (module.json) — its models, its Lists, its recipes. The Template Engine reads those declarations and generates the UI.',
        'The Guesser is the rule engine inside the Template Engine. Its key rule: if a resource has a single-select STAGE list with 3 or more values, offer Kanban as an optional view. Zero code written. Just: "this resource has a STAGE list." That\'s enough.',
        'The rendering hierarchy has three layers. The Guesser produces a default ResourceView. A developer can register a template override for specific resources. A user can save a personal view (a saved Recipe) that narrows the default. Each layer only adds or narrows — never breaks the layer below.',
        'Custom Components still exist for complex screens that can\'t be expressed generically (maps, dashboards, composite reports). The distinction is: Template Engine for anything that\'s "resource + Lists + recipes." Custom Component only when that\'s genuinely not enough.',
      ],
      highlight: 'Module manifest → Guesser → ResourceView → EntityList. Config drives the UI. Code only when config can\'t.',
    },
    activity: {
      kind: 'build',
      prompt: 'Given a resource declaration, predict what the Template Engine will generate',
      slots: [
        {
          id: 'view_kanban',
          label: 'Will Kanban be offered? (resource has helpdeskTicketStage STAGE with 5 values)',
          options: ['No — Kanban requires a custom component', 'Yes — STAGE list with 3+ values triggers the Guesser rule', 'Only if the manifest sets showKanban: true', 'Only for Admin users'],
          correct: 'Yes — STAGE list with 3+ values triggers the Guesser rule',
        },
        {
          id: 'tabs',
          label: 'What do TAXONOMY lists become in the UI?',
          options: ['Nothing — TAXONOMY lists are not rendered', 'Kanban columns', 'Primary tabs, chip toggles, and select filters', 'Read-only labels on each row'],
          correct: 'Primary tabs, chip toggles, and select filters',
        },
        {
          id: 'override',
          label: 'A developer registers a template for "organizations". What happens to the Guesser\'s default?',
          options: ['The Guesser default is deleted', 'The registered template overrides the Guesser output for that resource', 'Both render — the user picks', 'The registered template is ignored — Guesser always wins'],
          correct: 'The registered template overrides the Guesser output for that resource',
        },
      ],
    },
    questions: [
      {
        q: 'What is the Guesser\'s key rule for surfacing a Kanban view?',
        options: [
          'The resource must have at least one TAXONOMY list',
          'The manifest must explicitly set showKanban: true',
          'The resource has a single-select STAGE list with 3 or more values',
          'The user must have Account Manager role',
        ],
        correct: 2,
        explanation: 'From the strategy docs: "rule board-when-one-stage in defaultViewRules.ts." One single-select STAGE list, 3+ values → Kanban offered. No manifest flag, no custom code needed.',
      },
      {
        q: 'What is a module manifest (module.json)?',
        options: [
          'A JSON file listing npm dependencies for a module',
          'A file that declares a module\'s models, Lists, recipes, navigation nodes, actions, and seeds at build time',
          'A database migration file',
          'A TypeScript type definition file',
        ],
        correct: 1,
        explanation: 'Module manifests (modules/*/module.json) are the source of truth for what a module contains. The Template Engine consumes them to know what resources exist, what Lists apply, and how to render them.',
      },
      {
        q: 'When should you use a Custom Component instead of the Template Engine?',
        options: [
          'Always — the Template Engine is still experimental',
          'When the resource has more than 10 fields',
          'When the UI requires genuinely complex rendering that can\'t be expressed as a resource + Lists + recipe (maps, composite dashboards, etc.)',
          'When performance is critical',
        ],
        correct: 2,
        explanation: 'Template Engine = resource + Lists + recipes → generic UI. Custom Component = only when that\'s genuinely not sufficient. The strategy doc tracks all Custom Components with a required "reason" field so the WET set is visible and can shrink over time.',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Sort activity ──────────────────────────────────────────────────────────
function SortActivity({ activity, onComplete }: {
  activity: Extract<ActivityType, { kind: 'sort' }>;
  onComplete: () => void;
}) {
  type Placement = Record<string, string>; // itemId → bucketId
  const [placements, setPlacements] = useState<Placement>({});
  const [checked, setChecked] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const allPlaced = activity.items.every(i => placements[i.id]);
  const score = activity.items.filter(i => placements[i.id] === i.bucket).length;
  const allCorrect = score === activity.items.length;

  function drop(bucketId: string) {
    if (!dragging) return;
    setPlacements(p => ({ ...p, [dragging]: bucketId }));
    setDragging(null);
    setOver(null);
  }

  // Tap-to-place (touch / mobile where HTML5 drag-and-drop doesn't fire)
  function selectItem(itemId: string) {
    setDragging(prev => (prev === itemId ? null : itemId));
  }

  function placeSelected(bucketId: string) {
    if (!dragging) return;
    setPlacements(p => ({ ...p, [dragging]: bucketId }));
    setDragging(null);
    setOver(null);
  }

  function clickPlace(itemId: string, bucketId: string) {
    setPlacements(p => {
      if (p[itemId] === bucketId) {
        const next = { ...p };
        delete next[itemId];
        return next;
      }
      return { ...p, [itemId]: bucketId };
    });
  }

  return (
    <div className="activity activity--sort">
      <p className="activity__prompt">{activity.prompt}</p>

      {/* Unplaced items */}
      <div className="sort-pool">
        {activity.items.filter(i => !placements[i.id]).map(item => (
          <div
            key={item.id}
            className={`sort-item ${dragging === item.id ? 'sort-item--dragging sort-item--selected' : ''}`}
            draggable
            onDragStart={() => setDragging(item.id)}
            onDragEnd={() => setDragging(null)}
            onClick={() => selectItem(item.id)}
          >
            <code>{item.label}</code>
          </div>
        ))}
        {activity.items.every(i => placements[i.id]) && (
          <div className="sort-pool-empty">All items placed</div>
        )}
      </div>

      {/* Buckets */}
      <div className="sort-buckets">
        {activity.buckets.map(bucket => (
          <div
            key={bucket.id}
            className={`sort-bucket ${over === bucket.id ? 'sort-bucket--over' : ''} ${dragging ? 'sort-bucket--target' : ''}`}
            style={{ '--bucket-color': bucket.color } as React.CSSProperties}
            onDragOver={e => { e.preventDefault(); setOver(bucket.id); }}
            onDragLeave={() => setOver(null)}
            onDrop={() => drop(bucket.id)}
            onClick={() => placeSelected(bucket.id)}
          >
            <div className="sort-bucket__header">{bucket.label}</div>
            <div className="sort-bucket__items">
              {activity.items.filter(i => placements[i.id] === bucket.id).map(item => {
                const correct = item.bucket === bucket.id;
                return (
                  <div
                    key={item.id}
                    className={`sort-item sort-item--placed ${checked ? (correct ? 'sort-item--correct' : 'sort-item--wrong') : ''}`}
                    onClick={e => { e.stopPropagation(); if (!checked) clickPlace(item.id, bucket.id); }}
                  >
                    <code>{item.label}</code>
                    {checked && <span className="sort-item__badge">{correct ? '✓' : '✗'}</span>}
                  </div>
                );
              })}
              {activity.items.filter(i => placements[i.id] === bucket.id).length === 0 && (
                <div className="sort-bucket__empty">Drop items here</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="activity__hint">Tap an item to select it, then tap a bucket to place it. On desktop you can also drag. Tap a placed item to send it back to the pool.</p>

      {!checked ? (
        <button
          className={`activity__check-btn ${allPlaced ? 'activity__check-btn--ready' : ''}`}
          disabled={!allPlaced}
          onClick={() => setChecked(true)}
        >
          Check my answers
        </button>
      ) : (
        <div className="activity__result">
          <div className="activity__result-score">
            {score}/{activity.items.length} correct
          </div>
          <p className="activity__result-text">
            {allCorrect
              ? 'Perfect! You can tell the difference between a hardcoded copy and a DRY List read.'
              : `${activity.items.length - score} item(s) are in the wrong bucket. The difference is whether the code defines the vocabulary itself or reads it from the List.`}
          </p>
          <button className="activity__next-btn" onClick={onComplete}>
            {allCorrect ? 'Continue to quiz →' : 'Continue anyway →'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Match activity ─────────────────────────────────────────────────────────
function MatchActivity({ activity, onComplete }: {
  activity: Extract<ActivityType, { kind: 'match' }>;
  onComplete: () => void;
}) {
  const TYPES = ['STAGE', 'TAXONOMY', 'RELATIONSHIP', 'EVENT', 'TRANSFORM'];
  type Matches = Record<string, string>;
  const [matches, setMatches] = useState<Matches>({});
  const [checked, setChecked] = useState(false);

  const allMatched = activity.pairs.every(p => matches[p.term]);
  const score = activity.pairs.filter(p => matches[p.term] === p.def).length;

  const typeColors: Record<string, string> = {
    STAGE: 'var(--orange-l)', TAXONOMY: 'var(--blue)',
    RELATIONSHIP: 'var(--green)', EVENT: 'var(--pink)', TRANSFORM: 'var(--yellow)',
  };

  return (
    <div className="activity activity--match">
      <p className="activity__prompt">{activity.prompt}</p>

      <div className="match-grid">
        {activity.pairs.map(pair => {
          const selected = matches[pair.term];
          const correct = selected === pair.def;
          return (
            <div key={pair.term} className={`match-row ${checked ? (correct ? 'match-row--correct' : 'match-row--wrong') : ''}`}>
              <div className="match-term"><code>{pair.term}</code></div>
              <div className="match-arrow">→</div>
              <div className="match-select-wrap">
                <select
                  className="match-select"
                  value={selected ?? ''}
                  disabled={checked}
                  onChange={e => setMatches(m => ({ ...m, [pair.term]: e.target.value }))}
                  style={selected ? { borderColor: typeColors[selected], color: typeColors[selected] } : {}}
                >
                  <option value="">Pick a type…</option>
                  {TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {checked && (
                  <span className="match-badge">{correct ? '✓' : `✗ → ${pair.def}`}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!checked ? (
        <button
          className={`activity__check-btn ${allMatched ? 'activity__check-btn--ready' : ''}`}
          disabled={!allMatched}
          onClick={() => setChecked(true)}
        >
          Check matches
        </button>
      ) : (
        <div className="activity__result">
          <div className="activity__result-score">{score}/{activity.pairs.length} correct</div>
          <p className="activity__result-text">
            {score === activity.pairs.length
              ? 'You know your ListTypes. This distinction drives everything the Template Engine does.'
              : 'Review: STAGE = governed lifecycle. TAXONOMY = free classification. RELATIONSHIP = edge label. EVENT = occurrence (no resource). TRANSFORM = middleware rules.'}
          </p>
          <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
        </div>
      )}
    </div>
  );
}

// ── Build activity ─────────────────────────────────────────────────────────
function BuildActivity({ activity, onComplete }: {
  activity: Extract<ActivityType, { kind: 'build' }>;
  onComplete: () => void;
}) {
  type Selections = Record<string, string>;
  const [selections, setSelections] = useState<Selections>({});
  const [checked, setChecked] = useState(false);

  const allFilled = activity.slots.every(s => selections[s.id]);
  const score = activity.slots.filter(s => selections[s.id] === s.correct).length;

  return (
    <div className="activity activity--build">
      <p className="activity__prompt">{activity.prompt}</p>

      <div className="build-recipe">
        <div className="build-recipe__header">
          <span className="build-recipe__label">Recipe</span>
          <code className="build-recipe__brace">{'{'}</code>
        </div>

        {activity.slots.map(slot => {
          const val = selections[slot.id];
          const correct = val === slot.correct;
          return (
            <div key={slot.id} className={`build-slot ${checked ? (correct ? 'build-slot--correct' : 'build-slot--wrong') : ''}`}>
              <span className="build-slot__key">{slot.label}:</span>
              <select
                className="build-slot__select"
                value={val ?? ''}
                disabled={checked}
                onChange={e => setSelections(s => ({ ...s, [slot.id]: e.target.value }))}
              >
                <option value="">select…</option>
                {slot.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {checked && !correct && (
                <span className="build-slot__correct-hint">✗ correct: {slot.correct}</span>
              )}
              {checked && correct && <span className="build-slot__ok">✓</span>}
            </div>
          );
        })}

        <code className="build-recipe__brace">{'}'}</code>
      </div>

      {!checked ? (
        <button
          className={`activity__check-btn ${allFilled ? 'activity__check-btn--ready' : ''}`}
          disabled={!allFilled}
          onClick={() => setChecked(true)}
        >
          Build & check
        </button>
      ) : (
        <div className="activity__result">
          <div className="activity__result-score">{score}/{activity.slots.length} correct</div>
          <p className="activity__result-text">
            {score === activity.slots.length
              ? 'You built a valid recipe. That\'s exactly how the real crm.* recipes are structured in the module manifests.'
              : 'Review the field names — resource slugs are plural snake_case, filter fields use lists.<listKey> format, values are ListItem slugs (lowercase).'}
          </p>
          <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
        </div>
      )}
    </div>
  );
}

// ── Trace activity ─────────────────────────────────────────────────────────
function TraceActivity({ activity, onComplete }: {
  activity: Extract<ActivityType, { kind: 'trace' }>;
  onComplete: () => void;
}) {
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= activity.steps.length;

  return (
    <div className="activity activity--trace">
      <p className="activity__prompt">{activity.prompt}</p>

      <div className="trace-steps">
        {activity.steps.map((step, i) => {
          const isVisible = i < revealed;
          const isCurrent = i === revealed;
          return (
            <div key={step.id} className={`trace-step ${isVisible ? 'trace-step--visible' : ''}`}>
              <div
                className={`trace-step__node ${isCurrent ? 'trace-step__node--pulse' : ''}`}
                style={{ '--step-color': step.color } as React.CSSProperties}
                onClick={() => i <= revealed && setRevealed(r => Math.max(r, i + 1))}
              >
                <span className="trace-step__num">{i + 1}</span>
              </div>
              {i < activity.steps.length - 1 && (
                <div className={`trace-step__line ${isVisible ? 'trace-step__line--active' : ''}`}
                  style={{ '--step-color': step.color } as React.CSSProperties} />
              )}
              <div className={`trace-step__content ${isVisible ? 'trace-step__content--visible' : ''}`}>
                <div className="trace-step__label" style={{ color: step.color }}>{step.label}</div>
                {isVisible && <p className="trace-step__detail animate-fade-in">{step.detail}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {!done ? (
        <button
          className="activity__check-btn activity__check-btn--ready"
          onClick={() => setRevealed(r => Math.min(r + 1, activity.steps.length))}
        >
          {revealed === 0 ? 'Start trace →' : `Next: ${activity.steps[revealed]?.label} →`}
        </button>
      ) : (
        <div className="activity__result">
          <p className="activity__result-text">
            You traced the full PRBAC flow. Notice how each step narrows context — by the time data is returned, it\'s already scoped by org, role, and relationship graph.
          </p>
          <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
        </div>
      )}
    </div>
  );
}

function ActivityRouter({ activity, onComplete }: { activity: ActivityType; onComplete: () => void }) {
  if (activity.kind === 'sort') return <SortActivity activity={activity} onComplete={onComplete} />;
  if (activity.kind === 'match') return <MatchActivity activity={activity} onComplete={onComplete} />;
  if (activity.kind === 'build') return <BuildActivity activity={activity} onComplete={onComplete} />;
  if (activity.kind === 'trace') return <TraceActivity activity={activity} onComplete={onComplete} />;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

interface Progress {
  completedLevels: number[];
}

function loadProgress(): Progress {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch {}
  return { completedLevels: [] };
}

function saveProgress(p: Progress) {
  sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

type LevelPhase = 'intro' | 'activity' | 'quiz';

export default function CoursePage() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [phase, setPhase] = useState<LevelPhase>('intro');
  const [quizState, setQuizState] = useState<{
    answers: (number | null)[];
    submitted: boolean[];
    score: number;
    finished: boolean;
  } | null>(null);

  function openLevel(levelId: number) {
    setActiveLevel(levelId);
    setPhase('intro');
    setQuizState(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startActivity() { setPhase('activity'); }
  function startQuiz() {
    const level = LEVELS.find(l => l.id === activeLevel)!;
    setPhase('quiz');
    setQuizState({
      answers: new Array(level.questions.length).fill(null) as null[],
      submitted: new Array(level.questions.length).fill(false) as false[],
      score: 0,
      finished: false,
    });
  }

  function answerQuestion(qIdx: number, optionIdx: number) {
    if (!quizState || quizState.submitted[qIdx]) return;
    const level = LEVELS.find(l => l.id === activeLevel)!;
    const correct = level.questions[qIdx]!.correct === optionIdx;
    const newAnswers = [...quizState.answers]; newAnswers[qIdx] = optionIdx;
    const newSubmitted = [...quizState.submitted]; newSubmitted[qIdx] = true;
    const newScore = quizState.score + (correct ? 1 : 0);
    const finished = newSubmitted.every(Boolean);
    setQuizState({ answers: newAnswers, submitted: newSubmitted, score: newScore, finished });
  }

  function finishLevel() {
    if (!quizState || !activeLevel) return;
    const level = LEVELS.find(l => l.id === activeLevel)!;
    const passScore = Math.ceil(level.questions.length * 0.67);
    if (quizState.score >= passScore) {
      const newProgress = { completedLevels: [...new Set([...progress.completedLevels, activeLevel])] };
      setProgress(newProgress);
      saveProgress(newProgress);
    }
    setActiveLevel(null);
    setQuizState(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetProgress() {
    const fresh: Progress = { completedLevels: [] };
    setProgress(fresh);
    saveProgress(fresh);
    setActiveLevel(null);
    setQuizState(null);
  }

  // ── Level detail view ──────────────────────────────────────────────────
  if (activeLevel !== null) {
    const level = LEVELS.find(l => l.id === activeLevel)!;
    const phaseIndex = phase === 'intro' ? 0 : phase === 'activity' ? 1 : 2;

    return (
      <div className="course">
        {/* top nav */}
        <div className="course__level-nav">
          <button className="course__back" onClick={() => { setActiveLevel(null); window.scrollTo({ top: 0 }); }}>
            ← All levels
          </button>
          <div className="course__level-nav-title" style={{ color: level.color }}>
            {level.icon} {level.title}
          </div>
          {/* phase progress */}
          <div className="course__phases">
            {['Read', 'Practice', 'Quiz'].map((name, i) => (
              <div key={name} className={`course__phase ${i === phaseIndex ? 'course__phase--active' : ''} ${i < phaseIndex ? 'course__phase--done' : ''}`}
                style={{ '--phase-color': level.color } as React.CSSProperties}>
                <div className="course__phase-dot">{i < phaseIndex ? '✓' : i + 1}</div>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── INTRO phase ── */}
        {phase === 'intro' && (
          <div className="course__intro animate-fade-up">
            <div className="course__intro-badge" style={{ color: level.color, borderColor: level.color }}>
              Level {level.id} · {level.subtitle}
            </div>
            <h2 className="course__intro-headline">{level.intro.headline}</h2>

            <div className="course__intro-body">
              {level.intro.body.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <blockquote className="course__intro-highlight">
              {level.intro.highlight}
            </blockquote>

            <button className="course__phase-btn" style={{ background: level.color }} onClick={startActivity}>
              Got it — let me practice →
            </button>
          </div>
        )}

        {/* ── ACTIVITY phase ── */}
        {phase === 'activity' && (
          <div className="animate-fade-up">
            <div className="course__activity-header">
              <div className="course__activity-label">Practice</div>
              <h3 className="course__activity-title">{
                level.activity.kind === 'sort' ? 'Sort the examples' :
                level.activity.kind === 'match' ? 'Match the types' :
                level.activity.kind === 'build' ? 'Build the recipe' :
                'Trace the flow'
              }</h3>
            </div>
            <ActivityRouter activity={level.activity} onComplete={startQuiz} />
          </div>
        )}

        {/* ── QUIZ phase ── */}
        {phase === 'quiz' && quizState && (
          <div className="animate-fade-up">
            <div className="course__activity-header">
              <div className="course__activity-label">Knowledge check</div>
              <h3 className="course__activity-title">{level.questions.length} questions to complete Level {level.id}</h3>
            </div>

            <div className="course__questions">
              {level.questions.map((q, qi) => (
                <div key={qi} className="course__question card">
                  <div className="course__question-header">
                    <span className="course__question-num">Q{qi + 1}</span>
                    <p className="course__question-text">{q.q}</p>
                  </div>
                  <div className="course__options">
                    {q.options.map((opt, oi) => {
                      const submitted = quizState.submitted[qi];
                      const selected = quizState.answers[qi] === oi;
                      const isCorrect = q.correct === oi;
                      let cls = 'course__option';
                      if (submitted) {
                        if (isCorrect) cls += ' course__option--correct';
                        else if (selected) cls += ' course__option--wrong';
                        else cls += ' course__option--dim';
                      } else if (selected) cls += ' course__option--selected';
                      return (
                        <button key={oi} className={cls}
                          onClick={() => answerQuestion(qi, oi)}
                          disabled={quizState.submitted[qi] === true}>
                          <span className="course__option-letter">{['A','B','C','D'][oi]}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizState.submitted[qi] && (
                    <div className={`course__explanation animate-fade-in ${quizState.answers[qi] === q.correct ? 'course__explanation--correct' : 'course__explanation--wrong'}`}>
                      <span>{quizState.answers[qi] === q.correct ? '✅' : '❌'}</span>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {quizState.finished && (
              <div className="course__result animate-fade-up card">
                <div className="course__result-score" style={{ color: level.color }}>
                  {quizState.score}/{level.questions.length}
                </div>
                <div className="course__result-label">
                  {quizState.score >= Math.ceil(level.questions.length * 0.67) ? '🎉 Level Complete!' : '😅 Almost there'}
                </div>
                <p className="course__result-desc">
                  {quizState.score >= Math.ceil(level.questions.length * 0.67)
                    ? `Level ${level.id} passed and saved to your progress.`
                    : 'You need 67%+ to pass. Review the intro and try again.'}
                </p>
                <div className="course__result-actions">
                  {quizState.score < Math.ceil(level.questions.length * 0.67) && (
                    <button className="course__back-btn" onClick={() => setPhase('intro')}>
                      ← Back to intro
                    </button>
                  )}
                  <button
                    className="course__phase-btn"
                    style={{ background: quizState.score >= Math.ceil(level.questions.length * 0.67) ? level.color : 'var(--surface2)', color: quizState.score >= Math.ceil(level.questions.length * 0.67) ? 'white' : 'var(--text-dim)', border: '1px solid var(--border)' }}
                    onClick={finishLevel}
                  >
                    {quizState.score >= Math.ceil(level.questions.length * 0.67)
                      ? (activeLevel < LEVELS.length ? 'Next level →' : 'Finish course 🎓')
                      : 'Back to levels'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Level hub ──────────────────────────────────────────────────────────
  const pct = Math.round((progress.completedLevels.length / LEVELS.length) * 100);

  return (
    <div className="course">
      <div className="course__header">
        <div className="section__label">Learning Mode</div>
        <h1 className="section__title">Synapse Architecture Course</h1>
        <p className="section__desc">
          5 levels. Each one has an introduction, a hands-on activity, and a knowledge check.
          Complete 67%+ of the quiz to pass a level. Progress is saved in this session.
        </p>
        <div className="course__progress-bar-container">
          <div className="course__progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="course__progress-label">
          <span>{progress.completedLevels.length}/{LEVELS.length} levels complete</span>
          <button className="course__reset" onClick={resetProgress}>Reset progress</button>
        </div>
      </div>

      <div className="course__levels">
        {LEVELS.map((level) => {
          const isCompleted = progress.completedLevels.includes(level.id);
          const isLocked = level.id > 1 && !progress.completedLevels.includes(level.id - 1);
          return (
            <div
              key={level.id}
              className={`course__level-card card ${isCompleted ? 'course__level-card--done' : ''} ${isLocked ? 'course__level-card--locked' : ''}`}
              style={{ '--lc-color': level.color } as React.CSSProperties}
            >
              <div className="course__level-left">
                <div className="course__level-icon">{isCompleted ? '✅' : isLocked ? '🔒' : level.icon}</div>
                <div>
                  <div className="course__level-num">Level {level.id}</div>
                  <div className="course__level-title">{level.title}</div>
                  <div className="course__level-subtitle">{level.subtitle}</div>
                </div>
              </div>
              <div className="course__level-right">
                <div className="course__level-meta">
                  <span>📖 Read</span>
                  <span>🎮 Practice</span>
                  <span>📝 {level.questions.length} Qs</span>
                </div>
                {!isLocked && (
                  <button
                    className="course__level-start"
                    style={{ borderColor: level.color, color: level.color }}
                    onClick={() => openLevel(level.id)}
                  >
                    {isCompleted ? 'Replay' : 'Start'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {progress.completedLevels.length === LEVELS.length && (
        <div className="course__complete card animate-fade-up">
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎓</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Course Complete!</h2>
          <p style={{ color: 'var(--text-dim)' }}>
            You've worked through every concept in the architecture. Now go build it right. 🍰
          </p>
        </div>
      )}
    </div>
  );
}
