import { useState } from 'react';
import './GlossaryPage.css';

interface Term {
  term: string;
  acronym?: string;
  category: string;
  color: string;
  def: string;
  example?: string;
}

const TERMS: Term[] = [
  {
    term: 'List',
    category: 'Primitive',
    color: 'var(--purple-l)',
    def: 'The controlled vocabulary primitive. A named, typed set of ListItems that replaces hardcoded enums. Lives in the database, consumed by every layer. Has a permanent key slug, a ListType, and a selectionType (SINGLE or MULTIPLE).',
    example: 'customerStatus, industry, helpdeskTicketStage, eventInvocationMethod',
  },
  {
    term: 'ListItem',
    category: 'Primitive',
    color: 'var(--purple-l)',
    def: 'One term inside a List. Has a stable, immutable slug (machine identifier) and a human display label. STAGE items carry isInitial, isTerminal, and a metadata.transitions array. Slugs are permanent identifiers — renaming a label is safe, renaming a slug is a data migration.',
    example: 'slug: "cancelled", label: "Cancelled", isTerminal: true',
  },
  {
    term: 'ListResource',
    category: 'Primitive',
    color: 'var(--purple-l)',
    def: 'The binding between a ListItem and an actual database row. "This organization IS a customer" — the ListResource records that the customerStatus ListItem "customer" applies to this organization row.',
    example: 'organization #42 → customerStatus = "customer"',
  },
  {
    term: 'ListType',
    category: 'Primitive',
    color: 'var(--purple-l)',
    def: 'The semantic category of a List. Determines how the system interprets and uses it. Official values (Prisma enum): STAGE, TAXONOMY, RELATIONSHIP, EVENT, TRANSFORM. STATUS and TYPE were retired into TAXONOMY by migration 20260920120000.',
  },
  {
    term: 'System List',
    category: 'Primitive',
    color: 'var(--yellow)',
    def: 'A List with system: true whose key slug is referenced in application code. The admin UI locks the key field as read-only to prevent silent breaks. The anatomy ratchet CI tool counts how many system lists remain (started at 78). As references are migrated to read from the List, the flag can be removed.',
  },
  {
    term: 'STAGE',
    category: 'ListType',
    color: 'var(--orange-l)',
    def: 'A ListType for governed lifecycle states. Movement between values is controlled — the system can refuse an invalid transition. Items carry isInitial, isTerminal, stageGroup, and a transitions array. The Template Engine\'s Guesser exposes a Kanban view for any resource with a single-select STAGE list of 3+ values.',
    example: 'customerStatus: Lead → Customer → At Risk → Cancelled (terminal)',
  },
  {
    term: 'TAXONOMY',
    category: 'ListType',
    color: 'var(--blue)',
    def: 'A ListType for classification. No governed journey — the caller can apply any value freely. selectionType MULTIPLE allows several values at once. TAXONOMY lists become primary tabs, chip toggles, and select filters in the Template Engine. The default for any vocabulary that doesn\'t govern transitions.',
    example: 'industry: Home Services, Marketing, Construction (all selectable simultaneously)',
  },
  {
    term: 'RELATIONSHIP',
    category: 'ListType',
    color: 'var(--green)',
    def: 'A ListType for labels on edges between two records. Bidirectional by design: A-of-B implies B-of-A (employee of Chris → Chris is employer of Brandon). The definition table stays authoritative; the List mirrors it. Used in CREAM-PIE recipes to scope data and RBAC by relationship context.',
    example: 'organizationRelationshipType: customer, vendor, referrer, competitor',
  },
  {
    term: 'EVENT',
    category: 'ListType',
    color: 'var(--pink)',
    def: 'A ListType for occurrence vocabulary. Labels what happened, not a record that exists — so the resources column is intentionally empty. The only seeded EVENT list is eventInvocationMethod (User, Cron, Subscriber), used by the activity log middleware.',
    example: 'eventInvocationMethod: User, Cron, Subscriber',
  },
  {
    term: 'TRANSFORM',
    category: 'ListType',
    color: 'var(--yellow)',
    def: 'A ListType for response-shaping rules. Items are parsed as rules by the responseTransform middleware — they are not user-selectable values or filters. Distinct from TAXONOMY. No list of type TRANSFORM is currently seeded; the consumer exists in responseTransform.ts.',
    example: 'Response shape rules read by middleware — not rendered in the UI',
  },
  {
    term: 'CREAM-PIE',
    acronym: 'Context Rules Engine Application Matrix — Polymorphic Injection & Execution',
    category: 'Engine',
    color: 'var(--orange-l)',
    def: 'The context rules engine. A CREAM-PIE Recipe is a named, stored set of conditions (CreamPieRecipe in the DB). Recipes drive query parameters, menu items, list view configuration, RBAC, pub/sub conditions, and cron gates — all from one stored object. From docs/CREAM-PIE.md.',
  },
  {
    term: 'Recipe',
    category: 'Engine',
    color: 'var(--orange-l)',
    def: 'A named, reusable CREAM-PIE condition set. Has a slug, a primaryResource, conditions in CREAM-PQL, a scope (system | organization | user), and optional presentation narrowing. The same recipe is the source of a menu nav node, a ?recipe= URL param, an RBAC gate, and a pub/sub subscriber condition.',
    example: 'crm.organizations.customers → lists.customerStatus in [customer, at_risk]',
  },
  {
    term: 'CREAM-PQL',
    category: 'Engine',
    color: 'var(--orange-l)',
    def: 'The canonical internal condition format used by CREAM-PIE. A CreamPqlGroup of { logic: AND|OR, rules: [{ field, op, value }] }. Both JSON and MTEL input formats compile to CREAM-PQL. Evaluated by compilePredicate in libs/cream-pie.',
    example: '{ logic: "AND", rules: [{ field: "lists.customerStatus", op: "in", value: ["customer"] }] }',
  },
  {
    term: 'MTEL',
    acronym: 'Merge Tag Expression Language',
    category: 'Engine',
    color: 'var(--orange-l)',
    def: 'One of the input formats for CREAM-PIE recipes. Like Excel formulas for ERP context data. Compiles to CREAM-PQL internally. Used in subscriber conditions and display conditions.',
    example: '{{organization.customerStatus}} == "customer"',
  },
  {
    term: 'Template Engine',
    category: 'Rendering',
    color: 'var(--teal)',
    def: 'The generic metadata-driven renderer. Reads List types and CREAM-PIE recipes to infer UI without custom code per resource. Produces EntityList views with tabs, chip toggles, Kanban boards, and action buttons. Implemented as <EntityList> / <Browse> in Synapse-v3.',
  },
  {
    term: 'Guesser',
    category: 'Rendering',
    color: 'var(--teal)',
    def: 'The rule set inside the Template Engine that infers ResourceView config from the descriptor + List types. Lives in defaultViewRules.ts. Key rule: one single-select STAGE list with ≥3 values → expose Kanban (rule: board-when-one-stage).',
  },
  {
    term: 'Manifest',
    category: 'Rendering',
    color: 'var(--teal)',
    def: 'A modules/*/module.json file that declares models, Lists, recipes, navigation nodes, actions, and seeds for a feature module at build time. The Template Engine consumes manifests to know what resources exist and how to render them.',
    example: 'modules/crm/module.json declares organizations, customerStatus, crm.organizations.customers recipe',
  },
  {
    term: 'ResourceView',
    category: 'Rendering',
    color: 'var(--teal)',
    def: 'The configuration object that describes how a resource should be rendered. Fields: listOptions (table/kanban/card), primaryTabs, chipToggles, selectFilters, bulkEditFields, listActions, recordActions, fieldLists. Defaults come from the Guesser, overridden by registered templates, narrowed by saved views.',
  },
  {
    term: 'SavedView',
    category: 'Rendering',
    color: 'var(--teal)',
    def: 'A user-saved ResourceView presentation narrowing stored as a CreamPieRecipe with ownerUserId. Can be shared (shareScope: organization). Appears as a chip in the list and as an accordion entry under the nav node. Never adds new actions — only narrows.',
  },
  {
    term: 'Perspective',
    category: 'Relationship',
    color: 'var(--green)',
    def: 'The principle that the same data means different things depending on which relationship edge you traversed to reach it. Crystal as OWNER → her org\'s revenue = DIRECT MRR. As REFERRER → INDIRECT MRR. Same payments, different perspective. Drives relationship-aware aggregation.',
  },
  {
    term: 'PRBAC',
    acronym: 'Polymorphic Role-Based Access Control',
    category: 'Security',
    color: 'var(--teal)',
    def: 'Authorization where capability = Action + Object + Organization Context + Condition. The same user has different capabilities depending on which organization they selected at login (encoded in JWT). Policy is deny-first. Implemented via CASL abilities in the ability model.',
    example: 'can("generate", "FinancialReport", { org: "CI Web Group", role: "financial_officer" })',
  },
  {
    term: 'Anatomy Ratchet',
    category: 'Tooling',
    color: 'var(--blue)',
    def: 'A CI tool that counts every remaining place in the codebase where business vocabulary is hardcoded (a private "drawer") instead of reading from a List. Started at 78. Each file migrated to read from the central List lowers the count. Goal: 0.',
  },
  {
    term: 'ErpStore',
    category: 'Architecture',
    color: 'var(--text-dim)',
    def: 'The global application state hierarchy. Configuration layers: Platform → Tenant → Identity → Module → Resource → View. Set by the Context Machine (ErpProvider) in this order: login → getUser → getContact → getOrganizations → setOrganization → setBrand → setIdentity → getModules → getMenu → setActiveView.',
  },
  {
    term: 'DSL',
    acronym: 'Domain-Specific Language',
    category: 'Concept',
    color: 'var(--text-dim)',
    def: 'The term Chris was searching for during the meeting to describe what CREAM-PIE + MTEL create: a proprietary language tailored to CI Connect\'s ERP domain. CREAM-PQL is the internal representation; MTEL and JSON are input dialects.',
  },
];

