import { useState } from 'react';
import { Callout, Files, Section } from '../kit/Kit';

// Step through the real middleware chain of the generic route
// (apps/web-services/src/routes/genericCrudChain.ts) with the Vendors & Partners
// request, watching req.prismaQuery take shape.

interface Mw {
  name: string;
  file: string;
  kind: 'route' | 'guard' | 'auth' | 'scope' | 'query' | 'shape' | 'handler';
  does: string;
  forThisRequest: string;
  state: string;
}

const KIND_COLOR: Record<Mw['kind'], string> = {
  route: 'var(--blue)',
  guard: 'var(--text-dim)',
  auth: 'var(--pink)',
  scope: 'var(--orange-l)',
  query: 'var(--purple-l)',
  shape: 'var(--yellow)',
  handler: 'var(--green)',
};

const REQ =
  'GET /api/v1/leads?recipe=sales.vendors-partners\n' +
  '  &when[status][notIn]=unresponsive,converted,not_interested\n' +
  '  &when[organizationId][eq]=496\n' +
  '  &lists=leadStatus,leadCustomerType,leadType,leadOrigin,trade,industry\n' +
  '  &sort=createdAt:desc&populate=salesRepUser,salesSupportUser\n' +
  '  &page=1&pageSize=100';

const CHAIN: Mw[] = [
  {
    name: 'smartRoute',
    file: 'middleware/smartRoutes.ts',
    kind: 'route',
    does: 'Turns the path into model names. /leads → Lead; /parents/5/children → [Parent, Child]. Every model in Prisma is reachable this way — that is why there is no bespoke leads controller.',
    forThisRequest: '/leads resolves to the Lead model.',
    state: 'req.smartRoute = { models: ["Lead"] }',
  },
  {
    name: 'smartRouteModelBlocklist · staffOnlyGenericWrites · managedListGenericWrites · edgeGenericWrites',
    file: 'middleware/managedListWrites.ts, edgeWriteGuard.ts …',
    kind: 'guard',
    does: 'Write guards. Blocked models are refused; writes to machinery lists (recipes, navigation, PubSub, role grants) need a super admin; edge writes need the predicate\'s writeSubject ability.',
    forThisRequest: 'A GET — every write guard passes straight through.',
    state: '(unchanged)',
  },
  {
    name: 'rejectBackupTrackingGenericApi',
    file: 'middleware/backupTrackingGenericApiGuard.ts',
    kind: 'guard',
    does: 'Keeps the backup-tracking models OFF the generic API entirely (they have bespoke routes). This is one reason the Infrastructure tab cannot use <EntityList> today.',
    forThisRequest: 'Lead is not a backup model — passes.',
    state: '(unchanged)',
  },
  {
    name: 'caslGenericAuthorization',
    file: 'middleware/caslGenericAuth.ts',
    kind: 'auth',
    does: 'Deny-first: does the caller\'s CASL ability allow READ on this subject? No explicit allow → 403. Abilities themselves carry no organization conditions (that is the next step\'s job).',
    forThisRequest: 'A staff user with read on leads → allowed.',
    state: '(unchanged) — or 403 here',
  },
  {
    name: 'siteScopedOrgFilter',
    file: 'middleware/siteScopedOrgFilter.ts → utils/tenantScope.ts',
    kind: 'scope',
    does: 'Tenant scope for constrained (non-staff) callers, in TWO layers. (1) Application: a where on organizationId (or a derived parent) is put on the query BEFORE any user filter, so later filters can only narrow it. (2) Database (new on stage, migration 20261231900000_tenant_row_level_security): the same scope is recorded on the request (req.tenantRls) so the query later runs as the PostgreSQL role ci_tenant, where row-level-security policies hide every other tenant\'s rows even if the application filter were wrong. Staff are not constrained by either.',
    forThisRequest: 'Staff caller → no tenant where, no RLS scope. (A client user would get organizationId = their org here, and their org ids in req.tenantRls.)',
    state: 'req.prismaQuery.where = { }          // staff\n// client: { organizationId: <their org> }\n// client: req.tenantRls = { organizationIds: {<their org>}, siteKeys, emails }',
  },
  {
    name: 'nestedRouteParentScope · subjectPathFilterMiddleware',
    file: 'middleware/…, modules/cream-pie/subjectPath*.ts',
    kind: 'scope',
    does: 'For /parents/5/children the parent becomes a where on the child. subject.* paths (polymorphic subjects) are pre-resolved.',
    forThisRequest: 'Not nested, no subject.* rule — pass.',
    state: '(unchanged)',
  },
  {
    name: 'ormConfigurator',
    file: 'middleware/orm.ts:715-1125',
    kind: 'query',
    does: 'Parses populate (→ include, pruned to what the caller may read), sort (→ orderBy, dotted paths allowed), page/pageSize (→ skip/take) and the legacy Strapi-style ?filters=.',
    forThisRequest: 'populate → include both rep relations; sort → createdAt desc; page 1 × 100.',
    state:
      'req.prismaQuery = {\n  where: {},\n  include: { salesRepUser: true, salesSupportUser: true },\n  orderBy: { createdAt: "desc" },\n  skip: 0, take: 100\n}',
  },
  {
    name: 'listFilterMiddleware',
    file: 'utils/listsQuery.ts:26 (parseListsQuery)',
    kind: 'query',
    does: '?lists=a,b means "hydrate these vocabularies onto each row" (so the grid can show labels/colours). The object form lists[key][$op]=v also filters by them.',
    forThisRequest: 'Six vocabularies to enrich with — no filter.',
    state: '_metadata.lists = [leadStatus, leadCustomerType, leadType,\n                   leadOrigin, trade, industry]',
  },
  {
    name: 'viewFilterMiddleware',
    file: 'modules/cream-pie/viewFilter.ts:89-190',
    kind: 'query',
    does: 'The CREAM-PIE step. Resolves ?recipe= across tiers (platform → org → user; unknown → 404), enforces availableWhen server-side (→ 403), binds {{params}}, parses when[…], drops unknown fields, ANDs recipe + when, pre-resolves lists.* / edges.* / subject.* rules, compiles with cream-pie, then narrowWhere() ANDs it UNDER the existing scope.',
    forThisRequest: 'Recipe sales.vendors-partners (leadType in vendor,partner AND org 496) AND when (status notIn …, org 496).',
    state:
      'where = AND(\n  {},                                   // scope from step 5\n  { leadType: { in: ["vendor","partner"] } },   // recipe\n  { organizationId: { equals: 496 } },          // recipe\n  { status: { notIn: ["unresponsive","converted","not_interested"] } }, // when\n  { organizationId: { equals: 496 } }           // when (idempotent)\n)',
  },
  {
    name: 'schemaValidatorMiddleware',
    file: 'middleware/schemaValidator*.ts',
    kind: 'shape',
    does: 'Validates write payloads against the JSON schemas declared for the model.',
    forThisRequest: 'GET — nothing to validate.',
    state: '(unchanged)',
  },
  {
    name: 'responseTransformMiddleware',
    file: 'middleware/responseTransform.ts',
    kind: 'shape',
    does: 'Only when ?transform=<key> is present: wraps res.json so the rules of that TRANSFORM List reshape the payload. See the TRANSFORM tab.',
    forThisRequest: 'No ?transform= → untouched.',
    state: '(unchanged)',
  },
  {
    name: 'controller (controllerFactory → findMany + count)',
    file: 'routes/genericCrudChain.ts (last handler) → controllerFactory',
    kind: 'handler',
    does: 'Runs prisma.lead.findMany(req.prismaQuery) and a count with the same where, enriches rows with the requested lists, redacts sensitive fields, and answers with the envelope. For a tenant-constrained request, getPrismaClient(req) wraps every operation in a transaction that first runs set_config(\'role\', \'ci_tenant\', true) and sets app.tenant_org_ids / app.tenant_site_keys / app.tenant_emails, so PostgreSQL row-level security enforces the scope a second time.',
    forThisRequest: '19 rows today (18 vendor + 1 partner leads in production, minus any in hidden stages).',
    state: '{ data: [ …rows ], meta: { pagination: { page: 1, pageSize: 100, total: … } } }',
  },
];

