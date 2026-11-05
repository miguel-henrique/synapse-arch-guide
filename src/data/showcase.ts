// "Show the backend" demo scripts. Bodies are markdown rendered by
// components/Markdown. Paths are relative to the ci-connect repo.
//
// Every SQL query and terminal command here was run on Home 1 on Nov 5 2026
// against the local Postgres container (`postgres`, port 5433), database
// ci_consolidated (the stage-next worktree's DB), with origin/stage at
// 4216f78a68. API calls were checked to exist (they answer 401 without a
// token); their bodies follow the controllers, not a recorded response.
import type { Step } from '../components/kit/Kit';

export interface Demo {
  id: string;
  title: string;
  /** The architectural claim this demo proves, in one sentence. */
  claim: string;
  /** Where to click in the product before you open the terminal. */
  ui: string;
  steps: Step[];
}

// ───────────────────────────────────────────────────────────────── TOOLBOX

export const TOOLBOX: Step[] = [
  {
    where: 'cli',
    title: 'See what is running on this machine',
    body: `Every local database lives in one Docker container called \`postgres\` (Postgres 17, host port **5433**). Redis, Mercure, MinIO, Redpanda and Neo4j sit next to it.

\`\`\`bash
docker ps --format '{{.Names}}\\t{{.Image}}\\t{{.Ports}}'
\`\`\`

List the databases in it. One per environment:

\`\`\`bash
docker exec postgres psql -U postgres -lqt | cut -d'|' -f1 | grep -v '^ *$'
\`\`\`

| Database | Who uses it |
|---|---|
| \`mydb_stage\` | the main checkout (\`apps/web-services/.env\`) |
| \`ci_consolidated\` | the \`stage-next\` worktree |
| \`ci_task_<slug>\` | one isolated task env each (\`task-provision.sh\`) |
| \`mydb\` | the template task DBs are cloned from |`,
  },
  {
    where: 'cli',
    title: 'Find which database an app is really reading',
    body: `Never guess the database; read it from the env the app was started with.

\`\`\`bash
# a task env: the manifest the provision script writes
jq -r '.db, .urls.webServices, .urls.synapse' ~/.workstation/tasks/scrum-nov4.json

# any worktree: the DATABASE_URL, without printing the password
grep -h '^DATABASE_URL' .worktrees/stage-next/apps/web-services/.env \\
  | sed -E 's#.*/([^/?]+).*#\\1#'
\`\`\`

Do this before a demo. Two databases can disagree: on Nov 5, \`mydb_stage\` had **0** Synapse chart recipes and \`ci_consolidated\` had **7**, because only the second had been re-seeded.`,
  },
  {
    where: 'cli',
    title: 'Add two shell helpers (once)',
    body: `Put these in \`~/.zshrc\`. \`sdb\` opens psql on any local DB; \`tdb\` opens the DB of a task env by its slug.

\`\`\`bash
sdb() { docker exec -it postgres psql -U postgres -d "\${1:-ci_consolidated}" "\${@:2}"; }
tdb() { sdb "$(jq -r .db ~/.workstation/tasks/$1.json)" "\${@:2}"; }
\`\`\`

\`\`\`bash
sdb                       # interactive, ci_consolidated
tdb scrum-nov4            # interactive, the scrum-nov4 task DB
sdb mydb_stage -c 'SELECT count(*) FROM todos'
\`\`\`

No password is needed: \`docker exec\` runs psql inside the container as the \`postgres\` user.`,
  },
  {
    where: 'db',
    title: 'psql moves you will use in every demo',
    body: `\`\`\`sql
\\dt                       -- every table
\\d list_items             -- columns, indexes and foreign keys of one table
\\d "List"                 -- PascalCase tables need double quotes
\\x auto                   -- wide rows switch to one-column-per-line
\\pset pager off           -- no pager while presenting
\`\`\`

**The quoting rule.** A Prisma model with \`@@map\` has a snake_case table and snake_case columns: \`todos.status_slug\`, \`leads.organization_id\`. A model without one keeps its Prisma names, so both the table and its columns need double quotes: \`"List"."selectionType"\`, \`"ListResource"."listItemId"\`. \`list_items\` is mapped but keeps camelCase columns (\`"listId"\`, \`"parentItemId"\`). When in doubt, run \`\\d <table>\`.

**JSON columns.** Recipes, navigation nodes and stage transitions live in \`list_items.metadata\` (jsonb). Read them with \`->\` (json) and \`->>\` (text), and print a whole document with \`jsonb_pretty(metadata)\`.`,
  },
  {
    where: 'db',
    title: 'The one query that explains the platform',
    body: `Most of what you will show is rows of two tables: \`"List"\` (a vocabulary) and \`list_items\` (its values). Count them per list:

\`\`\`sql
SELECT l.key, l.type, count(i.id) AS items
FROM "List" l
LEFT JOIN list_items i ON i."listId" = l.id
WHERE l.key IN ('navigation','creamPieRecipe','savedView','helpdeskTicketStage','storyPoints','leadStatus')
  AND l."organizationId" IS NULL
GROUP BY 1, 2 ORDER BY 1;
\`\`\`

On \`ci_consolidated\` that returns 163 navigation nodes, 86 recipes, 3 saved views, 6 ticket stages, 6 story-point values and 12 lead stages. The menu, the saved queries, the board's charts and every dropdown are all values of a List.`,
  },
  {
    where: 'code',
    title: 'Read a manifest with jq instead of scrolling',
    body: `A module's lists, recipes and menu are declared in \`modules/<module>/module.json\`. jq pulls out the part you are showing:

\`\`\`bash
cd ~/projects/ciweb/ci-connect
jq -r '.lists[].key'      modules/operations/module.json
jq -r '.recipes[].slug'   modules/operations/module.json
jq '.navigation[] | select(.subjectId=="operations.synapse")' modules/operations/module.json
\`\`\`

Then show that the generated files match the manifest. This is the same check CI runs:

\`\`\`bash
pnpm check:modules        # ✓ 10 module(s) in sync and type-checking
\`\`\``,
  },
  {
    where: 'cli',
    title: 'Call the API the screen calls',
    body: `Every authenticated namespace wants a bearer token. Copy yours from the running app: open DevTools on the Synapse tab, Console, then run

\`\`\`js
copy(localStorage.getItem('token'))
\`\`\`

and paste it into the terminal:

\`\`\`bash
export TOKEN='<paste>'
export WS=http://localhost:3012          # the task env's web-services port
curl -s -H "Authorization: Bearer $TOKEN" "$WS/synapse/v1/navigation" | jq . | head -20
\`\`\`

Use \`-g\` (globoff) whenever the URL has \`when[...]\` brackets, or curl tries to expand them. Without a token every route below answers **401**, which is a quick way to prove the route exists. The token is yours: do not paste it into chat or a shared screen.

The other option is DevTools, Network tab: click the request the screen made and use **Copy as cURL**.`,
  },
  {
    where: 'cli',
    title: 'Logs and a browsing UI, if you need them',
    body: `A task env writes its server logs to

\`\`\`bash
tail -f ~/.workstation/service-logs/task-scrum-nov4-web-services.log
\`\`\`

For clicking through tables instead of typing SQL there is Prisma Studio, run from the Prisma lib against the DB you choose (not verified in this session):

\`\`\`bash
cd ~/projects/ciweb/ci-connect/libs/prisma
DATABASE_URL='postgresql://postgres:<pw>@localhost:5433/ci_consolidated' pnpm exec prisma studio --port 5555
\`\`\`

For a demo, psql is better: the query on screen is itself the evidence.`,
  },
];

