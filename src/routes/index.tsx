import { createFileRoute, Link } from "@tanstack/react-router";
import { Bitcoin, KeyRound, Webhook, ShieldCheck, Zap, Code2 } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TEXITcoin Pay — non-custodial crypto payments for any store" },
      {
        name: "description",
        content:
          "Accept BTC, TEXITcoin, and EVM stablecoins on WooCommerce or any open ecommerce platform. You keep the keys. We do the watching.",
      },
      { property: "og:title", content: "TEXITcoin Pay" },
      {
        property: "og:description",
        content: "Non-custodial crypto payment gateway. Plug into WooCommerce in minutes.",
      },
    ],
  }),
  component: HomePage,
});

const CHAINS = [
  { label: "Bitcoin", code: "BTC", live: true },
  { label: "TEXITcoin", code: "TXC", live: true },
  { label: "USDC", code: "ERC-20", live: true },
  { label: "USDT", code: "ERC-20", live: true },
  { label: "Base", code: "L2", live: true },
  { label: "Dogecoin", code: "DOGE", live: false },
  { label: "Iceland Coin", code: "ISK", live: false },
  { label: "ZCU", code: "ZCU", live: false },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Non-custodial · WooCommerce-ready · TEXITcoin native
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Accept crypto.
              <br />
              <span className="text-primary">Keep your keys.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              A turnkey payment gateway for BTC, TEXITcoin, and EVM stablecoins.
              Paste an xpub, drop our plugin into your store, and start getting paid
              directly to your wallet — no custodian in between.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free <Zap className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/integrations/woocommerce">WooCommerce plugin</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {CHAINS.map((c) => (
                <span
                  key={c.label}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    c.live
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card/50 text-muted-foreground"
                  }`}
                >
                  {c.label} <span className="opacity-60">· {c.live ? "live" : "soon"}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Mock invoice card */}
          <div className="rounded-xl border border-border bg-card/80 p-5 shadow-2xl shadow-primary/10">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Invoice INV_8f3a…</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> awaiting payment
              </span>
            </div>
            <div className="mt-4 font-mono text-3xl tabular-nums">$49.00 <span className="text-base text-muted-foreground">USD</span></div>
            <div className="mt-1 font-mono text-sm text-muted-foreground tabular-nums">
              ≈ 0.00072194 BTC
            </div>
            <div className="mt-5 grid grid-cols-[88px_1fr] gap-3 rounded-md border border-dashed border-border bg-background/50 p-3">
              <div className="aspect-square rounded-sm bg-foreground/90" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Pay to</div>
                <div className="truncate font-mono text-sm">bc1qxy2k...gd4xn</div>
                <div className="mt-2 text-xs text-muted-foreground">Network</div>
                <div className="font-mono text-sm">Bitcoin · 2 conf.</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Expires in 14m 32s · Rate locked
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Built for merchants who don't trust custodians.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Non-custodial"
              body="You paste an xpub, we derive a fresh address per invoice. Your keys never touch our servers."
            />
            <Feature
              icon={<Bitcoin className="h-5 w-5" />}
              title="Multi-chain"
              body="BTC, TEXITcoin, USDC/USDT on Ethereum and Base out of the box. More chains rolling in."
            />
            <Feature
              icon={<Code2 className="h-5 w-5" />}
              title="Drop-in WooCommerce"
              body="Install our plugin, paste your API key, and checkout works. REST API for everything else."
            />
            <Feature
              icon={<KeyRound className="h-5 w-5" />}
              title="HMAC-signed webhooks"
              body="Stripe-style signatures, exponential retry, full delivery log in your dashboard."
            />
            <Feature
              icon={<Webhook className="h-5 w-5" />}
              title="Live transaction view"
              body="Watch deposits hit the mempool, confirm on-chain, and trigger your store — all in real time."
            />
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Built on TEXITcoin"
              body="First-class support for TXC. Bring your own explorer endpoint or use ours."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/60 px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Stop sending customers to a custodial checkout.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Spin up an account, paste your xpub, and accept crypto on your store today.
          </p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create your gateway
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