export default function RequestLifecycle() {
  const [i, setI] = useState(0);
  const mw = CHAIN[i]!;

  return (
    <Section
      label="Run time"
      title="Request lifecycle — one URL, one middleware chain, one Prisma query"
      intro={
        <p>
          Every list screen in synapse-v3 calls the same generic route. Step through the real chain
          (in the order it is declared in <code>routes/genericCrudChain.ts</code>) with the request your browser sent
          for <em>Vendors &amp; Partners</em>, and watch the Prisma query take shape. The order
          matters: scope is applied <em>before</em> any user filter, so a filter can only narrow.
        </p>
      }
    >
      <pre className="lc-req">{REQ}</pre>

      <div className="lc">
        <ol className="lc__chain">
          {CHAIN.map((m, idx) => (
            <li key={m.name}>
              <button
                className={`lc__mw ${idx === i ? 'lc__mw--on' : ''} ${idx < i ? 'lc__mw--past' : ''}`}
                style={{ '--mw-color': KIND_COLOR[m.kind] } as React.CSSProperties}
                onClick={() => setI(idx)}
              >
                <span className="lc__dot">{idx + 1}</span>
                <span className="lc__name">{m.name}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="lc__panel" style={{ '--mw-color': KIND_COLOR[mw.kind] } as React.CSSProperties}>
          <div className="lc__kind">{mw.kind}</div>
          <h3 className="lc__title">{mw.name}</h3>
          <code className="lc__file">apps/web-services/src/{mw.file}</code>
          <p className="lc__does">{mw.does}</p>
          <div className="lc__this"><strong>For this request:</strong> {mw.forThisRequest}</div>
          <div className="lc__state-label">State after this step</div>
          <pre className="lc__state">{mw.state}</pre>
          <div className="lc__nav">
            <button disabled={i === 0} onClick={() => setI(x => x - 1)}>← Previous</button>
            <span>{i + 1} / {CHAIN.length}</span>
            <button disabled={i === CHAIN.length - 1} onClick={() => setI(x => x + 1)}>Next →</button>
          </div>
        </div>
      </div>

      <Callout kind="tip" title="Why the order is the security model">
        Tenant scope (step 5) writes the <code>where</code> first. The recipe and <code>when[…]</code>{' '}
        (step 9) are combined with <code>narrowWhere(existing, new)</code> — an AND. So a client who
        types <code>when[organizationId][eq]=&lt;someone else&gt;</code> just gets an empty list:{' '}
        <code>org = mine AND org = theirs</code> matches nothing. "Recipes narrow, never widen"
        (doctrine §4) is literally this AND.
      </Callout>

      <Callout kind="real" title="New this week: a second, database-level tenant wall">
        <p>
          Until Oct 2026 tenant isolation lived only in application code. Stage now adds PostgreSQL{' '}
          <strong>row-level security</strong>: a NOLOGIN role <code>ci_tenant</code>, policies on every tenant-owned
          table keyed on <code>app.tenant_org_ids</code> / <code>app.tenant_site_keys</code> / <code>app.tenant_emails</code>,
          and a role switch local to each transaction of a constrained request (<code>withTenantRls</code>). "The
          application decides WHEN a request is scoped; the database decides WHAT that scope can see." A missing
          application filter now returns no foreign rows instead of another tenant's data.
        </p>
        <p>
          Not covered, by design: staff and system requests (every role except <code>ci_tenant</code> matches a bypass
          policy), raw SQL on the scoped client, and a database restored into a cluster without the{' '}
          <code>ci_tenant</code> role (the service then logs an error and enforces the application scope only).
        </p>
      </Callout>

      <Callout kind="info" title="The same chain now also serves anonymous reads">
        <code>modules/onboarding/publicReferenceReads.ts</code> mounts this exact chain for unauthenticated GETs of
        platform reference data (decks, catalog products, platforms, industries, lists) used by the onboard wizard,
        with a fixed read-only ability, a smaller page cap and per-IP rate limits. One chain means a guard added here
        covers both — and a regression here affects both.
      </Callout>

      <Files
        items={[
          { path: 'apps/web-services/src/routes/genericCrudChain.ts', note: 'the chain, in order (apiRoutes.ts mounts it)' },
          { path: 'libs/prisma/src/utils/tenantRls.ts', note: 'withTenantRls — the database half of tenant isolation' },
          { path: 'libs/prisma/src/schema/migrations/20261231900000_tenant_row_level_security', note: 'ci_tenant role + policies' },
          { path: 'apps/web-services/src/modules/cream-pie/viewFilter.ts', note: 'recipe + when → where; narrowWhere' },
          { path: 'libs/cream-pie/src/lib/prisma-where.ts:494-504', note: 'narrowWhere — the AND' },
          { path: 'apps/web-services/src/utils/tenantScope.ts', note: 'tenant scope for constrained callers (moved from middleware/)' },
        ]}
      />
    </Section>
  );
}