// ─────────────────────────────────────────────────────────────── OPERATIONS

export const OPERATIONS_DEMOS: Demo[] = [
  {
    id: 'menu-is-rows',
    title: 'The Operations menu is rows, seeded from one manifest',
    claim: 'No React component lists the Operations entries. The manifest declares them, the seed writes them as `navigation` list items, and the shell renders whatever rows exist.',
    ui: 'Open the workspace switcher → Operations. Point at the left menu: Dashboard, Tasks, the department queues (Helpdesk … Synapse … Unrouted), Projects, Support Settings.',
    steps: [
      {
        where: 'code',
        title: 'Show the declaration',
        body: `\`modules/operations/module.json\` has a \`navigation\` array (34 nodes). The workspace node is at line 1382, the Synapse node at line 1469:

\`\`\`json
{
  "subjectId": "operations.synapse",
  "parent": "operations",
  "label": "Synapse (getstarted)",
  "navigationType": "CreamPie",
  "icon": "Sparkles",
  "position": 160,
  "recipeSlug": "operations.department.synapse",
  "primaryResource": "todos"
}
\`\`\`

\`navigationType: "CreamPie"\` means the node is a saved query over \`todos\` (a recipe). It has no route and no page of its own.`,
      },
      {
        where: 'db',
        title: 'Show the same nodes as rows',
        body: `\`\`\`sql
SELECT c.position, c.key AS subject, c.label,
       c.metadata->>'navigationType' AS kind,
       c.metadata->>'recipeSlug'     AS recipe,
       c.metadata->>'route'          AS route
FROM list_items c
JOIN list_items p ON p.id = c."parentItemId"
JOIN "List" l     ON l.id = c."listId"
WHERE l.key = 'navigation' AND p.key = 'operations'
ORDER BY c.position;
\`\`\`

28 rows come back, in the menu's order. Twelve are \`cream-pie\` nodes with a recipe (Internal Projects, Tasks, Reporting and the nine department queues); the rest are \`item\` nodes with a route, plus one \`heading\` (Support Settings). Same tree, same positions, as the manifest.`,
      },
      {
        where: 'code',
        title: 'Show how a CreamPie node becomes a screen',
        body: `\`apps/synapse-v3/src/pages/Browse.tsx\` renders every CreamPie node. The URL is \`/backoffice/<workspace>/<node>\` (\`config/navResolve.ts:433\`), so Synapse is \`/backoffice/operations/synapse\`. Browse looks the node up in the navigation tree and hands it to the universal list:

\`\`\`tsx
<EntityList
  navigationSubject={subjectId}
  cellRenderers={detail?.listCellRenderers}
  ...
/>
\`\`\`

One component serves Helpdesk, Growth, Finance, Synapse and the rest. The only per-department input is the node row.`,
      },
      {
        where: 'cli',
        title: 'Show the menu coming from the API',
        body: `\`\`\`bash
curl -s -H "Authorization: Bearer $TOKEN" "$WS/synapse/v1/navigation" | jq . | head -40
\`\`\`

\`GET /synapse/v1/navigation\` (\`apps/web-services/src/modules/synapse/synapse.routes.ts:198\`) is what the shell reads. Change a row and the menu changes; no frontend build is involved.`,
      },
      {
        where: 'verify',
        title: 'Close with the rule it follows',
        body: `Doctrine §5: **menu = places, chips = perspectives, filters = refinements.** The department queues are perspectives (one recipe each) over one table, which is why they all look alike and all gain a feature at once. The seed that writes these rows runs per database:

\`\`\`bash
cd ~/projects/ciweb/ci-connect/libs/prisma
pnpm run seed:modules --list                        # the module slugs
DATABASE_URL=... pnpm run seed:modules --only operations --nav
\`\`\`

Run the seed only on a local or task DB. It is idempotent: a re-run on unchanged manifests reports every count as \`=\` (unchanged).`,
      },
    ],
  },
  {
    id: 'departments-one-table',
    title: 'Nine department queues, one table, two discriminators',
    claim: 'A department queue is not a table. It is `todos` filtered by two discriminator columns, and every queue is declared as a recipe.',
    ui: 'Click Helpdesk, then Finance, then Synapse. Same columns, same toolbar, different rows.',
    steps: [
      {
        where: 'code',
        title: 'Show the department recipes side by side',
        body: `\`\`\`bash
jq -r '.recipes[] | select(.slug|startswith("operations.department.")) |
       [.slug, (.conditions.rules|map(.field+" "+.op+" "+(.value|tostring))|join(" AND "))] | @tsv' \\
   modules/operations/module.json
\`\`\`

Each line reads \`lists.todoType eq ticket AND queueSlug eq <department>\`. The only thing that changes is the queue value.`,
      },
      {
        where: 'db',
        title: 'Run the recipe by hand',
        body: `The Synapse recipe in SQL:

\`\`\`sql
SELECT status_slug, count(*)
FROM todos
WHERE type_slug = 'ticket' AND queue_slug = 'synapse'
GROUP BY 1 ORDER BY 2 DESC;
\`\`\`

\`type_slug\` is a key of the \`todoType\` list, \`queue_slug\` a key of \`helpdeskDepartment\` (16 queues). A ticket, a task and a subtask are all rows of \`todos\`; doctrine §2 calls this a discriminator over duplicate models.`,
      },
    ],
  },
];

