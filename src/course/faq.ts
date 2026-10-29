// FAQ shown at the bottom of every course level. Answers are markdown.
export const COURSE_FAQ: Record<number, { q: string; a: string }[]> = {
  1: [
    { q: 'If enums are type-safe, why are Lists better?', a: 'Enums are safe *at compile time* but frozen *at run time*: adding "churned" needs a code change, a review and a deploy, and every copy must be updated. A List is one row everyone reads, editable without a deploy. Type safety comes back through generated types (`crm-types.ts`) and the compiler failing closed on unknown fields.' },
    { q: 'Does "zero hardcoded copies" mean code never mentions a value?', a: 'No. Code may reference a stable **key** when behaviour genuinely depends on it (e.g. `isTerminal`, or the recipe for "vendors"). What it must not do is *re-declare the vocabulary* — arrays like `const STATUSES = [...]`, colour maps per value, or a Zod enum of the values.' },
    { q: 'Where do I see the drift in practice?', a: 'Two real cases on this site: the first leadType feature shipped a `LeadTypeSchema` with three values and "Mark as X" actions, which had to be removed when the admin added more values; and production has leads whose `status` is not a leadStatus key. Both are drift.' },
    { q: 'What is the anatomy ratchet, concretely?', a: 'A CI check that counts known hardcoded-vocabulary sites and fails if the number goes **up**. It never forces you to fix old debt in your PR — it only stops new debt.' },
  ],
  2: [
    { q: 'How do I decide between STAGE and TAXONOMY?', a: 'Ask: "is moving from one value to another an *event with rules*?" If yes (a lead going to Converted, a ticket to Resolved) it is STAGE: it has an initial value, terminal values, allowed transitions, and moves emit PubSub events. If values are just applied/removed freely (industry, tag, lead type) it is TAXONOMY.' },
    { q: 'Single-select vs multi-select — where is the value stored?', a: 'A single-select list is usually bound to a **column** that stores the item key (`leads.status = "contacted"`). Multi-select values (tags) are **ListResource rows** linking the item to the record. In the URL: `when[status][eq]=…` vs `when[lists.leadTag][in]=…`.' },
    { q: 'Can I rename a value?', a: 'Rename the **label** freely ("qualified" shows as "Hot Lead" in production). Never rename the **key** — columns, URLs, recipes and topic names store it. If the list is manifest-owned, change the label in the manifest, not only in the admin.' },
    { q: 'What exactly is a "system" list?', a: '`system: true` means code or a manifest depends on it. For manifest-declared lists the module seed owns most item columns, so the manifest is the durable place to edit them. Non-system lists are fully admin-owned.' },
    { q: 'Why is TRANSFORM in this list if nobody uses it?', a: 'It is on the enum and the middleware exists, but no TRANSFORM list is seeded and the docs propose moving it off the axis. Level 8 covers it in depth.' },
  ],
  3: [
    { q: 'Is a recipe a query, a filter or a menu item?', a: 'A recipe is a **named, stored condition** (`{logic, rules}`) over a primary resource. The same row can be applied as a filter (`?recipe=`), shown as a chip or accordion perspective, gated by `availableWhen`, and referenced by a nav node or binding. Where it appears is decided by those references, not by flags on the recipe (decision C2).' },
    { q: 'What is the difference between `?recipe=` and `?when[…]`?', a: '`when[…]` is the flat-AND subset that a filter bar can write and read back. Anything with OR, nesting or parameters (`{{user.id}}`, `{{period}}`) must be a stored recipe. The server ANDs both.' },
    { q: 'Can a recipe show me data I could not see otherwise?', a: 'No. Recipes are ANDed **under** your existing scope with `narrowWhere` — they narrow, never widen. `availableWhen` decides who may *apply* it, enforced server-side (403).' },
    { q: 'Where are recipes stored?', a: 'Declared in `module.json → recipes[]`, seeded by the module system seed. On stage (Schema B) they are ListItems of list `creamPieRecipe`; personal views are items of `savedView`.' },
  ],
  4: [
    { q: 'What is the difference between a RELATIONSHIP list and a relation?', a: 'A RELATIONSHIP **list** is a vocabulary of edge labels (owner, vendor, referrer) with graph metadata; each edge is a ListResource triple. A Prisma **relation** is a structural foreign key the ORM can join. Deep Dives → Relationships has a side-by-side.' },
    { q: 'How does "Perspective" relate to recipes?', a: 'Two meanings meet here. In the graph sense, a perspective is the *path* you traverse (OWNER vs REFERRER gives Direct vs Indirect MRR). In the UI sense (§5), a perspective is a recipe shown as a chip. Both say: same rows, different lens.' },
    { q: 'Is tenant scoping the same as RBAC?', a: 'No. CASL answers "may you read this subject at all"; tenant scope adds the `organizationId` where for constrained callers. Abilities carry no org conditions — the tenant-scope middleware does. See Questions → S4.' },
    { q: 'Are edges bidirectional?', a: 'Stored once, read both ways. Items declare `inverseSlug`, `symmetric` and `directional`, and the edge resolver reads the inverse side through an object-side index.' },
  ],
  5: [
    { q: 'Who decides that Leads gets Kanban?', a: 'The Guesser rule: a resource with a single-select STAGE list of ≥ 3 values gets a board offered. Lead has `supportedViews: ["datagrid", "kanban"]` and leadStatus is STAGE.' },
    { q: 'What is the difference between the manifest and a view template like LEADS_VIEW?', a: 'The manifest says *what exists* (models, lists, recipes, nav). The view template says *how one screen presents it* (columns, defaults, hidden stages, bulk actions, the org pin). It is frontend code in `resourceViews/`.' },
    { q: 'When is a custom component justified?', a: 'When the screen is not "resource + lists + recipes": maps, dashboards, coverage strips, composite reports. They live as CustomView nodes with a required reason, counted as WET debt.' },
    { q: 'Do generated files ever get edited by hand?', a: 'Never. Edit `module.json`, run `pnpm build:modules`; `pnpm check:modules` fails CI on drift.' },
  ],
  6: [
    { q: 'Is "admin UI, not migrations" always right?', a: 'It is right for **values**, with one nuance found in the seeders: for manifest-owned (system) lists, the next deploy rewrites labels/colours/order from the manifest. Level 11 turns this into a four-way triage.' },
    { q: 'Why is a resolver so bad if it gives the right answer?', a: 'It is a second filter dialect beside CREAM-PQL: other surfaces (recipes, PubSub conditions, exports, MCP) do not get it, it hides a side query, and it rewrites a field\'s meaning silently. One dialect means one place to reason about correctness and security.' },
    { q: 'What changed in the campaign example since the doctrine was written?', a: 'On stage `campaign_members` was folded into ListResource edges, so there is no table to declare a Prisma relation to, and the resolver is still wired. The doctrine-shaped answer is now an edge traversal — an open design fork (Tutorials → campaign filter).' },
    { q: 'How do I find the manifest that owns something?', a: '`grep -n \'"key": "<listKey>"\' modules/*/module.json` for a list; `grep -n \'"subjectId": "<id>"\'` for a menu node; `"slug": "<recipe>"` for a recipe.' },
  ],
  7: [
    { q: 'Why does the URL use dots but the doctrine shows [some]?', a: 'The URL grammar is `when[field][op]=value` only. The dotted field (`campaignMembers.campaignId`) is the path; `some` is what the compiler emits. The bracketed `[some]` in the doctrine is pseudo-code for the compiled Prisma shape.' },
    { q: 'Does traversal cost a JOIN?', a: 'It compiles to EXISTS subqueries (semijoins), which Postgres plans well with an index on the junction\'s foreign key. Deep paths and case-insensitive `contains` across hops can get expensive — there is no depth limit today (Questions → S3).' },
    { q: 'How do I express "leads NOT in campaign 8"?', a: 'Not with `ne` through the relation (that means "has some other campaign"). Use a stored recipe with an explicit rule, or `notExists` if you mean "in no campaign at all".' },
    { q: 'Can I traverse to any column of a related model?', a: 'Today the resolver accepts any DMMF scalar at any depth, which is convenient — and is the root of the suspected oracle in Questions → S1. Expect a field allow/deny check to land there.' },
  ],
  8: [
    { q: 'Should I create a TRANSFORM list for a new client?', a: 'Check with the team first: none exist, the cache is per-process and never invalidated, and the docs propose retiring the type. An explicit adapter in the client or a dedicated endpoint may be clearer.' },
    { q: 'Does TRANSFORM run before or after redaction?', a: 'After. That is safe for `omit`, but it also means `flatten` can only lift what the response already contained — it cannot leak a redacted field.' },
    { q: 'Why does order matter?', a: 'Rules run sequentially on each record. A case conversion renames every key, so any later rule must use the new names.' },
  ],
  9: [
    { q: 'Why do I see one request per tab in the network panel?', a: '`useStageCounts` asks the server for each tab\'s total with `pageSize=1`, in parallel, cached with the grid. There is no aggregate on the generic route yet (Questions → G12).' },
    { q: 'Why is `spam` not in my notIn list?', a: 'Production\'s leadStatus has no `spam` item yet (stage\'s manifest adds it). The hidden list is computed from the live List: terminal items + `openHidesStages`.' },
    { q: 'Where does `organizationId=496` come from if I never chose it?', a: 'LEADS_VIEW.fixedWhen — CI Web Group\'s organization id, pinned because the leads table also holds every client website\'s leads.' },
    { q: 'How do I reproduce a teammate\'s view?', a: 'Send the browser URL. Because the state lives in the query string, the same URL rebuilds the same request.' },
  ],
  10: [
    { q: 'Is a saved view a recipe or a presentation?', a: 'Both halves: the **conditions** are a user-tier recipe; the **presentation** (which columns/actions to keep) narrows the template. Neither can add power.' },
    { q: 'What is WET?', a: '"Write Everything Twice" — the quarantine menu for screens not yet on the universal surface, each with a reason. ~51 of ~66 list surfaces were bespoke when V10 was written.' },
    { q: 'Why does "nomenclature is API" keep coming up?', a: 'Keys, slugs, subjectIds and URL parameters are stored in links, grants, columns and topic names. Renaming any of them is a migration, so they are chosen once and aliased (`formerIds`) instead of renamed.' },
    { q: 'What is the single idea to remember from these two documents?', a: 'User-supplied configuration only narrows. Ceilings in presentation, AND in conditions, server-built audiences, no shadowing between tiers.' },
  ],
  11: [
    { q: 'How can I tell if a list is manifest-owned?', a: 'In the Lists admin it shows as system; in the repo, `grep -n \'"key": "<listKey>"\' modules/*/module.json` finds it. Production example: leadStatus/leadType are system, leadTag is not.' },
    { q: 'Can I still use the admin for a system list in an emergency?', a: 'Yes for **adding** an item (the seed adopts it if the manifest later declares the same key) and for retiring one (`isActive`). Then back-port the change to the manifest so the next deploy does not revert or duplicate it.' },
    { q: 'What makes something a "design fork" rather than a code change?', a: 'Two or more valid shapes with different trade-offs that a stakeholder should choose between (cost, consistency, migration risk). The rule is to present them, not to pick silently.' },
  ],
};
