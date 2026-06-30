import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs · Nectar.Pay" },
      {
        name: "description",
        content:
          "Quickstart, API reference, and webhook signing for the Nectar.Pay gateway.",
      },
      { property: "og:title", content: "Nectar.Pay Docs" },
      {
        property: "og:description",
        content: "Quickstart, API reference, and webhook signing.",
      },
          { property: "og:url", content: "https://nectar-pay.com/docs" },
],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/docs" }],
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

        <Section title="Drop-in JS button">
          <p>
            One <code className="font-mono">&lt;script&gt;</code> tag and a button —
            crypto checkout opens in a modal, no redirect, works on any site.
          </p>
          <Pre>{`<script src="https://pay.honest.money/sdk/payhme.js" defer></script>

<button
  data-payhme
  data-api-key="sk_live_..."
  data-chain="btc"
  data-amount="49.00"
  data-currency="USD"
  data-order-id="ORDER_1234"
>Pay $49 with Bitcoin</button>`}</Pre>
          <p>Or call it programmatically:</p>
          <Pre>{`PayHME.checkout({
  apiKey: "sk_live_...",
  chain: "base", amount: 49, currency: "USD",
  orderId: "ORDER_1234",
}).then(result => {
  // result.status: "paid" | "closed" | "expired"
  if (result.status === "paid") console.log("Got it:", result.tx);
});`}</Pre>
          <LiveDemo />
        </Section>

        <Section title="WooCommerce">
          <p>
            See the <Link to="/integrations/woocommerce" className="text-primary underline">
              WooCommerce integration guide
            </Link>{" "}
            to install our plugin in under five minutes.
          </p>
        </Section>

        <div className="mt-16 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-card/60 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Don't trust us? <span className="honey-text">Good.</span>
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              We get it. The whole point of crypto is{" "}
              <span className="text-foreground">don't trust, verify</span>. A payment
              processor asking you to take its word for it is the exact thing we built
              Nectar.Pay to replace. We don't hold your keys — and you don't have to take
              our word for that either.
            </p>
            <p>
              Read the source. Run it yourself. Or fork the whole thing and run a
              competing gateway — we honestly don't mind. The bees do better when the
              hive is bigger.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href="https://github.com/blockchainmint1/nectarpay"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-xl border border-border bg-card/60 p-5 transition hover:border-primary/50 hover:bg-card"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Read the code
              </div>
              <div className="mt-1 text-base font-semibold text-foreground">
                Source on GitHub →
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Every line of the gateway, SDK, and watcher. MIT-ish, audit-friendly,
                no hidden custody layer.
              </p>
            </a>

            <a
              href="https://lovable.dev/projects/faa7c23e-4f75-4eed-8c8c-23234e4242f7?remix=1"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-xl border border-primary/40 bg-primary/10 p-5 transition hover:border-primary hover:bg-primary/15"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                Run your own — $999
              </div>
              <div className="mt-1 text-base font-semibold text-foreground">
                Buy the remix on Lovable →
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                One-click clone of the entire Nectar.Pay stack into your own Lovable
                workspace. Your domain, your keys, your hive. Checkout via
                blockchainmint.com — coming soon.
              </p>
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Prefer to self-host the GitHub source? Go for it — no license fee, no
            phone-home. The $999 remix is just the shortcut.
          </p>
        </div>
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

// Loads the real SDK and renders a working button. Uses the merchant's most-recent
// pending invoice via the public demo path so visitors see the real checkout UI.
function LiveDemo() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Inject the SDK once.
    if (!document.getElementById("payhme-sdk")) {
      const s = document.createElement("script");
      s.id = "payhme-sdk";
      s.src = "/sdk/payhme.js";
      s.defer = true;
      document.head.appendChild(s);
    }
    // Re-scan in case the SDK loaded before our button mounted.
    const t = setInterval(() => {
      const PayHME = (window as unknown as { PayHME?: { scan: () => void } }).PayHME;
      if (PayHME) { PayHME.scan(); clearInterval(t); }
    }, 200);
    const onResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log("[payhme demo] result:", detail);
    };
    document.addEventListener("payhme:result", onResult);
    return () => { clearInterval(t); document.removeEventListener("payhme:result", onResult); };
  }, []);

  return (
    <div className="mt-4 rounded-lg border border-border bg-card/60 p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Live demo
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Click below — this is the actual SDK, opening a real (test-mode) checkout in a modal.
        No payment will be processed; close the modal at any time.
      </p>
      <div className="mt-3">
        <button
          data-payhme
          data-invoice-id="demo"
          data-chain="btc"
          data-amount="1"
          data-currency="USD"
        >
          Try the Nectar.Pay button
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Tip: open your browser console to see the <code className="font-mono">payhme:result</code> event payload when the modal closes.
      </p>
    </div>
  );
}
