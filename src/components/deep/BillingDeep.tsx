import type { ReactNode } from 'react';
import { Callout, Files, Pill, Section } from '../kit/Kit';

// ─────────────────────────────────────────────────────────────────────────────
// Deck sale → contract → first payment → monthly billing, and how a signed
// $250/mo hosting line disappeared before the customer paid.
// Checked against origin/stage 938fc0aa37 and origin/main aab02ec6b4
// (Nov 25 2026; every billing file cited is identical on both), prod audit
// events, the stored PDFs and the payment row of the real case. The business
// is invented ("Bright Brush Painting"); times, amounts and code are real.
// ─────────────────────────────────────────────────────────────────────────────

const WS = 'apps/web-services/src';
const OB = 'apps/onboard/src';
const BILL = `${WS}/modules/billing`;
const SYN = 'https://synapse.ciwebgroup.com';

function Row({ t, what, proof }: { t: string; what: ReactNode; proof: ReactNode }) {
  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}><code>{t}</code></td>
      <td>{what}</td>
      <td>{proof}</td>
    </tr>
  );
}

export default function BillingDeep() {
  return (
    <>
      <Callout kind="info" title="Read this first">
        Billing for a deck sale is <strong>not one record</strong>. The contract, its lines, the signed PDF, the first
        invoice, the payment, the subscription and the monthly charge are all separate rows. Each is written at a different
        moment by a different piece of code. Most "the bill is wrong" questions are really "which of these rows changed, and
        when?" This page names every row, shows when it is written, and walks through one real case.
      </Callout>

      <Section label="Vocabulary" title="The seven things that make up a deck sale's billing">
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Thing</th><th>Table</th><th>What it holds</th><th>Written by</th></tr></thead>
            <tbody>
              <tr><td>Deck session</td><td><code>OnboardingSession</code></td><td>The customer's cart in <code>formData.getStarted.order</code> (tier, <code>websitePending</code>, quantities). <code>agreementId</code> points at the contract.</td><td>every autosave of the onboard app</td></tr>
              <tr><td>Contract (MSA, "OSC-…")</td><td><code>ServiceAgreement</code></td><td>Stage (<code>proposal → signed → active</code>), <code>monthlyCost</code>, <code>signedAt</code>, <code>paidAt</code>, and <code>dataSnapshot</code> (the plan lines and totals the billing job reads).</td><td>every deck save; signing; payment</td></tr>
              <tr><td>Contract lines</td><td><code>ServiceAgreementItem</code></td><td>One row per product. Website maintenance is <code>itemType = WEBSITE_HOSTING</code>.</td><td><strong>deleted and recreated on every deck save</strong></td></tr>
              <tr><td>Signed PDF</td><td>object storage <code>&lt;domain&gt;/agreements/&lt;contractId&gt;/</code></td><td>The document the customer signed (with the drawn signature image).</td><td>signing, and again at checkout</td></tr>
              <tr><td>First invoice ("CI-…")</td><td><code>Invoice</code></td><td>The first month, created OPEN at signing.</td><td>signing</td></tr>
              <tr><td>Payment</td><td><code>transactions</code> (<code>type_slug = payment</code>)</td><td>Method (card / ACH), Stripe ids, when it succeeded.</td><td>Stripe <code>payment_intent.succeeded</code> webhook</td></tr>
              <tr><td>Subscription ("Monthly plan")</td><td><code>Subscription</code></td><td><code>billingDay</code>, <code>currentPeriodStart</code>, <code>basePrice</code> (a cached fallback only), <code>notes = source=deck_checkout</code>.</td><td>the same webhook</td></tr>
            </tbody>
          </table>
        </div>
        <Callout kind="tip" title="Old Zoho rows are mirrors, not bills">
          Rows imported from Zoho have <code>isHistorical = true</code>, numbers like <code>ZB-SUB-…</code>, and
          <code> metadata.zoho</code>. Synapse never charges them: Zoho did. A re-import copies Zoho's current status, so a
          Zoho row turning <code>cancelled</code> in Synapse means it was cancelled <em>in Zoho</em>. No rule says
          "a new deck sale cancels the Zoho plan".
        </Callout>
        <Files items={[
          { path: `${WS}/services/serviceAgreementItems.ts:494`, note: 'replaceAgreementItemsForContract: deleteMany, then create' },
          { path: `${WS}/modules/billing-migration/stages/agreementsSchedulesStage.ts:262`, note: 'Zoho re-import reconciles each mirrored row to Zoho\'s status' },
          { path: `${BILL}/services/subscriptionKinds.ts:29`, note: 'CRON_PLAN_WHERE: no Stripe subscription and not historical' },
        ]} />
      </Section>

      <Section label="Lifecycle" title="What happens, in order, for a deck sale">
        <ol className="kit-prose">
          <li>
            <strong>Every save rewrites the contract lines.</strong> The browser prices the cart with the shared pricing
            engine (<code>computeOrderTotals</code>) and posts the result. The server deletes all of the contract's lines and
            creates them again from what was posted. Nothing compares old lines with new ones, and nobody is warned when a line
            disappears.
          </li>
          <li>
            <strong>Signing</strong> moves the contract to <Pill>signed</Pill>, stores the signature and the PDF, and creates
            the first invoice as OPEN. A later save never moves it back and never stores another signature.
          </li>
          <li>
            <strong>Payment.</strong> A card succeeds at once. <strong>ACH takes several business days</strong>, and
            nothing else happens until Stripe reports it succeeded. Then, in one go: the invoice turns PAID, the contract turns
            <Pill color="var(--green)">active</Pill> with <code>paidAt = now</code>, and the Subscription is created with
            <code> billingDay</code> = the day of the month of <em>that moment</em>.
          </li>
          <li>
            <strong>Monthly billing</strong> is the cron job <code>gs-monthly-billing</code> (minute 15 of every hour). It
            picks active, non-historical rows with no Stripe subscription and charges a row once
            <code> currentPeriodStart</code> + one month (on <code>billingDay</code>) has passed. <code>nextBillingDate</code> is
            not read, so it being empty is normal.
          </li>
          <li>
            <strong>The amount</strong> comes from, in order: Billing Hub plan lines (only for plans made with "New
            subscription"); then the <strong>latest signed version</strong> of the contract (its lines); then the snapshot
            totals; and <code>basePrice</code> only as a last fallback. Editing a Subscription's price does not change a
            deck plan's charge. A new contract version does.
          </li>
        </ol>
        <Files items={[
          { path: `${OB}/domain/get-started/useGetStartedState.ts:195`, note: 'the cart (selectedServices) is the pricing engine\'s output' },
          { path: `${WS}/modules/onboarding/submissionServiceContract.ts`, note: 'updateServiceContract → replaceAgreementItemsForContract' },
          { path: `${WS}/modules/onboarding/contractMsaLifecycle.ts:500`, note: 'markContractMsaSigned: signature + PDF, only on the move to signed' },
          { path: `${WS}/modules/stripe/stripe-payment.service.ts:891`, note: 'processSuccessfulPayment → deck fulfilment' },
          { path: `${WS}/modules/stripe/deckRecurringEnrollment.ts:202`, note: 'enrollDeckRecurringBilling (source deck_checkout, anchored at paidAt)' },
          { path: `${BILL}/recurring/recurringBilling.service.ts:127`, note: 'activateRecurringBillingFromFirstPayment: billingDay = day of paidAt' },
          { path: `${WS}/services/bootstrapPlatformCronJobs.ts:33`, note: 'cron gs-monthly-billing, "15 * * * *"' },
          { path: `${BILL}/recurring/recurringPlanCharges.ts:74`, note: 'resolveMonthlyBreakdown: where the amount comes from' },
          { path: `${BILL}/recurring/recurringPlanMsa.ts:31`, note: 'resolveBillingMsa → followContractVersion (the newest signed version wins)' },
        ]} />
      </Section>

      <Section
        label="Real case"
        title="The hosting line that vanished between the proposal and the signature"
        intro={<p>A painting company (invented name: <em>Bright Brush Painting</em>) moved from Zoho to a deck plan. The rep says the customer signed $3,650/mo including $250/mo hosting, but the plan bills $3,400. Here is what the records show.</p>}
      >
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>When (UTC)</th><th>What happened</th><th>How we know</th></tr></thead>
            <tbody>
              <Row t="Sep 28" what="Last Zoho invoice with the $250 Licensing Fee (hosting)." proof={<>historical <code>Invoice</code></>} />
              <Row t="Oct 21 15:55" what="Deck session created. Three hours later a change ships: a new cart starts with no website package picked (websitePending)." proof={<>session <code>createdAt</code>; commit 9ad5144f56 18:47 UTC</>} />
              <Row t="Oct 27 13:44" what={<>The rep edits the proposal: $3,776 → <strong>$3,650/mo</strong>. Lines include Lean Launch build ($2,500, 100% off with FREESITE) and <strong>Monthly maintenance $250/mo</strong> (WEBSITE_HOSTING). Still a proposal: <strong>not signed, not charged</strong>.</>} proof={<><code>audit_events</code> update on the contract; the lines inside the org snapshot in the session's <code>formData</code></>} />
              <Row t="Oct 27 13:55" what={<>A PDF of that proposal is drawn: "AG-09304945", $3,650/mo. <strong>This is the PDF the rep has.</strong></>} proof={<>the AG number is the last 8 digits of the clock when the PDF is drawn: 09304945 → 13:55:04.945</>} />
              <Row t="Oct 28 02:03" what={<>A fix for half-saved sessions ships: any field missing from a stored cart is filled with the <em>new-session default</em>. For an older cart, a missing <code>websitePending</code> becomes <code>true</code> = "no website picked".</>} proof={<>commit e706990ffd, <code>get-started-state-shape.ts</code></>} />
              <Row t="Oct 28 – Nov 3" what="The deck is opened several times. On load the repaired cart is written back; the pricing engine now leaves out both website lines." proof={<>"current step" updates on the session in <code>audit_events</code></>} />
              <Row t="Nov 3 19:01:16.477" what={<>The final save: contract $3,650 → <strong>$3,400</strong>. 140 ms later the customer signs (drawn signature).</>} proof={<><code>audit_events</code>: update, then transition proposal → signed</>} />
              <Row t="Nov 3 19:01:16" what={<>Signed PDF stored: <strong>$3,400/mo, three lines, no website or maintenance</strong>, with the signature image. First invoice CI-… created <strong>OPEN</strong> for $3,400.</>} proof={<>the stored PDF; <code>Invoice</code> create event</>} />
              <Row t="Nov 9 12:22:33" what={<>The <strong>ACH</strong> payment succeeds. Invoice PAID, contract active, Subscription "Monthly plan" $3,400 created with <code>billingDay = 9</code>.</>} proof={<><code>transactions.method_slug = ach</code>, <code>metadata.source = stripe_webhook</code></>} />
              <Row t="Nov 9 23:18" what="A Zoho re-import marks the Zoho plans (Licensing Fee, Local Optimization, Pulse) cancelled because they were cancelled in Zoho, and imports a paid Zoho invoice for 'Hydra Website Foundation' dated Oct 28." proof={<>system <code>audit_events</code>; no deck-supersedes-Zoho rule exists</>} />
              <Row t="Dec 9" what={<>Next charge: <strong>$3,400</strong>, from the signed version's lines.</>} proof={<code>resolveMonthlyBreakdown</code>} />
            </tbody>
          </table>
        </div>
        <Callout kind="warn" title="The root cause in one sentence">
          A fix for broken sessions filled the missing "website pending" flag with <code>true</code>, while every other
          place in the code reads a missing flag as "keep their package". The next save then deleted and recreated the
          contract lines without the website. The customer signed that $3,400 version, and nothing warned anyone that a line
          had gone.
        </Callout>
        <Files items={[
          { path: `${OB}/domain/get-started/get-started.ts:1506`, note: 'initialState(): websitePending: true' },
          { path: `${OB}/domain/get-started/get-started-state-shape.ts:46`, note: 'mergeOverDefaults: missing key ← default (true)' },
          { path: `${OB}/domain/get-started/useGetStartedState.ts:100`, note: 'writes the repaired cart back, so the next autosave stores it' },
          { path: `${OB}/domain/get-started/get-started.ts:3954`, note: 'draft load: missing → false (the opposite rule)' },
          { path: 'libs/get-started-pricing/src/lib/pricing.ts:1703', note: 'websiteSkipped = … || websitePending === true' },
          { path: 'libs/get-started-pricing/src/lib/pricing.ts:1935', note: 'maintenance = websiteSkipped ? 0 : tier.maintenance' },
          { path: 'libs/agreement-pdf/src/lib/generateAgreement.ts:889', note: 'AG number = Date.now() last 8 digits; the date is "today" (:2826). Neither is stored.' },
        ]} />
        <Callout kind="real" title="Which document governs?">
          The only signed document is the Nov 3 one, at $3,400. The $3,650 PDF is the Oct 27 proposal, drawn when no signature
          had been recorded and nothing had been charged. Its "Authorised Signature" block and date are printed on every
          rendering, signed or not. So adding $250 needs the customer's signature on a new version. It is not a correction
          to something they already signed.
        </Callout>
      </Section>

      <Section label="Check it yourself" title="Where to look, record by record">
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>Fact</th><th>In Synapse</th><th>In the data</th></tr></thead>
            <tbody>
              <tr><td>The account, its contracts, subscriptions and invoices</td><td><code>{SYN}/backoffice/finance/organizations/&lt;orgId&gt;</code> → <strong>Finance</strong> tab (Contracts, Subscriptions, Invoices panels)</td><td><code>ServiceAgreement</code>, <code>Subscription</code>, <code>Invoice</code> by <code>organizationId</code></td></tr>
              <tr><td>A contract and its lines</td><td><code>{SYN}/backoffice/sales/service-agreements/&lt;agreementId&gt;</code></td><td><code>ServiceAgreementItem</code> by <code>agreementId</code></td></tr>
              <tr><td>The subscription (billing day, last charge)</td><td><code>{SYN}/backoffice/finance/subscriptions/&lt;id&gt;</code></td><td><code>Subscription</code></td></tr>
              <tr><td>First invoice and the payment</td><td><code>/backoffice/finance/invoices/&lt;id&gt;</code>, <code>/backoffice/finance/payments</code></td><td><code>transactions</code> (<code>method_slug</code>, <code>metadata.source</code>, <code>occurred_at</code>)</td></tr>
              <tr><td>Signed PDF</td><td>Finance tab → Contracts → View Agreement; Records tab → signed agreements</td><td>storage <code>&lt;domain&gt;/agreements/&lt;contractId&gt;/</code></td></tr>
              <tr><td>The deck session and its cart</td><td>Records tab → Onboarding</td><td><code>OnboardingSession.formData → getStarted.order</code></td></tr>
              <tr><td>Every change, with time</td><td>Notes &amp; Timeline tab</td><td><code>audit_events</code> where <code>entity_kind = 'OrganizationServiceAgreement'</code>, <code>'Subscription'</code>, <code>'Invoice'</code> (the <code>diff</code> column has before/after)</td></tr>
            </tbody>
          </table>
        </div>
        <pre className="kit-code">{`-- the contract's history: price edits, signing, payment
select at, action, diff from audit_events
 where entity_kind = 'OrganizationServiceAgreement' and entity_id = '<agreementId>'
 order by at;

-- was a price drop part of the signing save? (any contract, since Oct 27)
-- an 'update' lowering monthlyCost within 3 s before the 'signed' transition`}</pre>
      </Section>

      <Section label="Fix" title="What to do: this customer, then the code">
        <h3 className="kit-h3">This customer (no code)</h3>
        <ol className="kit-prose">
          <li>
            <strong>Decide with the rep and finance</strong> that the hosting continues at $250/mo. The customer signed
            $3,400 and Zoho's Licensing Fee was cancelled in Zoho. Also confirm what the Zoho "Hydra Website Foundation"
            charge (about $446/mo, last imported for Oct 28) is, and whether it is still live in Zoho, so hosting is not
            billed twice.
          </li>
          <li>
            <strong>Finance tab → Contracts → the deck contract → Update contract.</strong> Add the catalog product
            "Website Build — Lean Launch" as a monthly line at $250 (its catalog <code>priceRecurring</code> is $250).
            The price goes up, so the dialog says <em>Send for signature</em>. The customer gets an email to sign at
            <code> /msa/:token</code>. The $3,400 contract stays in force until they sign.
          </li>
          <li>
            <strong>Once signed, nothing else is needed.</strong> The monthly job charges the newest signed version, so Dec 9
            bills $3,650. If they sign after Dec 9, Dec bills $3,400 and the new price starts the next cycle.
          </li>
          <li>
            <strong>Back-billing is a business decision</strong>, not a system fix. If it is agreed (after the customer
            agrees), Finance tab → Invoices → <strong>New invoice</strong> (direct invoice) issues a one-off charge.
            Hosting has not been billed since Sep 28.
          </li>
        </ol>
        <Callout kind="warn" title="What not to do">
          Do not edit the Subscription's price: for a deck plan it is only a fallback and is ignored while the contract can be
          read. The pricing endpoint also refuses non-Stripe plans. Do not edit contract lines in the database: the
          charge follows signed versions, and the customer would be billed for something they never signed.
        </Callout>
        <Files items={[
          { path: 'apps/synapse-v3/src/components/backoffice/billing/UpdateContractDialog.tsx', note: 'price up → customer signs; otherwise in effect at once' },
          { path: `${BILL}/services/contractUpdateService.ts:254`, note: 'updateContract (POST /api/v1/billing/agreements/:id/update)' },
          { path: `${BILL}/directInvoice.routes.ts`, note: 'one-off invoices (New invoice)' },
        ]} />

        <h3 className="kit-h3">The code (a separate fix)</h3>
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead><tr><th>#</th><th>Change</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>The session repair reads a missing <code>websitePending</code> as <code>false</code> when the stored cart has a tier, like the draft loader and the deck strategy already do.</td><td>Stops the website lines from vanishing for sessions created before Oct 21. <strong>Root fix.</strong></td></tr>
              <tr><td>2</td><td>When a save would remove a line from a contract that already had it (especially recurring or WEBSITE_HOSTING), record it on the contract and show the rep before signing.</td><td>Today a line can disappear in total silence.</td></tr>
              <tr><td>3</td><td>Give the PDF a stable agreement number (the contract's), and print "Proposal, not signed" when there is no signature.</td><td>A $3,650 "AG-…" PDF with a signature block and date looks signed when it was not.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="kit-prose">
          <strong>Others affected?</strong> A sweep of contracts signed since Oct 27 whose monthly price dropped in the
          signing save found 8. Only this case lost its hosting line from a session that predated the flag. The rest still have
          hosting or started after Oct 21. That sweep only covers drops at signing; drops in an earlier save would need the
          contract history compared with the deck's own pricing.
        </p>
      </Section>
    </>
  );
}
