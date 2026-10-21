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

// A cross-disciplinary concept callout: connects the Synapse pattern to an
// established idea in CS / databases / data structures / software engineering.
interface Concept {
  icon: string;
  discipline: string;      // e.g. "Databases", "Data Structures", "Programming"
  term: string;            // the established name, e.g. "Graph database"
  body: string;            // how the Synapse pattern maps to it
}

// Which source documents back this level (shown as a "documented in" block).
interface DocRef {
  file: string;            // repo path, e.g. "docs/architecture/DOCTRINE.md"
  note: string;            // what to read there
}

type ActivityType =
  | { kind: 'sort'; prompt: string; items: { id: string; label: string; bucket: string }[]; buckets: { id: string; label: string; color: string }[] }
  | { kind: 'match'; prompt: string; pairs: { term: string; def: string }[] }
  | { kind: 'build'; prompt: string; slots: { id: string; label: string; options: string[]; correct: string }[] }
  | { kind: 'trace'; prompt: string; steps: { id: string; label: string; detail: string; color: string }[] }
  // Interactive relationship-graph explorer — click a node, see its typed edges.
  | {
      kind: 'graph';
      prompt: string;
      nodes: { id: string; label: string; type: string; color: string; mrr?: number }[];
      edges: { from: string; to: string; label: string; perspective: string }[];
      focusHint: string;
    }
  // CREAM-PQL query builder — assemble a ?when[...] URL and see the compiled where.
  | {
      kind: 'query';
      prompt: string;
      resource: string;
      fields: { key: string; label: string; ops: string[]; values: { value: string; label: string }[] }[];
      goalText: string;
      goal: { field: string; op: string; value: string }[];
    }
  // Synapse UI simulation — a live EntityList the learner filters, with tabs/chips.
  | {
      kind: 'uimock';
      prompt: string;
      resource: string;
      stageList: { key: string; label: string; color: string }[];
      rows: { id: number; name: string; stage: string; meta: string }[];
      lessonText: string;
    };

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
  concepts?: Concept[];
  docRefs?: DocRef[];
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
    concepts: [
      {
        icon: '🔁',
        discipline: 'Software Engineering',
        term: 'DRY — Don\'t Repeat Yourself',
        body: 'Coined in The Pragmatic Programmer: "every piece of knowledge must have a single, unambiguous, authoritative representation within a system." The 78 copies are 78 representations of one piece of knowledge. Collapsing them to one List is DRY applied to data, not just code.',
      },
      {
        icon: '🎯',
        discipline: 'Software Design',
        term: 'Single Source of Truth (SSOT)',
        body: 'The List row is the SSOT for a vocabulary. Every other layer — UI, query, RBAC — holds a reference to it, never a copy. When the truth changes, every reference sees the change at once. No synchronisation step, so nothing can fall out of sync.',
      },
      {
        icon: '🛠️',
        discipline: 'Build / CI',
        term: 'Ratchet (one-way constraint)',
        body: 'The "anatomy ratchet" is a CI guard that only lets the count of hardcoded copies go down, never up. Like a socket-wrench ratchet, progress is locked in. This is a common technique for paying down tech debt without regressing — the number can only improve.',
      },
    ],
    docRefs: [
      { file: 'docs/architecture/DOCTRINE.md', note: '§1 — the "never hardcode a business vocabulary" rule and the One Vocabulary Layer.' },
      { file: 'docs/architecture/ERP-PRIMITIVES.md', note: 'Why this is Reference Data Management, not a bag of enums.' },
    ],
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
    concepts: [
      {
        icon: '🔤',
        discipline: 'Programming Languages',
        term: 'Primitive types',
        body: 'A language gives you a small set of primitives — number, string, boolean — and you compose them to express anything. A List is a primitive of the ERP\'s vocabulary language: pick a ListType the way you pick a type, and you express a status, a classification, an edge label, or an occurrence. The five ListTypes are the "type system" for business meaning.',
      },
      {
        icon: '🗃️',
        discipline: 'Databases',
        term: 'EAV & the WordPress taxonomy shape',
        body: 'List / ListItem / ListResource is the Entity-Attribute-Value pattern done deliberately: List ≈ wp_term_taxonomy, ListItem ≈ wp_terms, ListResource ≈ wp_term_relationships, and ItemMeta ≈ wp_termmeta. It is schemaless vocabulary on top of a relational database — new values need no migration, exactly like adding a WordPress tag.',
      },
      {
        icon: '🔑',
        discipline: 'Software Design',
        term: 'Stable identifier vs display label',
        body: 'The immutable slug is the machine identifier (like a primary key or an enum constant\'s name); the label is the human display string. This is the same separation as a database key vs a column value, or an i18n message-id vs its translation. Rename the label freely; the slug is API and renaming it is a data migration.',
      },
      {
        icon: '🌲',
        discipline: 'Data Structures',
        term: 'Recursive / self-referential structure',
        body: 'A ListItem can carry its own sub-List (the "Waiting on Client" stage has a holdReason sub-list). That is a tree/one-level recursion — a dependent picklist (Salesforce\'s name) or skos:narrower (the SKOS standard). The depth is bounded at one: a meta value may point to a List, but nothing attaches to a meta.',
      },
    ],
    docRefs: [
      { file: 'docs/architecture/ERP-PRIMITIVES.md', note: '§1 the SKOS/RDF names; §2 why type is three orthogonal axes; §3 ListType-as-a-List.' },
      { file: 'docs/architecture/SEEDED-LISTS.md', note: 'The full catalogue of 98 seeded lists, and the §4.2 dependent sub-list example.' },
      { file: 'docs/api/polymorphic-lists.md', note: 'The List/ListResource models and "add values via admin UI, not migrations."' },
    ],
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
    concepts: [
      {
        icon: '🧾',
        discipline: 'Programming Languages',
        term: 'DSL + compiler (one IR, many front-ends)',
        body: 'MTEL and JSON are two front-end syntaxes; both compile to CREAM-PQL, the single internal representation (IR), just as C and Rust both lower to LLVM IR. A recipe\'s { logic, rules } tree is an AST; compilePredicate / toPrismaWhere are the back-ends that target an in-memory predicate or a SQL WHERE. One grammar, evaluated everywhere.',
      },
      {
        icon: '⚙️',
        discipline: 'Software Architecture',
        term: 'Configuration over code',
        body: 'A recipe is a stored object, not a branch in a function. The same row drives the query, the menu item, the URL, the RBAC gate, the UI, and a pub/sub condition. Behaviour lives in data a non-developer can edit, not in code that needs a deploy — the inversion at the heart of the whole system.',
      },
      {
        icon: '🪆',
        discipline: 'Design Patterns',
        term: 'Composite + Interpreter',
        body: 'The { logic: AND|OR, rules: [...] } structure is the Composite pattern — a rule node and a group node share one shape and nest arbitrarily. The engine that walks that tree to a yes/no answer is the Interpreter pattern. These are the two GoF patterns a condition language always reaches for.',
      },
      {
        icon: '🔭',
        discipline: 'Scoping',
        term: 'Lexical-scope analogy (tiers)',
        body: 'System → Organization → User recipe tiers resolve like nested lexical scopes: a user recipe is looked up first but is additive and can never shadow a system slug, and it always narrows (ANDs) under the caller\'s security scope. "Narrow, never widen" is the invariant that makes sharing safe.',
      },
    ],
    docRefs: [
      { file: 'docs/CREAM-PIE.md', note: 'The original design: the CreamPie abstract, Context Store anatomy, and the engine.' },
      { file: 'docs/architecture/DOCTRINE.md', note: '§3 one condition dialect (CREAM-PQL); §4 recipes are tiered, condition-shared.' },
      { file: 'docs/LOADED-CREAM-PIE-STRATEGY.md', note: '§3 decisions C2/C3/C19 — recipes stay tiered, the URL param is ?recipe=, and the CSV grammar translation.' },
    ],
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
    concepts: [
      {
        icon: '🕸️',
        discipline: 'Databases',
        term: 'Graph data model (nodes + typed edges)',
        body: 'Standard SaaS partitions data with a single organization_id column — a flat, relational silo. CI Connect instead models organizations and contacts as nodes joined by typed, directed, bidirectional edges (OWNER, REFERRER, VENDOR…). That is a property graph (think Neo4j / RDF triples) living inside Postgres via the RELATIONSHIP List and junction rows. Visibility is a graph traversal, not a column filter.',
      },
      {
        icon: '🧭',
        discipline: 'Data / Semantics',
        term: 'Context-dependent meaning (the same edge, two readings)',
        body: '"Perspective" is the idea that a fact\'s meaning depends on the path taken to reach it. Crystal\'s $12k shows as Direct MRR along the OWNER edge and the same payments show as Indirect MRR along a REFERRER edge. In graph terms the aggregate is a function of the traversal, not of the node alone.',
      },
      {
        icon: '🔐',
        discipline: 'Security / Access Control',
        term: 'ABAC over RBAC (deny-first)',
        body: 'PRBAC = Action + Object + Organization-Context + Condition. Adding the context and condition turns plain role-based access control (RBAC) into attribute-based (ABAC). The default answer is DENY; access needs an explicit allow policy — the safe default (default-deny) for anything touching money or PII. Implemented with CASL abilities.',
      },
      {
        icon: '🎟️',
        discipline: 'Auth / Sessions',
        term: 'Claims in a JWT (stateless context)',
        body: 'At login you pick an organization; that choice is encoded as a claim in the JWT, so every request already carries "which org am I acting as." The same person is an Account Manager at one org and a plain contact at another — identity is resolved AFTER tenancy, deliberately.',
      },
    ],
    docRefs: [
      { file: 'docs/architecture/ERP-PRIMITIVES.md', note: 'RELATIONSHIP as an RDF predicate / triple; §6 the unanswered licensee-boundary question.' },
      { file: 'docs/architecture/SEEDED-LISTS.md', note: 'The mirrored RELATIONSHIP lists (organizationRelationshipType, organizationRole) and their definition tables.' },
      { file: 'docs/architecture/DOCTRINE.md', note: '§1 RELATIONSHIP labels an edge; the bidirectional A-of-B ⇒ B-of-A rule.' },
    ],
    activity: {
      kind: 'graph',
      prompt: 'Click a node to see its typed edges. Follow Crystal\'s edges and watch how the SAME payments read as Direct vs Indirect MRR depending on the edge you traverse.',
      focusHint: 'Start with Crystal (the contact). Her OWNER edge and her REFERRER edge reach different orgs — and attribute their revenue differently.',
      nodes: [
        { id: 'crystal', label: 'Crystal', type: 'Contact', color: 'var(--purple-l)' },
        { id: 'lemonseed', label: 'LemonSeed', type: 'Organization', color: 'var(--green)', mrr: 12000 },
        { id: 'acme', label: 'Acme HVAC', type: 'Organization', color: 'var(--blue)', mrr: 4500 },
        { id: 'ciweb', label: 'CI Web Group', type: 'Organization', color: 'var(--orange-l)' },
      ],
      edges: [
        { from: 'crystal', to: 'lemonseed', label: 'OWNER', perspective: 'Crystal OWNS LemonSeed → its $12k/mo counts as her DIRECT MRR.' },
        { from: 'crystal', to: 'acme', label: 'REFERRER', perspective: 'Crystal REFERRED Acme HVAC → its $4.5k/mo counts as her INDIRECT MRR. Same kind of payment rows, different edge, different attribution.' },
        { from: 'ciweb', to: 'lemonseed', label: 'ACCOUNT_MANAGER_OF', perspective: 'CI Web Group manages LemonSeed. Traverse from CI Web Group and LemonSeed is a managed account, not an owned company — a third reading of the same node.' },
        { from: 'crystal', to: 'ciweb', label: 'AMBASSADOR_OF', perspective: 'Crystal is also an Ambassador of CI Web Group. One contact, three simultaneous edges, three roles.' },
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
    concepts: [
      {
        icon: '🏭',
        discipline: 'Metaprogramming',
        term: 'Declarative, data-driven UI generation',
        body: 'Instead of imperative code per screen, you declare what a resource is and a generator produces the screen. This is the same idea as Rails scaffolding, Django admin, or GraphQL schema-first tooling — and directly inspired by React-Admin\'s "Guesser." The manifest is the schema; the engine is the code generator that never writes a file.',
      },
      {
        icon: '🧠',
        discipline: 'Programming Languages',
        term: 'Type inference',
        body: 'The Guesser infers the view the way a compiler infers a type: from the shape of the data. "One single-select STAGE list with ≥3 values" ⇒ offer a Kanban board, with zero annotation — exactly like let x = 3 inferring number. You only write an explicit override when inference guesses wrong.',
      },
      {
        icon: '📐',
        discipline: 'Software Design',
        term: 'Convention over configuration + layered overrides',
        body: 'A sensible default comes for free (convention); you only configure the exceptions. The fold is Guesser default → registered template → saved-view presentation, and each layer may only ADD or NARROW, never break the one below — the same safe-override discipline as CSS cascade or method overriding with a strengthened contract.',
      },
      {
        icon: '💧',
        discipline: 'Tech debt',
        term: 'WET as the inverse of DRY (made visible)',
        body: 'Screens that can\'t yet be generated are "WET" (Write Everything Twice) and are quarantined under a visible menu, each with a required reason. Naming and counting the debt is what lets it shrink — the same philosophy as the anatomy ratchet from Level 1.',
      },
    ],
    docRefs: [
      { file: 'docs/architecture/DECISIONS-resource-views.md', note: 'V1–V10 — the ResourceView template, the narrowing rule, and the WET quarantine.' },
      { file: 'docs/architecture/MODULE-STRUCTURE.md', note: '§1–§3 — what module.json declares and the three registries a module writes into.' },
      { file: 'docs/CREAM-PIE.md', note: 'The "Guesser" inspiration and the ResourceView / Rendering Engine sketch.' },
    ],
    activity: {
      kind: 'uimock',
      prompt: 'This is a simulated Synapse EntityList for helpdesk_tickets. The resource has one STAGE list (helpdeskTicketStage), so the Guesser gave it stage tabs. Click a tab — watch the URL and the rows update. No per-screen code wrote this.',
      resource: 'helpdesk_tickets',
      lessonText: 'Every tab you clicked set ?recipe / ?when on the URL — the filter state lives in the address bar, so the view is shareable by link. The tabs exist purely because a STAGE list was declared on the resource. Add a value in the Lists admin and a new tab appears with no deploy.',
      stageList: [
        { key: 'open', label: 'Open', color: 'var(--blue)' },
        { key: 'in_progress', label: 'In Progress', color: 'var(--purple-l)' },
        { key: 'waiting_on_client', label: 'Waiting on Client', color: 'var(--orange-l)' },
        { key: 'escalated', label: 'Escalated', color: 'var(--pink)' },
        { key: 'resolved', label: 'Resolved', color: 'var(--green)' },
      ],
      rows: [
        { id: 4821, name: 'Login page 500 error', stage: 'escalated', meta: 'Acme HVAC · High' },
        { id: 4822, name: 'Logo upload fails', stage: 'open', meta: 'LemonSeed · Medium' },
        { id: 4823, name: 'SEO report missing', stage: 'in_progress', meta: 'Acme HVAC · Low' },
        { id: 4824, name: 'Add user to portal', stage: 'resolved', meta: 'Delta Air · Low' },
        { id: 4825, name: 'Domain DNS cutover', stage: 'waiting_on_client', meta: 'LemonSeed · High' },
        { id: 4826, name: 'Billing address wrong', stage: 'open', meta: 'Crystal Co · Medium' },
        { id: 4827, name: 'Reschedule onboarding', stage: 'in_progress', meta: 'Delta Air · Medium' },
        { id: 4828, name: 'Password reset loop', stage: 'escalated', meta: 'Acme HVAC · Urgent' },
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

  // ── LEVEL 6 ──────────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'Deciding How to Build',
    subtitle: 'UI-vs-code triage, and "declare the relation, don\'t write a resolver"',
    icon: '🧭',
    color: 'var(--pink)',
    intro: {
      headline: 'The first question is never "what code do I write?"',
      body: [
        'Every request starts with one triage: is this a DATA change (done in the Lists admin UI, no code, no deploy) or a CODE change? Guessing "write some code" first is how the engine gets bypassed and bespoke one-offs pile up.',
        'DATA change — do it in the Lists admin at /backoffice/admin/lists, nothing else. New status, new type, new tag, a renamed or recolored value, a new saved perspective: these are ListItems or recipe rows. "Add list values via the admin UI, not migrations." No PR. If the whole request is "add/rename/reorder a value," you are done without touching the repo.',
        'CODE change — only when rows genuinely cannot express it: a new relation between two tables, a new module model, a new recipe wired into a module manifest, or real new behavior. Before writing anything, name the List, ListItem, recipe row, OR relation that is missing. If it can be rows, it is rows.',
        'The trap: a "new filter" can be EITHER. A filter over existing vocabulary values is data (a chip/recipe). A filter that has to reach across a relationship that is not yet navigable is a missing RELATION — you declare the relation in the schema, and the one condition dialect (CREAM-PQL) traverses it. You do NOT write a hand-rolled resolver that side-queries and builds a custom WHERE — that is the §3 violation (an ad-hoc filter DSL beside the engine).',
        'Worked example — the campaign filter bug. "Leads I attached to an event don\'t show when I filter Leads by that campaign." A lead links to a campaign two ways: a stamp on the lead (Lead.campaignId) and a membership row (CampaignMember). The filter only read the stamp. The WRONG fix (shipped first) was a bespoke campaignMembershipFilter.ts that side-queried CampaignMember and built an OR() — new filter code, a §3 violation. The RIGHT fix: the edge already exists as rows; what was missing was a declared Prisma RELATION (Lead.campaignMembers ↔ CampaignMember.lead). Declare it, and the stock compiler resolves when[campaignMembers.campaignId][eq]=8 with zero filter code. Delete the resolver.',
      ],
      highlight: 'Triage first: data (Lists admin, no code) vs code (a missing relation / model / recipe). "Admin UI not migrations" is about vocabulary VALUES. A missing relationship is schema — declare it, let CREAM-PQL traverse it, never hand-roll a resolver.',
    },
    concepts: [
      {
        icon: '🧮',
        discipline: 'Data Modeling',
        term: 'Relationship vs resolver (declare the edge)',
        body: 'A many-to-many link already stored as junction rows (CampaignMember) only needs a declared relation for the query engine to traverse it — like adding a foreign-key relation so an ORM can JOIN. Hand-writing a resolver that side-queries and builds a custom WHERE re-implements the JOIN by hand: more code, a second filter dialect, and a bug surface. Declare the relation; delete the resolver.',
      },
      {
        icon: '🔗',
        discipline: 'Databases',
        term: 'Query planner / path traversal',
        body: 'With the relation declared, when[campaignMembers][some][campaignId][eq]=8 compiles to a nested Prisma where — the engine plans the traversal across the junction table for you. "some" is an existential quantifier over the edge, the relational-algebra semijoin. You express intent; the planner does the work.',
      },
      {
        icon: '🚦',
        discipline: 'Software Process',
        term: 'Triage / decision tree before implementation',
        body: 'The discipline is to classify the request first: is it data (a value → Lists admin, no deploy) or structure (a relation / model / recipe → code)? Choosing the mechanism before writing anything is the same instinct as "measure before you optimise" — it stops the default reflex ("write some code") from bypassing the engine and piling up one-offs.',
      },
    ],
    docRefs: [
      { file: 'docs/architecture/DOCTRINE.md', note: '§2 discriminators over duplicate models; §3 one condition dialect (the resolver anti-pattern).' },
      { file: 'modules/crm/module.json', note: 'The real CRM manifest — the distributor/relationship pattern (commit 87b8972eb) is the model to imitate.' },
      { file: 'modules/_schema/module.schema.json', note: 'The field grammar, including { "type": "relation", "relationTo": "<Model>" } used to declare a navigable edge.' },
    ],
    activity: {
      kind: 'query',
      prompt: 'Build the CREAM-PQL filter for: "Open or in-progress tickets for Acme HVAC, reached through campaign #8 by membership." Watch the ?when[...] URL and the compiled Prisma where build as you go.',
      resource: 'leads',
      goalText: 'Goal: status is open OR in_progress, organization is Acme HVAC, AND the lead is a member of campaign 8 (traversed through the declared campaignMembers relation — no resolver).',
      goal: [
        { field: 'lists.leadStatus', op: 'in', value: 'open,in_progress' },
        { field: 'organizationId', op: 'eq', value: 'acme' },
        { field: 'campaignMembers.campaignId', op: 'eq', value: '8' },
      ],
      fields: [
        {
          key: 'lists.leadStatus',
          label: 'lists.leadStatus',
          ops: ['eq', 'in'],
          values: [
            { value: 'open', label: 'open' },
            { value: 'open,in_progress', label: 'open, in_progress' },
            { value: 'resolved', label: 'resolved' },
          ],
        },
        {
          key: 'organizationId',
          label: 'organizationId',
          ops: ['eq'],
          values: [
            { value: 'acme', label: 'Acme HVAC' },
            { value: 'lemonseed', label: 'LemonSeed' },
          ],
        },
        {
          key: 'campaignMembers.campaignId',
          label: 'campaignMembers.campaignId  (relation!)',
          ops: ['eq'],
          values: [
            { value: '8', label: '8' },
            { value: '3', label: '3' },
          ],
        },
        {
          key: 'campaignId',
          label: 'campaignId  (the stamp — the trap)',
          ops: ['eq'],
          values: [
            { value: '8', label: '8' },
          ],
        },
      ],
    },
    questions: [
      {
        q: 'A request says "add a Vendor option to the Lead Type dropdown." What is the correct first move?',
        options: [
          'Write a migration adding a new enum value',
          'Add the ListItem in the Lists admin UI — it\'s a vocabulary value, no code',
          'Create a new LeadType Prisma model',
          'Write a CREAM-PIE resolver for the Vendor case',
        ],
        correct: 1,
        explanation: 'A new value of an existing vocabulary is a ListItem, added in /backoffice/admin/lists. "Add list values via the admin UI, not migrations." No code, no deploy.',
      },
      {
        q: 'The docs say "add list values via the admin UI, not migrations." What does this rule govern?',
        options: [
          'All schema changes, including relations and new tables',
          'Only the VALUES inside a List (statuses, types, tags, roles) — not relations or new behavior',
          'Only changes made by non-developers',
          'Every filter, because all filters are data',
        ],
        correct: 1,
        explanation: 'It is specifically about vocabulary VALUES — ListItems. A missing RELATION between two tables, a new model, or genuinely new behavior is a code/schema change. Don\'t stretch the "admin UI" rule to cover a missing relationship.',
      },
      {
        q: 'A lead links to a campaign via a CampaignMember row, but the filter only reads Lead.campaignId. The membership-linked leads don\'t show. What is the doctrine-compliant fix?',
        options: [
          'Write a resolver that side-queries CampaignMember and builds an OR() where',
          'Add a new enum for campaign membership',
          'Declare the Prisma relation (Lead.campaignMembers ↔ CampaignMember.lead) and let CREAM-PQL traverse it — no filter code',
          'Copy Lead.campaignId onto every CampaignMember row with a backfill',
        ],
        correct: 2,
        explanation: 'The edge already exists as rows; the missing thing is a declared relation. With it, the stock compiler resolves when[campaignMembers.campaignId][eq]=8 natively. A hand-rolled resolver is an ad-hoc filter DSL beside the engine — the §3 violation this course exists to prevent.',
      },
      {
        q: 'Before writing ANY code for a request, what must you name first?',
        options: [
          'The React component and its props',
          'The database table and its columns',
          'The List, ListItem, recipe row, or relation that is missing — "if it can be rows, it is rows"',
          'The API endpoint and its route',
        ],
        correct: 2,
        explanation: 'The governing rule: name the missing List / ListItem / recipe / relation first. If the need can be expressed as rows (a value, a saved view) or a declared relation, that is the answer — not new bespoke code.',
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
  if (activity.kind === 'graph') return <GraphActivity activity={activity} onComplete={onComplete} />;
  if (activity.kind === 'query') return <QueryActivity activity={activity} onComplete={onComplete} />;
  if (activity.kind === 'uimock') return <UiMockActivity activity={activity} onComplete={onComplete} />;
  return null;
}

// ── Graph activity ─────────────────────────────────────────────────────────
// Interactive relationship explorer. Click a node to light up its typed edges
// and read how the SAME data reads differently per edge (Perspective).
function GraphActivity({ activity, onComplete }: {
  activity: Extract<ActivityType, { kind: 'graph' }>;
  onComplete: () => void;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());

  const focusEdges = activity.edges.filter(e => e.from === focus || e.to === focus);
  const exploredEnough = visited.size >= Math.min(2, activity.nodes.length);

  function pick(id: string) {
    setFocus(id);
    setVisited(v => new Set(v).add(id));
  }

  function other(edge: { from: string; to: string }, id: string) {
    const otherId = edge.from === id ? edge.to : edge.from;
    return activity.nodes.find(n => n.id === otherId);
  }

  return (
    <div className="activity activity--graph">
      <p className="activity__prompt">{activity.prompt}</p>
      {!focus && <p className="activity__hint">{activity.focusHint}</p>}

      {/* Node cloud */}
      <div className="graph-nodes">
        {activity.nodes.map(n => {
          const connected =
            focus &&
            focus !== n.id &&
            activity.edges.some(
              e => (e.from === focus && e.to === n.id) || (e.to === focus && e.from === n.id),
            );
          return (
            <button
              key={n.id}
              className={`graph-node ${focus === n.id ? 'graph-node--focus' : ''} ${connected ? 'graph-node--connected' : ''}`}
              style={{ '--node-color': n.color } as React.CSSProperties}
              onClick={() => pick(n.id)}
            >
              <span className="graph-node__type">{n.type}</span>
              <span className="graph-node__label">{n.label}</span>
              {typeof n.mrr === 'number' && (
                <span className="graph-node__mrr">${n.mrr.toLocaleString()}/mo</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Edges of the focused node */}
      {focus && (
        <div className="graph-edges animate-fade-in">
          <div className="graph-edges__head">
            Edges from <strong>{activity.nodes.find(n => n.id === focus)?.label}</strong>
          </div>
          {focusEdges.map((e, i) => {
            const o = other(e, focus);
            return (
              <div key={i} className="graph-edge">
                <div className="graph-edge__rel">
                  <span className="graph-edge__arrow">—[{e.label}]→</span>
                  <span className="graph-edge__target">{o?.label}</span>
                </div>
                <p className="graph-edge__perspective">{e.perspective}</p>
              </div>
            );
          })}
        </div>
      )}

      {!exploredEnough ? (
        <p className="activity__hint">Explore at least two nodes to continue.</p>
      ) : (
        <div className="activity__result">
          <p className="activity__result-text">
            Same payment records, different attribution — that is Perspective. The graph is a
            property graph (nodes + typed edges) living in Postgres, and an aggregate like MRR is a
            function of the <em>path you traversed</em>, not of the node alone.
          </p>
          <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
        </div>
      )}
    </div>
  );
}

// ── Query activity ─────────────────────────────────────────────────────────
// A CREAM-PQL builder. The learner adds rules; the ?when[...] URL and the
// compiled Prisma where render live. Completing the goal reveals the lesson.
function QueryActivity({ activity, onComplete }: {
  activity: Extract<ActivityType, { kind: 'query' }>;
  onComplete: () => void;
}) {
  type Rule = { field: string; op: string; value: string };
  const [rules, setRules] = useState<Rule[]>([]);
  const [field, setField] = useState('');
  const [op, setOp] = useState('');
  const [value, setValue] = useState('');

  const fieldDef = activity.fields.find(f => f.key === field);

  function addRule() {
    if (!field || !op || !value) return;
    setRules(r => [...r.filter(x => x.field !== field), { field, op, value }]);
    setField(''); setOp(''); setValue('');
  }
  function removeRule(f: string) {
    setRules(r => r.filter(x => x.field !== f));
  }

  // Serialize to the ?when[...] grammar
  const whenUrl =
    '/api/v1/' +
    activity.resource +
    (rules.length
      ? '?' + rules.map(r => `when[${r.field}][${r.op}]=${encodeURIComponent(r.value)}`).join('&')
      : '');

  // A readable Prisma-ish where
  const prismaWhere =
    '{\n' +
    rules
      .map(r => {
        if (r.field.includes('.') && !r.field.startsWith('lists.')) {
          const [rel, col] = r.field.split('.');
          return `  ${rel}: { some: { ${col}: { ${r.op}: ${fmt(r.value)} } } }`;
        }
        return `  ${r.field}: { ${r.op}: ${fmt(r.value)} }`;
      })
      .join(',\n') +
    (rules.length ? '\n' : '') +
    '}';

  function fmt(v: string) {
    if (v.includes(',')) return '[' + v.split(',').map(s => `"${s.trim()}"`).join(', ') + ']';
    return /^\d+$/.test(v) ? v : `"${v}"`;
  }

  const goalMet =
    activity.goal.every(g =>
      rules.some(r => r.field === g.field && r.op === g.op && r.value === g.value),
    ) && rules.length === activity.goal.length;

  const usedTrap = rules.some(r => r.field === 'campaignId');

  return (
    <div className="activity activity--query">
      <p className="activity__prompt">{activity.prompt}</p>
      <div className="query-goal">{activity.goalText}</div>

      {/* Rule builder */}
      <div className="query-builder">
        <select className="query-sel" value={field} onChange={e => { setField(e.target.value); setOp(''); setValue(''); }}>
          <option value="">field…</option>
          {activity.fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <select className="query-sel" value={op} disabled={!fieldDef} onChange={e => setOp(e.target.value)}>
          <option value="">op…</option>
          {fieldDef?.ops.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="query-sel" value={value} disabled={!fieldDef} onChange={e => setValue(e.target.value)}>
          <option value="">value…</option>
          {fieldDef?.values.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        <button className="query-add" disabled={!field || !op || !value} onClick={addRule}>+ Add rule</button>
      </div>

      {/* Current rules */}
      {rules.length > 0 && (
        <div className="query-rules">
          {rules.map(r => (
            <span key={r.field} className={`query-rule ${r.field === 'campaignId' ? 'query-rule--trap' : ''}`}>
              {r.field} {r.op} {r.value}
              <button onClick={() => removeRule(r.field)}>✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Live output */}
      <div className="query-output">
        <div className="query-output__label">URL (the filter state lives here)</div>
        <pre className="query-output__url">{whenUrl}</pre>
        <div className="query-output__label">compiles to Prisma where</div>
        <pre className="query-output__where">{prismaWhere}</pre>
      </div>

      {usedTrap && (
        <div className="query-trap-warn">
          ⚠ You used <code>campaignId</code> — the stamp on the lead. That misses leads linked only
          by a <code>CampaignMember</code> row. The fix is the declared relation{' '}
          <code>campaignMembers.campaignId</code>, not the stamp.
        </div>
      )}

      {!goalMet ? (
        <p className="activity__hint">
          Add rules until the where matches the goal. Hint: reach the campaign through the relation
          (<code>campaignMembers.campaignId</code>), and use <code>in</code> for two statuses.
        </p>
      ) : (
        <div className="activity__result">
          <div className="activity__result-score">Query matches the goal ✓</div>
          <p className="activity__result-text">
            You never wrote a resolver. The <code>campaignMembers.campaignId</code> rule traversed a
            declared relation — the stock compiler planned the junction-table join (a semijoin via{' '}
            <code>some</code>). One dialect, from URL to Prisma where, with zero bespoke filter code.
          </p>
          <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
        </div>
      )}
    </div>
  );
}

// ── UI-mock activity ───────────────────────────────────────────────────────
// A simulated Synapse EntityList. Stage tabs come from a STAGE list; clicking
// one updates the "URL" and filters rows — config-generated, no per-screen code.
function UiMockActivity({ activity, onComplete }: {
  activity: Extract<ActivityType, { kind: 'uimock' }>;
  onComplete: () => void;
}) {
  const [active, setActive] = useState<string>('all');
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'table' | 'kanban'>('table');

  const visible = active === 'all' ? activity.rows : activity.rows.filter(r => r.stage === active);
  const url =
    '/' + activity.resource.replace(/_/g, '-') + (active === 'all' ? '' : `?when[lists.helpdeskTicketStage][eq]=${active}`);
  const stageOf = (k: string) => activity.stageList.find(s => s.key === k);
  const exploredEnough = touched.size >= 2;

  function clickTab(key: string) {
    setActive(key);
    if (key !== 'all') setTouched(t => new Set(t).add(key));
  }

  return (
    <div className="activity activity--uimock">
      <p className="activity__prompt">{activity.prompt}</p>

      {/* Simulated browser chrome */}
      <div className="mock">
        <div className="mock__bar">
          <span className="mock__dot" /><span className="mock__dot" /><span className="mock__dot" />
          <span className="mock__url">{url}</span>
        </div>

        <div className="mock__toolbar">
          <span className="mock__resource">{activity.resource}</span>
          <div className="mock__viewtoggle">
            <button className={view === 'table' ? 'mock__vt--on' : ''} onClick={() => setView('table')}>☰ Table</button>
            <button className={view === 'kanban' ? 'mock__vt--on' : ''} onClick={() => setView('kanban')}>▦ Kanban</button>
          </div>
        </div>

        {/* Stage tabs (derived from the STAGE list) */}
        <div className="mock__tabs">
          <button className={`mock__tab ${active === 'all' ? 'mock__tab--on' : ''}`} onClick={() => clickTab('all')}>
            All <span className="mock__count">{activity.rows.length}</span>
          </button>
          {activity.stageList.map(s => {
            const n = activity.rows.filter(r => r.stage === s.key).length;
            return (
              <button
                key={s.key}
                className={`mock__tab ${active === s.key ? 'mock__tab--on' : ''}`}
                style={{ '--tab-color': s.color } as React.CSSProperties}
                onClick={() => clickTab(s.key)}
              >
                {s.label} <span className="mock__count">{n}</span>
              </button>
            );
          })}
        </div>

        {/* Body: table or kanban */}
        {view === 'table' ? (
          <div className="mock__table">
            {visible.map(r => (
              <div key={r.id} className="mock__row">
                <span className="mock__row-id">#{r.id}</span>
                <span className="mock__row-name">{r.name}</span>
                <span className="mock__row-stage" style={{ color: stageOf(r.stage)?.color }}>
                  ● {stageOf(r.stage)?.label}
                </span>
                <span className="mock__row-meta">{r.meta}</span>
              </div>
            ))}
            {visible.length === 0 && <div className="mock__empty">No rows in this stage.</div>}
          </div>
        ) : (
          <div className="mock__kanban">
            {activity.stageList.map(s => (
              <div key={s.key} className="mock__col" style={{ '--tab-color': s.color } as React.CSSProperties}>
                <div className="mock__col-head">{s.label}</div>
                {activity.rows.filter(r => r.stage === s.key).map(r => (
                  <div key={r.id} className="mock__card">
                    <div className="mock__card-name">{r.name}</div>
                    <div className="mock__card-meta">{r.meta}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {!exploredEnough ? (
        <p className="activity__hint">
          Click at least two stage tabs (and try the Kanban toggle) to continue.
        </p>
      ) : (
        <div className="activity__result">
          <p className="activity__result-text">{activity.lessonText}</p>
          <button className="activity__next-btn" onClick={onComplete}>Continue to quiz →</button>
        </div>
      )}
    </div>
  );
}

// Short label for the hub card describing a level's practice activity.
function activityMeta(kind: ActivityType['kind']): string {
  switch (kind) {
    case 'sort': return '🗂️ Sort';
    case 'match': return '🔗 Match';
    case 'build': return '🧱 Build';
    case 'trace': return '🔀 Trace';
    case 'graph': return '🕸️ Graph';
    case 'query': return '🔍 Query';
    case 'uimock': return '🖥️ Live UI';
    default: return '🎮 Practice';
  }
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

            {/* Cross-disciplinary concept callouts */}
            {level.concepts && level.concepts.length > 0 && (
              <div className="course__concepts">
                <div className="course__concepts-head">
                  <span className="course__concepts-title">Connecting the dots</span>
                  <span className="course__concepts-sub">
                    How this maps to ideas you may already know
                  </span>
                </div>
                <div className="course__concepts-grid">
                  {level.concepts.map((c, i) => (
                    <div
                      key={i}
                      className="course__concept"
                      style={{ '--lc-color': level.color } as React.CSSProperties}
                    >
                      <div className="course__concept-top">
                        <span className="course__concept-icon">{c.icon}</span>
                        <div>
                          <div className="course__concept-discipline">{c.discipline}</div>
                          <div className="course__concept-term">{c.term}</div>
                        </div>
                      </div>
                      <p className="course__concept-body">{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentation references */}
            {level.docRefs && level.docRefs.length > 0 && (
              <div className="course__docrefs">
                <div className="course__docrefs-head">
                  📄 Documented in
                  <span className="course__docrefs-hint">
                    — read the full source in the Documentation tab
                  </span>
                </div>
                <ul className="course__docrefs-list">
                  {level.docRefs.map((d, i) => (
                    <li key={i} className="course__docref">
                      <code className="course__docref-file">{d.file}</code>
                      <span className="course__docref-note">{d.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                level.activity.kind === 'graph' ? 'Explore the relationship graph' :
                level.activity.kind === 'query' ? 'Build a CREAM-PQL query' :
                level.activity.kind === 'uimock' ? 'Drive a live Synapse view' :
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
          6 levels. Each has an introduction with cross-disciplinary context (databases, data
          structures, software architecture), a hands-on interactive activity, and a knowledge
          check. Every level links to the source documentation it draws from. Complete 67%+ of
          the quiz to pass a level. Progress is saved in this session.
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
                  <span>{activityMeta(level.activity.kind)}</span>
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
