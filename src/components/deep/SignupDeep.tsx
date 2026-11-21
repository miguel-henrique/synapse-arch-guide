import { useState } from 'react';
import SvgDiagram, { type DiagramEdge, type DiagramGroup, type DiagramNode } from '../kit/SvgDiagram';
import { Callout, Files, Pill, Section } from '../kit/Kit';

// ─────────────────────────────────────────────────────────────────────────────
// Signup → contract → payment, and how one customer ends up as two accounts.
// Checked against origin/stage f8c288eb30 (Nov 21 2026) plus the two open PRs
// that change it (#1796 deck submit upsert, #1819 one lookup rule), and the
// timestamps of the real cases in prod (names replaced by an invented business).
// ─────────────────────────────────────────────────────────────────────────────

const WS = 'apps/web-services/src';
const OB = 'apps/onboard/src';
const ONB = `${WS}/modules/onboarding`;

// ── 1. the big picture ──────────────────────────────────────────────────────
const mGroups: DiagramGroup[] = [
  { id: 'syn', x: 16, y: 16, w: 232, h: 384, label: 'Synapse (staff)', color: 'var(--purple-l)' },
  { id: 'onb', x: 264, y: 16, w: 300, h: 384, label: "Customer's browser (onboard app)", color: 'var(--teal)' },
  { id: 'api', x: 580, y: 16, w: 300, h: 384, label: 'web-services (public routes)', color: 'var(--orange-l)' },
  { id: 'db', x: 896, y: 16, w: 188, h: 384, label: 'Records', color: 'var(--green)' },
];
const mNodes: DiagramNode[] = [
  { id: 'rep', x: 32, y: 56, w: 200, h: 64, label: 'Sales rep', sub: 'client, lead or opportunity\nrecord in Synapse', color: 'var(--purple-l)',
    detail: <p>The sale starts on a record in Synapse: a client (quick actions, onboarding card), a lead (lead drawer) or the commercial create actions. Nobody "creates a session" by hand. The rep opens or sends a <strong>get-started link</strong> for a deck.</p>,
    files: ['apps/synapse-v3/src/lib/getStartedLink.ts', 'apps/synapse-v3/src/pages/onboardingDecks/deckShareLink.ts'] },
  { id: 'link', x: 32, y: 140, w: 200, h: 92, label: 'Get-started link', sub: '/customize-plan?deckId=…\n&organizationId=…&access=<grant>\nor ?sid=sess_…', color: 'var(--purple-l)',
    detail: <><p>Three shapes:</p><ul className="kit-prose"><li><code>?deckId=18</code>: a fresh start, no account yet.</li><li><code>?organizationId=A&amp;access=&lt;grant&gt;</code>: a proposal for a known account. The <strong>grant</strong> is a signed token (30 days) that proves the link came from us.</li><li><code>?sid=sess_…</code>: resume an existing session (save-progress email).</li></ul><p>An old <code>?organizationId=</code> link with no grant lands on the email-code gate.</p></>,
    files: [`${WS}/utils/appOrigins.ts:36`, `${ONB}/proposalAccess.ts:148`] },
  { id: 'email', x: 32, y: 252, w: 200, h: 64, label: 'Proposal / progress email', sub: 'pubsub system:notification:send', color: 'var(--purple-l)', variant: 'ghost',
    detail: <p>Sending a proposal emails the link (pubsub <code>system:notification:send</code>). The "save my progress" email sends the <code>?sid=</code> form. In production the link opens <code>hydraos.ai/get-started/…</code>.</p>,
    files: [`${ONB}/customize-plan.controller.ts:275`, `${ONB}/saveProgressEmail.ts:69`] },
  { id: 'deck', x: 280, y: 56, w: 268, h: 64, label: 'Deck wizard', sub: 'steps come from the deck schema\nsession created on page load', color: 'var(--teal)',
    detail: <p>The onboard app reads the deck (its steps and blocks), then <code>SessionProvider.createSession</code> calls <code>POST /api/v1/sessions</code>. That is where the <code>OnboardingSession</code> (<code>sess_…</code>) is born. It is tagged with an account only if the caller can prove one (a grant in the link, a signed-in staff member).</p>,
    files: [`${OB}/providers/SessionProvider.tsx`, `${ONB}/onboarding-session.controller.ts:82`] },
  { id: 'next', x: 280, y: 140, w: 268, h: 64, label: 'Every "Next" saves', sub: 'StepProvider → submitForm\nPOST /customize-plan/submit', color: 'var(--teal)',
    detail: <><p><strong>This is the detail that makes duplicates possible.</strong> There is no separate "final submit". Each step advance posts the whole form to the submit route. The server needs only a company <code>name</code> and an <code>industryId</code>, so the <em>first</em> Next that carries those already creates (or finds) the Organization.</p><p>The response's <code>id</code> is then written back into the form (<code>updateFormWithServerData</code>), so later saves update that same account.</p></>,
    files: [`${OB}/providers/StepProvider.tsx:363`, `${OB}/providers/FormProvider.tsx:464`, `${OB}/services/submissionService.ts:713`] },
  { id: 'verify', x: 280, y: 224, w: 130, h: 72, label: 'Website check', sub: 'HydraCustomerVerify\n"We found your account"', color: 'var(--teal)',
    detail: <p>The buyer types their website; <code>POST /customize-plan/customer/verify</code> looks it up. On a match the block writes <code>id = A</code> and <code>name = A's name</code> into the form (<code>applyMatch</code>) and shows "We found your account". On no match it shows "We could not match that website to an account" and reveals the business-name field. The block itself saves nothing.</p>,
    files: [`${OB}/pages/Onboarding/components/steps/hydra/HydraCustomerVerify.tsx:137`, `${OB}/pages/Onboarding/components/steps/hydra/hydraCustomerVerify.blockConfig.ts`] },
  { id: 'code', x: 418, y: 224, w: 130, h: 72, label: 'Email code', sub: '6 digits to the\naddress on file', color: 'var(--teal)',
    detail: <p>Optional. "Email me a code" sends a 6-digit code to the email <em>on file</em> for that account (10 min, 5 tries, 3 sends an hour). Typing it back proves the buyer controls that inbox, and the server returns a <strong>grant</strong> for the account. The browser keeps it in <code>sessionStorage</code> and sends it with every save and with Pay Now.</p>,
    files: [`${WS}/modules/get-started/getStartedPrefill.service.ts:375`, `${WS}/modules/get-started/getStartedPrefill.service.ts:505`, `${OB}/services/organizationAccess.ts:13`] },
  { id: 'pay', x: 280, y: 316, w: 268, h: 64, label: 'Sign, then Pay Now', sub: 'PaymentModal → organizationId = form id', color: 'var(--teal)',
    detail: <p>Signing marks the contract (MSA) signed. Pay Now saves once more only if the form has no <code>id</code> yet; otherwise it goes straight to checkout with <code>organizationId = form id</code>. Whatever account the form names is the one the payment is for.</p>,
    files: [`${OB}/pages/Onboarding/components/PayNowButton.tsx:92`, `${OB}/components/PaymentModal.tsx`] },
  { id: 'lookups', x: 596, y: 224, w: 268, h: 72, label: 'Account lookups', sub: 'prefill · customer verify\norganization-match', color: 'var(--orange-l)',
    detail: <p>Three read-only "who owns this website?" lookups, one per entry point. On stage each has its own matcher, and they do not always agree with each other or with the submit. PR #1819 makes all three use one helper.</p>,
    files: [`${WS}/modules/get-started/getStartedPrefill.service.ts:177`, `${ONB}/customerVerification.ts:76`, `${ONB}/publicLookups.controller.ts`] },
  { id: 'submit', x: 596, y: 56, w: 268, h: 148, label: 'submitOnboarding', sub: '1. is the claimed id proven?\n2. if not: drop it, run dedupe\n3. found → file on it\n4. nothing → create a NEW account', color: 'var(--orange-l)',
    detail: <><p>The public route cannot trust an id the browser sends (anyone could type one). So:</p><ol className="kit-prose"><li>A claimed id is kept only with <strong>proof</strong> for it, if it is not the deck partner, and if the typed website fits it.</li><li>Otherwise the id is dropped and a dedupe runs. On stage: <code>findOrganizationForWebsite</code> = same website <em>and</em> exactly the same business name.</li><li>Found: the sale is filed on it. Without proof its details stay untouched.</li><li>Nothing found: <code>submitNewOrganization</code> creates a new account. <strong>This is the only place a deck creates an account.</strong></li></ol></>,
    files: [`${ONB}/onboarding-submission.service.ts:150-202`, `${ONB}/submissionCreateFlow.ts`, `${ONB}/submissionUpdateFlow.ts`, `${ONB}/organizationDedupe.ts`] },
  { id: 'guard', x: 596, y: 316, w: 268, h: 64, label: 'Payment guard', sub: 'checkoutOrganizationProof\nany proof → Stripe · none → 404', color: 'var(--orange-l)',
    detail: <p>Before a payment intent is created, the guard asks: may <em>this session</em> pay for account N? See the proof table below. With no proof it answers <strong>404 "Organization N not found"</strong> on purpose (it must not reveal which ids exist), records a <code>payment.refused</code> activity on the session and emits <code>onboarding.checkout.refused</code>.</p>,
    files: [`${ONB}/checkoutOrganizationProof.ts`, `${ONB}/checkoutRefusal.ts:26`] },
  { id: 'org', x: 912, y: 56, w: 156, h: 56, label: 'Organization', sub: 'the account', color: 'var(--green)',
    detail: <p>The customer's account. Stage "opportunity" when a deck creates it. A merged copy keeps a row with <code>merged_into_id</code> set and its website/email/phone cleared (PR #1667).</p> },
  { id: 'sess', x: 912, y: 132, w: 156, h: 72, label: 'OnboardingSession', sub: 'sess_…\norganizationId\nagreementId', color: 'var(--green)',
    detail: <p>One per wizard visit. <code>organizationId</code> = the account it is filed on. <code>agreementId</code> = the contract this session signed. Both are what the payment guard reads.</p> },
  { id: 'agr', x: 912, y: 224, w: 156, h: 72, label: 'ServiceAgreement', sub: 'the contract / MSA\ncontractId', color: 'var(--green)',
    detail: <p>Called "contract" or "MSA" in the UI and in code (<code>services/serviceContracts.ts</code> is the facade). Written by the deck save (<code>createServiceContract</code>), signed by <code>markContractMsaSigned</code>, linked to the session by <code>attachSessionToContract</code>.</p>,
    files: [`${ONB}/contractMsaLifecycle.ts:327`, 'libs/prisma/src/schema/organization/ServiceAgreement.prisma'] },
  { id: 'stripe', x: 912, y: 316, w: 156, h: 64, label: 'Stripe', sub: 'customer + payment', color: 'var(--green)',
    detail: <p>The Stripe customer is linked to the account at payment (<code>linkOrgStripeCustomerIfUnlinked</code>). A refused payment never reaches Stripe, which is why Finance shows no failure.</p> },
];
const mEdges: DiagramEdge[] = [
  { from: 'rep', to: 'link', color: 'var(--purple-l)' },
  { from: 'link', to: 'email', color: 'var(--purple-l)', dashed: true },
  { from: 'email', to: 'deck', label: 'customer opens', color: 'var(--purple-l)', curve: -30 },
  { from: 'deck', to: 'next', color: 'var(--teal)' },
  { from: 'next', to: 'submit', label: 'POST', color: 'var(--teal)' },
  { from: 'verify', to: 'lookups', color: 'var(--teal)', curve: 20 },
  { from: 'code', to: 'lookups', label: 'grant', color: 'var(--teal)' },
  { from: 'pay', to: 'guard', color: 'var(--teal)' },
  { from: 'submit', to: 'org', label: 'find / create', color: 'var(--orange-l)' },
  { from: 'submit', to: 'sess', color: 'var(--orange-l)' },
  { from: 'submit', to: 'agr', color: 'var(--orange-l)' },
  { from: 'guard', to: 'sess', label: 'reads', color: 'var(--orange-l)', dashed: true },
  { from: 'guard', to: 'stripe', color: 'var(--orange-l)' },
];

// ── 2. the walkthrough: one signup, three versions of the code ──────────────
type Mode = 'stage' | 'prs' | 'target';
type Tone = 'ok' | 'warn' | 'bad' | 'info';
interface Beat {
  step: string;
  customer: string;
  server: string;
  form: string;
  records: { a: string; b: string | null; session: string; contract: string };
  tone: Tone;
}

const MODE_LABEL: Record<Mode, string> = {
  stage: 'Before the fix (how it broke)',
  prs: 'With #1796 + #1819',
  target: 'Target: no account before we know who it is',
};

const BEATS: Record<Mode, Beat[]> = {
  stage: [
    { step: '0 · Link opened', customer: 'Opens the rep\'s ?deckId= link. The account "Summit Heating and Air Conditioning" (A, summitheating.com) has been a client since July.',
      server: 'POST /sessions creates sess_… with no account (no proof in the link).', form: 'id: —', tone: 'info',
      records: { a: 'A exists', b: null, session: 'no account', contract: '—' } },
    { step: '1 · Company step → Next', customer: 'Types "Summit Heating & Air" and picks HVAC.',
      server: 'Next = save. No id, so the dedupe runs: findOrganizationForWebsite needs the same website AND exactly the same name. No website yet (or "& Air" ≠ "and Air Conditioning") → nothing found → submitNewOrganization creates B and files the session on B.',
      form: 'id: B (written back from the response)', tone: 'bad',
      records: { a: 'A untouched', b: 'B created (copy)', session: 'on B', contract: '—' } },
    { step: '2 · Website check', customer: 'Types summitheating.com. Sees "We found your account".',
      server: 'customer/verify → resolveOrganizationIdByHost (hosting record first) → A. The block writes id = A and name = A\'s name into the form. Nothing is saved yet.',
      form: 'id: A, name: A\'s name', tone: 'warn',
      records: { a: 'A', b: 'B', session: 'on B', contract: '—' } },
    { step: '3 · Plan step → Next', customer: 'Chooses the plan.',
      server: 'Save with id A but no proof (no email code; the session is on B, not A) → id dropped → dedupe again. Now the name is A\'s own name, so website + name matches A. The contract is written on A, without proof, so A\'s details are not changed. The session is not moved: it stays on B.',
      form: 'id: A', tone: 'warn',
      records: { a: 'A', b: 'B', session: 'on B · no agreementId', contract: 'on A' } },
    { step: '4 · Sign', customer: 'Signs the agreement.', server: 'The contract on A is marked signed.',
      form: 'id: A', tone: 'info', records: { a: 'A', b: 'B', session: 'on B', contract: 'on A · signed' } },
    { step: '5 · Pay Now', customer: 'Clicks Pay Now and gets "Organization A not found".',
      server: 'Guard for A: no grant · session is on B · not staff · session has no agreement on A · no finished merge → 404, payment.refused recorded. Nothing reaches Stripe.',
      form: 'id: A', tone: 'bad', records: { a: 'A', b: 'B', session: 'on B', contract: 'on A · signed' } },
    { step: 'Repair (by hand)', customer: 'Reopens the same link and pays.',
      server: 'Staff merge B into A (Organizations → Merge). Every record moves to A, including the session. Proof 2 (session on A) now passes.',
      form: 'id: A', tone: 'ok', records: { a: 'A', b: 'B merged into A', session: 'on A', contract: 'on A · signed' } },
  ],
  prs: [
    { step: '0 · Link opened', customer: 'Same link, same customer.', server: 'Session created with no account.', form: 'id: —', tone: 'info',
      records: { a: 'A exists', b: null, session: 'no account', contract: '—' } },
    { step: '1 · Company step → Next', customer: 'Types "Summit Heating & Air" and picks HVAC.',
      server: 'findOrganizationForDeckSubmit: no lookup id yet. If the website is on this step, rule 3 (a similar name AND the same website or phone) finds A. If this step has no website and no matching phone, nothing matches → B is still created.',
      form: 'id: A or B (depends on the step\'s fields)', tone: 'warn',
      records: { a: 'A', b: 'B only if no website/phone here', session: 'on A, or on B', contract: '—' } },
    { step: '2 · Website check', customer: 'Types summitheating.com.',
      server: 'One rule for every lookup (#1819): same-business copies resolve to one account (Stripe-linked, then oldest); merged copies never match. Form gets id = A.',
      form: 'id: A', tone: 'ok', records: { a: 'A', b: '(B if step 1 made it)', session: 'unchanged', contract: '—' } },
    { step: '3 · Plan step → Next', customer: 'Chooses the plan.',
      server: 'The unproven id A is kept as a hint (lookupId). It holds the typed website and the holders are one business → rule 1 answers A. The contract is filed on A and the session\'s contract is A\'s.',
      form: 'id: A', tone: 'ok', records: { a: 'A', b: '(B if step 1 made it)', session: 'agreement on A', contract: 'on A' } },
    { step: '5 · Pay Now', customer: 'Pays.',
      server: 'Guard for A passes on the session\'s own contract (proof 4). A copy B made at step 1 still exists, holding nothing, and still needs a merge.',
      form: 'id: A', tone: 'ok', records: { a: 'A', b: '(empty B)', session: 'agreement on A', contract: 'on A · paid' } },
  ],
  target: [
    { step: '0 · Link opened', customer: 'Same link.', server: 'Session created with no account.', form: 'id: —', tone: 'info',
      records: { a: 'A exists', b: null, session: 'no account', contract: '—' } },
    { step: '1 · Company step → Next', customer: 'Types "Summit Heating & Air" and picks HVAC.',
      server: 'Progress is saved on the session only. We do not know who this is yet (no website, no proof), so no account is created or picked.',
      form: 'id: —', tone: 'ok', records: { a: 'A', b: null, session: 'draft, no account', contract: '—' } },
    { step: '2 · Website check', customer: 'Types summitheating.com.', server: 'One lookup rule → A.', form: 'id: A (hint)', tone: 'ok',
      records: { a: 'A', b: null, session: 'draft', contract: '—' } },
    { step: '3 · First save with an identity', customer: 'Next.',
      server: 'Now the save has a website: findOrganizationForDeckSubmit → A. The session and the contract are filed on A. A new account is created only here, and only when nothing matches.',
      form: 'id: A', tone: 'ok', records: { a: 'A', b: null, session: 'on A', contract: 'on A' } },
    { step: '5 · Pay Now', customer: 'Pays.', server: 'Session is on A → proof 2 passes. No copy, nothing to merge.', form: 'id: A', tone: 'ok',
      records: { a: 'A', b: null, session: 'on A', contract: 'on A · paid' } },
  ],
};

const TONE: Record<Tone, string> = { ok: 'var(--green)', warn: 'var(--yellow)', bad: 'var(--pink)', info: 'var(--blue)' };

function Walkthrough() {
  const [mode, setMode] = useState<Mode>('stage');
  const [i, setI] = useState(0);
  const beats = BEATS[mode];
  const b = beats[Math.min(i, beats.length - 1)];
  const pick = (m: Mode) => { setMode(m); setI(0); };
  return (
    <div className="su-walk">
      <div className="ps-sim__radio">
        {(Object.keys(MODE_LABEL) as Mode[]).map(m => (
          <button key={m} className={`ps-chip ${mode === m ? 'ps-chip--on' : ''}`} onClick={() => pick(m)}>{MODE_LABEL[m]}</button>
        ))}
      </div>
      <ol className="su-walk__rail">
        {beats.map((x, k) => (
          <li key={k}>
            <button className={`su-walk__dot ${k === i ? 'su-walk__dot--on' : ''}`} style={{ '--tone': TONE[x.tone] } as React.CSSProperties} onClick={() => setI(k)}>
              {x.step}
            </button>
          </li>
        ))}
      </ol>
      <div className="su-walk__card" style={{ '--tone': TONE[b.tone] } as React.CSSProperties}>
        <div className="su-walk__row"><span>Customer</span><p>{b.customer}</p></div>
        <div className="su-walk__row"><span>Server</span><p>{b.server}</p></div>
        <div className="su-walk__row"><span>Form holds</span><p><code>{b.form}</code></p></div>
        <div className="su-walk__records">
          <div className="su-rec"><b>Account A</b>{b.records.a}</div>
          <div className={`su-rec ${b.records.b ? 'su-rec--bad' : 'su-rec--none'}`}><b>Account B</b>{b.records.b ?? 'does not exist'}</div>
          <div className="su-rec"><b>Session</b>{b.records.session}</div>
          <div className="su-rec"><b>Contract</b>{b.records.contract}</div>
        </div>
        <div className="su-walk__nav">
          <button className="ps-chip" disabled={i === 0} onClick={() => setI(i - 1)}>← Back</button>
          <button className="ps-chip ps-chip--on" disabled={i >= beats.length - 1} onClick={() => setI(i + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── 3. which account does the submit pick? ──────────────────────────────────
type Web = 'none' | 'A' | 'other';
type Name = 'exact' | 'similar' | 'different';
interface Pick { who: 'A' | 'NEW'; rule: string; owned: boolean; pay: string }

function decide(s: { pr: boolean; lookup: boolean; proof: boolean; web: Web; name: Name; phone: boolean; franchise: boolean }): Pick {
  if (s.lookup && s.proof && s.web === 'A') {
    return { who: 'A', rule: 'claimed id is proven and the website fits it', owned: true, pay: 'passes (grant / session on A)' };
  }
  if (s.pr && s.lookup && s.web === 'A' && !s.franchise) {
    return { who: 'A', rule: 'rule 1 · lookup: the id the website check found holds this website, one business', owned: false, pay: 'passes on the session\'s own contract (proof 4)' };
  }
  if (s.web === 'A' && s.name === 'exact') {
    return { who: 'A', rule: `${s.pr ? 'rule 2 · ' : ''}website + exactly the same business name (findOrganizationForWebsite)`, owned: false, pay: 'passes on the session\'s own contract (proof 4)' };
  }
  if (s.pr && s.name !== 'different' && (s.web === 'A' || s.phone)) {
    return { who: 'A', rule: `rule 3 · corroborated: a similar name and the same ${s.web === 'A' ? 'website' : 'phone'}`, owned: false, pay: 'passes on the session\'s own contract (proof 4)' };
  }
  return { who: 'NEW', rule: 'nothing matched → submitNewOrganization', owned: true, pay: 'a second account exists. If the form later names A, Pay Now is refused' };
}

function Tog({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button className={`ps-tog ${on ? 'ps-tog--on' : ''}`} onClick={() => set(!on)} aria-pressed={on}>
      <span className="ps-tog__box">{on ? '✓' : ''}</span>{label}
    </button>
  );
}

function PickSim() {
  const [pr, setPr] = useState(false);
  const [lookup, setLookup] = useState(true);
  const [proof, setProof] = useState(false);
  const [web, setWeb] = useState<Web>('A');
  const [name, setName] = useState<Name>('similar');
  const [phone, setPhone] = useState(false);
  const [franchise, setFranchise] = useState(false);
  const r = decide({ pr, lookup, proof, web, name, phone, franchise });
  const good = r.who === 'A';
  return (
    <div className="ps-sim">
      <div className="ps-sim__ctl">
        <div className="ps-sim__h">The save</div>
        <div className="ps-sim__radio"><span>Code:</span>
          <button className={`ps-chip ${!pr ? 'ps-chip--on' : ''}`} onClick={() => setPr(false)}>stage today</button>
          <button className={`ps-chip ${pr ? 'ps-chip--on' : ''}`} onClick={() => setPr(true)}>with #1796</button>
        </div>
        <Tog on={lookup} set={setLookup} label="The website check found A (form carries id A)" />
        <Tog on={proof} set={setProof} label="Buyer proved A (email code, or staff signed in)" />
        <div className="ps-sim__radio"><span>Website typed:</span>
          {(['none', 'A', 'other'] as Web[]).map(w => <button key={w} className={`ps-chip ${web === w ? 'ps-chip--on' : ''}`} onClick={() => setWeb(w)}>{w === 'A' ? "A's site" : w}</button>)}
        </div>
        <div className="ps-sim__radio"><span>Name typed:</span>
          {(['exact', 'similar', 'different'] as Name[]).map(n => <button key={n} className={`ps-chip ${name === n ? 'ps-chip--on' : ''}`} onClick={() => setName(n)}>{n}</button>)}
        </div>
        <Tog on={phone} set={setPhone} label="Phone typed = A's phone" />
        <Tog on={franchise} set={setFranchise} label="Website is shared by several franchisees" />
      </div>
      <div className="ps-sim__out">
        <div className="ps-sim__h">submitOnboarding decides</div>
        <ol className="ps-steps">
          <li style={{ '--tone': 'var(--blue)' } as React.CSSProperties}><b>Claimed id</b>{lookup ? (proof && web === 'A' ? 'Kept: proven and the website fits.' : pr ? 'Not proven → kept only as a hint (lookupId), then dropped as an id.' : 'Not proven → dropped completely.') : 'None.'}</li>
          <li style={{ '--tone': good ? 'var(--green)' : 'var(--pink)' } as React.CSSProperties}><b>Rule that answered</b>{r.rule}</li>
          <li style={{ '--tone': 'var(--blue)' } as React.CSSProperties}><b>May it change A's details?</b>{r.who === 'A' ? (r.owned ? 'Yes: the buyer proved the account.' : 'No: the sale is filed on A, but name, website, phone and contacts stay as they are.') : 'n/a'}</li>
          <li style={{ '--tone': good ? 'var(--green)' : 'var(--pink)' } as React.CSSProperties}><b>Pay Now</b>{r.pay}</li>
        </ol>
        <div className="ps-result" style={{ '--tone': good ? 'var(--green)' : 'var(--pink)' } as React.CSSProperties}>
          {good ? 'Filed on account A · no copy' : 'NEW account created · duplicate'}
        </div>
      </div>
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────────────
export default function SignupDeep() {
  return (
    <>
      <Section
        label="The whole journey"
        title="From the sales rep's link to the payment"
        intro={
          <p>
            A sale crosses three apps: <strong>Synapse</strong> (where the rep works), the <strong>onboard app</strong> (the
            deck the customer fills in, served at <code>hydraos.ai/get-started</code>) and <strong>web-services</strong> (the API
            that writes the records). The customer is never logged in. Click any box.
          </p>
        }
      >
        <SvgDiagram width={1100} height={416} groups={mGroups} nodes={mNodes} edges={mEdges} minWidth={860} initial="next"
          hint="Click a box for what it does and where the code is." />
      </Section>

      <Section label="Vocabulary" title="The four records, and what a 'grant' is">
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Word</th><th>What it is</th><th>Who creates it</th></tr></thead>
            <tbody>
              <tr><td>Account / organization</td><td><code>Organization</code>: the customer business.</td><td>A deck save when nothing matches (<code>submitNewOrganization</code>), the CRM import, Get Started, catalog checkout, staff.</td></tr>
              <tr><td>Session</td><td><code>OnboardingSession</code> <code>sess_…</code>: one visit to a deck. Holds the account it is filed on and the contract it signed.</td><td>The onboard app, when the deck page loads.</td></tr>
              <tr><td>Contract / MSA / agreement</td><td><code>ServiceAgreement</code> with a <code>contractId</code> (e.g. OSC-6822). "MSA" is the signed master agreement.</td><td>The deck save once a plan is chosen; signed at the Sign step.</td></tr>
              <tr><td>Grant</td><td>A signed token <code>&lt;expiry&gt;.&lt;HMAC(secret, account id, expiry)&gt;</code>. Proof that this browser may act for one account. Not a login.</td><td>Our server only: in proposal links (30 days), after the email code (7 days), after a save the buyer owns.</td></tr>
            </tbody>
          </table>
        </div>
        <Callout kind="info" title="Is this an authentication mechanism?">
          Not a login. The buyer never has a password. It is <strong>proof of ownership per account</strong>: the public
          routes refuse to change or charge an account unless the request shows one of a few proofs that it belongs to
          this buyer. That rule exists so that a stranger who types a client's website or id cannot rename the client or
          pay into its account. The duplicates are a side effect of that rule being strict while the "who is this?"
          lookups were loose and inconsistent.
        </Callout>
      </Section>

      <Section
        label="Proof"
        title="The checks: may this browser act for account A?"
        intro={<p>The save and the payment ask the same question with slightly different lists. One "yes" is enough.</p>}
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>#</th><th>Proof</th><th>Save (submit)</th><th>Pay Now (guard)</th><th>How a buyer gets it</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>A valid grant for A</td><td>yes</td><td>yes</td><td>Proposal link with <code>access=</code>, or the email code</td></tr>
              <tr><td>2</td><td>The session is filed on A</td><td>yes</td><td>yes</td><td>A save that created A or proved it</td></tr>
              <tr><td>3</td><td>Signed-in staff or account member</td><td>yes</td><td>yes</td><td>Never in the public checkout</td></tr>
              <tr><td>4</td><td>The session's own contract is on A</td><td>—</td><td>yes</td><td>A save filed the contract on A</td></tr>
              <tr><td>5</td><td>The session's account was merged into A</td><td>—</td><td>yes</td><td>Staff merged the copy</td></tr>
            </tbody>
          </table>
        </div>
        <Files items={[
          { path: `${ONB}/submissionAccess.ts:129`, note: 'callerHasOrganizationProof (the save)' },
          { path: `${ONB}/checkoutOrganizationProof.ts`, note: 'the payment guard: grant, session, staff, sessionSaleProof:101, mergedSessionProof:144' },
          { path: `${ONB}/proposalAccess.ts:83`, note: 'signProposalAccess / verifyProposalAccess' },
        ]} />
      </Section>

      <Section
        label="Right flow vs wrong flow"
        title="One signup, step by step"
        intro={
          <p>
            An invented client, <em>Summit Heating and Air Conditioning</em> (account A), signs up again through a deck and types
            its name a little differently. Step through it under three versions of the code. The "before" version follows
            the real cases: in the latest one the copy was created <strong>6 minutes</strong> into the signup, and the
            contract was written on the real account <strong>2 minutes later</strong>.
          </p>
        }
      >
        <Walkthrough />
        <Callout kind="warn" title="The root cause in one sentence">
          Two different pieces of code answer "which account is this?" (the website check in the browser and the dedupe in the
          save), they used different rules, and the save runs on <em>every</em> Next, so it can create an account before the
          website check has even run.
        </Callout>
      </Section>

      <Section
        label="Simulator"
        title="Which account does a save pick?"
        intro={<p>The decision inside <code>submitOnboarding</code> for one save, on stage today and with PR #1796. Try the cases that broke: a similar name on A's own website, with and without the website check.</p>}
      >
        <PickSim />
        <Files items={[
          { path: `${ONB}/organizationDedupe.ts`, note: 'findOrganizationForWebsite (stage); findOrganizationForDeckSubmit (#1796); resolveWebsiteHolder (#1819)' },
          { path: 'libs/prisma/src/utils/organizationIdentity.ts:319', note: 'findCorroboratedOrganization (rule 3, shared with the CRM import and the duplicate detector)' },
        ]} />
        <Callout kind="tip" title="What it never matches, on purpose">
          <strong>Email alone</strong> (a contact email names a person: agencies and partners type their own),{' '}
          <strong>the deck's partner</strong>, <strong>merged copies</strong>, <strong>locations</strong> (child accounts),
          and <strong>a guess between franchisees</strong> sharing one website. A duplicate can be merged later; a sale
          filed on the wrong company is much worse.
        </Callout>
      </Section>

      <Section label="Who decides" title="Every place that answers 'who owns this website?'">
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Where</th><th>Function</th><th>Rule on stage</th><th>After #1819</th></tr></thead>
            <tbody>
              <tr><td>Email-code prefill</td><td><code>getStartedPrefill.findOrganizationByHost</code></td><td>site name, website or hosting asset. <strong>Two live holders → refuses</strong> ("unknown site") and files a duplicate candidate.</td><td>shared helper; same-business copies → one answer</td></tr>
              <tr><td>Current-customer check (deck)</td><td><code>customerVerification.resolveOrganizationIdByHost</code></td><td>hosting record first (no merged/location filter), then <code>findWebsiteHolder</code>. Returns "unmatched" for opportunity accounts.</td><td>shared helper</td></tr>
              <tr><td>Business-info search</td><td><code>publicLookups</code> <code>GET /organization-match</code></td><td><code>findWebsiteHolder</code>; fills name + website only</td><td>shared helper</td></tr>
              <tr><td>The save</td><td><code>submitOnboarding</code></td><td>website (<code>currentWebsiteUrl</code> only) <strong>and</strong> exact business name</td><td>#1796: lookup hint → website+name → similar name with same website/phone</td></tr>
            </tbody>
          </table>
        </div>
        <p className="kit-prose">
          The hosting record and site name were visible to the lookups but not to the save, and the save also demanded the
          exact name. That gap is exactly where the copies came from.
        </p>
      </Section>

      <Section label="The fixes" title="What was built, in order">
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>PR</th><th>State</th><th>What it does</th><th>Kind</th></tr></thead>
            <tbody>
              <tr><td>#1667</td><td><Pill color="var(--green)">merged</Pill></td><td>A merged copy loses its website, email, phone and site name, so no lookup finds the dead copy again.</td><td>clean-up</td></tr>
              <tr><td>#1671</td><td><Pill color="var(--green)">merged</Pill></td><td>Email-code lookup skips merged copies. Its "refuse when two accounts hold the site" part is replaced by #1819.</td><td>lookup</td></tr>
              <tr><td>#1735 · #1736</td><td><Pill color="var(--green)">merged</Pill></td><td>A refused payment is recorded on the session ("Payment refused" chip, <code>organization_unproven</code>), and the customer sees a real message with the session reference.</td><td>diagnostics</td></tr>
              <tr><td>#1759</td><td><Pill color="var(--text-dim)">closed</Pill></td><td>Email the rep when a split happens. Review: do not alert about the copy, stop making it.</td><td>dropped</td></tr>
              <tr><td>#1796</td><td><Pill color="var(--yellow)">in review</Pill></td><td>The save finds the existing account (lookup hint, website+name, corroborated name) and files the sale on it without rewriting it.</td><td><strong>root fix</strong></td></tr>
              <tr><td>#1819</td><td><Pill color="var(--yellow)">in review</Pill></td><td>All three lookups use one rule and the save's rule agrees with them. No more refusals for same-business copies.</td><td><strong>root fix</strong></td></tr>
              <tr><td>next</td><td><Pill color="var(--blue)">planned</Pill></td><td>A deck save creates no account until it knows who the buyer is (a website or proof); before that, progress lives on the session.</td><td><strong>closes the last gap</strong></td></tr>
              <tr><td>next</td><td><Pill color="var(--blue)">planned</Pill></td><td>Find and merge the copies already in prod; a person merges each pair.</td><td>data</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section label="Still open" title="Where a copy can still be made">
        <ul className="kit-prose">
          <li><strong>The first Next.</strong> A step with a name and an industry but no website and no matching phone still creates an account, even with #1796. That is the planned fix above.</li>
          <li><strong>Deck copies are invisible to duplicate review.</strong> <code>submitNewOrganization</code> does not emit <code>organization:created</code>, so the duplicate-candidate handler never scores them.</li>
          <li><strong>Other entry points</strong> match by email only: Get Started (<code>getStarted.service.ts</code>, <code>ensureProspectOrganization</code>) and catalog checkout (<code>catalogContract.ts</code>). They have no merged filter until the #1667 backfill runs in prod.</li>
          <li><strong>On purpose:</strong> a new website, an unrelated name and a different phone create a new account. Guessing there would file a sale on another company.</li>
        </ul>
        <Callout kind="real" title="If it happens anyway: the repair">
          Confirm: the contract's account ≠ the session's account. Then Synapse → Organizations → tick both → <strong>Merge
          organizations</strong>, keeping the older account. The customer reopens the same link and pays. Full runbook:
          Workstation → Knowledge → <em>Payment refused: customer split across two accounts</em>.
        </Callout>
      </Section>
    </>
  );
}
