import { createFileRoute, Link } from "@tanstack/react-router";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs · TEXITcoin Pay" },
      {
        name: "description",
        content:
          "Quickstart, API reference, and webhook signing for the TEXITcoin Pay gateway.",
      },
      { property: "og:title", content: "TEXITcoin Pay Docs" },
      {
        property: "og:description",
        content: "Quickstart, API reference, and webhook signing.",
      },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-3 text-muted-foreground">
          A non-custodial gateway. You hold the keys; we derive deposit addresses, watch the
          chain, and notify your store.
        </p>

        <Section title="1. Create an account">
          <p>
            Sign up at <Link to="/auth" className="text-primary underline">/auth</Link>, create
            a store, and add at least one chain config.
          </p>
        </Section>

        <Section title="2. Add an xpub or receive address">
          <p>
            We support BIP32 extended public keys for UTXO chains (BTC, TXC, DOGE, ISK, ZCU)
            and a single receive address for account-based chains (ETH, Base, Tron, Solana).
            Your private keys never leave your wallet.
          </p>
          <p>
            New to xpubs?{" "}
            <Link to="/docs/wallet-setup" className="text-primary underline">
              Step-by-step wallet setup guide for every supported chain →
            </Link>
          </p>
        </Section>

        <Section title="3. Get your API key">
          <p>
            Each store has its own secret API key (<span className="font-mono">sk_live_…</span>).
            It's shown once — store it securely.
          </p>
        </Section>

        <Section title="4. Create invoices">
          <Pre>{`POST /api/public/v1/invoices
Authorization: Bearer sk_live_...
Content-Type: application/json

{
  "chain": "btc",
  "amount": 49.00,
  "currency": "USD",
  "order_id": "ORDER_1234",
  "redirect_url": "https://store.example.com/thanks"
}`}</Pre>
          <p>Response includes the unique deposit address and the hosted payment page URL.</p>
        </Section>

        <Section title="5. Receive webhooks">
          <p>
            We POST to your configured webhook URL on every status change. Each request is signed:
          </p>
          <Pre>{`X-TXCPay-Signature: t=1729000000,v1=hex-hmac-sha256

# verify in node:
const sig = req.headers["x-txcpay-signature"];
const [, t] = sig.match(/t=(\\d+)/);
const [, v1] = sig.match(/v1=([a-f0-9]+)/);
const expected = crypto
  .createHmac("sha256", WEBHOOK_SECRET)
  .update(\`\${t}.\${rawBody}\`)
  .digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))) reject();`}</Pre>
        </Section>

        <Section title="WooCommerce">
          <p>
            See the <Link to="/integrations/woocommerce" className="text-primary underline">
              WooCommerce integration guide
            </Link>{" "}
            to install our plugin in under five minutes.
          </p>
        </Section>
      </section>
      <MarketingFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-card/60 p-4 text-xs leading-relaxed text-foreground">
      <code>{children}</code>
    </pre>
  );
}
