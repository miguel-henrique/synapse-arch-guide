import { useMemo, useState } from 'react';
import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../components/kit/SvgDiagram';
import { Callout, Files, PageHeader, Pill, Section } from '../components/kit/Kit';
import type { Page } from '../types';
import './ErpPage.css';

// ─────────────────────────────────────────────────────────────────────────────
// The declarative ERP module, as Chris presented it in the daily of
// Nov 16 2026 (with a ChatGPT write-up of erp.crm.json), mapped onto what
// exists on origin/stage de81a84533. Every "exists" claim cites a file.
// ─────────────────────────────────────────────────────────────────────────────

const SV3 = 'apps/synapse-v3/src';
const WS = 'apps/web-services/src';

// ── the real pipeline ───────────────────────────────────────────────────────
const groups: DiagramGroup[] = [
  { id: 'src', x: 16, y: 16, w: 250, h: 420, label: 'Declare (source of truth)', color: 'var(--purple-l)' },
  { id: 'build', x: 282, y: 16, w: 250, h: 420, label: 'Compile & seed (deploy)', color: 'var(--teal)' },
  { id: 'run', x: 548, y: 16, w: 536, h: 420, label: 'Consumers at run time', color: 'var(--orange-l)' },
];
const nodes: DiagramNode[] = [
  { id: 'manifest', x: 32, y: 60, w: 218, h: 150, label: 'modules/<slug>/module.json', sub: 'slug · version · optional\ndefaultEnabled · dependencies\nmodels · lists · meta\nactions · recipes\nnavigation · seeds', color: 'var(--purple-l)',
    detail: <p>The real "erp.crm.json". Eleven modules on stage: core, vocabulary, crm, agreements, billing, communication, events, operations, portal, web-presence, infrastructure. Each one declares a business capability. Renaming any key in it is a data migration ("nomenclature is API").</p>,
    files: ['modules/crm/module.json', 'modules/_schema/module.schema.json'] },
  { id: 'schema', x: 32, y: 230, w: 218, h: 64, label: 'module.schema.json', sub: 'the versioned contract', color: 'var(--purple-l)',
    detail: <p>JSON Schema every manifest is validated against. It is what ChatGPT calls <code>erp.module.schema.json</code>, already in place. It also refuses retired ListTypes (STATUS, TYPE, CATEGORY).</p> },
  { id: 'prisma', x: 32, y: 314, w: 218, h: 100, label: '*.prisma models', sub: 'the tables (entities)\nadopted by models[]', color: 'var(--purple-l)', variant: 'ghost',
    detail: <p>Chris: "our entities list just has contact … that means there should be a <code>contact.prisma</code> file". Entities are still Prisma models. The manifest <em>adopts</em> them (<code>models[].sourceFile</code>, <code>adopted: true</code>) and binds columns to Lists. It does not generate migrations by itself.</p> },

  { id: 'bm', x: 298, y: 60, w: 218, h: 84, label: 'pnpm build:modules', sub: 'validate · resolve deps\n(topological order) · emit', color: 'var(--teal)',
    detail: <p>The "Module Registry &amp; Compiler" of the ChatGPT diagram. It validates every manifest, rejects unknown <code>requires</code> and require/conflict clashes, builds in dependency order, and emits typed artifacts. <code>pnpm check:modules</code> fails CI when generated files drift from the manifests.</p>,
    files: ['tools/build-modules/index.mjs', 'tools/build-modules/lib/validate.mjs'] },
  { id: 'gen', x: 298, y: 164, w: 218, h: 84, label: 'generated/*', sub: 'lists · types · navigation\nnavTree.generated (fallback menu)', color: 'var(--teal)',
    detail: <p>The "service projections": one per consumer. <code>crm-lists.ts</code>, <code>crm-types.ts</code>, the nav rows the sidebar ships with, the CREAM-PIE field index. Never edited by hand.</p> },
  { id: 'seed', x: 298, y: 268, w: 218, h: 84, label: 'seed:modules (every deploy)', sub: 'upsert Lists · recipes\nPlatformModule row (navRoots)\nnavigation items', color: 'var(--teal)',
    detail: <p><code>createModuleSeeder</code> upserts the module's Lists and recipes, then its <code>PlatformModule</code> registry row with <code>navRoots</code>: the top-level menu subjects the module unlocks. Navigation is seeded in one pass across modules because a node's parent can belong to another module.</p>,
    files: ['libs/prisma/src/seeders/modules/_moduleFactory.ts:47-85'] },

  { id: 'reg', x: 564, y: 56, w: 248, h: 86, label: 'Module registry', sub: 'resolveModulesForOrg()\nGET /synapse/v1/modules/enabled', color: 'var(--orange-l)',
    detail: <p><strong>Availability.</strong> Which modules this organization has: platform switch → admin-only → role limit → the org's own row (or its parent's) → industry default → <code>defaultEnabled</code>. Its own comment: "These gates decide what the menu offers. They do not authorize data."</p>,
    files: [`${WS}/modules/synapse/moduleRegistry.ts:1-150`] },
  { id: 'menu', x: 828, y: 56, w: 240, h: 86, label: 'Menu (UnifiedSidebar)', sub: 'nav tree − disabled module roots\n− staff-only − !canRead', color: 'var(--orange-l)',
    detail: <p>The rendering engine for navigation. It reads the seeded tree and drops nodes in this order: claimed by a disabled module → staff-only for partners → no <code>read</code> on the subject or any ancestor. See the simulator below.</p>,
    files: [`${SV3}/components/dashboard/UnifiedSidebar.tsx:252-288`] },
  { id: 'casl', x: 564, y: 162, w: 248, h: 86, label: 'Security (CASL / PRBAC)', sub: 'deny-first abilities\nsubject = nav subjectId', color: 'var(--orange-l)',
    detail: <p><strong>Authorization.</strong> Polymorphic RBAC: an ability is an action on a subject in an organization context. Nav <code>subjectId</code>s are RBAC subjects, and grants cascade by string prefix (<code>sales</code> covers <code>sales.leads</code>). This is the authoritative check: every API request is checked again on the server.</p>,
    files: [`${WS}/ability/defineAbility.ts`, `${WS}/ability/prbacResolver.ts`] },
  { id: 'api', x: 828, y: 162, w: 240, h: 86, label: 'API: generic route', sub: '/api/v1/:resource\nno per-module controllers', color: 'var(--orange-l)',
    detail: <p>One generic chain serves every model and typed kind: CASL → tenant scope → recipe → CREAM-PQL → Prisma. A new module's entities get list/read/write endpoints with no new controller.</p>,
    files: [`${WS}/routes/genericCrudChain.ts`] },
  { id: 'tpl', x: 564, y: 268, w: 248, h: 86, label: 'Template engine', sub: 'EntityList + resourceViews\nrecipes → perspectives (chips)', color: 'var(--orange-l)',
    detail: <p>Listings and boards render from a declared view (<code>resourceViews/*.ts</code>), the guesser's defaults and the module's recipes. Action buttons come from the node's <code>actionKeys</code> → <code>actions[]</code>.</p>,
    files: [`${SV3}/components/entity-list/EntityList.tsx`] },
  { id: 'ps', x: 828, y: 268, w: 240, h: 86, label: 'PubSub', sub: 'actions[].topics · domain events\nsubscribers = List items', color: 'var(--orange-l)',
    detail: <p>A manifest action names the topics it emits (<code>enrich → crm:organization:enrich-requested</code>). Subscribers are not in the manifest: they are rows (List items) seeded by bootstrap code or created in Admin → PubSub. Deep Dives → PubSub has the whole pipeline.</p> },
  { id: 'ctx', x: 564, y: 374, w: 504, h: 50, label: 'React context machine (ErpProvider): org → identity/ability → modules → menu', color: 'var(--blue)',
    detail: <p>The "React Template Context Service". Its order is a correctness rule: abilities resolve <em>after</em> the organization (the same person can be admin in one tenant and guest in another), and the menu resolves <em>after</em> modules (otherwise it briefly shows places the tenant has not bought).</p>,
    files: [`${SV3}/erp/useErpBootstrap.ts:1-27`, `${SV3}/erp/ErpProvider.tsx`] },
];
const edges: DiagramEdge[] = [
  { from: 'schema', to: 'manifest', label: 'validates', color: 'var(--purple-l)', dashed: true },
  { from: 'prisma', to: 'manifest', label: 'adopted', color: 'var(--purple-l)', dashed: true },
  { from: 'manifest', to: 'bm', color: 'var(--purple-l)' },
  { from: 'bm', to: 'gen', color: 'var(--teal)' },
  { from: 'gen', to: 'seed', color: 'var(--teal)' },
  { from: 'seed', to: 'reg', label: 'PlatformModule', color: 'var(--teal)' },
  { from: 'seed', to: 'tpl', label: 'recipes', color: 'var(--teal)' },
  { from: 'reg', to: 'menu', label: 'disabled roots', color: 'var(--orange-l)' },
  { from: 'casl', to: 'menu', label: 'canRead', color: 'var(--orange-l)' },
  { from: 'casl', to: 'api', label: 'authorize', color: 'var(--orange-l)' },
  { from: 'api', to: 'ps', label: 'writes emit', color: 'var(--orange-l)' },
];

// ── ChatGPT namespace → reality ─────────────────────────────────────────────
type Status = 'yes' | 'partial' | 'no';
const STATUS: Record<Status, { label: string; color: string }> = {
  yes: { label: 'exists', color: 'var(--green)' },
  partial: { label: 'partial', color: 'var(--yellow)' },
  no: { label: 'not yet', color: 'var(--pink)' },
};
interface MapRow { ns: string; today: React.ReactNode; status: Status; study: { label: string; page: Page; hash?: string } }
const MAP: MapRow[] = [
  { ns: 'module (identity, version, activation)', status: 'yes',
    today: <><code>slug</code>, <code>version</code>, <code>optional</code> (false = core, always on), <code>defaultEnabled</code>, <code>platformAdminOnly</code>, <code>draft</code>. Seeded into a <code>PlatformModule</code> row.</>,
    study: { label: 'Docs → Module structure', page: 'docs', hash: 'module-structure' } },
  { ns: 'dependencies', status: 'partial',
    today: <><code>dependencies.requires / optional / conflicts</code>. Checked at <strong>build</strong> time (unknown slugs, require/conflict clash, topological build order). Nothing checks them when a module is switched on for a tenant.</>,
    study: { label: 'Questions → G16', page: 'questions', hash: 'G16' } },
  { ns: 'entitlements (purchased)', status: 'partial',
    today: <>No manifest section. "What was bought" is the per-org module switch (<code>OrganizationModule</code>: SELF or inherited from the PARENT org), then the industry default, then <code>defaultEnabled</code>. Admins set it in Admin → Modules. It is not derived from billing or the catalog.</>,
    study: { label: 'this page → Availability', page: 'erp' } },
  { ns: 'entities', status: 'yes',
    today: <><code>models[]</code> adopts Prisma models (<code>sourceFile</code>, <code>resource</code>, <code>labelField</code>, <code>supportedViews</code>, fields bound to Lists). The table itself is still a <code>.prisma</code> file plus a migration.</>,
    study: { label: 'How it fits → Todos & Projects', page: 'howitfits' } },
  { ns: 'vocabulary (statuses, stages, types)', status: 'yes',
    today: <><code>lists[]</code>: every business vocabulary is a List (doctrine §1). STAGE lists are the state machines that ChatGPT's "workflows" mostly are.</>,
    study: { label: 'Architecture → List primitive', page: 'home' } },
  { ns: 'security (RBAC, policies)', status: 'partial',
    today: <>Polymorphic RBAC exists (CASL/PRBAC, deny-first, subject = nav <code>subjectId</code>, prefix cascade) and recipes carry <code>availableWhen</code> (enforced server-side). Roles and grants are data in the RBAC admin, not a manifest section.</>,
    study: { label: 'Deep Dives → Request Lifecycle', page: 'deepdives', hash: 'lifecycle' } },
  { ns: 'api (endpoints, queries, commands)', status: 'yes',
    today: <>No section needed: the generic route <code>/api/v1/:resource</code> serves every adopted model. Queries are <strong>recipes</strong> (<code>recipes[]</code>, named CREAM-PQL conditions). Commands are <code>actions[]</code>.</>,
    study: { label: 'Deep Dives → URL Anatomy', page: 'deepdives', hash: 'url' } },
  { ns: 'events (topics, subscribers)', status: 'partial',
    today: <><code>actions[].topics</code> names what an action emits. Topics and subscribers live as List items (<code>pubsubTopic</code> / <code>pubsubSubscriber</code>), seeded by bootstrap code or made in Admin → PubSub, not declared in the manifest.</>,
    study: { label: 'Deep Dives → PubSub', page: 'deepdives', hash: 'pubsub' } },
  { ns: 'workflows', status: 'partial',
    today: <>STAGE lists (gated transitions in item metadata, <code>transitionAndAnnounce</code>) plus PubSub subtopic chains. No general declarative workflow engine.</>,
    study: { label: 'Deep Dives → PubSub (chains)', page: 'deepdives', hash: 'pubsub' } },
  { ns: 'ui (menu, listings, detail, actions)', status: 'yes',
    today: <><code>navigation[]</code> (Workspace / Item / CreamPie nodes), <code>recipes[]</code> as perspectives, <code>actionKeys</code> → action buttons, <code>resourceViews</code> templates for listings and boards.</>,
    study: { label: 'How it fits → Operations area', page: 'howitfits' } },
  { ns: 'availability', status: 'yes',
    today: <><code>resolveModulesForOrg</code> → the sidebar's module gate; <code>availableWhen</code> on recipes. Not one resolver: see below.</>,
    study: { label: 'this page → simulator', page: 'erp' } },
  { ns: 'ai (agents, skills, harnesses)', status: 'no',
    today: <>Not in the manifest. Agents (Neo, the backoffice assistant) are configured in their own apps and tables.</>,
    study: { label: '—', page: 'erp' } },
  { ns: 'storage', status: 'no',
    today: <>Not in the manifest. Files go through the existing storage services per feature.</>,
    study: { label: '—', page: 'erp' } },
];

// ── availability-then-access simulator ──────────────────────────────────────
type Source = 'SELF' | 'PARENT' | 'INDUSTRY' | 'DEFAULT';
interface G {
  superAdmin: boolean;
  platformActive: boolean;
  adminOnly: boolean;
  roleLimited: boolean;
  hasRole: boolean;
  source: Source;
  enabled: boolean;
  partner: boolean;
  staffOnly: boolean;
  canRead: boolean;
}
interface Gate { name: string; layer: 'availability' | 'access'; pass: boolean; why: string }

function evaluate(g: G): Gate[] {
  const out: Gate[] = [];
  const closed = !g.superAdmin && (!g.platformActive ? 'INACTIVE' : g.adminOnly ? 'PLATFORM_ADMIN_ONLY' : g.roleLimited && !g.hasRole ? 'ROLE' : null);
  out.push({ name: 'Module switched on platform-wide, not admin-only, role allowed', layer: 'availability', pass: !closed,
    why: g.superAdmin ? 'Super admins open every gate.' : closed ? `Closed for everyone but super admins (source = ${closed}).` : 'Open.' });
  if (closed) return out;
  const enabled = g.superAdmin && g.source === 'DEFAULT' ? true : g.enabled;
  const srcText: Record<Source, string> = {
    SELF: 'the organization\'s own module row',
    PARENT: 'a row inherited from the parent organization',
    INDUSTRY: 'the default for the organization\'s industry',
    DEFAULT: 'the manifest\'s defaultEnabled',
  };
  out.push({ name: 'Module enabled for this organization', layer: 'availability', pass: enabled,
    why: `Decided by ${srcText[g.source]}: ${enabled ? 'enabled' : 'disabled'}. If disabled, every nav node under the module's navRoots disappears.` });
  if (!enabled) return out;
  const staffHide = g.partner && g.staffOnly;
  out.push({ name: 'Not a staff-only screen for a partner', layer: 'access', pass: !staffHide,
    why: staffHide ? 'Partners never see Admin, Commissions, Infrastructure or Finance ERP screens (config/staffOnly.ts).' : 'Open.' });
  if (staffHide) return out;
  const canRead = g.superAdmin || g.canRead;
  out.push({ name: 'CASL: read on the subject or an ancestor', layer: 'access', pass: canRead,
    why: g.superAdmin ? 'Super admins hold manage on all.' : canRead ? 'The ability allows read on sales.leads, sales or all.' : 'No read grant on the node or any ancestor, so it is dropped.' });
  return out;
}

function Gates() {
  const [g, setG] = useState<G>({ superAdmin: false, platformActive: true, adminOnly: false, roleLimited: false, hasRole: true, source: 'DEFAULT', enabled: true, partner: false, staffOnly: false, canRead: true });
  const set = <K extends keyof G>(k: K, v: G[K]) => setG(o => ({ ...o, [k]: v }));
  const gates = useMemo(() => evaluate(g), [g]);
  const shown = gates.every(x => x.pass) && gates.length === 4;
  const lostAt = gates.find(x => !x.pass);
  const T = ({ k, label }: { k: keyof G; label: string }) => (
    <button className={`erp-tog ${g[k] ? 'erp-tog--on' : ''}`} onClick={() => set(k, !g[k] as never)} aria-pressed={!!g[k]}>
      <span className="erp-tog__box">{g[k] ? '✓' : ''}</span>{label}
    </button>
  );
  return (
    <div className="erp-sim">
      <div className="erp-sim__ctl">
        <div className="erp-sim__h">The reader</div>
        <T k="superAdmin" label="Is a super admin" />
        <T k="partner" label="Is a partner (tenant user), not staff" />
        <T k="canRead" label="Has a read grant on the node (or an ancestor)" />
        <div className="erp-sim__h">The module (registry row)</div>
        <T k="platformActive" label="Active platform-wide (isActive)" />
        <T k="adminOnly" label="platformAdminOnly" />
        <T k="roleLimited" label="Limited to certain roles (metadata.roleIds)" />
        {g.roleLimited && <T k="hasRole" label="…and the reader holds one of them" />}
        <div className="erp-sim__h">This organization</div>
        <div className="erp-sim__radio">
          <span>Decided by</span>
          {(['SELF', 'PARENT', 'INDUSTRY', 'DEFAULT'] as Source[]).map(s => (
            <button key={s} className={`erp-chip ${g.source === s ? 'erp-chip--on' : ''}`} onClick={() => set('source', s)}>{s}</button>
          ))}
        </div>
        <T k="enabled" label={g.source === 'DEFAULT' ? 'defaultEnabled in the manifest' : 'isEnabled on that row'} />
        <div className="erp-sim__h">The menu node</div>
        <T k="staffOnly" label="Is a staff-only screen" />
      </div>
      <div className="erp-sim__out">
        <div className="erp-sim__h">Will “Leads” show in the menu?</div>
        <ol className="erp-gates">
          {gates.map(x => (
            <li key={x.name} className={x.pass ? 'erp-gate--ok' : 'erp-gate--no'}>
              <span className={`erp-layer erp-layer--${x.layer}`}>{x.layer}</span>
              <b>{x.pass ? '✓' : '✗'} {x.name}</b>
              <span>{x.why}</span>
            </li>
          ))}
        </ol>
        <div className={`erp-verdict ${shown ? 'erp-verdict--ok' : 'erp-verdict--no'}`}>
          {shown ? 'Shown in the menu.' : `Hidden: lost at the ${lostAt?.layer} layer.`}
        </div>
        <Callout kind="warn" title="And if they type /backoffice/sales/leads into the address bar?">
          Every gate above is <strong>UX</strong>. The menu chrome even fails open: if <code>modules/enabled</code> errors,
          nothing is hidden. What protects the data is the server: the generic route checks the CASL ability on every
          request, deny-first, and scopes it to the tenant. A hidden button is never the thing that stops an
          unauthorized command.
        </Callout>
      </div>
    </div>
  );
}

export default function ErpPage({ setPage }: { setPage: (p: Page) => void }) {
  // Sub-tab links set the full hash first, so the target page reads its tab on mount.
  const go = (p: Page, hash?: string) => {
    if (p === 'erp') {
      document.getElementById(hash ?? 'availability')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (hash) {
      window.location.hash = `#/${p}/${hash}`;
      window.scrollTo({ top: 0 });
    } else setPage(p);
  };
  return (
    <div className="kit-page">
      <PageHeader
        label="ERP Manifest"
        title="One declarative module, read by every part of the ERP"
        desc={
          <>
            In the daily on Nov 16, Chris walked through a ChatGPT write-up of a <em>declarative ERP module loader</em>:
            one JSON object (<code>erp.crm.json</code>) that creates entities, defines RBAC, names topics and subscriber
            callbacks, and drives the menu, listings and action buttons, with zero module-specific code. His point:
            <strong> this is not new.</strong> It is the philosophy the platform is already built on, and CREAM-PIE recipes
            are "a smaller part of this larger JSON object". This page maps that vision onto what really exists on stage, and
            what does not yet.
          </>
        }
      >
        <button className="kit-link-btn" onClick={() => go('tutorials', 'my-first-recipe')}>Homework: make your own recipe →</button>
      </PageHeader>

      <Section
        label="The problem"
        title="Why a manifest, and what Chris asked of the team"
        intro={
          <p>
            <strong>Problem:</strong> scalability, and how the pieces of the platform connect. Without one standard, every module
            grows its own controllers, menus, enums and component logic, and the backlog grows with it. <strong>Answer:</strong> a
            module is <em>declared</em> once, and generic services (API, security, menu, listings, events) consume the
            declaration. Adding <code>projects</code> or <code>billing</code> becomes configuration, not another application.
          </p>
        }
      >
        <div className="erp-asks">
          <div><b>Build right</b><span>Follow the doctrine; no business vocabulary or component logic hardcoded in screens. Reviewers (Blake) should flag PRs that drift from it.</span></div>
          <div><b>Read the code</b><span>Understand how the system digests modules (e.g. how the menu is plucked from enabled modules) before changing it. That is aimed at the menu restructuring work first.</span></div>
          <div><b>Use the shared vocabulary</b><span>The docs are the legend: look terms up before asking. PubSub docs are pinned in the code channel as the source of truth.</span></div>
          <div><b>Make your own recipe</b><span>Everyone saves a CREAM-PIE recipe in Synapse to feel the architecture. "As easy as pointing and clicking and saving a view."</span></div>
        </div>
      </Section>

      <Section
        label="What exists"
        title="erp.crm.json already exists: it is modules/crm/module.json"
        intro={
          <p>
            The ChatGPT diagram (manifest → registry &amp; compiler → service projections → tenant runtime) matches the real
            pipeline closely. Click any box for what it does and where it lives.
          </p>
        }
      >
        <SvgDiagram width={1100} height={452} nodes={nodes} edges={edges} groups={groups} minWidth={960} />
        <Callout kind="info" title="Different names, same idea">
          ChatGPT's file is a proposal written from a blank page, so its section names differ. Do not go looking for{' '}
          <code>erp.crm.json</code>, <code>entitlements</code> or <code>ai</code> in the repo. The real contract is{' '}
          <code>modules/_schema/module.schema.json</code>, and the sections are{' '}
          <code>models · lists · meta · actions · recipes · navigation · seeds · dependencies</code>.
        </Callout>
      </Section>

      <Section
        label="Gap analysis"
        title="Each namespace of the proposal, against stage"
        intro={<p>Use the last column as your study path: it points to the CREAM-PIE page that explains that piece.</p>}
      >
        <div className="kit-table-wrap">
          <table className="kit-table erp-map">
            <thead><tr><th>Proposal namespace</th><th>On stage today</th><th>Status</th><th>Study</th></tr></thead>
            <tbody>
              {MAP.map(r => (
                <tr key={r.ns}>
                  <td><code>{r.ns}</code></td>
                  <td>{r.today}</td>
                  <td><Pill color={STATUS[r.status].color}>{STATUS[r.status].label}</Pill></td>
                  <td>{r.study.label === '—' ? '—' : <button className="kit-inline-link" onClick={() => go(r.study.page, r.study.hash)}>{r.study.label}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="availability"
        label="Availability before access control"
        title="“Availability occurs before access control”"
        intro={
          <p>
            Chris's most stressed point. <strong>Availability</strong> asks: does this tenant have the module at all (the
            website-and-hosting package gives you certain places)? <strong>Access control</strong> asks: may this person use it?
            Having a module available does not mean every user may open it. On stage the two are separate code paths, applied in
            that order.
          </p>
        }
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Concept (ChatGPT's word)</th><th>Question</th><th>On stage</th></tr></thead>
            <tbody>
              <tr><td><b>Installation</b></td><td>Does the capability exist in the platform?</td><td>A <code>module.json</code>, built and seeded into a <code>PlatformModule</code> row</td></tr>
              <tr><td><b>Tenant activation / entitlement</b></td><td>Did this customer get it?</td><td><code>resolveModulesForOrg</code>: org row (SELF/PARENT) → industry default → <code>defaultEnabled</code></td></tr>
              <tr><td><b>Authorization</b></td><td>May this person do it?</td><td>CASL / PRBAC abilities on subjects; <code>availableWhen</code> on recipes. Enforced on the server</td></tr>
              <tr><td><b>Operational availability</b></td><td>Can it run right now?</td><td>No platform concept. Each feature handles its own outages</td></tr>
            </tbody>
          </table>
        </div>
        <Gates />
        <Callout kind="tip" title="The order is written into the front end too">
          <code>useErpBootstrap.ts</code> documents the "context machine":{' '}
          <code>getUser → getOrganizations → setOrganization → (setIdentity, getModules → getMenu)</code>. Identity resolves
          after the organization, because the same person has different abilities in different tenants. The menu resolves after
          modules, because "a menu built before module enablement is known briefly shows places the tenant has not bought".
          Read this file before touching the menu.
        </Callout>
        <Files
          items={[
            { path: `${WS}/modules/synapse/moduleRegistry.ts`, note: 'resolveModulesForOrg: the availability resolver' },
            { path: `${WS}/modules/synapse/modules.controller.ts:55-82`, note: 'GET /synapse/v1/modules/enabled' },
            { path: `${SV3}/erp/useErpBootstrap.ts`, note: 'the context machine (order of resolution)' },
            { path: `${SV3}/components/dashboard/UnifiedSidebar.tsx:252-288`, note: 'the gates, in order' },
            { path: `${SV3}/hooks/useDisabledNavRoots.ts`, note: 'module gate (see Questions → G15)' },
            { path: `${SV3}/hooks/useNavReadFilter.ts`, note: 'canRead: read on the subject or an ancestor' },
            { path: `${SV3}/config/staffOnly.ts`, note: 'staff-only subjects' },
            { path: `${SV3}/components/backoffice/ModulesAdminView.tsx`, note: 'Admin → Modules (/admin/modules)' },
          ]}
        />
      </Section>

      <Section
        label="Walk-through"
        title="One action button, through every service"
        intro={
          <p>
            ChatGPT's example is an "AI Enrich" button. Stage has a real one: the <code>enrich</code> action in the CRM manifest.
          </p>
        }
      >
        <pre className="erp-code">{`// modules/crm/module.json → actions[]
{ "name": "enrich",
  "description": "Fetch third-party firmographics for this record.",
  "topics": ["crm:organization:enrich-requested"],
  "context": ["Organization", "Lead"] }

// modules/crm/module.json → navigation[]  (finance.organizations)
{ "subjectId": "finance.organizations", "actionKeys": ["enrich", "merge"], … }`}</pre>
        <ol className="kit-prose">
          <li><b>Template engine</b>: the Organizations node lists <code>actionKeys</code>, so the screen offers <em>Enrich</em> for records of the action's <code>context</code> types. No component knows what enrichment is.</li>
          <li><b>Availability</b>: the node lives under the module's nav roots, so if CRM is off for the tenant, the place (and the button) is gone.</li>
          <li><b>Security</b>: the server checks the caller's ability on the request. That check, not the hidden button, is the enforcement.</li>
          <li><b>PubSub</b>: the action emits <code>crm:organization:enrich-requested</code>. Whatever subscribers exist for that topic (a CODE handler, a webhook) do the work and record a delivery.</li>
        </ol>
      </Section>

      <Section
        label="Design decisions"
        title="ChatGPT's three “decide early” points, checked"
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Recommendation</th><th>Stage</th><th></th></tr></thead>
            <tbody>
              <tr>
                <td>A typed expression language, never JavaScript callbacks or <code>eval</code> in JSON</td>
                <td><b>CREAM-PQL</b> (<code>{'{logic, rules}'}</code>, compiled to Prisma or a predicate) is the one condition dialect for recipes, boards, <code>availableWhen</code> and PubSub conditions. <b>MTEL</b> is the template / input dialect. Subscribers reference a named CODE handler, not code in the row.</td>
                <td><Pill color="var(--green)">done</Pill></td>
              </tr>
              <tr>
                <td>Transactional activation: compile and validate everything, then publish an immutable registry version</td>
                <td><code>build:modules</code> validates and <code>check:modules</code> blocks drift in CI. Activation is a deploy + seed, then a per-org switch. There is no versioned registry snapshot that services acknowledge.</td>
                <td><Pill color="var(--yellow)">partial</Pill></td>
              </tr>
              <tr>
                <td>One capability resolver that every service asks</td>
                <td>Split across <code>resolveModulesForOrg</code> (modules), CASL (abilities), <code>availableWhen</code> (recipes) and <code>staffOnly</code>. Each is sound alone, but no single call answers "can this person do X here, and if not, why".</td>
                <td><Pill color="var(--pink)">not yet</Pill></td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout kind="real" title="ChatGPT's open question, answered by the code">
          "Should the JSON define database persistence and migrations, or map onto an existing generic data layer?" Stage
          chose a middle path: real Prisma tables (one <code>.prisma</code> file and a migration per entity, adopted by{' '}
          <code>models[]</code>), with everything that varies (vocabularies, queries, menus, topics, even recipes and
          subscribers) folded into the generic List layer (Schema B).
        </Callout>
      </Section>

      <Section label="In practice" title="What “building right” means on your next PR">
        <ul className="kit-prose">
          <li>A new status, stage, type or tag is a <b>List</b> in the manifest, never an enum, constant array or inline options.</li>
          <li>A new "view of" something is a <b>recipe</b>, not a menu node and not filter code. Personal ones are saved views.</li>
          <li>A new screen over a model is <b>EntityList + a resourceView</b>, not a bespoke table with its own fetch.</li>
          <li>Server state goes through <b>TanStack Query</b>, keyed by the tenant: no <code>useEffect</code> + <code>fetch</code>, no module-level caches.</li>
          <li>Side effects are <b>domain events</b> through PubSub, never direct provider calls.</li>
          <li>Keys, slugs, <code>subjectId</code>s and topic names are <b>permanent</b>. A rename is a data migration.</li>
          <li>The menu is a <b>projection</b> of manifests + module availability + abilities. Change the manifest, then run <code>pnpm build:modules</code>. Do not hand-edit the sidebar.</li>
        </ul>
        <div className="erp-next">
          <button className="kit-link-btn" onClick={() => go('tutorials', 'my-first-recipe')}>1. Make your own recipe →</button>
          <button className="kit-link-btn" onClick={() => go('howitfits', 'operations')}>2. How a manifest becomes a workspace →</button>
          <button className="kit-link-btn" onClick={() => go('deepdives', 'pubsub')}>3. PubSub end to end →</button>
          <button className="kit-link-btn" onClick={() => go('docs', 'doctrine')}>4. Doctrine §1–§10 →</button>
        </div>
      </Section>
    </div>
  );
}
