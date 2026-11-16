import { useState } from 'react';
import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Files, Pill, Section } from '../kit/Kit';

// Leads, end to end: every row, file and request that makes
// /backoffice/sales/leads appear. Production numbers come from the read-only
// synapse-crm MCP (aggregates only), Oct 22 2026.

// ── anatomy diagram ─────────────────────────────────────────────────────────
const groups: DiagramGroup[] = [
  { id: 'def', x: 16, y: 16, w: 254, h: 600, label: '1 · Definition (repo)', color: 'var(--orange-l)' },
  { id: 'db', x: 286, y: 16, w: 262, h: 600, label: '2 · Rows (PostgreSQL)', color: 'var(--green)' },
  { id: 'api', x: 564, y: 16, w: 236, h: 600, label: '3 · API (web-services)', color: 'var(--purple-l)' },
  { id: 'ui', x: 816, y: 16, w: 268, h: 600, label: '4 · Screen (synapse-v3)', color: 'var(--blue)' },
];

const nodes: DiagramNode[] = [
  { id: 'crm', x: 32, y: 56, w: 222, h: 104, label: 'modules/crm/module.json', sub: 'model Lead (resource "leads")\nlists: leadStatus, leadType,\nleadOrigin, leadCustomerType…\nrecipes · navigation · actions', color: 'var(--orange-l)',
    detail: <><p>The CRM manifest declares the <code>Lead</code> model (adopted from <code>Lead.prisma</code>), which columns are bound to which List (<code>status → leadStatus</code>, <code>leadType → leadType</code>, <code>leadOrigin</code>, <code>customerType → leadCustomerType</code>, <code>source → leadIntakeChannel</code>), the lists and their items, four recipes over leads and the menu nodes.</p><p>Supported views: <code>datagrid</code>, <code>kanban</code> (default datagrid). Actions: <code>enrich</code>, <code>add-followup</code>.</p></>,
    files: ['modules/crm/module.json:186-320 (Lead model)', 'modules/crm/module.json:578 (leadStatus)', 'modules/crm/module.json:2800-2890 (recipes)', 'modules/crm/module.json:2943-2976 (nav)'] },
  { id: 'vocab', x: 32, y: 180, w: 222, h: 62, label: 'modules/vocabulary/module.json', sub: 'trade · industry (shared spine)', color: 'var(--orange-l)',
    detail: <p>Spine taxonomies are shared across modules, never copied (doctrine §1). <code>trade</code> and <code>industry</code> are declared here with <code>source: mirror</code>. Note: their <code>resources</code> list does not include <code>leads</code>, although Lead lists them in its taxonomies — see Questions.</p>,
    files: ['modules/vocabulary/module.json:83-110'] },
  { id: 'build', x: 32, y: 262, w: 222, h: 56, label: 'pnpm build:modules', sub: 'validate + emit', color: 'var(--orange-l)',
    detail: <p>Emits <code>modules/crm/generated/crm-lists.ts</code> (lists + recipes), <code>crm-navigation.ts</code>, <code>crm-types.ts</code>, the Prisma artifacts, and (via <code>gen-synapse-nav-artifacts.mjs</code>) <code>navTree.generated.ts</code>.</p>,
    files: ['tools/build-modules/index.mjs', 'modules/crm/generated/'] },
  { id: 'seed', x: 32, y: 338, w: 222, h: 70, label: 'seed-crm.system.ts', sub: 'runs on every deploy\nupserts lists, items, recipes, nav', color: 'var(--orange-l)',
    detail: <><p>The production-safe system seed. It upserts every declared List and ListItem by key and <strong>owns</strong> the item columns <code>label, value, position, color, icon, isDefault, isInitial, isTerminal, system, metadata</code> — but not <code>isActive</code>.</p><p>Consequence: relabelling a manifest-declared item in the Lists admin is reverted on the next seed. Items an admin adds that are NOT in the manifest are left alone.</p></>,
    files: ['libs/prisma/src/seeders/modules/seed-crm.system.ts', 'libs/prisma/src/seeders/modules/_moduleSeeder.ts:37-50, 163-210'] },
  { id: 'view', x: 32, y: 430, w: 222, h: 90, label: 'resourceViews/leads.ts', sub: 'LEADS_VIEW template\nhideClosedStages · defaultWhen\nfixedWhen (org 496) · columns', color: 'var(--orange-l)',
    detail: <><p>The presentation template for the leads grid: columns, default sort, which stages are hidden by default, the Lead-type dropdown, the Campaign picker, bulk-edit fields, the "Merge leads…" and (new this week) "Link to event…" bulk actions, a tags column, and the pinned <code>organizationId = 496</code>. It is frontend code, not a manifest row.</p><p>"Link to event…" writes campaign <em>membership edges</em> for the selected leads — the second linkage the campaign filter has to reconcile (Deep Dives → Relationships).</p></>,
    files: ['apps/synapse-v3/src/components/entity-list/resourceViews/leads.ts', 'apps/synapse-v3/src/components/entity-list/resourceViewRegistry.ts:26,33'] },
  { id: 'leadprisma', x: 32, y: 540, w: 222, h: 60, label: 'Lead.prisma', sub: 'columns · indexes · campaignId', color: 'var(--orange-l)',
    detail: <p>The hand-written model the manifest adopts. <code>organizationId</code> enrolls the model in generic-API tenant scoping; <code>campaignId</code> is the stringified campaign id stamped by QR capture and imports.</p>,
    files: ['libs/prisma/src/schema/organization/Lead.prisma'] },

  { id: 'lists', x: 302, y: 56, w: 230, h: 96, label: 'List rows', sub: 'leadStatus #91 STAGE (11 items)\nleadType #95 TAXONOMY (5)\nleadOrigin #93 (19) · leadTag #94\nleadCustomerType #92 (3)', color: 'var(--green)',
    detail: <p>What production actually holds today (read-only MCP). Each has <code>resources: ["leads"]</code>; all but <code>leadTag</code> are <code>system: true</code>. See the Lists table below for every item.</p> },
  { id: 'recipes', x: 302, y: 172, w: 230, h: 84, label: 'Recipe items', sub: 'sales.vendors-partners · referrals\nmy-followups · reporting · hot\noverdue · unassigned · new-not-contacted', color: 'var(--green)',
    detail: <p>The eight recipes with <code>primaryResource: "leads"</code> (four more since Nov 13, commit <code>7f519eacde</code>: <em>New, not contacted</em>, <em>Overdue follow-ups</em>, <em>Unassigned</em> and <em>Hot</em>, which matches the tags 911 or Big Fish). On stage they are items of list <code>creamPieRecipe</code> (Schema B). Each one is a perspective of the Leads screen, reachable as <code>?recipe=&lt;slug&gt;</code>.</p> },
  { id: 'navrows', x: 302, y: 276, w: 230, h: 70, label: 'Navigation items', sub: 'sales (Workspace)\n├ sales.leads (Item, /leads)\n└ sales.vendors-partners (CreamPie)', color: 'var(--green)',
    detail: <p>The menu nodes. <code>sales.leads</code> is an Item with a route and a <code>primaryResource</code>, so it grows the perspectives accordion. <code>sales.vendors-partners</code> is a sibling CreamPie node over the same recipe — the duplicate you noticed.</p> },
  { id: 'leadsT', x: 302, y: 366, w: 230, h: 88, label: 'leads table', sub: '1,472 CI Web Group leads (org 496)\n10,012 client-website leads\nstatus / lead_type: trigger-checked keys', color: 'var(--green)',
    detail: <><p>One table for two populations: CI Web Group's own pipeline and the leads every client website captures. That is why the Leads view pins <code>organizationId = 496</code>.</p><p>Columns store the ListItem <strong>key</strong>: <code>status = "contacted"</code>, <code>lead_type = "vendor"</code>.</p></> },
  { id: 'adminui', x: 302, y: 478, w: 230, h: 70, label: 'Lists admin UI', sub: '/backoffice/admin/lists', color: 'var(--blue)',
    detail: <p>Edits the List/ListItem rows directly (no deploy). Good for adding values; risky for relabelling manifest-declared values (the next seed wins). Real example: someone added the leadType items <code>"List"</code> and <code>"Employment Application"</code> here on Oct 19–20.</p>,
    files: ['apps/synapse-v3/src/components/backoffice/lists/ListsView.tsx'] },

  { id: 'route', x: 580, y: 56, w: 204, h: 70, label: 'GET /api/v1/leads', sub: 'generic smart route\n(no leads controller)', color: 'var(--purple-l)',
    detail: <p>Leads use the same catch-all route as every model. See Deep Dives → Request Lifecycle.</p>, files: ['apps/web-services/src/routes/genericCrudChain.ts'] },
  { id: 'vf', x: 580, y: 146, w: 204, h: 90, label: 'viewFilterMiddleware', sub: 'resolve ?recipe= (tiers)\navailableWhen → 403\nAND when[] → compile', color: 'var(--purple-l)',
    detail: <p>Looks the recipe up (platform → org → user), enforces <code>availableWhen</code>, binds <code>{'{{user.id}}'}</code>, ANDs recipe + <code>when[]</code> and narrows the scope.</p>, files: ['apps/web-services/src/modules/cream-pie/viewFilter.ts:89-190'] },
  { id: 'lf', x: 580, y: 256, w: 204, h: 64, label: 'listFilterMiddleware', sub: '?lists= → hydrate labels', color: 'var(--purple-l)',
    detail: <p>Attaches the six vocabularies so each row carries labels and colours, not just keys.</p>, files: ['apps/web-services/src/utils/listsQuery.ts:26'] },
  { id: 'camp', x: 580, y: 340, w: 204, h: 74, label: 'campaignMembershipFilter', sub: 'bespoke resolver\n(doctrine §3 debt)', color: 'var(--pink)', variant: 'danger',
    detail: <p>Rewrites a Lead <code>campaignId</code> rule into "stamp OR membership" with a side query. Still wired on stage. See Deep Dives → Relationships.</p>, files: ['apps/web-services/src/modules/cream-pie/campaignMembershipFilter.ts'] },
  { id: 'stagesvc', x: 580, y: 434, w: 204, h: 84, label: 'stageMachine', sub: 'leadStatus transitions\nisInitial / isTerminal', color: 'var(--purple-l)',
    detail: <p>Moves between stages are validated against <code>metadata.transitions</code> on each leadStatus item (on stage: every stage may move to every other). The generic API refuses direct writes to lifecycle columns; <code>transitionAndAnnounce</code> emits a PubSub event after commit.</p>, files: ['libs/prisma/src/utils/stageMachine.ts', 'apps/web-services/src/services/stageTransitionService.ts'] },

  { id: 'sidebar', x: 832, y: 56, w: 236, h: 82, label: 'UnifiedSidebar', sub: 'Sales & Marketing › Leads\n+ perspectives accordion', color: 'var(--blue)',
    detail: <p>Draws the workspace from the navigation tree. An <em>Item</em> node with a <code>primaryResource</code> lists every recipe over that resource beneath it, linking to <code>/leads?recipe=&lt;slug&gt;</code>.</p>, files: ['apps/synapse-v3/src/components/dashboard/UnifiedSidebar.tsx:97-104, 172-208, 383-409'] },
  { id: 'browse', x: 832, y: 158, w: 236, h: 64, label: 'WorkspaceScreen → Browse', sub: '/backoffice/sales/leads', color: 'var(--blue)',
    detail: <p><code>router.tsx</code> sends <code>/backoffice/&lt;workspace&gt;/&lt;node&gt;</code> to <code>WorkspaceScreen</code>, which renders <code>&lt;Browse subjectId="sales.leads"/&gt;</code>, which mounts <code>EntityList</code> with the registered view template.</p>, files: ['apps/synapse-v3/src/pages/WorkspaceScreen.tsx:165-167', 'apps/synapse-v3/src/router.tsx'] },
  { id: 'el', x: 832, y: 242, w: 236, h: 92, label: '<EntityList resource="leads">', sub: 'URL state · grid / kanban\nbuildEntityQuery()\nbulk edit · merge', color: 'var(--blue)',
    detail: <p>The universal list surface. Merges the when layers (default → URL → closed-stage hiding → fixedWhen last), serialises the request, renders the grid. Kanban is offered because Lead has a single-select STAGE list.</p>, files: ['apps/synapse-v3/src/components/entity-list/EntityList.tsx:503-533, 801-816', 'apps/synapse-v3/src/components/entity-list/useEntityQuery.ts:98-118'] },
  { id: 'tabs', x: 832, y: 354, w: 236, h: 70, label: 'StageTabs + useStageCounts', sub: 'one tab per leadStatus item\npageSize=1 count per tab', color: 'var(--blue)',
    detail: <p>The tab strip is derived from the leadStatus List — add an item and a tab appears. Each badge is its own request with <code>pageSize=1</code>.</p>, files: ['apps/synapse-v3/src/components/entity-list/StageTabs.tsx', 'apps/synapse-v3/src/components/entity-list/useStageCounts.ts'] },
  { id: 'filters', x: 832, y: 444, w: 236, h: 76, label: 'Toolbar filters', sub: 'Lead type dropdown (leadType)\nCampaign picker (campaignId)\nTaxonomyFilterBar', color: 'var(--blue)',
    detail: <p>The Lead-type dropdown is <code>selectFilters: [{'{ list: "leadType", widget: "select" }'}]</code> — its options come from the List, so admin-added values show up automatically. The Campaign picker is a <code>relationFilter</code> on <code>campaignId</code>.</p>, files: ['apps/synapse-v3/src/components/entity-list/TaxonomyFilterBar.tsx', 'apps/synapse-v3/src/components/entity-list/RelationFilter.tsx'] },
  { id: 'saved', x: 832, y: 540, w: 236, h: 60, label: 'Saved views', sub: 'user-tier recipes (chips)', color: 'var(--blue)',
    detail: <p>Any rep can save the current filters as a personal view — a user-tier recipe stored in list <code>savedView</code>. It appears in the accordion and as a chip, never as a new menu entry.</p>, files: ['apps/synapse-v3/src/components/entity-list/useSavedViews.ts', 'apps/synapse-v3/src/components/entity-list/usePerspectives.ts'] },
];

const edges: DiagramEdge[] = [
  { from: 'crm', to: 'build', color: 'var(--orange-l)', curve: -30 },
  { from: 'vocab', to: 'build', color: 'var(--orange-l)' },
  { from: 'build', to: 'seed', color: 'var(--orange-l)' },
  { from: 'seed', to: 'lists', label: 'upsert', color: 'var(--orange-l)', dashed: true },
  { from: 'seed', to: 'recipes', color: 'var(--orange-l)', dashed: true },
  { from: 'seed', to: 'navrows', color: 'var(--orange-l)', dashed: true },
  { from: 'leadprisma', to: 'leadsT', label: 'migration', color: 'var(--orange-l)', dashed: true },
  { from: 'adminui', to: 'lists', label: 'edit rows', color: 'var(--blue)', curve: 60 },
  { from: 'navrows', to: 'sidebar', color: 'var(--green)', curve: -40 },
  { from: 'sidebar', to: 'browse', color: 'var(--blue)' },
  { from: 'browse', to: 'el', color: 'var(--blue)' },
  { from: 'view', to: 'el', label: 'template', color: 'var(--orange-l)', dashed: true, curve: 70 },
  { from: 'el', to: 'route', label: 'GET', color: 'var(--blue)' },
  { from: 'tabs', to: 'route', label: 'counts', color: 'var(--blue)', dashed: true },
  { from: 'route', to: 'vf', color: 'var(--purple-l)' },
  { from: 'vf', to: 'recipes', label: 'lookup', color: 'var(--purple-l)' },
  { from: 'vf', to: 'camp', color: 'var(--pink)', dashed: true, curve: -30 },
  { from: 'lf', to: 'lists', color: 'var(--purple-l)' },
  { from: 'vf', to: 'leadsT', label: 'findMany', color: 'var(--purple-l)' },
  { from: 'stagesvc', to: 'lists', color: 'var(--purple-l)', dashed: true, curve: 40 },
  { from: 'filters', to: 'el', color: 'var(--blue)' },
  { from: 'saved', to: 'el', color: 'var(--blue)', curve: -40 },
];

// ── real production vocabulary (read-only MCP, aggregates) ──────────────────
const LEAD_STATUS = [
  { key: 'new', label: 'New', color: 'sky', group: 'open', initial: true, count: 392 },
  { key: 'contacted', label: 'Contacted', color: 'indigo', group: 'open', count: 507 },
  { key: 'qualified', label: 'Hot Lead', color: 'red', group: 'open', count: 24 },
  { key: 'booked', label: 'Booked', color: 'violet', group: 'open', count: 33 },
  { key: 'proposal_sent', label: 'Proposal Out', color: 'amber', group: 'open', count: 127 },
  { key: 'msa_sent', label: 'MSA Sent', color: 'amber', group: 'open', count: 2 },
  { key: 'follow_up', label: 'Follow-Up', color: 'sky', group: 'open', count: 18 },
  { key: 'needs_rescheduled', label: 'Needs Rescheduled', color: 'orange', group: 'open', count: 60 },
  { key: 'unresponsive', label: 'Unresponsive', color: 'slate', group: 'open', hidden: true, count: 29 },
  { key: 'converted', label: 'Converted', color: 'green', group: 'won', terminal: true, count: 196 },
  { key: 'not_interested', label: 'Not Interested', color: 'slate', group: 'lost', terminal: true, count: 81 },
];
const ORPHAN_STATUSES = [
  { key: 'partner_referral', count: 1 },
  { key: 'Converted', count: 1 },
  { key: 'contact', count: 1 },
];
const LEAD_TYPE = [
  { key: 'prospect', label: 'Prospect', system: true, def: true, count: 1431 },
  { key: 'vendor', label: 'Vendor', system: true, count: 18 },
  { key: 'partner', label: 'Strategic Partner', system: true, count: 1 },
  { key: 'List', label: 'List', system: false, count: 22, note: 'added in Lists admin, Oct 19' },
  { key: 'Employment Application', label: 'Employment Application', system: false, count: 0, note: 'added in Lists admin, Oct 20' },
];
const TW: Record<string, string> = { sky: '#38bdf8', indigo: '#818cf8', red: '#f87171', violet: '#a78bfa', amber: '#fbbf24', orange: '#fb923c', slate: '#94a3b8', green: '#4ade80' };

// ── the sidebar mock ────────────────────────────────────────────────────────
interface MenuEntry {
  id: string;
  label: string;
  depth: 0 | 1;
  kind: string;
  url: string;
  source: string;
  dup?: string;
}
const MENU: MenuEntry[] = [
  { id: 'dash', label: 'Dashboard', depth: 0, kind: 'Item', url: '/backoffice/sales/dashboard', source: 'nav node sales.dashboard (position 1)' },
  { id: 'leads', label: 'Leads', depth: 0, kind: 'Item · primaryResource leads', url: '/backoffice/sales/leads', source: 'nav node sales.leads (position 10). Because it is an Item with a resource, the sidebar grows the accordion below it from every recipe over "leads".' },
  { id: 'acc-fu', label: 'My follow-ups', depth: 1, kind: 'perspective (recipe)', url: '/backoffice/sales/leads?recipe=sales.my-followups', source: 'recipe sales.my-followups — derived at runtime, not a nav node' },
  { id: 'acc-ref', label: 'Referrals', depth: 1, kind: 'perspective (recipe)', url: '/backoffice/sales/leads?recipe=sales.referrals', source: 'recipe sales.referrals — derived at runtime' },
  { id: 'acc-vp', label: 'Vendors & Partners', depth: 1, kind: 'perspective (recipe)', url: '/backoffice/sales/leads?recipe=sales.vendors-partners', source: 'recipe sales.vendors-partners — derived at runtime from the recipe row', dup: 'vp' },
  { id: 'acc-rep', label: 'Reporting', depth: 1, kind: 'perspective (recipe)', url: '/backoffice/sales/leads?recipe=sales.reporting', source: 'recipe sales.reporting — derived at runtime', dup: 'rep' },
  { id: 'acc-new', label: 'New, not contacted', depth: 1, kind: 'perspective (recipe)', url: '/backoffice/sales/leads?recipe=sales.new-not-contacted', source: 'recipe sales.new-not-contacted (Nov 13): status = new' },
  { id: 'acc-over', label: 'Overdue follow-ups', depth: 1, kind: 'perspective (recipe)', url: '/backoffice/sales/leads?recipe=sales.overdue', source: 'recipe sales.overdue (Nov 13): nextFollowUpDate olderThan 0, status not converted / not_interested / spam' },
  { id: 'acc-un', label: 'Unassigned', depth: 1, kind: 'perspective (recipe)', url: '/backoffice/sales/leads?recipe=sales.unassigned', source: 'recipe sales.unassigned (Nov 13): salesRepUserId isNull' },
  { id: 'acc-hot', label: 'Hot', depth: 1, kind: 'perspective (recipe)', url: '/backoffice/sales/leads?recipe=sales.hot', source: 'recipe sales.hot (Nov 13): tags in [911, Big Fish]; Lead.tags stores labels, so the values must match leadTag labels' },
  { id: 'acc-mine', label: '★ your saved views', depth: 1, kind: 'user-tier recipe', url: '/backoffice/sales/leads?recipe=<your-view>', source: 'list savedView — only you see these' },
  { id: 'vp', label: 'Vendors & Partners', depth: 0, kind: 'CreamPie node', url: '…?recipe=sales.vendors-partners', source: 'nav node sales.vendors-partners (CreamPie, parent "sales", position 12) — a SECOND way to the same recipe', dup: 'vp' },
  { id: 'promo', label: 'Promo Codes', depth: 0, kind: 'Item', url: '/backoffice/admin/partner-codes', source: 'nav node sales.promo-codes (18)' },
  { id: 'orgs', label: 'Organizations', depth: 0, kind: 'Item', url: '/backoffice/sales/organizations', source: 'nav node sales.organizations (20) — its own accordion over organizations' },
  { id: 'amb', label: 'Ambassadors', depth: 0, kind: 'Relationship node', url: '…', source: 'nav node sales.ambassadors (40) — a fixed perspective over an edge' },
  { id: 'todos', label: 'Todos', depth: 0, kind: 'CreamPie node', url: '…?recipe=sales.marketing-todos', source: 'nav node sales.marketing-todos (75) — CreamPie over todos (no Item over todos here, so no duplicate)' },
  { id: 'rep', label: 'Reporting', depth: 0, kind: 'CreamPie node', url: '…?recipe=sales.reporting', source: 'nav node sales.reporting (100) — also a CreamPie over leads, so the same duplicate pattern applies', dup: 'rep' },
];

function SidebarMock() {
  const [sel, setSel] = useState<string>('vp');
  const s = MENU.find(m => m.id === sel)!;
  return (
    <div className="sbm">
      <div className="sbm__side">
        <div className="sbm__ws">Sales &amp; Marketing</div>
        {MENU.map(m => (
          <button
            key={m.id}
            className={`sbm__item sbm__item--d${m.depth} ${sel === m.id ? 'sbm__item--on' : ''} ${s.dup && m.dup === s.dup ? 'sbm__item--dup' : ''}`}
            onClick={() => setSel(m.id)}
          >
            {m.depth === 0 && m.id === 'leads' ? '▾ ' : ''}{m.label}
            {m.dup && <span className="sbm__dupdot" title="same recipe twice">●</span>}
          </button>
        ))}
      </div>
      <div className="sbm__info">
        <div className="sbm__kind">{s.kind}</div>
        <h4>{s.label}</h4>
        <code className="sbm__url">{s.url}</code>
        <p>{s.source}</p>
        {s.dup && (
          <Callout kind="warn" title="Same recipe, two entries">
            Both highlighted entries open <code>?recipe=sales.{s.dup === 'vp' ? 'vendors-partners' : 'reporting'}</code> over leads — your
            URLs ① and ② are byte-identical for this reason.
          </Callout>
        )}
      </div>
    </div>
  );
}

export default function LeadsModule() {
  return (
    <>
      <Section
        label="Case study · built"
        title="Leads, end to end"
        intro={
          <>
            <p>
              <code>/backoffice/sales/leads</code> looks like one screen, but almost nothing about it
              is written specifically for leads. It is the universal <code>EntityList</code>, pointed
              at the <code>leads</code> resource, configured by a manifest, a handful of List rows,
              four recipes and one presentation template. Click through the four columns: definition →
              rows → API → screen.
            </p>
          </>
        }
      >
        <SvgDiagram width={1100} height={630} nodes={nodes} edges={edges} groups={groups} minWidth={900} />
      </Section>

      <Section
        label="Menu"
        title="Where Leads sits in the menu — and the double “Vendors & Partners”"
        intro={
          <p>
            Click the entries. The workspace and its direct children are <em>navigation nodes</em>{' '}
            (rows seeded from <code>modules/crm/module.json</code>). The indented entries under Leads are
            not nodes at all: the sidebar derives them at runtime from every recipe whose{' '}
            <code>primaryResource</code> is <code>leads</code> (decision C21).
          </p>
        }
      >
        <SidebarMock />

        <h3>Verdict: an accidental overlap of two correct mechanisms</h3>
        <div className="kit-prose">
          <p>
            Commit <code>53f4c5501</code> added the recipe <em>and</em> a CreamPie nav node for it in one go, as
            a sibling of Leads (<code>parent: "sales"</code>, position 12) so leadership could find
            vendor-classified leads that had "vanished" from the main list. Meanwhile the accordion
            already lists every leads recipe under Leads. The sidebar has a de-duplication rule — "a
            CreamPie child over its parent's resource is one of the parent's perspectives" — but it
            only fires when the CreamPie node is a <em>child</em> of the Item
            (<code>UnifiedSidebar.tsx:203-208</code>). As a sibling it slips through. <code>sales.reporting</code>{' '}
            has the same shape.
          </p>
          <p>
            Doctrine §5 says "menu = places, chips = perspectives": a recipe is a perspective, and
            should not also be a top-level menu entry. So it is not a bug in the code, it is a
            manifest decision that conflicts with the doctrine. The fix is a two-line manifest edit —
            see Tutorials → "Fix the double Vendors &amp; Partners".
          </p>
        </div>
      </Section>

      <Section
        label="Vocabulary"
        title="The Lists behind Leads — with production data"
        intro={
          <p>
            Read live (read-only) from production on Oct 22 2026, CI Web Group leads only. Notice how
            the <strong>key</strong> (what the column stores and the URL sends) differs from the{' '}
            <strong>label</strong> (what the tab shows): <code>qualified</code> displays as "Hot Lead",{' '}
            <code>proposal_sent</code> as "Proposal Out".
          </p>
        }
      >
        <h3>leadStatus <Pill color="var(--orange-l)">STAGE</Pill> <Pill color="var(--text-dim)">SINGLE · system · column leads.status</Pill></h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>pos</th><th>key (stored)</th><th>label (shown)</th><th>flags</th><th>stageGroup</th><th>leads</th></tr></thead>
            <tbody>
              {LEAD_STATUS.map((s, i) => (
                <tr key={s.key}>
                  <td>{(i + 1) * 10}</td>
                  <td><code>{s.key}</code></td>
                  <td><span className="lm-swatch" style={{ background: TW[s.color] }} /> {s.label}</td>
                  <td>
                    {s.initial && <Pill color="var(--green)">isInitial · default</Pill>}{' '}
                    {s.terminal && <Pill color="var(--pink)">isTerminal → hidden from "Open"</Pill>}{' '}
                    {s.hidden && <Pill color="var(--teal)">openHidesStages → hidden from "Open"</Pill>}
                  </td>
                  <td>{s.group}</td>
                  <td>{s.count}</td>
                </tr>
              ))}
              {ORPHAN_STATUSES.map(s => (
                <tr key={s.key} className="lm-orphan">
                  <td>—</td><td><code>{s.key}</code></td><td colSpan={3}>⚠ no such item in the List — a value the column holds that the vocabulary does not know</td><td>{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="real" title="Two things production shows that the code does not">
          <p>
            <strong>3 leads carry statuses outside the List</strong> (<code>partner_referral</code>,{' '}
            <code>Converted</code> with a capital C, <code>contact</code>). They match no stage tab. The schema does
            guard the column: a <code>list_slot__status</code> trigger (<code>enforce_list_slot('status', 'leadStatus')</code>)
            rejects any value that is not a key of the platform leadStatus list. But it only checks a value when it is
            written or changed, so these rows most likely predate the trigger on production. Stage also guards{' '}
            <code>lead_type</code>, <code>lead_origin</code>, <code>customer_type</code> and <code>source</code> the same way.
          </p>
          <p>
            <strong>Production is behind stage:</strong> stage's manifest also declares a terminal{' '}
            <code>spam</code> stage and <code>metadata.transitions</code> on every item; production items only carry{' '}
            <code>stageGroup</code>. That is also why your URL hides{' '}
            <code>unresponsive,converted,not_interested</code> but not <code>spam</code>.
          </p>
        </Callout>

        <h3>leadType <Pill color="var(--blue)">TAXONOMY</Pill> <Pill color="var(--text-dim)">SINGLE · system · column leads.lead_type</Pill></h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>key (stored)</th><th>label</th><th>origin</th><th>leads</th></tr></thead>
            <tbody>
              {LEAD_TYPE.map(t => (
                <tr key={t.key}>
                  <td><code>{t.key}</code></td>
                  <td>{t.label}{t.def && <> <Pill color="var(--green)">default</Pill></>}</td>
                  <td>{t.system ? 'manifest (system)' : <span className="lm-warn">{t.note}</span>}</td>
                  <td>{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="warn" title="A real-world drift in the making">
          The two admin-added items use keys that are not slugs (<code>"List"</code>, <code>"Employment Application"</code> with a space).
          Meanwhile stage's manifest adds its own item <code>employment</code> labelled "Employment Application". After the next
          deploy+seed, production will have <em>two</em> "Employment Application" values with different keys, and any lead
          saved with one will not match a filter on the other. This is the clearest example of why the triage
          "UI or code?" needs a third answer: <strong>for a manifest-owned (system) list, change the manifest</strong>.
        </Callout>

        <h3>The rest of the Leads vocabulary</h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>List</th><th>Type</th><th>Bound to</th><th>Items</th><th>Where the UI uses it</th></tr></thead>
            <tbody>
              <tr><td><code>leadOrigin</code></td><td>TAXONOMY</td><td>column <code>lead_origin</code></td><td>19 (referral, website, booth, ai_agent…)</td><td>grid column, recipe <code>sales.referrals</code></td></tr>
              <tr><td><code>leadCustomerType</code></td><td>TAXONOMY</td><td>column <code>customer_type</code></td><td>3 (new, existing, returning)</td><td>grid column, bulk edit</td></tr>
              <tr><td><code>leadIntakeChannel</code></td><td>TAXONOMY</td><td>column <code>source</code></td><td>28 (web_form, call_tracking, ppc, social_*…)</td><td>"Intake Channel" field (stage manifest)</td></tr>
              <tr><td><code>leadTag</code></td><td>TAXONOMY · MULTIPLE</td><td>ListResource rows</td><td>13 in prod (911, warm, cold, big_fish…)</td><td><code>when[lists.leadTag][in]=…</code> — not system, so truly admin-owned</td></tr>
              <tr><td><code>trade</code>, <code>industry</code></td><td>TAXONOMY (spine)</td><td>ListResource rows</td><td>shared</td><td>requested via <code>lists=</code> on every leads call</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        label="Perspectives"
        title="The four recipes over leads"
        intro={<p>Each is a stored CREAM-PQL condition. They narrow the leads table; none of them widens what you could already see.</p>}
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Slug</th><th>Conditions</th><th>Shown as</th></tr></thead>
            <tbody>
              <tr><td><code>sales.vendors-partners</code></td><td><code>leadType in [vendor, partner]</code> AND <code>organizationId eq 496</code></td><td>accordion + CreamPie node (duplicate)</td></tr>
              <tr><td><code>sales.referrals</code></td><td><code>leadOrigin in [referral, ambassador_referral, strategic_partner_referral, tsm_referral, manufacturer_referral, distributor_referral]</code> AND <code>organizationId eq 496</code></td><td>accordion</td></tr>
              <tr><td><code>sales.my-followups</code></td><td><code>salesRepUserId eq {'{{user.id}}'}</code> AND <code>nextFollowUpDate isNotNull</code></td><td>accordion — <code>{'{{user.id}}'}</code> is bound server-side from your session</td></tr>
              <tr><td><code>sales.reporting</code></td><td><code>createdAt within {'{{period}}'}</code> (param, default <code>mtd</code>) AND <code>organizationId eq 496</code></td><td>accordion + CreamPie node (same duplicate shape)</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        label="Map"
        title="If you want to change X, go to Y"
        intro={<p>The single most useful table on this page. Most Leads changes are one row of one file — or no file at all.</p>}
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>I want to…</th><th>Go to</th><th>Kind</th></tr></thead>
            <tbody>
              <tr><td>Add a tag value (leadTag)</td><td>Lists admin → leadTag → Add item</td><td><Pill color="var(--green)">UI only</Pill></td></tr>
              <tr><td>Add a lead type / origin / stage that should exist everywhere</td><td><code>modules/crm/module.json</code> → the list's <code>items</code> → build:modules → deploy (seed)</td><td><Pill color="var(--purple-l)">manifest</Pill></td></tr>
              <tr><td>Try a new value quickly in prod</td><td>Lists admin (then back-port it to the manifest with the same <em>slug</em> key)</td><td><Pill color="var(--yellow)">UI, then manifest</Pill></td></tr>
              <tr><td>Rename / recolour / reorder a stage</td><td>manifest item <code>label</code>/<code>color</code>/<code>position</code> (the seed owns these columns)</td><td><Pill color="var(--purple-l)">manifest</Pill></td></tr>
              <tr><td>Retire a value</td><td>Lists admin → deactivate (<code>isActive</code> is NOT seed-owned)</td><td><Pill color="var(--green)">UI only</Pill></td></tr>
              <tr><td>A personal filtered view</td><td>Leads screen → filter → Save view</td><td><Pill color="var(--green)">UI only</Pill></td></tr>
              <tr><td>A shared perspective everyone gets</td><td>manifest <code>recipes[]</code> (system tier) or an org-tier recipe</td><td><Pill color="var(--purple-l)">manifest</Pill></td></tr>
              <tr><td>Change grid columns, default sort, hidden stages, the Lead-type dropdown</td><td><code>resourceViews/leads.ts</code> (LEADS_VIEW)</td><td><Pill color="var(--blue)">frontend code</Pill></td></tr>
              <tr><td>A new menu entry</td><td>manifest <code>navigation[]</code> — but ask first whether it is a place or a perspective (§5)</td><td><Pill color="var(--purple-l)">manifest</Pill></td></tr>
              <tr><td>A new field on leads</td><td>manifest model field (+ Prisma migration) and, if it is a vocabulary, a new List</td><td><Pill color="var(--pink)">code + migration</Pill></td></tr>
              <tr><td>Filter leads by something related (campaign, rep, org edge)</td><td>declared relation or <code>edges.*</code> path — never a resolver</td><td><Pill color="var(--pink)">schema</Pill></td></tr>
            </tbody>
          </table>
        </div>
        <Files
          items={[
            { path: 'modules/crm/module.json', note: 'Lead model, lists, recipes, navigation' },
            { path: 'apps/synapse-v3/src/components/entity-list/resourceViews/leads.ts', note: 'LEADS_VIEW presentation template' },
            { path: 'apps/synapse-v3/src/config/ciWebGroup.ts', note: 'CI_WEB_GROUP_ORGANIZATION_ID = 496' },
            { path: 'libs/prisma/src/seeders/modules/_moduleSeeder.ts', note: 'which item columns the seed owns' },
            { path: 'https://synapse.ciwebgroup.com/backoffice/admin/lists', note: 'Lists admin' },
          ]}
        />
      </Section>
    </>
  );
}