// ──────────────────────────────────────────────────────────────── SYNAPSE

export const SYNAPSE_DEMOS: Demo[] = [
  {
    id: 'charts-are-recipes',
    title: 'The board charts are recipe rows',
    claim: 'Each chart on the Synapse board is a `creamPieRecipe` list item whose parent is the board recipe. No chart table exists, and no chart component per chart.',
    ui: 'Operations → Synapse (getstarted) → the Charts button. Point at the seven charts: velocity, velocity in points, burn-up, burn-up in points, created vs done, open by status, workload by assignee.',
    steps: [
      {
        where: 'code',
        title: 'Show one chart in the manifest',
        body: `\`modules/operations/module.json:965\`:

\`\`\`json
{
  "slug": "operations.synapse.chart.velocity",
  "displayName": "Velocity: tickets done per week",
  "primaryResource": "todos",
  "conditions": { "logic": "AND", "rules": [
    { "field": "lists.todoType", "op": "eq", "value": "ticket" },
    { "field": "queueSlug",      "op": "eq", "value": "synapse" } ] },
  "parent": "operations.department.synapse",
  "presentation": { "view": "chart", "chart": {
    "chartType": "bar",
    "dimensions": [ { "field": "completedAt", "bucket": "week" } ],
    "measures":   [ { "fn": "count" } ],
    "extraWhen":  { "logic": "AND", "rules": [ { "field": "completedAt", "op": "isNotNull" } ] } } }
}
\`\`\`

All seven at once:

\`\`\`bash
jq -r '.recipes[] | select(.slug|startswith("operations.synapse.chart")) |
       [.slug, .presentation.chart.chartType,
        (.presentation.chart.dimensions|map(.field+":"+(.bucket//"-"))|join(","))] | @tsv' \\
   modules/operations/module.json
\`\`\``,
      },
      {
        where: 'db',
        title: 'Show the rows (this is the query you asked about)',
        body: `Since the CREAM-PIE fold (migration \`20261113000300_cream_pie_fold\`) a recipe is an item of the list \`creamPieRecipe\`: \`key\` is the slug, \`parentItemId\` points at the recipe it reads, and the rest sits in \`metadata\`.

\`\`\`sql
SELECT i.id, i.key AS slug, p.key AS parent_recipe,
       i.metadata->'meta'->'presentation'->>'view' AS view,
       i.metadata->>'source' AS source
FROM list_items i
JOIN "List" l          ON l.id = i."listId"
LEFT JOIN list_items p ON p.id = i."parentItemId"
WHERE l.key = 'creamPieRecipe' AND i.key LIKE 'operations.%synapse%'
ORDER BY i.id;
\`\`\`

\`\`\`text
   id   |                     slug                      |         parent_recipe         |   view   | source
--------+-----------------------------------------------+-------------------------------+----------+--------
  11751 | operations.department.synapse                 |                               | datagrid | MODULE
 105254 | operations.synapse.chart.velocity             | operations.department.synapse | chart    | MODULE
 105255 | operations.synapse.chart.velocity-points      | operations.department.synapse | chart    | MODULE
 105256 | operations.synapse.chart.burn-up-points       | operations.department.synapse | chart    | MODULE
 105257 | operations.synapse.chart.created-vs-done      | operations.department.synapse | chart    | MODULE
 105258 | operations.synapse.chart.burn-up              | operations.department.synapse | chart    | MODULE
 105259 | operations.synapse.chart.open-by-status       | operations.department.synapse | chart    | MODULE
 105260 | operations.synapse.chart.workload-by-assignee | operations.department.synapse | chart    | MODULE
\`\`\`

The whole stored recipe:

\`\`\`sql
\\x auto
SELECT jsonb_pretty(i.metadata)
FROM list_items i JOIN "List" l ON l.id = i."listId"
WHERE l.key = 'creamPieRecipe' AND i.key = 'operations.synapse.chart.velocity';
\`\`\`

\`metadata.conditions\` is the CREAM-PQL filter, \`metadata.meta.presentation.chart\` the chart spec, \`metadata.resource\` is \`todos\`. It is the manifest entry, stored.`,
      },
      {
        where: 'code',
        title: 'Show where the folding is documented',
        body: `\`libs/prisma/src/utils/creamPieRecipes.ts\` (top comment) states the three lists:

- \`creamPieRecipe\`: the shared tiers. A platform recipe has \`organizationId\` NULL; an organization's recipe carries its id. A chart is a recipe whose \`parentItem\` is the perspective it reads.
- \`savedView\`: one person's saved views, keyed \`<ownerUserId>/<slug>\`.
- \`creamPieBinding\`: bindings, as children of the recipe they attach to.

Integrity the old recipe tables had as foreign keys is held by triggers on \`list_items\`, for example: a recipe that charts read cannot be deleted.`,
      },
      {
        where: 'cli',
        title: 'Show the API that draws a chart',
        body: `The Charts library asks for the charts of a resource, then posts each one to the aggregate endpoint:

\`\`\`bash
curl -s -H "Authorization: Bearer $TOKEN" "$WS/synapse/v1/charts?resource=todos" | jq . | head -40

curl -s -X POST "$WS/synapse/v1/lists/aggregate" \\
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \\
  -d '{"resource":"todos","recipe":"operations.department.synapse",
       "dimensions":[{"field":"completedAt","bucket":"week"}],
       "measures":[{"fn":"count"}]}' | jq '.rows[:5], .meta'
\`\`\`

\`postSynapseListAggregate\` (\`cream-pie/listAggregate.controller.ts:123\`) forwards to \`/api/v1/list-aggregate/todos\` on the same server, so the ORM scope, list filters and recipe filter run on the same middleware chain as the board's list. The engine is \`listAggregate.service.ts\`: buckets, groups, \`sum\`, a per-measure \`dateField\`, and \`cumulative\` for burn-ups.`,
      },
      {
        where: 'verify',
        title: 'Prove a chart is data, using git',
        body: `\`\`\`bash
git show --stat 8af1faed2b
\`\`\`

\`\`\`text
feat(operations): points burn-up chart on the Synapse board
 modules/operations/generated/operations-lists.ts | 50 ++++
 modules/operations/module.json                   | 47 ++++
\`\`\`

A new chart touched two files: the manifest and the artifact generated from it. No component, no endpoint, no migration. The commit that taught manifests to ship charts at all, \`6c57f17fc1\`, is the one that touched the seeder and the schema.`,
      },
    ],
  },
  {
    id: 'seed-gap',
    title: 'Why a chart can be missing on one database',
    claim: 'Recipes and Lists are rows. A deploy ships code and migrations; it does not write rows. The module seed does, and it has to run on each database.',
    ui: 'Open Synapse → Charts on two environments that run the same code. One shows seven charts, the other shows none.',
    steps: [
      {
        where: 'db',
        title: 'Count the chart rows on every local database',
        body: `\`\`\`bash
for db in mydb_stage ci_consolidated ci_task_scrum_nov4 ci_task_ticket_notifications; do
  printf '%-30s' "$db"
  docker exec postgres psql -U postgres -d "$db" -tAc \\
    "SELECT count(*) FROM list_items i JOIN \\"List\\" l ON l.id = i.\\"listId\\"
     WHERE l.key = 'creamPieRecipe' AND i.key LIKE 'operations.synapse.chart.%'"
done
\`\`\`

\`\`\`text
mydb_stage                    0
ci_consolidated               7
ci_task_scrum_nov4            7
ci_task_ticket_notifications  0
\`\`\`

Same code, different rows. Running \`seed:modules --only core,operations\` on the DB closes the gap, and that step is not part of the deploy.`,
      },
    ],
  },
  {
    id: 'story-points',
    title: 'Story points: one nullable column, the scale is a List',
    claim: 'The schema change was one column. The allowed values are list items, so adding a size is a Lists change, not a migration.',
    ui: 'Open a Synapse ticket → the Points picker next to Priority. Then the Points column on the board.',
    steps: [
      {
        where: 'code',
        title: 'Show the whole migration',
        body: `\`libs/prisma/src/schema/migrations/20261231996000_todo_story_points/migration.sql\`:

\`\`\`sql
-- Nullable: existing todos are unsized. No CHECK constraint: the scale is
-- the list's rows, not the schema's.
ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "story_points" INTEGER;
\`\`\`

The column is declared in \`modules/core/module.json:237\`, the \`storyPoints\` list at \`:956\`.`,
      },
      {
        where: 'db',
        title: 'Show the scale and confirm the migration ran',
        body: `\`\`\`sql
SELECT i.position, i.label, i.metadata->>'points' AS points
FROM list_items i JOIN "List" l ON l.id = i."listId"
WHERE l.key = 'storyPoints' AND i."organizationId" IS NULL
ORDER BY i.position;

SELECT migration_name, finished_at FROM _prisma_migrations
WHERE migration_name LIKE '%story_points%';
\`\`\`

Six values (1, 2, 3, 5, 8, 13). Each item's \`metadata.points\` is the number written to \`todos.story_points\`, which is why the points charts can \`sum\` it.`,
      },
    ],
  },
  {
    id: 'stage-machine',
    title: 'Ticket stages are a governed state machine in a List',
    claim: 'The board columns and the allowed moves come from the STAGE list `helpdeskTicketStage`. A generic PATCH cannot change the stage; one shared endpoint runs the machine.',
    ui: 'Drag a ticket from Open to Resolved on the board, or change its status on the ticket page.',
    steps: [
      {
        where: 'db',
        title: 'Show the columns and the transitions',
        body: `\`\`\`sql
SELECT i.position, i.key, i.label, i."isInitial", i."isTerminal",
       i.metadata->>'stageGroup'  AS grp,
       i.metadata->'transitions'  AS can_move_to
FROM list_items i JOIN "List" l ON l.id = i."listId"
WHERE l.key = 'helpdeskTicketStage' AND i."organizationId" IS NULL
ORDER BY i.position;
\`\`\`

\`\`\`text
 10 | open              | Open              | t | f | open   | ["in_progress","waiting_on_client","escalated","resolved"]
 20 | in_progress       | In Progress       | f | f | open   | ["waiting_on_client","pending_review","escalated","resolved","open"]
 30 | waiting_on_client | Waiting on Client | f | f | held   | ["in_progress","resolved","escalated"]
 40 | pending_review    | Pending Review    | f | f | open   | ["in_progress","resolved","escalated"]
 50 | escalated         | Escalated         | f | f | open   | ["in_progress","pending_review","resolved"]
 60 | resolved          | Resolved          | f | t | closed | ["open"]
\`\`\`

\`isTerminal\` on Resolved is what stamps \`completed_at\`, and \`completed_at\` is what the velocity chart buckets.`,
      },
      {
        where: 'code',
        title: 'Show the one endpoint every staged resource shares',
        body: `\`apps/web-services/src/modules/lifecycle/stage.routes.ts\`:

\`\`\`text
GET  /api/v1/:resource/:id/stage   where the row stands and where it may go
POST /api/v1/:resource/:id/stage   { to, reason? }  runs the STAGE list's machine
\`\`\`

\`\`\`bash
curl -s -H "Authorization: Bearer $TOKEN" "$WS/api/v1/todos/<ticketId>/stage" | jq
\`\`\`

The generic PATCH refuses lifecycle columns (\`utils/stageFieldWrites.ts\`) and points here. Leads use the same endpoint with \`leadStatus\` (\`libs/prisma/src/utils/stageResources.ts\` registers both).`,
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────────── LEADS

export const LEADS_DEMOS: Demo[] = [
  {
    id: 'leads-screen-is-generic',
    title: 'The Leads screen is the generic list over a model the manifest describes',
    claim: '`/backoffice/sales/leads` has no Leads page component. The route table is generated from the manifest, and every column and filter comes from the `Lead` model entry in `modules/crm/module.json`.',
    ui: 'Sales & Marketing → Leads. Show the columns, the Status chips, a column header filter, then a saved view chip.',
    steps: [
      {
        where: 'code',
        title: 'Show the menu node and the generated route',
        body: `\`modules/crm/module.json:2945\`:

\`\`\`json
{ "subjectId": "sales.leads", "parent": "sales", "label": "Leads",
  "navigationType": "Item", "route": "/leads", "primaryResource": "leads",
  "formerIds": ["bizdev.pipeline.leads-db", "bizdev.pipeline.prospects", "..."] }
\`\`\`

\`pnpm build:modules\` turns it into \`apps/synapse-v3/src/config/navRoutes.generated.ts\`:

\`\`\`ts
{ "path": "/leads", "subjectId": "sales.leads", "resource": "leads" }
\`\`\`

and \`router.tsx:300\` maps every generated route to the same component, \`<Browse subjectId={route.subjectId} />\`, which renders \`<EntityList>\`. \`formerIds\` keeps old bookmarks and role grants working after the rename.`,
      },
      {
        where: 'code',
        title: 'Show where the columns come from',
        body: `The \`Lead\` model entry (\`modules/crm/module.json:187\`) lists each field with its type and flags:

\`\`\`json
{ "name": "status", "type": "list", "list": "leadStatus",
  "filterable": true, "sortable": true, "inList": true, "label": "Status" },
{ "name": "salesRepUserId", "type": "relation", "relationTo": "User",
  "filterable": true, "inList": true, "label": "Sales Rep" }
\`\`\`

\`type: "list"\` binds a column to a vocabulary, so the filter widget is built from that List's items. \`type: "relation"\` gives the people picker. Nothing in the frontend names a lead status.`,
      },
      {
        where: 'db',
        title: 'Show the vocabularies bound to leads',
        body: `\`\`\`sql
SELECT l.key, l.type, l."selectionType", l.resources, count(i.id) AS items
FROM "List" l LEFT JOIN list_items i ON i."listId" = l.id
WHERE l.key LIKE 'lead%' AND l."organizationId" IS NULL
GROUP BY 1, 2, 3, 4 ORDER BY 1;
\`\`\`

\`\`\`text
 leadCustomerType  | TAXONOMY | SINGLE   | {leads}        |  3
 leadIntakeChannel | TAXONOMY | SINGLE   | {leads}        | 28
 leadOrigin        | TAXONOMY | SINGLE   | {leads}        | 19
 leadSource        | TAXONOMY | SINGLE   | {organization} | 18
 leadStatus        | STAGE    | SINGLE   | {leads}        | 12
 leadTag           | TAXONOMY | MULTIPLE | {leads}        | 15
 leadType          | TAXONOMY | SINGLE   | {leads}        |  6
\`\`\`

\`leadStatus\` is a STAGE (gated moves); the rest are TAXONOMY (any value, applied freely). \`leadOrigin\` is what the rep records; \`leadIntakeChannel\` is what the system recorded when the lead arrived. Two lists because they are two different facts.`,
      },
      {
        where: 'db',
        title: 'Show the pipeline: stored key, shown label, count',
        body: `Counts only. The \`leads\` table holds names, emails and phones; do not select those on a shared screen.

\`\`\`sql
SELECT s.position, l.status AS key, s.label, s."isTerminal", count(*)
FROM leads l
LEFT JOIN list_items s
  ON s.key = l.status AND s."organizationId" IS NULL
 AND s."listId" = (SELECT id FROM "List" WHERE key = 'leadStatus' AND "organizationId" IS NULL)
WHERE l.organization_id = 496          -- CI Web Group's own pipeline
GROUP BY 1, 2, 3, 4 ORDER BY 1;
\`\`\`

The row stores \`qualified\`; the screen shows **Hot Lead**. Renaming the label never touches a lead row. Organization 496 is CI Web Group: the same table also holds every client site's form leads, owned by that client's organization.`,
      },
    ],
  },
  {
    id: 'leads-recipes',
    title: 'My follow-ups, Referrals, Vendors & Partners: four recipes, not four pages',
    claim: 'Each saved perspective over leads is a recipe row with a CREAM-PQL condition. They show as chips on one screen.',
    ui: 'On Leads, click the perspective chips: My follow-ups, Referrals, Vendors & Partners.',
    steps: [
      {
        where: 'db',
        title: 'Show the four recipes',
        body: `\`\`\`sql
SELECT i.key AS slug, i.metadata->'conditions' AS conditions
FROM list_items i JOIN "List" l ON l.id = i."listId"
WHERE l.key = 'creamPieRecipe' AND i.metadata->>'resource' = 'leads'
ORDER BY 1;
\`\`\`

\`\`\`text
 sales.my-followups     | salesRepUserId eq {{user.id}}  AND nextFollowUpDate isNotNull
 sales.referrals        | leadOrigin in [referral, ambassador_referral, …]  AND organizationId eq 496
 sales.reporting        | createdAt within {{period}}  AND organizationId eq 496
 sales.vendors-partners | leadType in [vendor, partner]  AND organizationId eq 496
\`\`\`

\`{{user.id}}\` and \`{{period}}\` are parameters filled at request time. Recipes narrow and never widen: the server ANDs them under the caller's own scope (doctrine §4).`,
      },
      {
        where: 'cli',
        title: 'Show the URL is the filter state',
        body: `Apply a chip and a column filter, then copy the browser URL. It carries \`?recipe=\` and \`when[field][op]=value\`. The same query string works on the API:

\`\`\`bash
curl -sg -H "Authorization: Bearer $TOKEN" \\
  "$WS/api/v1/leads?recipe=sales.referrals&when[status][eq]=new" | jq . | head -30
\`\`\`

\`viewFilter.ts\` reads \`recipe\` and \`when\`, and \`libs/cream-pie/src/lib/when-query.ts\` (\`parseWhenQuery\`) and \`prisma-where.ts\` (\`compileToPrismaWhere\`) turn them into a Prisma \`where\`. That one compiler serves every list, chart and count in the product (doctrine §3).`,
      },
    ],
  },
  {
    id: 'leads-campaign-edge',
    title: 'Events a lead attended are edges, not a column',
    claim: 'Lead ↔ campaign membership is a `ListResource` row with predicate `campaignMember`, and the role on that edge is a list item.',
    ui: 'Open a lead that came from a trade show → its Events. Or filter Leads by an event.',
    steps: [
      {
        where: 'db',
        title: 'Show the edges',
        body: `\`\`\`sql
SELECT li.key AS role, count(*) AS edges,
       count(DISTINCT r."relatedResourceId") AS leads,
       count(DISTINCT r."resourceId")        AS campaigns
FROM "ListResource" r
JOIN list_items li ON li.id = r."listItemId"
WHERE r.predicate = 'campaignMember' AND r."relatedResource" = 'Lead'
GROUP BY 1 ORDER BY 2 DESC;
\`\`\`

On \`ci_consolidated\`: 339 \`prospect\` edges, joining 329 leads to 51 campaigns. \`resource = 'Project'\` is the campaign (a project of type campaign), \`relatedResource = 'Lead'\` the lead, \`listItemId\` the role from \`campaignMemberRole\`.

To see every kind of edge the platform stores this way:

\`\`\`sql
SELECT resource, "relatedResource", predicate, count(*)
FROM "ListResource" GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 15;
\`\`\``,
      },
      {
        where: 'verify',
        title: 'Tell the story of the fix this replaced',
        body: `The first fix for "leads attached to an event don't show under the Campaign filter" added a resolver that side-queried memberships and built its own \`OR\`. The doctrine records the correction: declare the relation, after which the existing compiler resolves \`when[campaignMembers][some][campaignId][eq]=<id>\` with no filter code. \`CampaignMember\` is declared in \`modules/events/module.json:923\` as served by \`ListResource\`. That is the pattern to point at: declare the relation, do not write the filter.`,
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────────── PROOF

export interface ProofRow {
  rule: string;
  doctrine: string;
  command: string;
  expect: string;
}

export const PROOF: ProofRow[] = [
  {
    rule: 'Generated files are never hand-edited',
    doctrine: 'MODULE-STRUCTURE §1–3',
    command: 'pnpm check:modules',
    expect: '✓ 10 module(s) in sync and type-checking',
  },
  {
    rule: 'No new Prisma enum for a vocabulary',
    doctrine: 'DOCTRINE §1',
    command: "git diff origin/stage...HEAD -- libs/prisma/src/schema | grep -E '^\\+\\s*enum '",
    expect: 'no output',
  },
  {
    rule: 'No hardcoded option arrays in the frontend',
    doctrine: 'DOCTRINE §1',
    command: "git diff origin/stage...HEAD -- apps/ | grep -E '^\\+.*_(STATUSES|TYPES|OPTIONS) *= *\\['",
    expect: 'no output',
  },
  {
    rule: 'A chart or perspective is a manifest change',
    doctrine: 'DOCTRINE §4',
    command: 'git show --stat 8af1faed2b',
    expect: 'only modules/operations/module.json and its generated artifact',
  },
  {
    rule: 'A vocabulary fix is a recipe/list row',
    doctrine: 'DOCTRINE §1, §4',
    command: 'git show --stat 87b8972eb',
    expect: 'modules/crm/module.json and crm-lists.ts, 4 lines each',
  },
  {
    rule: 'No bespoke filter format',
    doctrine: 'DOCTRINE §3',
    command: "git diff origin/stage...HEAD -- apps/ | grep -E '^\\+.*(visibleIf|buildWhere|customWhere)'",
    expect: 'no output; filters are recipes or when[] params',
  },
  {
    rule: 'New list screens use EntityList',
    doctrine: 'DOCTRINE §6',
    command: "grep -n '<EntityList' apps/synapse-v3/src/pages/Browse.tsx",
    expect: 'one hit; Synapse and Leads both render through it',
  },
  {
    rule: 'The rows exist on the DB you demo',
    doctrine: 'seed is not part of the deploy',
    command: "sdb <db> -c \"SELECT count(*) FROM list_items i JOIN \\\"List\\\" l ON l.id=i.\\\"listId\\\" WHERE l.key='creamPieRecipe'\"",
    expect: 'the same count on every environment you show (86 on ci_consolidated)',
  },
];

/** Folder map of the parts the demos open, relative to ci-connect. */
export const TREE = `ci-connect/
├── modules/                          # the manifests: lists, recipes, navigation, models
│   ├── _schema/module.schema.json    # what a module.json may contain
│   ├── core/module.json              # todoType, todoStatus, storyPoints, Todo fields
│   ├── crm/module.json               # Lead model, lead* lists, sales.* recipes, Sales menu
│   ├── operations/module.json        # helpdeskTicketStage, department + chart recipes, Operations menu
│   │   └── generated/                # @generated by pnpm build:modules; do not edit
│   └── events/module.json            # CampaignMember (served by ListResource)
├── tools/build-modules/              # manifest → generated artifacts; check:modules
├── libs/
│   ├── prisma/src/
│   │   ├── schema/                   # *.prisma + migrations/
│   │   ├── seeders/modules/          # _runner.ts (seed:modules), _moduleSeeder.ts, _navSeeder.ts
│   │   └── utils/creamPieRecipes.ts  # recipes = items of list creamPieRecipe
│   └── cream-pie/src/lib/            # when-query.ts, prisma-where.ts, predicate.ts (CREAM-PQL)
└── apps/
    ├── web-services/src/
    │   ├── app.ts                    # namespaces: /synapse/v1, /api …
    │   ├── modules/cream-pie/        # viewFilter, recipeResolver, listAggregate.*, chart.controller
    │   ├── modules/lifecycle/stage.routes.ts   # GET/POST /api/v1/:resource/:id/stage
    │   └── modules/synapse/synapse.routes.ts   # /navigation, /charts, /lists/aggregate, /recipes
    └── synapse-v3/src/
        ├── router.tsx                # MANIFEST_ROUTES → <Browse>
        ├── config/navRoutes.generated.ts
        ├── pages/Browse.tsx          # every CreamPie node and manifest route
        ├── pages/ResourceChartLibrary.tsx       # the board's Charts library
        ├── components/entity-list/   # EntityList, filters, board
        ├── components/chart-composer/ # chartPaths.ts, SavedChartPreview.tsx
        └── components/helpdesk/      # ticket page parts (StoryPointsPicker, comments, subtasks)`;
