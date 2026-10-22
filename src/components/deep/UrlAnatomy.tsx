import { useMemo, useState } from 'react';
import { Callout, Files, Section } from '../kit/Kit';

// Decode the real Leads API URLs: every parameter, which layer of the system
// wrote it, and what the server turns it into.

type Source = 'recipe' | 'hideClosed' | 'fixed' | 'user' | 'view' | 'paging' | 'count' | 'unknown';

const SOURCES: Record<Source, { label: string; color: string; who: string }> = {
  recipe:     { label: 'Recipe (perspective)', color: 'var(--orange-l)', who: 'You clicked a perspective — the sidebar accordion entry or the CreamPie menu item. Both link to ?recipe=<slug>.' },
  hideClosed: { label: 'View: hide closed stages', color: 'var(--teal)', who: 'LEADS_VIEW.hideClosedStages + openHidesStages. EntityList collects the leadStatus items flagged isTerminal (converted, not_interested) plus "unresponsive" and sends notIn while no stage tab is chosen.' },
  fixed:      { label: 'View: fixedWhen (pinned)', color: 'var(--pink)', who: 'LEADS_VIEW.fixedWhen pins the list to CI Web Group (organization 496). Merged LAST so no URL refinement can widen it — the leads table also holds ~10,000 leads from client websites.' },
  user:       { label: 'Your click (refinement)', color: 'var(--blue)', who: 'A filter you chose: a stage tab, the Lead-type dropdown, a chip, a column filter.' },
  view:       { label: 'View template / grid', color: 'var(--purple-l)', who: 'Decided by the view template and the grid: which vocabularies to hydrate (lists=), which relations to load (populate=), default sort.' },
  paging:     { label: 'Pagination', color: 'var(--text-dim)', who: 'The grid page you are on and the page size.' },
  count:      { label: 'Tab-count probe', color: 'var(--yellow)', who: 'useStageCounts: one request PER STAGE TAB asking for a single row, only to read meta.pagination.total for the badge number.' },
  unknown:    { label: 'Other', color: 'var(--text-faint)', who: 'Not one of the parameters the Leads screen sends.' },
};

interface Preset {
  id: string;
  title: string;
  story: string;
  url: string;
  recipe?: { slug: string; rules: string[] };
}

const BASE = 'https://api.ciwebgroup.com/api/v1/leads?';

const PRESETS: Preset[] = [
  {
    id: 'vp',
    title: '① ② Vendors & Partners',
    story: 'Your first two URLs are byte-identical: once from the "Vendors & Partners" entry inside the Leads accordion, once from the sibling "Vendors & Partners" menu item. Both link to the same recipe — that is the menu duplicate explained on the Modules page.',
    url: BASE + 'recipe=sales.vendors-partners&when%5Bstatus%5D%5BnotIn%5D=unresponsive%2Cconverted%2Cnot_interested&when%5BorganizationId%5D%5Beq%5D=496&lists=leadStatus%2CleadCustomerType%2CleadType%2CleadOrigin%2Ctrade%2Cindustry&sort=createdAt%3Adesc&populate=salesRepUser%2CsalesSupportUser&page=1&pageSize=100',
    recipe: { slug: 'sales.vendors-partners', rules: ['leadType in [vendor, partner]', 'organizationId eq 496'] },
  },
  {
    id: 'all',
    title: '③ ⑥ Leads — Lead type: All',
    story: 'Plain Leads, no perspective. No leadType rule is sent, so the Lead-type dropdown is on "All" (the view would otherwise seed leadType = prospect into the URL on a fresh visit). Closed stages are still hidden and the org pin is still there.',
    url: BASE + 'when%5Bstatus%5D%5BnotIn%5D=unresponsive%2Cconverted%2Cnot_interested&when%5BorganizationId%5D%5Beq%5D=496&lists=leadStatus%2CleadCustomerType%2CleadType%2CleadOrigin%2Ctrade%2Cindustry&sort=createdAt%3Adesc&populate=salesRepUser%2CsalesSupportUser&page=1&pageSize=100',
  },
  {
    id: 'vendor',
    title: '④ Leads — Lead type: Vendor',
    story: 'Same list, but you picked "Vendor" in the Lead-type dropdown. It writes the leadType slot of the URL — a plain refinement, not a recipe. Compare with ①: similar rows, different mechanism.',
    url: BASE + 'when%5Bstatus%5D%5BnotIn%5D=unresponsive%2Cconverted%2Cnot_interested&when%5BleadType%5D%5Beq%5D=vendor&when%5BorganizationId%5D%5Beq%5D=496&lists=leadStatus%2CleadCustomerType%2CleadType%2CleadOrigin%2Ctrade%2Cindustry&sort=createdAt%3Adesc&populate=salesRepUser%2CsalesSupportUser&page=1&pageSize=100',
  },
  {
    id: 'count',
    title: '⑤ The pageSize=1 request',
    story: 'Not a list at all — a COUNT. While Lead type = Partner, the stage-tab strip fires one request per tab with that tab\'s stage rule and pageSize=1, and reads only the total for the badge. This one is the badge on the "Not Interested" tab. Notice: no lists=, no populate, no sort — nobody reads the row.',
    url: BASE + 'when%5BleadType%5D%5Beq%5D=partner&when%5BorganizationId%5D%5Beq%5D=496&when%5Bstatus%5D%5Beq%5D=not_interested&page=1&pageSize=1',
  },
];

