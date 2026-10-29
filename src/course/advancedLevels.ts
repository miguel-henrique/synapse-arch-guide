// Advanced levels (7–11): the topics that are hardest to assimilate —
// relationship traversal, TRANSFORM, reading real URLs, the resource-view /
// Loaded CREAM-PIE decisions, and request triage. Each brings a new game.
import type { Level } from '../pages/CoursePage';

const LEADS = [
  { id: 'L1', name: 'Ferguson Supply', campaignId: '8' },
  { id: 'L2', name: 'Ace Plumbing', campaignId: null },
  { id: 'L3', name: 'Delta HVAC', campaignId: '3' },
  { id: 'L4', name: 'Bright Electric', campaignId: null },
  { id: 'L5', name: 'Nova Roofing', campaignId: '8' },
];
const MEMBERS = [
  { lead: 'L2', campaign: 8 },
  { lead: 'L3', campaign: 8 },
  { lead: 'L3', campaign: 3 },
  { lead: 'L5', campaign: 8 },
];

export const ADVANCED_LEVELS: Level[] = [
  // ── LEVEL 7 ──────────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'Reaching Across Relationships',
    subtitle: 'FK vs junction vs edge, and what "some" really means',
    icon: '🕸️',
    color: 'var(--green)',
    intro: {
      headline: 'A filter that crosses a link is a question about OTHER rows.',
      body: [
        'Filtering on a column of the row itself is easy: when[status][eq]=new. The hard case is a filter whose answer lives in another table: "leads in campaign 8" when the campaign is recorded in membership rows, not on the lead.',
        'There are three storage shapes. (1) A foreign-key column on the row (Lead.campaignId) — nothing to traverse. (2) A junction table reached through a declared Prisma relation (Lead.campaignMembers → campaign_members) — a to-many hop. (3) A RELATIONSHIP-list edge in ListResource: subject —predicate→ object, where the predicate is a ListItem (owner, vendor, referrer…).',
        'For shape 2 you write a dotted path: when[campaignMembers.campaignId][eq]=8. The field resolver splits it into hops, flags campaignMembers as to-many, and the compiler wraps the leaf in { some: … }. "some" = "at least one related row satisfies this" = an EXISTS subquery = a semijoin. It returns leads, never duplicates them.',
        'Negation stays INSIDE the some: when[campaignMembers.campaignId][ne]=8 means "has at least one membership in a campaign other than 8" — not "is not in campaign 8". A bare relation as the leaf only takes existence operators: when[campaignMembers][notExists] means "no membership rows at all".',
        'Why never "every" by default? Because "every membership is campaign 8" is vacuously TRUE for a lead with no memberships — the result silently widens. A widened filter is a data-leak primitive, so the compiler picks "some".',
        'For shape 3 the grammar is edges.<listKey>[:<itemKey>].<Model>[.<path>], e.g. on contacts when[edges.organizationRole:owner.Organization.name][contains]=acme. The edge rule is resolved to ids first and becomes { id: { in: [...] } }, ANDed under your scope.',
      ],
      highlight: 'You write the path; the compiler chooses the quantifier (some). Negation stays inside it. Existence is the only thing you can ask of a bare relation.',
    },
    concepts: [
      { icon: '🔎', discipline: 'Relational algebra', term: 'Semijoin (⋉) and anti-join (▷)', body: 'A semijoin returns rows of the left table that have at least one match on the right, without duplicating them — exactly what Prisma "some" and SQL EXISTS do. "none" / NOT EXISTS is the anti-join. A plain JOIN would duplicate Delta HVAC once per membership.' },
      { icon: '∃', discipline: 'Logic', term: 'Existential vs universal quantifiers', body: '"some" is ∃ (there exists), "every" is ∀ (for all). ∀ over an empty set is true — vacuous truth — which is why "every" is dangerous as a default for filters: empty relations sneak in.' },
      { icon: '🔺', discipline: 'Semantic web', term: 'Triples (subject–predicate–object)', body: 'A RELATIONSHIP edge is an RDF triple: Contact 3 —owner→ Org 7. The predicate is a vocabulary item with metadata (inverseSlug, symmetric), so the graph is self-describing and generic: any model to any model, one table.' },
    ],
    docRefs: [
      { file: 'libs/cream-pie/src/lib/prisma-where.ts', note: 'lines 13-30 (why "some"), relationLeaf, nest().' },
      { file: 'apps/web-services/src/modules/cream-pie/edgePath.ts', note: 'the edges.* grammar — its header comment is the best explanation.' },
      { file: 'docs/architecture/DOCTRINE.md', note: '§3 relation traversal (note: the bracketed [some] there is pseudo-code).' },
    ],
    activity: {
      kind: 'semijoin',
      prompt: 'Predict the rows. For each query, tick every lead you think matches, then reveal. L1 was stamped only, L2 attached only, L3 is in two campaigns, L4 in none, L5 both.',
      leads: LEADS,
      members: MEMBERS,
      rounds: [
        { url: 'when[campaignId][eq]=8', plain: 'the stamp column on the lead', answer: ['L1', 'L5'], lesson: 'Only the column. L2 and L3 were attached by membership and are invisible — the real "leads attached to the event don\'t show" bug.' },
        { url: 'when[campaignMembers.campaignId][eq]=8', plain: 'through the relation (compiles to some)', answer: ['L2', 'L3', 'L5'], lesson: 'EXISTS a membership row with campaign 8. L1 has no membership rows, so the stamp alone does not count here.' },
        { url: 'when[campaignMembers.campaignId][ne]=8', plain: 'negation through the relation', answer: ['L3'], lesson: 'Surprise: "has SOME membership in a campaign other than 8". Only Delta HVAC (it is also in campaign 3). Leads with no rows cannot have a row that is "not 8".' },
        { url: 'when[campaignMembers][notExists]', plain: 'bare relation, existence only', answer: ['L1', 'L4'], lesson: 'NOT EXISTS any membership row — the anti-join. Ferguson (stamped only) and Bright Electric (nothing).' },
        { url: '{ campaignMembers: { every: { campaignId: 8 } } }', plain: 'what "every" would mean (not the default)', answer: ['L1', 'L2', 'L4', 'L5'], lesson: 'Vacuous truth: L1 and L4 have NO rows, so "all their rows are campaign 8" holds. That widening is why the compiler never defaults to every.' },
      ],
    },
    questions: [
      { q: 'What does the compiler emit for each to-many hop in a dotted path like campaignMembers.campaignId?', options: ['every', 'some', 'none', 'a JOIN that duplicates rows'], correct: 1, explanation: '"some" is the only safe default: every widens on empty relations, none inverts intent (prisma-where.ts comment on FieldSegment.toMany).' },
      { q: 'when[campaignMembers.campaignId][ne]=8 returns…', options: ['leads not in campaign 8', 'leads with at least one membership in a campaign other than 8', 'leads with no memberships', 'an error'], correct: 1, explanation: 'Negation is applied at the column, inside "some". "Not in campaign 8" needs a recipe with explicit logic.' },
      { q: 'Which operators are allowed when the field path ENDS on a relation (e.g. when[campaignMembers][…])?', options: ['eq / in', 'contains', 'exists, notExists, isNull, isNotNull', 'any operator'], correct: 2, explanation: 'relationLeaf only accepts existence tests; comparing a relation to a value has no meaning and the compiler refuses it.' },
      { q: 'In edges.organizationRole:owner.Organization.name, what is "owner"?', options: ['a Prisma relation name', 'a column on Contact', 'a ListItem of the RELATIONSHIP list organizationRole — the edge label', 'a recipe slug'], correct: 2, explanation: 'The grammar is edges.<listKey>[:<itemKey>].<Model>[.<path>]; the item key picks the predicate.' },
    ],
  },

  // ── LEVEL 8 ──────────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'TRANSFORM Lists',
    subtitle: 'A List that is a program, not a vocabulary',
    icon: '🧮',
    color: 'var(--yellow)',
    intro: {
      headline: 'Every other ListType holds meaning. TRANSFORM holds instructions.',
      body: [
        'STAGE, TAXONOMY, RELATIONSHIP and EVENT lists all describe the business: where a record is in its lifecycle, what kind of thing it is, how two things are connected, what caused something. A person picks those values or a record carries them.',
        'A TRANSFORM list is different: nobody picks its items and nothing carries them. Each item\'s label is a rule string — rename:createdAt->created_at, omit:internalNotes, flatten:salesRepUser.username->rep, coerce:mrr->number, default:field->value, snake_case, camelCase, wrapper:envelope, wrapper:raw.',
        'When a request carries ?transform=<listKey>, the responseTransform middleware loads that list\'s active platform items in position order and runs them against the JSON the generic route was about to send: field rules per record, then at most one wrapper decides the envelope. wrapper:envelope yields { data, error: null, count } — the shape Supabase-style clients expect.',
        'Order matters (snake_case before omit:internalNotes breaks the omit), the conversion is shallow, a rule without a colon is silently dropped, and coerce to number turns null into 0.',
        'In reality: the enum and the middleware exist, but zero TRANSFORM lists are seeded and the docs propose moving TRANSFORM off the ListType axis because it "is not a business vocabulary at all". If it never felt like the others — that is the correct intuition.',
      ],
      highlight: 'TRANSFORM = rules stored as ListItems, executed by middleware to reshape a response. Not picked, not attached, currently unused.',
    },
    concepts: [
      { icon: '🔧', discipline: 'Software architecture', term: 'Adapter / anti-corruption layer', body: 'Reshaping one API\'s payload into the shape another client expects is the Adapter pattern. TRANSFORM stores the adapter as data instead of code — a configurable anti-corruption layer at the edge.' },
      { icon: '📜', discipline: 'Programming languages', term: 'A tiny interpreted DSL', body: 'Each item is an instruction; position is the program order; the middleware is the interpreter. Like any DSL without validation, typos fail silently — which is why parseRule returning null matters.' },
      { icon: '🧭', discipline: 'Data modelling', term: 'Category error', body: 'Putting a program in a vocabulary table is a category error the architects themselves flag (SEEDED-LISTS §3.2). Recognising "this is not like the others" is part of understanding the type axis.' },
    ],
    docRefs: [
      { file: 'apps/web-services/src/middleware/responseTransform.ts', note: 'the rule grammar (header), parseRule, applyTransform, 60 s cache.' },
      { file: 'docs/architecture/SEEDED-LISTS.md', note: '§3.2 — "0 TRANSFORM lists" and the proposal to retire it from the axis.' },
    ],
    activity: {
      kind: 'transform',
      prompt: 'Write the TRANSFORM list. Add rules from the pool and order them until your output equals the target. (Same algorithm as the real middleware.)',
      puzzles: [
        {
          story: 'A Supabase-style client wants snake_case keys, no internal notes, and the { data, error, count } envelope.',
          input: [{ id: 1, businessName: 'Acme HVAC', internalNotes: 'call after 3pm' }],
          total: 42,
          target: { data: [{ id: 1, business_name: 'Acme HVAC' }], error: null, count: 42 },
          pool: ['wrapper:envelope', 'wrapper:raw', 'snake_case', 'camelCase', 'omit:internalNotes', 'rename:businessName->name'],
          solutionHint: 'omit:internalNotes must run BEFORE snake_case (after it, the key is internal_notes).',
        },
        {
          story: 'A flat CSV-like consumer wants the rep\'s username at the top level, no nested object, and a bare array.',
          input: [{ id: 7, name: 'Nova Roofing', salesRepUser: { id: 54, username: 'amy' } }],
          total: 1,
          target: [{ id: 7, name: 'Nova Roofing', rep: 'amy' }],
          pool: ['flatten:salesRepUser.username->rep', 'omit:salesRepUser', 'wrapper:raw', 'wrapper:envelope', 'snake_case', 'rename:name->title'],
          solutionHint: 'flatten first (it needs the nested object), then omit the object, then wrapper:raw.',
        },
        {
          story: 'A dashboard needs mrr as a number and a placeholder when no follow-up is scheduled. Keep the default envelope.',
          input: [{ id: 3, mrr: '4500', nextFollowUpDate: null }, { id: 4, mrr: null, nextFollowUpDate: '2026-10-25' }],
          total: 2,
          target: { data: [{ id: 3, mrr: 4500, nextFollowUpDate: 'unscheduled' }, { id: 4, mrr: 0, nextFollowUpDate: '2026-10-25' }], meta: { pagination: { total: 2 } } },
          pool: ['coerce:mrr->number', 'coerce:mrr->string', 'default:nextFollowUpDate->unscheduled', 'wrapper:envelope', 'omit:mrr'],
          solutionHint: 'No wrapper keeps { data, meta }. Notice lead 4: null mrr became 0 — data changed meaning silently.',
        },
      ],
    },
    questions: [
      { q: 'What triggers a TRANSFORM list to run?', options: ['Every request automatically', 'A ?transform=<listKey> query parameter', 'A recipe binding', 'A PubSub subscriber'], correct: 1, explanation: 'responseTransformMiddleware only acts when the request names a TRANSFORM list key.' },
      { q: 'Which field of a TRANSFORM ListItem holds the rule?', options: ['key', 'metadata.rule', 'label', 'value'], correct: 2, explanation: 'getTransformRules reads active platform items ordered by position and parses their label.' },
      { q: 'How many TRANSFORM lists are seeded today?', options: ['0', '1', '5', 'one per module'], correct: 0, explanation: 'SEEDED-LISTS counts 0, and the production view shows none — the feature is mounted but unused.' },
      { q: 'Why is TRANSFORM a misfit on the ListType axis?', options: ['It has too many items', 'It is not a business vocabulary — nobody selects it and no record carries it', 'It cannot be cached', 'It only works for leads'], correct: 1, explanation: 'Every other type answers a question about the business; TRANSFORM answers "what shape should this payload have?".' },
    ],
  },

  // ── LEVEL 9 ──────────────────────────────────────────────────────────────
  {
    id: 9,
    title: 'Reading a Real URL',
    subtitle: 'Perspectives, refinements and who wrote each parameter',
    icon: '🔗',
    color: 'var(--blue)',
    intro: {
      headline: 'A list URL is a stack of layers, each adding its piece.',
      body: [
        'Open Leads with the network tab and the API URL looks noisy. It is not random: each parameter has exactly one author.',
        'The perspective you chose → ?recipe=<slug> (a sidebar accordion entry, a chip, or a CreamPie menu node). The server resolves it across tiers, enforces availableWhen and ANDs its stored conditions.',
        'The view template (LEADS_VIEW) → three kinds of when: hideClosedStages + openHidesStages produce when[status][notIn]=… while no stage tab is chosen; defaultWhen seeds when[leadType][eq]=prospect on a fresh visit (overridable); fixedWhen pins when[organizationId][eq]=496 last, so nothing can widen it. The template also decides lists= (which vocabularies to hydrate), populate= and the default sort.',
        'Your clicks → refinements: a stage tab writes when[status][eq]=…, the Lead-type dropdown writes when[leadType][eq]=…. They are the flat-AND subset; anything with OR must be a recipe.',
        'The tab badges → one request per tab with pageSize=1, reading only meta.pagination.total. Those are counts, not lists.',
        'Menu = places, chips = perspectives, filters = refinements (doctrine §5). A recipe is a perspective, which is why a CreamPie menu node next to the Item over the same resource shows the same thing twice.',
      ],
      highlight: 'recipe = perspective · view template = defaults, closed-stage hiding and the org pin · your clicks = refinements · pageSize=1 = a tab count.',
    },
    concepts: [
      { icon: '🧱', discipline: 'Software design', term: 'Layered configuration (cascade)', body: 'Like CSS specificity: defaults, then the URL, then hiding, then the pinned rule last so it always wins. Knowing the order tells you which layer to change.' },
      { icon: '🔗', discipline: 'Web architecture', term: 'REST: the URL is the state', body: 'Because all filter state lives in the query string, a view is a link: shareable, bookmarkable, reproducible in a bug report — and debuggable by reading it.' },
    ],
    docRefs: [
      { file: 'apps/synapse-v3/src/components/entity-list/resourceViews/leads.ts', note: 'LEADS_VIEW — every default in your URLs.' },
      { file: 'apps/synapse-v3/src/components/entity-list/useStageCounts.ts', note: 'the pageSize=1 count probes.' },
      { file: 'docs/architecture/DOCTRINE.md', note: '§5 menu = places, chips = perspectives, filters = refinements.' },
    ],
    activity: {
      kind: 'urlsource',
      prompt: 'For every parameter, choose which layer wrote it. These are URLs you captured from production.',
      sources: [
        { id: 'recipe', label: 'Recipe (a perspective you picked)' },
        { id: 'hide', label: 'View: hide closed stages' },
        { id: 'default', label: 'View: defaultWhen' },
        { id: 'fixed', label: 'View: fixedWhen (pin)' },
        { id: 'click', label: 'Your click (tab / dropdown)' },
        { id: 'template', label: 'View template / grid (lists, populate, sort)' },
        { id: 'paging', label: 'Pagination' },
        { id: 'count', label: 'Tab-count probe' },
      ],
      urls: [
        {
          title: 'Vendors & Partners',
          context: 'You clicked "Vendors & Partners" in the sidebar.',
          params: [
            { text: 'recipe=sales.vendors-partners', source: 'recipe', why: 'The perspective. Its stored conditions (leadType in vendor,partner AND org 496) are ANDed server-side.' },
            { text: 'when[status][notIn]=unresponsive,converted,not_interested', source: 'hide', why: 'isTerminal items (converted, not_interested) + openHidesStages (unresponsive), while no stage tab is chosen.' },
            { text: 'when[organizationId][eq]=496', source: 'fixed', why: 'LEADS_VIEW.fixedWhen, merged last. The recipe also says it; AND makes the repeat harmless.' },
            { text: 'lists=leadStatus,leadCustomerType,leadType,leadOrigin,trade,industry', source: 'template', why: 'Vocabularies to hydrate onto each row so the grid shows labels and colours.' },
            { text: 'sort=createdAt:desc', source: 'template', why: 'LEADS_VIEW.sort — newest first.' },
            { text: 'populate=salesRepUser,salesSupportUser', source: 'template', why: 'FK columns the grid shows as people.' },
            { text: 'page=1&pageSize=100', source: 'paging', why: 'The grid page.' },
          ],
        },
        {
          title: 'A badge count',
          context: 'Lead type dropdown is on "Partner"; the tab strip is computing its badges.',
          params: [
            { text: 'when[leadType][eq]=partner', source: 'click', why: 'Your Lead-type dropdown choice — carried into every count so badges describe the current view.' },
            { text: 'when[organizationId][eq]=496', source: 'fixed', why: 'The pin is in every request, counts included.' },
            { text: 'when[status][eq]=not_interested', source: 'count', why: 'This request counts the "Not Interested" tab; the stage rule is the tab being counted.' },
            { text: 'page=1&pageSize=1', source: 'count', why: 'One row — only meta.pagination.total is read.' },
          ],
        },
        {
          title: 'Hot Lead tab, fresh visit',
          context: 'You opened Leads in a new tab and clicked "Hot Lead".',
          params: [
            { text: 'when[status][eq]=qualified', source: 'click', why: 'The tab writes the stage KEY (qualified), not its label (Hot Lead). With a tab chosen, the notIn hiding disappears.' },
            { text: 'when[leadType][eq]=prospect', source: 'default', why: 'defaultWhen seeded on a fresh visit; the dropdown can override it.' },
            { text: 'when[organizationId][eq]=496', source: 'fixed', why: 'Always.' },
          ],
        },
      ],
    },
    questions: [
      { q: 'Why does the Vendors & Partners URL contain organizationId=496 twice in effect (recipe + when)?', options: ['A bug that doubles the rows', 'Two independent layers (stored recipe and the view\'s fixedWhen) both ask for it; AND makes it idempotent', 'The server needs it twice', 'It selects two organizations'], correct: 1, explanation: 'x AND x = x. Harmless, but it shows the constant 496 lives in several places.' },
      { q: 'Which requests have pageSize=1?', options: ['Mobile requests', 'Exports', 'Per-tab count probes from useStageCounts', 'Detail pages'], correct: 2, explanation: 'One request per tab, reading only the total.' },
      { q: 'A filter needs "status is booked OR status is msa_sent AND rep is me". Where does it go?', options: ['when[…] params', 'A recipe (?recipe=) — when[…] can only carry a flat AND', 'A custom resolver', 'populate'], correct: 1, explanation: 'D20: nested/OR trees travel as stored recipes.' },
      { q: 'Under doctrine §5, a saved query over leads should appear as…', options: ['A new top-level menu entry', 'A chip / accordion perspective of the Leads place', 'A new route', 'A new module'], correct: 1, explanation: 'Menu = places, chips = perspectives.' },
    ],
  },

  // ── LEVEL 10 ─────────────────────────────────────────────────────────────
  {
    id: 10,
    title: 'Resource Views & the Loaded CREAM-PIE Decisions',
    subtitle: 'Ceilings, tiers, sharing, WET — the rules behind the rules',
    icon: '🏛️',
    color: 'var(--orange-l)',
    intro: {
      headline: 'Two hard documents, one idea: nothing a user saves can grant power.',
      body: [
        'DECISIONS-resource-views and LOADED-CREAM-PIE-STRATEGY read like long lists of numbered decisions. Underneath they protect one invariant: configuration that comes from a user (a saved view, a shared view, a URL) may only NARROW what the system already allows.',
        'V1 — the template is a ceiling. A saved view stores a presentation that names what to KEEP from the template (columns, list keys, actions). Unknown names are dropped, booleans may be cleared but never set. So accepting a colleague\'s view can never add an action or a field: sharing is safe by construction.',
        'V5/V6 — saved views ARE recipes (the user tier), not a new model. Resolution asks platform, then organization, then your own rows; a user row is reached only when both shared tiers miss — so saving a view called "customers" gives you a second chip, it never changes what ?recipe=customers means.',
        'V7 — sharing travels as an intent ("private" | "organization"); the server writes the availableWhen from the request\'s org. The audience is the last thing you let the caller name for itself. availableWhen is enforced server-side at apply time.',
        'V9 — your saved views may appear in the menu, but only as indented children of the place they filter, linking to the same route with ?recipe=. V10 — non-DRY screens are quarantined under WET by creating new nodes (wet.* + formerIds), never by renaming: the subjectId IS the RBAC subject.',
        'Loaded CREAM-PIE: C1 land what exists instead of re-implementing; C2 no "menu/list/subscriber" flags on recipes — use bindings, nav nodes, availableWhen and tiers; C3 the URL param is "recipe" (nomenclature is API); C10 gates fail closed; C19 recipe values are item KEYS, not labels.',
      ],
      highlight: 'User-supplied configuration only narrows. Tiers never shadow. Audiences are decided by the server. Ids are API — migrate them with formerIds, never rename.',
    },
    concepts: [
      { icon: '🛡️', discipline: 'Security', term: 'Monotonic narrowing (least privilege by construction)', body: 'If every user-controlled layer is an intersection (AND / filter-over-template), no combination of layers can exceed the base grant. You no longer review each saved view; the algebra guarantees it.' },
      { icon: '🔭', discipline: 'Programming languages', term: 'Scope resolution without shadowing', body: 'Platform → org → user is like nested scopes, but with shadowing forbidden for the innermost scope. A user can add names, never redefine shared ones.' },
      { icon: '🔁', discipline: 'Distributed systems', term: 'Fail closed', body: 'When a gate cannot evaluate, deny. Fail-open on a delivery gate is how a customer gets an email they were excluded from (C10).' },
    ],
    docRefs: [
      { file: 'docs/architecture/DECISIONS-resource-views.md', note: 'V1, V5, V6, V7, V9, V10.' },
      { file: 'docs/LOADED-CREAM-PIE-STRATEGY.md', note: '§3 decisions C1–C20, especially C2, C3, C10, C19.' },
    ],
    activity: {
      kind: 'verdict',
      prompt: 'You are the reviewer. For each situation, decide what the system does (or should do) — then read the decision that governs it.',
      role: 'Reviewer',
      cards: [
        { scenario: 'A colleague shares a saved Leads view whose presentation lists a column "commissionRate" that LEADS_VIEW does not have.', options: ['The column is added for everyone who opens the view', 'The unknown name is dropped; the view applies without it', 'The view is rejected with an error'], correct: 1, why: 'V1: a presentation is a filter over the template\'s arrays. Unknown names are dropped, never appended — the template is a ceiling.', ref: 'DECISIONS-resource-views V1' },
        { scenario: 'A saved view sets selectable: true, but the template has row selection off.', options: ['Selection turns on', 'Ignored — booleans may be cleared, not set', 'Allowed for admins only'], correct: 1, why: 'V1: every boolean in a presentation may be cleared but not set. Turning a capability on is a privilege decision.', ref: 'V1' },
        { scenario: 'You save a personal view with slug sales.referrals — the same as a system recipe.', options: ['Your view replaces the system one for you', 'You get a second chip; ?recipe=sales.referrals still means the system recipe', 'The save fails'], correct: 1, why: 'V6: the user tier is additive and never shadows by slug.', ref: 'V6 / D16' },
        { scenario: 'The browser builds an availableWhen condition "organizationId = 12" to share a view with its org.', options: ['Accept it — the client knows the org', 'The client sends shareScope: "organization"; the server builds availableWhen from the request\'s org', 'Store it but do not enforce it'], correct: 1, why: 'V7: sharing travels as an intent. The audience is the last field you let the caller name for itself — and it is enforced server-side at apply time.', ref: 'V7 / D18' },
        { scenario: 'A rep wants their saved views listed in the sidebar.', options: ['Add them to module.json navigation', 'Show them as indented children of the place, linking to the same route with ?recipe=', 'Create a new workspace "My views"'], correct: 1, why: 'V9: not manifest entries, not separate places, not a duplicated surface — fetched at runtime from the same recipe rows the chips read.', ref: 'V9 (reconciling §5 / D13 / G.4)' },
        { scenario: 'A bespoke, non-DRY screen must move under the WET menu.', options: ['Change the node\'s parent to "wet"', 'Create a new node wet.<old id> with formerIds: ["<old id>"], deactivate the old one', 'Rename the subjectId in place'], correct: 1, why: 'V10: subjectId is the CASL subject and permissions cascade by string prefix. Re-parenting breaks the cascade; renaming orphans grants. formerIds is the migration path.', ref: 'V10' },
        { scenario: 'Someone proposes adding a boolean showInMenu to recipes.', options: ['Good idea', 'No — where a recipe is used is a binding or nav node; who sees it is availableWhen; who owns it is the tier', 'Only for system recipes'], correct: 1, why: 'C2: recipe scope stays tiered, not flagged.', ref: 'LOADED-CREAM-PIE C2' },
        { scenario: 'Marketing wants the URL parameter renamed from ?recipe= to ?cream-pie=.', options: ['Rename it everywhere', 'Keep ?recipe= — it ships in stored links; nomenclature is API', 'Support both and deprecate later'], correct: 1, why: 'C3: the URL parameter is recipe. Links already in emails and bookmarks are an API.', ref: 'C3' },
        { scenario: 'A PubSub delivery gate throws while evaluating its condition.', options: ['Deliver anyway (fail open)', 'Skip delivery and emit system:fulfillment:failure (fail closed)', 'Retry forever'], correct: 1, why: 'C10: gates fail closed. Fail-open is how an excluded recipient gets the email.', ref: 'C10' },
        { scenario: 'A CSV recipe says {"crm":{"organization":{"customerStatus":"Customer"}}}.', options: ['Store it as-is', 'Translate to { primaryResource: "organizations", conditions: lists.customerStatus eq "customer" } — item KEYS, not labels', 'Match the label "Customer"'], correct: 1, why: 'C19: the CSV grammar is translated, not adopted. Values are item keys.', ref: 'C19' },
      ],
    },
    questions: [
      { q: 'What does "the template is a ceiling" guarantee?', options: ['Templates load fast', 'A saved/shared view can only remove or narrow what the template offers, never add', 'Only admins can edit templates', 'Templates are cached'], correct: 1, explanation: 'V1: accepting a colleague\'s view can never be a privilege decision.' },
      { q: 'Where are saved views stored?', options: ['A new SavedView table with its own query format', 'As the user tier of CREAM-PIE recipes (list savedView on stage)', 'In localStorage', 'In module.json'], correct: 1, explanation: 'V5: same dialect, same middleware — a new model would have been a ninth condition dialect.' },
      { q: 'Why can a user-tier recipe never shadow a system slug?', options: ['Performance', 'So ?recipe=<slug> means the same thing for everyone; personal views are additive', 'Database limits', 'Slugs are random'], correct: 1, explanation: 'V6 / D16.' },
      { q: 'Why does V10 create new wet.* nodes instead of moving old ones?', options: ['Easier to undo', 'subjectId is the RBAC subject; permissions cascade by prefix, so moving or renaming breaks grants — formerIds migrates them', 'The UI requires it', 'It is faster'], correct: 1, explanation: 'Ids are API.' },
    ],
  },

  // ── LEVEL 11 ─────────────────────────────────────────────────────────────
  {
    id: 11,
    title: 'Triage Like an Architect',
    subtitle: 'Admin UI, manifest, code — or a fork to present',
    icon: '🚦',
    color: 'var(--purple-l)',
    intro: {
      headline: 'Level 6 had two answers. Reality has four.',
      body: [
        'Level 6 taught the first triage: data (Lists admin) or code. Reading the seeders and production adds nuance.',
        'Lists admin (pure data): values of lists the manifest does NOT own (org-tier lists, non-system lists like leadTag), retiring a value (isActive is not seed-owned), personal saved views.',
        'Manifest rows: anything about a SYSTEM list declared in a module.json — new items you want everywhere, labels, colours, order, initial/terminal flags, transitions — because the module system seed owns those columns and rewrites them on every deploy. Also shared recipes and navigation nodes.',
        'Code + schema: a new column or model, a relation the compiler cannot traverse yet, genuinely new behaviour (a collector, a subscriber), removing hardcoded vocabularies.',
        'Design fork: when two valid architectures exist (the campaign filter after the edges fold), present the options with trade-offs instead of picking silently.',
        'And always name the missing List, ListItem, recipe or relation BEFORE writing code. Sometimes the answer is "nothing is missing": a STAGE list with three values already gives you a Kanban board.',
      ],
      highlight: 'Non-system value → Lists admin. System list or shared perspective/menu → manifest. New structure or behaviour → code. Two valid shapes → present the fork.',
    },
    concepts: [
      { icon: '🗂️', discipline: 'Configuration management', term: 'Single owner per field', body: 'If a seed and a human both write the same column, the last writer wins and edits silently revert. Either give each field one owner, or record human ownership (the adminEdited marker nav nodes already use).' },
      { icon: '🧪', discipline: 'Engineering practice', term: 'Make the smallest durable change', body: 'Prefer the change that survives the next deploy and the next environment: a manifest row beats an admin edit for system data; a declared relation beats a resolver.' },
    ],
    docRefs: [
      { file: 'libs/prisma/src/seeders/modules/_moduleSeeder.ts', note: 'LIST_ITEM_OWNED_COLUMNS — what the seed overwrites.' },
      { file: 'docs/api/polymorphic-lists.md', note: '"add list values via the admin UI, not migrations" — and where it stops applying.' },
    ],
    activity: {
      kind: 'verdict',
      prompt: 'Requests arrive in Slack. Triage each one.',
      role: 'Triage',
      cards: [
        { scenario: '"Can the Booked stage be teal instead of violet?"', options: ['Lists admin — it is just a colour', 'Manifest: change the item color in modules/crm/module.json', 'Code: edit a colour map in the frontend'], correct: 1, why: 'leadStatus is a system list; the seed owns color and would revert an admin edit on the next deploy.', ref: '_moduleSeeder.ts LIST_ITEM_OWNED_COLUMNS' },
        { scenario: '"Add a tag 911-callback for urgent leads."', options: ['Lists admin → leadTag → add item (key 911_callback)', 'Manifest + deploy', 'New column on leads'], correct: 0, why: 'leadTag is not a system list (system: false in production) and tags are ListResource rows — no column, no deploy. Use a slug key.' },
        { scenario: '"I want my own list of leads I created this week."', options: ['Shared recipe in the manifest', 'Save a personal view from the Leads screen', 'New menu entry'], correct: 1, why: 'A user-tier recipe. No code, no admin.' },
        { scenario: '"Vendors & Partners appears twice in the menu."', options: ['Hide it with CSS', 'Manifest: remove or re-parent the CreamPie nav node; keep the recipe', 'Delete the recipe'], correct: 1, why: 'The recipe is right; the extra nav node conflicts with §5.' },
        { scenario: '"Filter leads by the sales rep\'s username."', options: ['Write a resolver that looks up the user id first', 'Nothing new: when[salesRepUser.username][eq]=amy — the relation is declared', 'Copy the username onto leads'], correct: 1, why: 'Lead.salesRepUser is a declared relation; a dotted path traverses it with zero code.' },
        { scenario: '"Infrastructure needs a Storage tab showing server volumes."', options: ['Lists admin', 'Code + schema: a StorageVolume model, two Lists, a recipe and a nav Item in a manifest — then the stock EntityList', 'Another if-branch in Infrastructure.tsx'], correct: 1, why: 'A new model is structure. Everything after it is rows. The if-branch is the legacy anti-pattern.' },
        { scenario: '"Show failed backup runs in red."', options: ['Edit RUN_STATUS_CLASSES', 'Make backupRunStatus a List (failed → color red) and render badges from the List — then delete the colour map', 'Lists admin'], correct: 1, why: 'The vocabulary is hardcoded today; the durable fix is phase 1 of the Infrastructure refactor.' },
        { scenario: '"Campaign filter must include leads attached to the event AND leads stamped by QR."', options: ['Keep extending campaignMembershipFilter.ts', 'Design fork: edge traversal vs single linkage vs declared computed field — present the options', 'Lists admin'], correct: 1, why: 'After the campaign_members → edges fold there is no single obvious shape. Present the trade-offs.' },
        { scenario: '"Can storage volumes have a Kanban board?"', options: ['Build an EntityBoard for storage', 'Nothing to build: a single-select STAGE list with ≥ 3 values makes the Guesser offer Kanban', 'Add showKanban: true'], correct: 1, why: 'Declare storageVolumeState as STAGE and the board comes from the rule layer.' },
      ],
    },
    questions: [
      { q: 'Why can a relabel of a system list in the Lists admin be lost?', options: ['The admin is read-only', 'The module system seed owns label/colour/position of manifest items and rewrites them on deploy', 'Labels are cached forever', 'Browsers do not save it'], correct: 1, explanation: 'LIST_ITEM_OWNED_COLUMNS; only isActive and items not in the manifest are left alone.' },
      { q: 'Which change is pure data with no deploy?', options: ['A new column', 'A new value in a non-system TAXONOMY list such as leadTag', 'A new nav node', 'A new model'], correct: 1, explanation: 'Non-system lists are owned by the admin.' },
      { q: 'What must you name before writing code?', options: ['The component', 'The missing List, ListItem, recipe row or relation', 'The API route', 'The test file'], correct: 1, explanation: '"If it can be rows, it is rows."' },
    ],
  },
];
