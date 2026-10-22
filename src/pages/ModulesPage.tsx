import { useState } from 'react';
import { PageHeader, Tabs } from '../components/kit/Kit';
import LeadsModule from '../components/modules/LeadsModule';
import InfraModule from '../components/modules/InfraModule';
import type { Page } from '../types';
import './ModulesPage.css';

const TABS = [
  { id: 'leads', label: 'Leads (built)', icon: '🎯' },
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
        title="Two real modules, taken apart"
        desc={
          <>
            One module that follows the architecture (Leads, in Sales &amp; Marketing) and one that does
            not yet (Infrastructure). Same questions for both: where is it declared, which rows drive it,
            which code renders it, and what would you touch to change it.
          </>
        }
      >
        {setPage && <button className="kit-link-btn" onClick={() => setPage('tutorials')}>Step-by-step changes →</button>}
      </PageHeader>
      <Tabs tabs={TABS} active={tab} onChange={change} />
      {tab === 'leads' ? <LeadsModule /> : <InfraModule />}
    </div>
  );
}
