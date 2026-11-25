import { useState } from 'react';
import { PageHeader, Tabs } from '../components/kit/Kit';
import SystemMap from '../components/deep/SystemMap';
import RequestLifecycle from '../components/deep/RequestLifecycle';
import UrlAnatomy from '../components/deep/UrlAnatomy';
import RelationshipDeep from '../components/deep/RelationshipDeep';
import TransformDeep from '../components/deep/TransformDeep';
import SchemaB from '../components/deep/SchemaB';
import PubSubDeep from '../components/deep/PubSubDeep';
import SignupDeep from '../components/deep/SignupDeep';
import BillingDeep from '../components/deep/BillingDeep';
import type { Page } from '../types';
import './DeepDivesPage.css';

const TABS = [
  { id: 'map', label: 'System Map', icon: '🗺️' },
  { id: 'lifecycle', label: 'Request Lifecycle', icon: '🔄' },
  { id: 'url', label: 'URL Anatomy', icon: '🔗' },
  { id: 'rel', label: 'Relationships', icon: '🕸️' },
  { id: 'transform', label: 'TRANSFORM', icon: '🧮' },
  { id: 'schemab', label: 'Lists all the way down', icon: '🧬' },
  { id: 'pubsub', label: 'PubSub', icon: '📣' },
  { id: 'signup', label: 'Signup → payment', icon: '🧾' },
  { id: 'billing', label: 'Deck billing', icon: '💳' },
];

export default function DeepDivesPage({ setPage }: { setPage: (p: Page) => void }) {
  const [tab, setTab] = useState(() => {
    const sub = window.location.hash.split('/')[2];
    return TABS.some(t => t.id === sub) ? sub! : 'map';
  });

  function change(id: string) {
    setTab(id);
    history.replaceState(null, '', `#/deepdives/${id}`);
  }

  return (
    <div className="kit-page">
      <PageHeader
        label="Deep Dives"
        title="How the machine actually runs"
        desc={
          <>
            The Architecture page explains the <em>ideas</em>. These pages show the <em>machinery</em>{' '}
            with diagrams and playgrounds built from the real code: where every piece lives, what
            happens to a URL on its way to the database, how filters reach across relationships, and
            the two ListTypes that are hardest to picture.
          </>
        }
      >
        <button className="kit-link-btn" onClick={() => setPage('modules')}>See it applied to Leads →</button>
      </PageHeader>

      <Tabs tabs={TABS} active={tab} onChange={change} />

      {tab === 'map' && <SystemMap />}
      {tab === 'lifecycle' && <RequestLifecycle />}
      {tab === 'url' && <UrlAnatomy />}
      {tab === 'rel' && <RelationshipDeep />}
      {tab === 'transform' && <TransformDeep />}
      {tab === 'schemab' && <SchemaB />}
      {tab === 'pubsub' && <PubSubDeep />}
      {tab === 'signup' && <SignupDeep />}
      {tab === 'billing' && <BillingDeep />}
    </div>
  );
}
