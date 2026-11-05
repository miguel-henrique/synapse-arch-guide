import { useState } from 'react';
import { PageHeader, Tabs } from '../components/kit/Kit';
import CoreObjects from '../components/fits/CoreObjects';
import OperationsArea from '../components/fits/OperationsArea';
import RequestAndEvents from '../components/fits/RequestAndEvents';
import type { Page } from '../types';
import './FitsTogetherPage.css';

const TABS = [
  { id: 'objects', label: 'Todos & Projects', icon: '🧱' },
  { id: 'operations', label: 'The Operations area', icon: '🗂️' },
  { id: 'paths', label: 'Request & event paths', icon: '🔀' },
];

export default function FitsTogetherPage({ setPage }: { setPage: (p: Page) => void }) {
  const [tab, setTab] = useState(() => {
    const sub = window.location.hash.split('/')[2];
    return TABS.some(t => t.id === sub) ? sub! : 'objects';
  });

  function change(id: string) {
    setTab(id);
    history.replaceState(null, '', `#/howitfits/${id}`);
  }

  return (
    <div className="kit-page">
      <PageHeader
        label="How it fits together"
        title="The core objects, and the Operations area"
        desc={
          <>
            The Architecture and Deep Dives pages explain the <em>primitives</em> (List, recipe, edge,
            CREAM-PQL) and the platform-wide request path. This page connects them to the two tables
            most of Operations is built on — <code>todos</code> and <code>projects</code> — and shows
            how one module manifest becomes a whole workspace of boards. Read it before the Synapse
            module page; that page is this page applied to one board.
          </>
        }
      >
        <button className="kit-link-btn" onClick={() => setPage('modules')}>See it on the Synapse board →</button>
      </PageHeader>

      <Tabs tabs={TABS} active={tab} onChange={change} />

      {tab === 'objects' && <CoreObjects setPage={setPage} />}
      {tab === 'operations' && <OperationsArea setPage={setPage} />}
      {tab === 'paths' && <RequestAndEvents setPage={setPage} />}
    </div>
  );
}
