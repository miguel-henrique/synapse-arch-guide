import { useState } from 'react';
import { PageHeader, Tabs } from '../components/kit/Kit';
import LeadsModule from '../components/modules/LeadsModule';
import InfraModule from '../components/modules/InfraModule';
import SynapseModule from '../components/modules/SynapseModule';
import type { Page } from '../types';
import './ModulesPage.css';

const TABS = [
  { id: 'leads', label: 'Leads (built)', icon: '🎯' },
  { id: 'synapse', label: 'Synapse (Get started)', icon: '🎫' },
  { id: 'infra', label: 'Infrastructure (legacy)', icon: '🖥️' },
];

export default function ModulesPage({ setPage }: { setPage?: (p: Page) => void }) {
  const [tab, setTab] = useState(() => {
    const sub = window.location.hash.split('/')[2];
    return TABS.some(t => t.id === sub) ? sub! : 'leads';
  });
  function change(id: string) {
    setTab(id);
    history.replaceState(null, '', `#/modules/${id}`);
  }
  return (
    <div className="kit-page">
      <PageHeader
        label="Modules"
        title="Real modules, taken apart"
        desc={
          <>
            Two modules that follow the architecture (Leads, in Sales &amp; Marketing, and the Synapse
            ticket board, in Operations) and one that does not yet (Infrastructure). Same questions for each: where is it declared, which rows drive it,
            which code renders it, and what would you touch to change it.
          </>
        }
      >
        {setPage && <button className="kit-link-btn" onClick={() => setPage('tutorials')}>Step-by-step changes →</button>}
      </PageHeader>
      <Tabs tabs={TABS} active={tab} onChange={change} />
      {tab === 'leads' ? <LeadsModule /> : tab === 'synapse' ? <SynapseModule /> : <InfraModule />}
    </div>
  );
}
