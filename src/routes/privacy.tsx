import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Nectar.Pay" },
      {
        name: "description",
        content:
          "How Nectar.Pay handles merchant and customer data. Non-custodial by design: we never see customer wallets, balances, or private keys.",
      },
    ],
  }),
  component: PrivacyPage,
});

const EFFECTIVE = "June 21, 2026";

function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        ← Nectar.Pay
      </Link>
      <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective {EFFECTIVE}</p>

      <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
        <p className="text-base text-muted-foreground">
          This page is maintained by Nectar.Pay to describe what data we collect,
          why, and what we don't. Nectar.Pay is non-custodial — we don't see
          customer funds or keys, and we work hard to collect as little
          personal data as we can while still running a reliable gateway.
        </p>

        <h2>1. What we collect about merchants</h2>
        <ul>
          <li>
            <strong>Account info</strong>: email, name, and authentication
            data (Google OAuth or password hash). Required to sign you in.
          </li>
          <li>
            <strong>Store configuration</strong>: store name, website,
            currency, webhook URLs, xpubs or receiving addresses you provide.
          </li>
          <li>
            <strong>Billing data</strong>: plan, usage counters (invoice
            count, volume), and on-chain TXC top-up deposit addresses.
          </li>
          <li>
            <strong>Operational logs</strong>: request metadata for
            debugging, rate-limiting, and abuse prevention.
          </li>
        </ul>

        <h2>2. What we collect about your customers</h2>
        <p>
          Very little. The hosted checkout (the <code>/i/&lt;invoice&gt;</code>{" "}
          page) does not require customers to sign up, log in, or provide
          identity. We store the invoice's receiving address, fiat and crypto
          amounts, status, and the on-chain transaction hash once it appears.
          We do <strong>not</strong> collect customer names, emails, IP-based
          tracking, or wallet identity beyond what is already public on the
          blockchain.
        </p>

        <h2>3. What we never see</h2>
        <ul>
          <li>Customer wallet balances.</li>
          <li>Customer private keys, seed phrases, or mnemonics.</li>
          <li>
            Merchant wallet private keys. We derive receiving addresses from
            the <em>public</em> xpub you provide. Funds always settle to
            you, not to us.
          </li>
        </ul>

        <h2>4. Cookies & analytics</h2>
        <p>
          We use only the cookies necessary to keep you signed in. We do not
          run third-party advertising trackers. If we add product analytics
          later, we will disclose them here.
        </p>

        <h2>5. Third-party services</h2>
        <p>
          To deliver the gateway we rely on a small set of subprocessors:
        </p>
        <ul>
          <li>
            <strong>Lovable Cloud</strong> — hosting, database, and
            authentication infrastructure.
          </li>
          <li>
            <strong>Alchemy</strong> — read-only block-chain RPC for
            Ethereum, Base, Tron, and Solana.
          </li>
          <li>
            <strong>CoinMarketCap</strong> — fiat/crypto exchange rates.
          </li>
          <li>
            <strong>Public block explorers</strong> — for BTC and TXC
            transaction confirmation.
          </li>
          <li>
            <strong>Telegram</strong> (optional) — only if you opt in to
            payment notifications.
          </li>
        </ul>

        <h2>6. How long we keep data</h2>
        <p>
          Account and store data is kept while your account is active. You
          may delete your account at any time, which removes your stores,
          invoices, and personal data within 30 days, subject to legal
          retention requirements. On-chain transactions themselves are
          public and permanent — we cannot remove those.
        </p>

        <h2>7. Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of your
          personal data by emailing{" "}
          <a href="mailto:hello@honest.money">hello@honest.money</a>. If you
          are in the EU/UK, you have rights under the GDPR / UK GDPR
          including the right to object and to lodge a complaint with your
          local supervisory authority.
        </p>

        <h2>8. Security</h2>
        <p>
          Connections are encrypted in transit (HTTPS). Row-level security
          isolates merchant data so one merchant cannot read another's.
          Webhook secrets are hashed at rest. As with any internet service,
          we cannot guarantee absolute security; please use a strong unique
          password and enable two-factor authentication on your email
          account.
        </p>

        <h2>9. Children</h2>
        <p>
          Nectar.Pay is for businesses and adults. We do not knowingly collect
          data from anyone under 18.
        </p>

        <h2>10. Changes</h2>
        <p>
          We will post changes to this policy here, update the effective
          date, and announce material changes in-product or by email.
        </p>

        <h2>11. Contact</h2>
        <p>
          Privacy questions:{" "}
          <a href="mailto:hello@honest.money">hello@honest.money</a>.
        </p>

        <hr className="my-10 border-border" />
        <p className="text-sm text-muted-foreground">
          Nectar.Pay is part of the{" "}
          <a href="https://honest.money">Honest Money Ecosystem</a>.
        </p>
      </div>
    </article>
  );
}