interface Decoded {
  raw: string;
  key: string;
  field?: string;
  op?: string;
  value: string;
  source: Source;
  meaning: string;
}

function attribute(field: string, op: string, value: string, isCount: boolean, hasRecipe: boolean): { source: Source; meaning: string } {
  if (field === 'organizationId') return { source: 'fixed', meaning: `Only rows whose organizationId = ${value} (CI Web Group).` };
  if (field === 'status' && op === 'notIn') return { source: 'hideClosed', meaning: `Hide leads whose stage is one of: ${value.split(',').join(', ')}.` };
  if (field === 'status' && op === 'eq') return isCount
    ? { source: 'count', meaning: `Count only the "${value}" stage — the badge on that tab.` }
    : { source: 'user', meaning: `You clicked the "${value}" stage tab.` };
  if (field === 'leadType') return { source: 'user', meaning: hasRecipe ? `Lead type = ${value}.` : `Lead-type dropdown = ${value} (or the view's default "prospect").` };
  return { source: 'user', meaning: `Refinement: ${field} ${op} ${value}.` };
}

function decode(url: string): { rows: Decoded[]; error?: string; isCount: boolean; when: { field: string; op: string; value: string }[]; recipe: string | null; resource: string } {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return { rows: [], error: 'That is not a full URL (it must start with https://).', isCount: false, when: [], recipe: null, resource: '' };
  }
  const resource = u.pathname.split('/').filter(Boolean).pop() ?? '';
  const params = [...u.searchParams.entries()];
  const isCount = u.searchParams.get('pageSize') === '1';
  const recipe = u.searchParams.get('recipe');
  const rows: Decoded[] = [];
  const when: { field: string; op: string; value: string }[] = [];
  for (const [key, value] of params) {
    const m = /^when\[([^\]]+)\](?:\[([^\]]+)\])?$/.exec(key);
    if (m) {
      const field = m[1]!;
      const op = m[2] ?? 'eq';
      when.push({ field, op, value });
      const { source, meaning } = attribute(field, op, value, isCount, Boolean(recipe));
      rows.push({ raw: `${key}=${value}`, key: 'when', field, op, value, source, meaning });
      continue;
    }
    let source: Source = 'unknown';
    let meaning = 'Not a parameter the Leads screen uses.';
    switch (key) {
      case 'recipe':
        source = 'recipe';
        meaning = `Apply the stored recipe "${value}". The server resolves it (platform → org → user tier), checks availableWhen, and ANDs its conditions with every when[] rule.`;
        break;
      case 'lists':
        source = 'view';
        meaning = `Hydrate each row with these vocabularies so the grid can show labels/colours: ${value.split(',').join(', ')}. Enrichment only — not a filter.`;
        break;
      case 'sort':
        source = 'view';
        meaning = `ORDER BY ${value.replace(':', ' ')} (view default: newest first).`;
        break;
      case 'populate':
        source = 'view';
        meaning = `Load these relations with each row (Prisma include, pruned to what you may read): ${value.split(',').join(', ')}.`;
        break;
      case 'page':
        source = isCount ? 'count' : 'paging';
        meaning = `Page ${value}.`;
        break;
      case 'pageSize':
        source = isCount ? 'count' : 'paging';
        meaning = isCount ? 'One row — the rows are not wanted, only meta.pagination.total.' : `${value} rows per page.`;
        break;
      case 'transform':
        source = 'view';
        meaning = `Reshape the response with the TRANSFORM list "${value}".`;
        break;
      case 'filters':
        source = 'user';
        meaning = 'Legacy Strapi-style filter / the search box ($containsi).';
        break;
    }
    rows.push({ raw: `${key}=${value}`, key, value, source, meaning });
  }
  return { rows, isCount, when, recipe, resource };
}

