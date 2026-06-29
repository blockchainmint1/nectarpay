import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Nectar.Pay" },
      {
        name: "description",
        content:
          "The terms governing use of Nectar.Pay, a non-custodial crypto payment gateway built for the Honest Money Ecosystem.",
      },
    ],
  }),
  component: TermsPage,
});

const EFFECTIVE = "June 21, 2026";

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        ← Nectar.Pay
      </Link>
      <h1 className="text-4xl font-bold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective {EFFECTIVE}</p>

      <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
        <p className="text-base text-muted-foreground">
          This page is maintained by Nectar.Pay to describe the terms on which we
          provide our merchant payment gateway. Plain English where we can,
          legal language where we must. By creating a Nectar.Pay account or
          accepting a payment through Nectar.Pay, you agree to these terms.
        </p>

        <h2>1. What Nectar.Pay is</h2>
        <p>
          Nectar.Pay is a <strong>non-custodial</strong> cryptocurrency payment
          gateway. We generate per-invoice receiving addresses from public
          keys (xpubs) or static addresses that you, the merchant, supply.
          Funds settle directly from the customer's wallet to your wallet.
          Nectar.Pay never takes possession of customer funds, and cannot freeze,
          reverse, or seize them.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old and legally able to enter
          contracts in your jurisdiction. You are responsible for ensuring
          that accepting cryptocurrency is lawful for your business in the
          jurisdictions in which you operate.
        </p>

        <h2>3. Your account</h2>
        <ul>
          <li>
            You are responsible for the security of your account credentials,
            your wallet keys, and any xpub or address you configure.
          </li>
          <li>
            You are responsible for the accuracy of invoice amounts, store
            details, and webhook secrets.
          </li>
          <li>
            We may suspend accounts that violate these terms, attempt to
            abuse the service, or use Nectar.Pay for activity prohibited by
            applicable law.
          </li>
        </ul>

        <h2>4. Fees and plans</h2>
        <p>
          Current pricing is published on our{" "}
          <Link to="/pricing">pricing page</Link>. We may change pricing
          prospectively with reasonable notice. Because Nectar.Pay is
          non-custodial, we do not deduct fees from your settlements; plan
          fees are billed separately.
        </p>

        <h2>5. Cryptocurrency risk</h2>
        <p>
          Cryptocurrency transactions are <strong>irreversible</strong>.
          Block-chain confirmations, exchange rates, and network fees are
          determined by the underlying networks (Bitcoin, TEXITcoin,
          Ethereum, Base, Tron, Solana, and others we may add). Nectar.Pay does
          not guarantee any specific exchange rate, confirmation time, or
          network availability. You accept the risk that:
        </p>
        <ul>
          <li>Network congestion may delay confirmations.</li>
          <li>Exchange rates may move between invoice creation and payment.</li>
          <li>
            Sending funds to a wrong address — by you, your customer, or as a
            result of a misconfigured xpub — is not recoverable.
          </li>
        </ul>

        <h2>6. Refunds and chargebacks</h2>
        <p>
          Nectar.Pay does not process refunds. Cryptocurrency payments have no
          chargeback mechanism. If you need to refund a customer, you do so
          directly from your wallet. Refund policies between you and your
          customer are your responsibility.
        </p>

        <h2>7. Tax and compliance</h2>
        <p>
          You are solely responsible for your tax obligations, sales tax
          collection, reporting, and KYC/AML compliance applicable to your
          business. Nectar.Pay provides export tools (CSV, JSON, QuickBooks) to
          help; it does not provide tax or legal advice.
        </p>

        <h2>8. Service availability</h2>
        <p>
          We work to keep Nectar.Pay available, but we do not guarantee
          uninterrupted service. Scheduled maintenance, third-party outages
          (block explorers, exchange rate providers, the underlying chains),
          or force-majeure events may interrupt service. Because settlement
          is on-chain, Nectar.Pay downtime does not put your funds at risk.
        </p>

        <h2>9. Acceptable use</h2>
        <p>
          You agree not to use Nectar.Pay for activity that is illegal under
          applicable law, including (without limitation) money laundering,
          sanctions evasion, fraud, or the sale of contraband. We reserve
          the right to terminate accounts found doing so.
        </p>

        <h2>10. Disclaimer of warranties</h2>
        <p>
          Nectar.Pay is provided <strong>"as is"</strong> without warranties of
          any kind, express or implied, including merchantability, fitness
          for a particular purpose, or non-infringement.
        </p>

        <h2>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Nectar.Pay's total liability
          for any claim arising out of or relating to the service is limited
          to the fees you paid us in the twelve months preceding the claim.
          We are not liable for indirect, incidental, consequential, or
          punitive damages, or for any losses arising from blockchain
          network behavior, wallet errors, exchange rate movement, or
          customer dispute.
        </p>

        <h2>12. Changes</h2>
        <p>
          We may update these terms from time to time. Material changes will
          be announced in-product or by email. Continued use after the
          effective date constitutes acceptance.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href="mailto:hello@honest.money">hello@honest.money</a>.
        </p>

        <hr className="my-10 border-border" />
        <p className="text-sm text-muted-foreground">
          Nectar.Pay is part of the{" "}
          <a href="https://honest.money">Honest Money Ecosystem</a>.
        </p>
      </div>
    </article>
      <MarketingFooter />
    </div>
  );
}
