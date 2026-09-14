import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Developer Docs & API Reference · Nectar.Pay" },
      {
        name: "description",
        content:
          "Full public API reference for the Nectar.Pay gateway: authentication, invoices, statuses, webhooks, signature verification, and the drop-in JS checkout button.",
      },
      { property: "og:title", content: "Nectar.Pay Developer Docs" },
      {
        property: "og:description",
        content:
          "Everything a third-party integration needs: API keys, invoice creation, status polling, signed webhooks, and error formats.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.nectar-pay.com/docs" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/docs" }],
  }),
  component: DocsPage,
});

const CHAINS = [
  ["btc", "Bitcoin (on-chain)"],
  ["lightning", "Bitcoin via Lightning"],
  ["txc", "TEXITcoin"],
  ["eth", "Ethereum (ETH + USDC/USDT/PYUSD/DAI)"],
  ["base", "Base (ETH + stablecoins)"],
  ["tron", "Tron (TRX + USDT)"],
  ["sol", "Solana (SOL + SPL tokens)"],
  ["doge", "Dogecoin"],
  ["ltc", "Litecoin"],
  ["bch", "Bitcoin Cash"],
  ["dash", "Dash"],
  ["isk", "Iskander Network"],
  ["zcu", "ZCU (Zero Chill)"],
] as const;

const STATUSES = [
  ["pending", "Created; waiting for payment (or for the customer to pick a chain)."],
  ["underpaid", "A payment arrived but is short of the requested amount."],
  ["confirmed", "Paid and confirmed on-chain. Treat this as final."],
  ["expired", "TTL elapsed with no (sufficient) payment."],
] as const;