function fmtVal(op: string, v: string): string {
  if (op === 'in' || op === 'notIn') return '[' + v.split(',').map(s => (/^\d+$/.test(s) ? s : `"${s}"`)).join(', ') + ']';
  return /^\d+$/.test(v) ? v : `"${v}"`;
}

const PRISMA_OP: Record<string, string> = { eq: 'equals', ne: 'not', in: 'in', notIn: 'notIn', gt: 'gt', gte: 'gte', lt: 'lt', lte: 'lte', contains: 'contains', startsWith: 'startsWith', endsWith: 'endsWith' };

export default function UrlAnatomy() {
  const [presetId, setPresetId] = useState('vp');
  const [custom, setCustom] = useState('');
  const preset = PRESETS.find(p => p.id === presetId)!;
  const url = custom || preset.url;
  const d = useMemo(() => decode(url), [url]);
  const recipeRules = !custom && preset.recipe ? preset.recipe.rules : d.recipe ? ['(recipe conditions, resolved server-side)'] : [];

  const pql = [
    ...recipeRules.map(r => `  ${r.padEnd(46)} // from ?recipe=`),
    ...d.when.map(w => `  ${`${w.field} ${w.op} ${fmtVal(w.op, w.value)}`.padEnd(46)} // when[${w.field}][${w.op}]`),
  ];

  const prisma = d.when.map(w => `    { ${w.field}: { ${PRISMA_OP[w.op] ?? w.op}: ${fmtVal(w.op, w.value)} } }`);
  if (!custom && preset.recipe) {
    prisma.unshift('    { leadType: { in: ["vendor", "partner"] } },      // recipe', '    { organizationId: { equals: 496 } },             // recipe');
  }

  return (
    <Section
      label="Queries"
      title="URL anatomy — who wrote each parameter?"
      intro={
        <>
          <p>
            The URLs in your network tab look noisy because several layers each contribute a piece.
            Pick one of the URLs you captured (or paste your own), and every parameter is
            colour-coded by the layer that put it there.
          </p>
        </>
      }
    >
      <div className="ua-presets">
        {PRESETS.map(p => (
          <button key={p.id} className={`ua-preset ${presetId === p.id && !custom ? 'ua-preset--on' : ''}`} onClick={() => { setPresetId(p.id); setCustom(''); }}>
            {p.title}
          </button>
        ))}
      </div>

      <textarea
        className="ua-input"
        placeholder="…or paste any https://api.ciwebgroup.com/api/v1/<resource>?… URL from your network tab"
        value={custom}
        onChange={e => setCustom(e.target.value)}
        rows={2}
      />

      {!custom && <Callout kind="real" title="What happened in the browser">{preset.story}</Callout>}

      {d.error ? (
        <Callout kind="warn">{d.error}</Callout>
      ) : (
        <>
          <div className="ua-legend">
            {(Object.keys(SOURCES) as Source[]).filter(s => d.rows.some(r => r.source === s)).map(s => (
              <span key={s} className="ua-legend__item" style={{ '--src': SOURCES[s].color } as React.CSSProperties}>
                <i /> {SOURCES[s].label}
              </span>
            ))}
          </div>

          <div className="ua-url">
            <span className="ua-url__base">/api/v1/{d.resource}?</span>
            {d.rows.map((r, i) => (
              <span key={i} className="ua-url__part" style={{ '--src': SOURCES[r.source].color } as React.CSSProperties}>
                {i > 0 && <span className="ua-url__amp">&amp;</span>}
                {r.raw}
              </span>
            ))}
          </div>

          <div className="ua-rows">
            {d.rows.map((r, i) => (
              <div key={i} className="ua-row" style={{ '--src': SOURCES[r.source].color } as React.CSSProperties}>
                <div className="ua-row__param">
                  {r.key === 'when' ? (
                    <code>when[<b>{r.field}</b>][<b>{r.op}</b>]=<b>{r.value}</b></code>
                  ) : (
                    <code>{r.key}=<b>{r.value}</b></code>
                  )}
                  <span className="ua-row__src">{SOURCES[r.source].label}</span>
                </div>
                <div className="ua-row__meaning">{r.meaning}</div>
                <div className="ua-row__who">{SOURCES[r.source].who}</div>
              </div>
            ))}
          </div>

          <div className="kit-grid-2">
            <div>
              <div className="ua-out-label">Server combines it into ONE CREAM-PQL group</div>
              <pre className="ua-out">{`{ logic: "AND", rules: [\n${pql.join(',\n')}\n] }`}</pre>
            </div>
            <div>
              <div className="ua-out-label">…and compiles it to a Prisma where (ANDed under your scope)</div>
              <pre className="ua-out">{`prisma.lead.findMany({\n  where: { AND: [\n    <tenant scope — none for staff>,\n${prisma.join(',\n')}\n  ] },${d.isCount ? '\n  take: 1               // only the count matters' : '\n  include: { salesRepUser, salesSupportUser },\n  orderBy: { createdAt: "desc" }, take: 100'}\n})`}</pre>
            </div>
          </div>
        </>
      )}

      <h3>Why does the URL repeat <code>organizationId=496</code> when the recipe already says it?</h3>
      <p className="kit-prose">
        Because two independent layers each ask for it. The recipe <code>sales.vendors-partners</code>{' '}
        stores <code>organizationId eq 496</code> in the database; the Leads view template pins{' '}
        <code>fixedWhen: organizationId = 496</code> in the browser. The server ANDs them, and{' '}
        <code>x AND x = x</code>, so it is harmless — but it is a smell: the number 496 lives in three
        recipes and a frontend constant (<code>apps/synapse-v3/src/config/ciWebGroup.ts</code>) instead of
        coming from context. See Questions.
      </p>

      <h3>The <code>when</code> grammar in one table</h3>
      <div className="kit-table-wrap">
        <table className="kit-table">
          <thead><tr><th>URL</th><th>Meaning</th><th>Prisma</th></tr></thead>
          <tbody>
            <tr><td><code>when[status]=new</code></td><td>no operator ⇒ <code>eq</code></td><td><code>{'{ status: { equals: "new" } }'}</code></td></tr>
            <tr><td><code>when[status][in]=new,contacted</code></td><td>arrays travel comma-joined</td><td><code>{'{ status: { in: ["new","contacted"] } }'}</code></td></tr>
            <tr><td><code>when[nextFollowUpDate][isNotNull]</code></td><td>valueless ops: isNull, isNotNull, exists, notExists</td><td><code>{'{ nextFollowUpDate: { not: null } }'}</code></td></tr>
            <tr><td><code>when[lists.leadTag][in]=warm,big_fish</code></td><td><code>lists.&lt;key&gt;</code> — a TAXONOMY applied via ListResource rows</td><td>pre-resolved to <code>{'{ id: { in: [...] } }'}</code></td></tr>
            <tr><td><code>when[salesRepUser.username][contains]=amy</code></td><td>dotted path follows a declared Prisma relation</td><td><code>{'{ salesRepUser: { username: { contains: "amy", mode: "insensitive" } } }'}</code></td></tr>
            <tr><td><code>when[edges.organizationRole:owner.Organization.name][contains]=acme</code></td><td>follows a RELATIONSHIP list edge (see Relationships tab)</td><td>pre-resolved to <code>{'{ id: { in: [...] } }'}</code></td></tr>
          </tbody>
        </table>
      </div>
      <p className="kit-prose">
        The 20 canonical operators (<code>libs/cream-pie/src/lib/types.ts:29-69</code>): <code>eq ne gt gte lt lte in notIn contains notContains startsWith endsWith isNull isNotNull within olderThan newerThan exists notExists matches</code>.
        Legacy aliases (<code>notEquals</code>, <code>$ne</code>…) are normalised in <code>normalize.ts</code>. <code>when[…]</code> can only carry a{' '}
        <em>flat AND</em>; anything with OR or nesting must be a stored recipe and travel as <code>?recipe=</code> (decision D20).
      </p>

      <Files
        items={[
          { path: 'apps/synapse-v3/src/components/entity-list/resourceViews/leads.ts', note: 'LEADS_VIEW: hideClosedStages, openHidesStages, defaultWhen, fixedWhen, columns, sort' },
          { path: 'apps/synapse-v3/src/components/entity-list/EntityList.tsx:503-533', note: 'builds the notIn and merges the when layers' },
          { path: 'apps/synapse-v3/src/components/entity-list/useEntityQuery.ts:98-118', note: 'buildEntityQuery — serialises every parameter' },
          { path: 'apps/synapse-v3/src/components/entity-list/useStageCounts.ts', note: 'the pageSize=1 count probes' },
          { path: 'libs/cream-pie/src/lib/when-query.ts', note: 'parse / serialise when[field][op]' },
        ]}
      />
    </Section>
  );
}
