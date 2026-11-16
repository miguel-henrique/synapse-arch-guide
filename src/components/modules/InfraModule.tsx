import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Files, Pill, Section } from '../kit/Kit';

// Infrastructure: the one workspace still outside the manifest-driven tree.
// As-is vs to-be, and a doctrine scorecard.

const asIsGroups: DiagramGroup[] = [
  { id: 'nav', x: 16, y: 16, w: 300, h: 418, label: 'Menu (hand-written)', color: 'var(--pink)' },
  { id: 'page', x: 332, y: 16, w: 380, h: 418, label: 'Page (if-chain)', color: 'var(--pink)' },
  { id: 'data', x: 728, y: 16, w: 356, h: 418, label: 'Data (bespoke)', color: 'var(--pink)' },
];
const asIsNodes: DiagramNode[] = [
  { id: 'reg', x: 32, y: 56, w: 268, h: 84, label: 'navRegistry.ts', sub: 'const infrastructureTree: NavNode\ndns · sites · backups leaves', color: 'var(--pink)', variant: 'danger',
    detail: <p>A hand-written TypeScript nav tree (<code>navRegistry.ts:1115-1166</code>), registered at <code>:1488</code>. Not a manifest, not ListItems — adding a tab means editing code.</p>, files: ['apps/synapse-v3/src/config/navRegistry.ts:1115-1166'] },
  { id: 'side', x: 32, y: 160, w: 268, h: 84, label: 'UnifiedSidebar special case', sub: "registryToGroups('infrastructure')\nskips the canRead ability gate", color: 'var(--pink)', variant: 'danger',
    detail: <p>The sidebar has a dedicated branch for Infrastructure (<code>UnifiedSidebar.tsx:147-171</code>). Its own comment says it "predates the ability-based canRead gate and was never wired into it" (<code>:288-297</code>) — an RBAC gap.</p>, files: ['apps/synapse-v3/src/components/dashboard/UnifiedSidebar.tsx:147-171, 288-297'] },
  { id: 'switch', x: 32, y: 264, w: 268, h: 70, label: 'DashboardSwitcher', sub: 'DASHBOARDS = [{ id: "infrastructure" }]', color: 'var(--pink)', variant: 'danger',
    detail: <p>"The one legacy, non-database entry" in the workspace switcher (<code>DashboardSwitcher.tsx:89-106</code>).</p> },
  { id: 'router', x: 32, y: 354, w: 268, h: 64, label: 'router.tsx ×4 routes', sub: '/infrastructure[/:tab|/backups/:section]', color: 'var(--pink)', variant: 'danger',
    detail: <p>Mounted four times with its own legacy <code>BackofficeLayout</code> instead of the StaffShell workspace tree (<code>router.tsx:573-610</code>).</p> },
  { id: 'infra', x: 348, y: 56, w: 348, h: 84, label: 'pages/Infrastructure.tsx', sub: "INFRASTRUCTURE_TABS = new Set(['backups','dns','sites'])\nmanual staff gate · if (activeTab === …)", color: 'var(--pink)', variant: 'danger',
    detail: <p>A tab whitelist in a <code>Set</code> (<code>:20-21</code>), a hand-rolled auth redirect (<code>:30-42</code>) and an if-chain choosing the component (<code>:65-72</code>).</p>, files: ['apps/synapse-v3/src/pages/Infrastructure.tsx'] },
  { id: 'dns', x: 348, y: 166, w: 106, h: 66, label: 'DNS', sub: 'Cloudflare\nzones', color: 'var(--pink)' },
  { id: 'backups', x: 468, y: 166, w: 106, h: 66, label: 'Backups', sub: 'BACKUP_SECTIONS\n4 sub-tabs', color: 'var(--pink)', variant: 'danger',
    detail: <p><code>BackupsPage.tsx:18-23</code> hardcodes a second nav array (wordpress / infrastructure / findings / search) with its own button bar and if-chain.</p> },
  { id: 'sites', x: 588, y: 166, w: 108, h: 66, label: 'Sites', sub: 'SitesPage', color: 'var(--pink)' },
  { id: 'tables', x: 348, y: 260, w: 348, h: 72, label: 'Bespoke <Table>s', sub: 'WordPressBackupsView · InventoryPrefixTable (454 l.)\nInfrastructureBackupsView · SitesPage', color: 'var(--pink)', variant: 'danger',
    detail: <p>Hand-built shadcn tables. No <code>&lt;EntityList&gt;</code>, no <code>?when</code>/<code>?lists</code> URL state, no chips, no saved views, no kanban.</p> },
  { id: 'badges', x: 348, y: 352, w: 348, h: 66, label: 'backupPresentation.ts · BackupBadges', sub: 'colour maps per enum · raw enum text as label', color: 'var(--pink)', variant: 'danger',
    detail: <p><code>RUN_STATUS_CLASSES</code>, <code>FINDING_STATE_CLASSES</code>, <code>CRITICAL_FINDING_TYPES</code>… — vocabulary and its presentation hardcoded in the frontend (doctrine §1).</p> },
  { id: 'hooks', x: 744, y: 56, w: 324, h: 72, label: 'useBackupResource ≡ useSiteInventoryResource', sub: 'byte-for-byte duplicate fetch hooks', color: 'var(--pink)', variant: 'danger',
    detail: <p>Two copy-pasted useState/useEffect fetchers, deliberately "kept as a local copy". TanStack Query (§7) is not used.</p> },
  { id: 'rest', x: 744, y: 148, w: 324, h: 80, label: 'backupTrackingRoutes.ts', sub: 'GET /summary /readiness /policies /runs\n/targets /findings /search', color: 'var(--pink)',
    detail: <p>Bespoke REST endpoints. The generic route is explicitly blocked for these models (<code>rejectBackupTrackingGenericApi</code>), so CREAM-PQL, recipes and RBAC-by-subject do not apply.</p>, files: ['apps/web-services/src/modules/backup-tracking/backupTrackingRoutes.ts:181-201', 'apps/web-services/src/middleware/backupTrackingGenericApiGuard.ts'] },
  { id: 'enums', x: 744, y: 248, w: 324, h: 80, label: 'libs/types backup-tracking', sub: 'enum BackupRunStatus · BackupFindingState\nBackupTargetState · BackupFindingType (11)', color: 'var(--pink)', variant: 'danger',
    detail: <p>Eight TypeScript enums (<code>index.ts:28-88</code>) plus a hardcoded bucket constant <code>WORDPRESS_BACKUP_BUCKET</code>. Only two backup/DNS vocabularies (<code>dnsActorType</code>, <code>backupIngestEventType</code>) are already Lists in <code>web-presence</code>.</p> },
  { id: 'nomani', x: 744, y: 348, w: 324, h: 70, label: 'No module.json', sub: 'models not declared in any manifest', color: 'var(--pink)', variant: 'ghost',
    detail: <p>No manifest declares an infrastructure workspace, its models, lists or recipes. <code>web-presence</code> (Domain, Asset) is the nearest neighbour.</p> },
];
const asIsEdges: DiagramEdge[] = [
  { from: 'reg', to: 'side', color: 'var(--pink)' },
  { from: 'side', to: 'infra', color: 'var(--pink)', curve: -20 },
  { from: 'switch', to: 'infra', color: 'var(--pink)', dashed: true, curve: 30 },
  { from: 'router', to: 'infra', color: 'var(--pink)', curve: 40 },
  { from: 'infra', to: 'dns', color: 'var(--pink)' },
  { from: 'infra', to: 'backups', color: 'var(--pink)' },
  { from: 'infra', to: 'sites', color: 'var(--pink)' },
  { from: 'backups', to: 'tables', color: 'var(--pink)' },
  { from: 'sites', to: 'tables', color: 'var(--pink)' },
  { from: 'tables', to: 'badges', color: 'var(--pink)' },
  { from: 'tables', to: 'hooks', color: 'var(--pink)', curve: -20 },
  { from: 'hooks', to: 'rest', color: 'var(--pink)' },
  { from: 'rest', to: 'enums', color: 'var(--pink)' },
  { from: 'badges', to: 'enums', color: 'var(--pink)', dashed: true },
];

