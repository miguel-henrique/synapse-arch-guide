import { useState } from 'react';
import { Callout, Files, PageHeader, Section, Steps, Tabs } from '../components/kit/Kit';
import { Markdown } from '../components/Markdown';
import {
  LEADS_DEMOS,
  OPERATIONS_DEMOS,
  PROOF,
  SYNAPSE_DEMOS,
  TOOLBOX,
  TREE,
  type Demo,
} from '../data/showcase';
import type { Page } from '../types';
import './ShowcasePage.css';

const TABS = [
  { id: 'toolbox', label: 'Your toolbox', icon: '🧰' },
  { id: 'operations', label: 'Operations menu', icon: '🗂️' },
  { id: 'synapse', label: 'Synapse board', icon: '🎫' },
  { id: 'leads', label: 'Leads', icon: '🎯' },
  { id: 'proof', label: 'Proof checklist', icon: '✅' },
];

function DemoBlock({ demo, n }: { demo: Demo; n: number }) {
  return (
    <Section id={demo.id} label={`Demo ${n}`} title={demo.title}>
      <div className="sc-claim">
        <div className="sc-claim__row">
          <span className="sc-claim__tag">What you prove</span>
          <Markdown source={demo.claim} />
        </div>
        <div className="sc-claim__row">
          <span className="sc-claim__tag sc-claim__tag--ui">Start in the UI</span>
          <Markdown source={demo.ui} />
        </div>
      </div>
      <Steps steps={demo.steps} />
    </Section>
  );
}

function DemoList({ demos }: { demos: Demo[] }) {
  return (
    <>
      <nav className="sc-toc">
        {demos.map((d, i) => (
          <a key={d.id} href={`#${d.id}`} onClick={e => { e.preventDefault(); document.getElementById(d.id)?.scrollIntoView({ behavior: 'smooth' }); }}>
            {i + 1}. {d.title}
          </a>
        ))}
      </nav>
      {demos.map((d, i) => <DemoBlock key={d.id} demo={d} n={i + 1} />)}
    </>
  );
}

export default function ShowcasePage({ setPage }: { setPage: (p: Page) => void }) {
  const [tab, setTab] = useState(() => {
    const sub = window.location.hash.split('/')[2];
    return TABS.some(t => t.id === sub) ? sub! : 'toolbox';
  });

  function change(id: string) {
    setTab(id);
    history.replaceState(null, '', `#/showcase/${id}`);
  }

  return (
    <div className="kit-page">
      <PageHeader
        label="Showcase"
        title="Show the backend, not just the screen"
        desc={
          <>
            Demo scripts for presenting the Operations menu, the Synapse board and Leads at the architecture
            level. Each demo starts on a screen, then opens the manifest, the database rows, the code and the
            API behind it, and ends with the doctrine rule it follows. Every query was run on the local
            Postgres on Nov 5 2026 (database <code>ci_consolidated</code>, origin/stage{' '}
            <code>4216f78a68</code>); paths are relative to <code>~/projects/ciweb/ci-connect</code>.
          </>
        }
      >
        <button className="kit-link-btn" onClick={() => setPage('modules')}>The module pages, in depth →</button>
      </PageHeader>

      <Tabs tabs={TABS} active={tab} onChange={change} />

      {tab === 'toolbox' && (
        <>
          <Section
            label="Before you present"
            title="How to reach each layer from the terminal"
            intro={
              <p>
                Set this up once. The demos assume the <code>sdb</code> helper, a <code>$TOKEN</code> and a{' '}
                <code>$WS</code> base URL.
              </p>
            }
          >
            <Steps steps={TOOLBOX} />
            <Callout kind="danger" title="Local databases only">
              Everything here reads the local Docker Postgres. The production database is not reachable this way and
              should not be. For a live production fact, use the read-only Synapse CRM MCP and show counts, not
              customer records.
            </Callout>
          </Section>
          <Section label="Map" title="The folders the demos open">
            <Markdown source={'```text\n' + TREE + '\n```'} />
          </Section>
        </>
      )}

      {tab === 'operations' && (
        <>
          <Callout kind="tip" title="The 30-second version">
            The Operations menu, its department queues and their columns are rows of Lists, written by the module
            seed from <code>modules/operations/module.json</code>. One page component, <code>Browse</code>, renders
            every queue through <code>EntityList</code>.
          </Callout>
          <DemoList demos={OPERATIONS_DEMOS} />
        </>
      )}

      {tab === 'synapse' && (
        <>
          <Callout kind="tip" title="The 30-second version">
            The board is a recipe over <code>todos</code>; its seven charts are recipes parented to it; the columns
            are a STAGE list with transitions; story points are one nullable column plus a List. New charts ship as
            manifest diffs with no component code.
          </Callout>
          <DemoList demos={SYNAPSE_DEMOS} />
          <Files
            items={[
              { path: 'modules/operations/module.json:928', note: 'the board recipe' },
              { path: 'modules/operations/module.json:965-1290', note: 'the seven chart recipes' },
              { path: 'libs/prisma/src/utils/creamPieRecipes.ts', note: 'recipes as list items' },
              { path: 'apps/web-services/src/modules/cream-pie/listAggregate.service.ts', note: 'the chart engine' },
              { path: 'apps/synapse-v3/src/pages/ResourceChartLibrary.tsx', note: 'the Charts library screen' },
            ]}
          />
        </>
      )}

      {tab === 'leads' && (
        <>
          <Callout kind="tip" title="The 30-second version">
            Leads is the generic list over the <code>Lead</code> model as the CRM manifest describes it. Status,
            origin, type and tags are Lists; the saved perspectives are recipes; event membership is an edge row.
          </Callout>
          <DemoList demos={LEADS_DEMOS} />
          <Callout kind="warn" title="PII on screen">
            <code>leads</code> holds real contact names, emails and phones (the local DBs are copies of real data).
            In a demo, select keys and counts; never <code>SELECT *</code>.
          </Callout>
        </>
      )}

      {tab === 'proof' && (
        <Section
          label="Show you followed the rules"
          title="Rule → command → what you should see"
          intro={
            <p>
              Run these from the ci-connect root (or from a task worktree, to check your own branch against stage). An
              empty result is the pass for the <code>grep</code> lines. They are spot checks for a presentation, not a
              replacement for review.
            </p>
          }
        >
          <div className="kit-table-wrap">
            <table className="kit-table">
              <thead><tr><th>Rule</th><th>Source</th><th>Command</th><th>Expect</th></tr></thead>
              <tbody>
                {PROOF.map(p => (
                  <tr key={p.rule}>
                    <td>{p.rule}</td>
                    <td>{p.doctrine}</td>
                    <td><code className="sc-cmd">{p.command}</code></td>
                    <td>{p.expect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout kind="info" title="A suggested running order for a 15-minute demo">
            1) Toolbox: <code>docker ps</code> and the List count query. 2) Operations: the menu rows query next to the
            menu. 3) Synapse: the chart rows query, then <code>git show --stat 8af1faed2b</code>. 4) Leads: the
            pipeline count with labels, then the four recipes. 5) Close on <code>pnpm check:modules</code>.
          </Callout>
        </Section>
      )}
    </div>
  );
}