function DocsPage() {
  const { user, loading } = useAuth();

  // Signed-in merchants keep their dashboard navigation on /docs.
  if (!loading && user) {
    return (
      <DashboardShell>
        <DocsBody />
      </DashboardShell>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <DocsBody />
      <MarketingFooter />
    </div>
  );
}

export function DocsBody() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Developer documentation</h1>
      <p className="mt-3 text-muted-foreground">
        A non-custodial gateway. You hold the keys; we derive deposit addresses, watch the
        chain, and notify your store. This page is the complete public API reference —
        everything a third-party site needs to integrate without ever talking to us.
      </p>

      {/* ---------------------------------------------------------- */}
      <Section title="1. Create an account &amp; store">
        <p>
          Sign up at <Link to="/auth" className="text-primary underline">/auth</Link>, create
          a store, and add at least one chain config.
        </p>
        <p>
          New to xpubs?{" "}
          <Link to="/docs/wallet-setup" className="text-primary underline">
            Step-by-step wallet setup guide for every supported chain →
          </Link>{" "}
          Wondering whether each invoice gets its own address?{" "}
          <Link to="/docs/address-rotation" className="text-primary underline">
            Address derivation &amp; rotation policy →
          </Link>
        </p>
      </Section>

      <Section title="2. Get your credentials">
        <p>
          Each store has its own secret API key (<span className="font-mono">sk_live_…</span>),
          created from <strong>Store → API keys</strong>. It's shown once — store it securely.
        </p>
        <p>
          For webhooks, set your endpoint URL and copy the signing secret from{" "}
          <strong>Store → Webhooks</strong>. The secret is per-store and is used to verify
          every event we send you (see §6).
        </p>
      </Section>

      <Section title="3. Base URL &amp; authentication">
        <p>
          <strong>All API calls go to <span className="font-mono">https://app.nectar-pay.com</span></strong>.
          Keys are issued and validated on this host only — sending a valid key to{" "}
          <span className="font-mono">nectar-pay.com</span> (the marketing site) returns{" "}
          <span className="font-mono">401 Invalid API key</span>.
        </p>
        <p>
          Every request carries the key as a Bearer token. Keys are scoped to a single store:
          you can only ever see and create that store's invoices.
        </p>
        <Pre>{`NECTARPAY_API_URL=https://app.nectar-pay.com

# sanity-check your key before wiring anything else:
curl -s https://app.nectar-pay.com/api/public/v1/me \\
  -H "Authorization: Bearer sk_live_..."`}</Pre>
        <p>
          A <span className="font-mono">200</span> from{" "}
          <span className="font-mono">/api/public/v1/me</span> confirms the key, the store it
          belongs to, and the webhook URL currently configured. All errors across the API
          look like <span className="font-mono">{'{ "error": "human readable message" }'}</span>{" "}
          with an appropriate 4xx/5xx status.
        </p>
      </Section>

      <Section title="4. Create an invoice">
        <Pre>{`POST https://app.nectar-pay.com/api/public/v1/invoices
Authorization: Bearer sk_live_...
Content-Type: application/json

{
  "chain": "btc",                    // optional — omit to let the customer pick
  "amount": 49.00,                   // required, fiat amount
  "currency": "USD",                 // required, ISO fiat code
  "order_id": "ORDER_1234",          // optional, echoed back + sent in webhooks
  "description": "T-shirt, size M",  // optional
  "redirect_url": "https://store.example.com/thanks", // optional
  "buyer_email": "sam@example.com",  // optional, sends a receipt
  "expires_in_seconds": 900          // optional, 60–86400, default is store TTL
}`}</Pre>
        <p>
          Supported <span className="font-mono">chain</span> values:
        </p>
        <Table
          head={["chain", "network"]}
          rows={CHAINS.map(([c, n]) => [c, n])}
        />
        <p>
          If you omit <span className="font-mono">chain</span>, the invoice is created in a
          "customer picks the network" state and{" "}
          <span className="font-mono">address</span>/<span className="font-mono">crypto_amount</span>/
          <span className="font-mono">rate</span> are <span className="font-mono">null</span>{" "}
          until the customer chooses on the hosted checkout page.
        </p>
        <p>Response (201):</p>
        <Pre>{`{
  "id": "7c9e…-invoice-uuid",
  "address": "bc1q…",              // null if chain omitted
  "crypto_amount": 0.00041712,     // null if chain omitted
  "rate": 117500.00,               // fiat per coin, null if chain omitted
  "fiat_amount": 49.00,
  "currency": "USD",
  "chain": "btc",
  "status": "pending",
  "expires_at": "2026-09-14T10:15:00.000Z",
  "checkout_url": "https://app.nectar-pay.com/i/7c9e…"
}`}</Pre>
        <p>
          Send the customer to <span className="font-mono">checkout_url</span> (QR + amount +
          copyable address) or render your own UI from{" "}
          <span className="font-mono">address</span> and{" "}
          <span className="font-mono">crypto_amount</span>.
        </p>
      </Section>

      <Section title="5. Check invoice status (polling)">
        <Pre>{`GET https://app.nectar-pay.com/api/public/v1/invoices/{id}
Authorization: Bearer sk_live_...

→ 200 {
  "id": "7c9e…",
  "status": "confirmed",           // see lifecycle below
  "chain": "btc",
  "fiat_amount": 49.00,
  "fiat_currency": "USD",
  "crypto_amount": 0.00041712,
  "rate": 117500.00,
  "address": "bc1q…",
  "order_id": "ORDER_1234",
  "description": "…",
  "redirect_url": "…",
  "buyer_email": "…",
  "expires_at": "…",
  "created_at": "…",
  "checkout_url": "https://app.nectar-pay.com/i/7c9e…"
}`}</Pre>
        <p>
          A <span className="font-mono">404</span> means the invoice doesn't exist{" "}
          <em>or belongs to a different store's key</em> — we never leak across stores.
        </p>
        <p>Invoice lifecycle:</p>
        <Table head={["status", "meaning"]} rows={STATUSES.map(([s, m]) => [s, m])} />
      </Section>

      <Section title="6. Receive webhooks">
        <p>
          We POST a signed JSON event to your configured webhook URL on every status change.
          Headers:
        </p>
        <Pre>{`POST /your/webhook HTTP/1.1
Content-Type: application/json
X-TXCPay-Signature: t=1729000000,v1=<hex-hmac-sha256>
X-TXCPay-Event: invoice.paid
X-TXCPay-Event-Id: 0f4c…-event-uuid
User-Agent: payHME-webhook/1`}</Pre>
        <p>
          Event types: <span className="font-mono">invoice.paid</span> (payment seen),{" "}
          <span className="font-mono">invoice.confirmed</span> (on-chain confirmation — final),{" "}
          <span className="font-mono">invoice.underpaid</span>.
        </p>
        <p>Body:</p>
        <Pre>{`{
  "id": "0f4c…-event-uuid",
  "type": "invoice.paid",
  "created_at": "2026-09-14T10:02:11.000Z",
  "data": {
    "invoice_id": "7c9e…",
    "store_id": "1a2b…",
    "status": "confirmed",
    "chain": "btc",
    "address": "bc1q…",
    "fiat_amount": 49.00,
    "fiat_currency": "USD",
    "paid_amount_usd": 49.00,
    "order_id": "ORDER_1234"
  }
}`}</Pre>
        <p>
          <strong>Always verify the signature</strong> against the raw request body before
          trusting anything:
        </p>
        <Pre>{`// node:
const sig = req.headers["x-txcpay-signature"];
const [, t]  = sig.match(/t=(\\d+)/);
const [, v1] = sig.match(/v1=([a-f0-9]+)/);
const expected = crypto
  .createHmac("sha256", WEBHOOK_SECRET)   // Store → Webhooks
  .update(\`\${t}.\${rawBody}\`)
  .digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))) reject();

// php:
[$t, $v1] = sscanf($_SERVER['HTTP_X_TXCPAY_SIGNATURE'], 't=%d,v1=%s');
$expected = hash_hmac('sha256', "$t." . file_get_contents('php://input'), $WEBHOOK_SECRET);
if (!hash_equals($expected, $v1)) { http_response_code(401); exit; }`}</Pre>
        <p>
          Reject timestamps more than ~5 minutes old to stop replay. Events carry a unique{" "}
          <span className="font-mono">id</span> — dedupe on it, because retries can repeat a
          delivery. Reply <span className="font-mono">2xx</span> quickly and process
          asynchronously.
        </p>
        <p>
          Missed one? Trigger a redelivery for a single invoice:
        </p>
        <Pre>{`curl -X POST "https://app.nectar-pay.com/api/public/v1/invoices/{id}?action=redeliver-webhook" \\
  -H "Authorization: Bearer sk_live_..."`}</Pre>
      </Section>

      <Section title="7. Drop-in JS button (no backend code)">
        <p>
          One <code className="font-mono">&lt;script&gt;</code> tag and a button —
          crypto checkout opens in a modal, no redirect, works on any site.
        </p>
        <Pre>{`<script src="https://app.nectar-pay.com/sdk/payhme.js" defer></script>

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
        <p>
          The button's result event is a UX signal, not a settlement guarantee — still confirm
          payment via webhook or the status endpoint before shipping goods.
        </p>
        <LiveDemo />
      </Section>

      <Section title="8. Hosted payment link (no code at all)">
        <p>
          Every store gets a hosted payment page at{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">https://app.nectar-pay.com/t/your-store</code>{" "}
          — link it from a button, an email, an invoice PDF, or a QR code. No API key, no
          webhook to host. When you outgrow it, everything above is waiting.
        </p>
      </Section>

      <Section title="E-commerce plugins">
        <p>
          Prefer a ready-made plugin?{" "}
          <Link to="/integrations" className="text-primary underline">
            WooCommerce, PrestaShop, OpenCart, Magento, WHMCS and more →
          </Link>{" "}
          Every plugin is a thin wrapper around the exact API documented above.
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

function Table({ head, rows }: { head: [string, string]; rows: readonly (readonly [string, string])[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-card/60 text-left text-foreground">
            <th className="px-3 py-2 font-medium">{head[0]}</th>
            <th className="px-3 py-2 font-medium">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-1.5 font-mono text-foreground">{a}</td>
              <td className="px-3 py-1.5">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