const toBeGroups: DiagramGroup[] = [
  { id: 'm', x: 16, y: 16, w: 330, h: 400, label: 'modules/infrastructure/module.json', color: 'var(--orange-l)' },
  { id: 'r', x: 362, y: 16, w: 330, h: 400, label: 'Rows + generic API', color: 'var(--green)' },
  { id: 'u', x: 708, y: 16, w: 376, h: 400, label: 'Screens (no per-tab code)', color: 'var(--blue)' },
];
const toBeNodes: DiagramNode[] = [
  { id: 'mnav', x: 32, y: 56, w: 298, h: 84, label: 'navigation[]', sub: 'infrastructure (Workspace)\n├ .dns · .sites · .backups (Item)\n└ .storage (Item)  ← new', color: 'var(--orange-l)', variant: 'ghost',
    detail: <p>One Workspace node and one Item per <em>place</em>. <code>formerIds</code> carries the old registry ids (<code>infrastructure.dns.cloudflare</code>, <code>infrastructure.sites.grid</code>, <code>infrastructure.backups.tracking</code>) so RBAC grants and redirects migrate.</p> },
  { id: 'mlists', x: 32, y: 160, w: 298, h: 90, label: 'lists[]', sub: 'backupRunStatus · backupFindingState (STAGE)\nbackupTargetState · backupFindingType\nstorageClass · storageVolumeState', color: 'var(--orange-l)', variant: 'ghost',
    detail: <p>Every TS enum becomes a List with <code>replaces: ["BackupRun.status", …]</code>. Colours, labels and severity move into ListItem <code>color</code> / <code>metadata</code>, replacing <code>backupPresentation.ts</code>.</p> },
  { id: 'mrec', x: 32, y: 270, w: 298, h: 64, label: 'recipes[]', sub: 'backups.wordpress · backups.infra-hosts\nstorage.near-capacity', color: 'var(--orange-l)', variant: 'ghost',
    detail: <p>The WordPress / infrastructure sub-tabs are perspectives over the same resource — recipes shown as chips, not a hardcoded <code>BACKUP_SECTIONS</code> array.</p> },
  { id: 'mmodels', x: 32, y: 354, w: 298, h: 48, label: 'models[]', sub: 'BackupTarget · BackupRun · StorageVolume', color: 'var(--orange-l)', variant: 'ghost',
    detail: <p>Models declared with list-bound fields (<code>{'{ "type": "list", "list": "backupRunStatus" }'}</code>) and relations (<code>{'{ "type": "relation", "relationTo": "Server" }'}</code>).</p> },
  { id: 'rows', x: 378, y: 56, w: 298, h: 84, label: 'List / ListItem / navigation / recipe rows', sub: 'seeded by seeds.system on deploy', color: 'var(--green)', variant: 'ghost' },
  { id: 'generic', x: 378, y: 160, w: 298, h: 84, label: 'GET /api/v1/backup-targets?…', sub: 'generic route + CREAM-PQL\nread-only guard instead of a block', color: 'var(--green)', variant: 'ghost',
    detail: <p>Replace the wholesale <code>rejectBackupTrackingGenericApi</code> block with a read-only rule (writes stay on the ingest pipeline), so lists get filters, recipes and CASL for free.</p> },
  { id: 'agg', x: 378, y: 264, w: 298, h: 70, label: '/summary · /readiness (kept)', sub: 'aggregates stay bespoke endpoints', color: 'var(--green)', variant: 'ghost',
    detail: <p>Aggregates and coverage strips genuinely aren't "resource + lists + recipe". They stay as CustomView widgets — counted in the WET quarantine with a reason.</p> },
  { id: 'side2', x: 724, y: 56, w: 344, h: 70, label: 'UnifiedSidebar (normal path)', sub: 'canRead gate · accordion · no special case', color: 'var(--blue)', variant: 'ghost' },
  { id: 'el', x: 724, y: 146, w: 344, h: 98, label: '<EntityList resource="…">', sub: 'one per Item node\nStageTabs from backupRunStatus\nTaxonomyFilterBar · chips · saved views', color: 'var(--blue)', variant: 'ghost' },
  { id: 'widgets', x: 724, y: 264, w: 344, h: 70, label: 'CustomView widgets', sub: 'CoverageStrip · readiness summary', color: 'var(--blue)', variant: 'ghost' },
  { id: 'deleted', x: 724, y: 354, w: 344, h: 48, label: '🗑 deleted', sub: 'navRegistry tree · INFRASTRUCTURE_TABS · dup hooks · enums', color: 'var(--text-dim)', variant: 'ghost' },
];
const toBeEdges: DiagramEdge[] = [
  { from: 'mnav', to: 'rows', color: 'var(--orange-l)' },
  { from: 'mlists', to: 'rows', color: 'var(--orange-l)' },
  { from: 'mrec', to: 'rows', color: 'var(--orange-l)' },
  { from: 'mmodels', to: 'generic', color: 'var(--orange-l)', dashed: true },
  { from: 'rows', to: 'side2', color: 'var(--green)' },
  { from: 'generic', to: 'el', color: 'var(--green)' },
  { from: 'agg', to: 'widgets', color: 'var(--green)' },
  { from: 'side2', to: 'el', color: 'var(--blue)' },
];

const SCORE: { rule: string; leads: string; infra: string; note: string }[] = [
  { rule: '§1 Vocabulary as Lists', leads: '✅', infra: '❌', note: '8 TS enums + colour maps (2 of 10 vocabularies already Lists)' },
  { rule: '§3 One condition dialect', leads: '⚠️', infra: '❌', note: 'no CREAM-PQL at all; leads has the campaign resolver' },
  { rule: '§4 Recipes for perspectives', leads: '✅', infra: '❌', note: 'BACKUP_SECTIONS array instead of recipes' },
  { rule: '§5 Menu = places, chips = perspectives', leads: '⚠️', infra: '❌', note: 'hand-written registry; leads has the duplicate CreamPie node' },
  { rule: '§6 <EntityList> + URL state', leads: '✅', infra: '❌', note: 'bespoke tables, no ?when / ?lists' },
  { rule: '§7 TanStack Query', leads: '✅', infra: '❌', note: 'duplicated useState/useEffect hooks' },
  { rule: 'Declared in a module.json', leads: '✅', infra: '❌', note: 'no manifest' },
  { rule: 'RBAC canRead on the menu', leads: '✅', infra: '❌', note: 'special-case branch skips it' },
];

export default function InfraModule() {
  return (
    <>
      <Callout kind="real" title="Update (Nov 2026): stage has moved past this page">
        <p>
          Commit <code>63b9f05007</code> (Oct 27) moved the Infrastructure menu into a module manifest,{' '}
          <code>modules/infrastructure/module.json</code>, so its nodes now pass the same module gate and <code>canRead</code>{' '}
          filter as every other workspace. On Nov 3 (<code>517549e9f1</code>) the Backups screens became recipes and a target
          detail, and <code>pages/Infrastructure.tsx</code> was deleted. The as-is diagram and scorecard below describe the
          state before those changes. They are kept as the worked example of what "outside the architecture" looked like.
        </p>
      </Callout>
      <Section
        label="Case study · under construction"
        title="Infrastructure — does it follow the List architecture?"
        intro={
          <>
            <p>
              Short answer: <strong>no</strong>. It is the one workspace that never migrated into the
              manifest-driven navigation tree (decisions D51/D52). The code says so itself: "Infrastructure
              never migrated into the D51/D52 workspace tree… no module manifest declares it". Everything
              that Leads gets for free — menu from rows, tabs from a STAGE list, filters in the URL,
              perspectives as recipes — is hand-written here.
            </p>
          </>
        }
      >
        <h3>As-is <Pill color="var(--pink)">legacy</Pill></h3>
        <SvgDiagram width={1100} height={450} nodes={asIsNodes} edges={asIsEdges} groups={asIsGroups} minWidth={900} />

        <h3>Doctrine scorecard</h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Rule</th><th>Leads</th><th>Infrastructure</th><th>Why</th></tr></thead>
            <tbody>
              {SCORE.map(s => (
                <tr key={s.rule}><td>{s.rule}</td><td>{s.leads}</td><td>{s.infra}</td><td>{s.note}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>To-be <Pill color="var(--green)">doctrine shape</Pill></h3>
        <SvgDiagram width={1100} height={430} nodes={toBeNodes} edges={toBeEdges} groups={toBeGroups} minWidth={900} hint="Dashed boxes are proposed — they do not exist yet. Click for details." />

        <Callout kind="tip" title="What a new Storage tab costs in each world">
          <strong>Today:</strong> a leaf in <code>navRegistry.ts</code>, an entry in <code>INFRASTRUCTURE_TABS</code>, another{' '}
          <code>if</code> branch, a bespoke page, a bespoke fetch hook, a bespoke REST route, TS enums for its states.{' '}
          <strong>After the refactor:</strong> a nav Item, a model, two Lists and a recipe in a manifest — the screen is the
          stock <code>&lt;EntityList&gt;</code>. The step-by-step for both is in Tutorials.
        </Callout>

        <Callout kind="info" title="What “storage” already means in the repo">
          <code>libs/storage</code> and <code>apps/web-services/src/modules/storage</code> are <em>object/file storage</em>{' '}
          (S3/MinIO for content and Hydra files). The backup docs describe two real S3 layouts:{' '}
          <code>s3://infra-backup-ciwg/infra/&lt;host&gt;/</code> and <code>s3://wp-backup-ciwg/backups/&lt;domain&gt;/</code>.
          There is no server disk / volume inventory model yet, and seeders <code>seed-Server-do.ts</code> /{' '}
          <code>seed-Server-wf.ts</code> suggest a Server model exists — confirm where it is defined before designing.
        </Callout>

        <Files
          items={[
            { path: 'apps/synapse-v3/src/pages/Infrastructure.tsx', note: 'tab Set + if-chain' },
            { path: 'apps/synapse-v3/src/config/navRegistry.ts:1115-1166', note: 'hand-written nav tree' },
            { path: 'apps/synapse-v3/src/components/infrastructure/backups/BackupsPage.tsx:18-23', note: 'BACKUP_SECTIONS' },
            { path: 'libs/types/src/lib/backup-tracking/index.ts:28-88', note: 'the enums to turn into Lists' },
            { path: 'modules/web-presence/module.json:~1202, ~1253', note: 'dnsActorType, backupIngestEventType — the pattern to copy' },
            { path: 'docs/backups/PMS-BACKUP-GAP.md', note: 'the two backup mechanisms' },
          ]}
        />
      </Section>
    </>
  );
}