const CATEGORIES = ['All', ...new Set(TERMS.map(t => t.category))];

export default function GlossaryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = TERMS.filter(t => {
    const matchSearch = !search ||
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.def.toLowerCase().includes(search.toLowerCase()) ||
      (t.acronym ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || t.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="glossary">
      <div className="glossary__header">
        <div className="section__label">Reference</div>
        <h1 className="section__title">Glossary</h1>
        <p className="section__desc">
          Every term from the architecture, defined. From Chris's meetings, AI discussions, and real code.
        </p>

        <div className="glossary__controls">
          <input
            type="search"
            className="glossary__search"
            placeholder="Search terms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="glossary__cats">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`glossary__cat ${category === cat ? 'glossary__cat--active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glossary__grid">
        {filtered.map((t, i) => (
          <div key={i} className="glossary__term card" style={{ '--t-color': t.color } as React.CSSProperties}>
            <div className="glossary__term-header">
              <span className="glossary__term-name">{t.term}</span>
              <span className="glossary__term-cat">{t.category}</span>
            </div>
            {t.acronym && (
              <div className="glossary__term-acronym">{t.acronym}</div>
            )}
            <p className="glossary__term-def">{t.def}</p>
            {t.example && (
              <div className="glossary__term-example">
                <span className="glossary__term-example-label">Example:</span>
                <code>{t.example}</code>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="glossary__empty">
            No terms match "{search}" in "{category}".
          </div>
        )}
      </div>
    </div>
  );
}
