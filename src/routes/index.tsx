import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Webhook, ShieldCheck, Zap, Code2, Hexagon, Printer, Snowflake, ArrowRight } from "lucide-react";
import posTerminal from "@/assets/nectar-pos-terminal.jpg.asset.json";

import { MarketingNav, MarketingFooter, NectarMark } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nectar.Pay — No keys. No fees." },
      {
        name: "description",
        content:
          "Non-custodial crypto payment gateway for BTC, TEXITcoin and EVM stablecoins. Paste a public key, get paid, zero per-transaction fees.",
      },
      { property: "og:title", content: "Nectar.Pay — No keys. No fees." },
      {
        property: "og:description",
        content:
          "Non-custodial crypto payments — direct to your wallet, zero per-transaction fees.",
      },
      { property: "og:url", content: "https://nectar-pay.com/" },
    ],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/" }],
  }),

  component: HomePage,
});

const CHAINS = [
  { label: "BTC", live: true },
  { label: "TXC", live: true },
  { label: "USDC", live: true },
  { label: "USDT", live: true },
  { label: "PYUSD", live: true },
  { label: "DAI", live: true },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Honeycomb wash */}
        <div className="absolute inset-0 comb-bg opacity-60" />
        {/* Honey glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1.15fr_1fr] md:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <NectarMark className="h-3.5 w-3.5" />
              Non-custodial · Zero per-tx fees · TXC native
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              <span className="honey-text">No keys.</span>
              <br />
              <span className="honey-text">No fees.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/80">
              Nothing could be sweeter than keeping <em className="not-italic text-primary">all</em> of your money.
              Paste an <span className="font-mono text-foreground">xpub</span>, drop in our plugin, and accept BTC,
              TEXITcoin and EVM stablecoins straight to your wallet. We never touch your keys. We never take a cut.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-lg shadow-primary/20">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free <Zap className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/manifesto">Read the manifesto →</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {CHAINS.map((c) => (
                <span
                  key={c.label}
                  className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {c.label} <span className="opacity-60">· live</span>
                </span>
              ))}
            </div>
          </div>

          {/* Mock invoice card */}
          <div className="relative">
            {/* Floating hex accents */}
            <Hexagon className="absolute -right-4 -top-6 h-10 w-10 text-primary/30" strokeWidth={1.5} />
            <Hexagon className="absolute -bottom-6 -left-4 h-14 w-14 text-primary/20" strokeWidth={1.5} />

            <div className="rounded-2xl border border-primary/20 bg-card/90 p-5 shadow-2xl shadow-primary/20 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Invoice INV_8f3a…</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> awaiting payment
                </span>
              </div>
              <div className="mt-4 font-mono text-3xl tabular-nums">
                $49.00 <span className="text-base text-muted-foreground">USD</span>
              </div>
              <div className="mt-1 font-mono text-sm text-muted-foreground tabular-nums">
                ≈ 0.00072194 BTC
              </div>
              <div className="mt-5 grid grid-cols-[88px_1fr] gap-3 rounded-md border border-dashed border-primary/30 bg-background/60 p-3">
                <div className="aspect-square rounded-sm bg-foreground/90" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Pay to</div>
                  <div className="truncate font-mono text-sm">bc1qxy2k...gd4xn</div>
                  <div className="mt-2 text-xs text-muted-foreground">Network</div>
                  <div className="font-mono text-sm">Bitcoin · 2 conf.</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Expires in 14m 32s · Rate locked</span>
                <span className="font-mono text-primary">→ your wallet</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "Why sweeter" strip */}
      <section className="border-b border-border/60 bg-gradient-to-b from-background to-card/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 text-center md:grid-cols-3">
            <Stat big="0%" label="Per-transaction fees" sub="Forever. The chain settles you, not us." />
            <Stat big="0" label="Customer keys we hold" sub="You paste a public key. We derive. Period." />
            <Stat big="100%" label="Of every payment is yours" sub="Direct deposit to your wallet, no middle hop." />
          </div>
        </div>
      </section>

      {/* Merchant Terminal Start-up Kit */}
      <section className="relative overflow-hidden border-b border-border/60 py-20">
        <div className="pointer-events-none absolute inset-0 comb-bg opacity-40" />
        <div className="pointer-events-none absolute -right-32 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <Hexagon className="h-3.5 w-3.5" />
              Merchant Start-up Kit · Ships from Blockchain Mint
            </div>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
              Open the box. <span className="honey-text">Start taking crypto.</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-foreground/80">
              Everything a shop needs to go non-custodial in an afternoon —
              the countertop terminal, a cold-storage coin that <em className="not-italic text-primary">is</em> your
              wallet, and a receipt printer that turns every sale into a paper trail your customer walks out with.
            </p>

            <ul className="mt-6 space-y-3">
              <KitItem
                icon={<Printer className="h-4 w-4" />}
                title="NectarPay Mobile POS Terminal"
                body="Android-based, 4G + Wi-Fi, built-in thermal QR printer. Boots straight into the NectarPay POS."
              />
              <KitItem
                icon={<Snowflake className="h-4 w-4" />}
                title="BeeKeeper Cold Storage Coin"
                body="A physically-minted coin holding the xpub seed for the terminal. Air-gapped, tamper-evident, yours forever."
              />
              <KitItem
                icon={<Zap className="h-4 w-4" />}
                title="Ready to provision & pair"
                body="Arrives ready to link to your Nectar-Pay account. No messy config required — scan, link, take your first payment."
              />
            </ul>

            <div className="mt-8 flex flex-wrap items-end gap-6">
              <div>
                <div className="font-mono text-5xl font-semibold tabular-nums honey-text">
                  $495
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  ONE-TIME · NO PER-TX FEES, EVER
                </div>
              </div>
              <Button
                asChild
                size="lg"
                className="shadow-lg shadow-primary/30"
              >
                <a
                  href="https://blockchainmint.com/buy/nectar-pay-mobile-pos-terminal?clear=1"
                  target="_blank"
                  rel="noreferrer"
                >
                  Claim your kit <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Checkout on <span className="text-foreground">blockchainmint.com</span> · ships worldwide
            </p>
          </div>

          {/* Product hero */}
          <a
            href="https://blockchainmint.com/buy/nectar-pay-mobile-pos-terminal?clear=1"
            target="_blank"
            rel="noreferrer"
            className="group relative block"
          >
            <div className="absolute -inset-6 rounded-3xl bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/70 p-3 shadow-2xl shadow-primary/20 backdrop-blur transition group-hover:-translate-y-1">
              <img
                src={posTerminal.url}
                alt="NectarPay mobile POS terminal printing a QR receipt"
                className="aspect-[4/3] w-full rounded-xl object-cover"
                loading="lazy"
              />
              <div className="flex items-center justify-between px-2 py-3 text-xs">
                <span className="text-muted-foreground">NectarPay POS · BeeKeeper Coin · QR receipts</span>
                <span className="font-mono text-primary">$495 →</span>
              </div>
            </div>
          </a>
        </div>
      </section>



      {/* Features */}
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Built for merchants who'd rather hold their own honey.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Every other gateway puts a custodian between you and your customers.
            Nectar.Pay just watches the chain and tells your store when money arrives.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Non-custodial by design"
              body="You paste an xpub. We derive a fresh address per invoice. Your private keys never touch our servers — because we never asked for them."
            />
            <Feature
              icon={<Hexagon className="h-5 w-5" />}
              title="Multi-chain"
              body="BTC, TEXITcoin, USDC/USDT/PYUSD/DAI on Ethereum, Base and BSC — plus Tron and Solana stablecoins. More chains in the pipeline."
            />
            <Feature
              icon={<Code2 className="h-5 w-5" />}
              title="Drop-in WooCommerce"
              body="Install our plugin, paste your API key, checkout works. REST API and embeddable button for everything else."
            />
            <Feature
              icon={<KeyRound className="h-5 w-5" />}
              title="HMAC-signed webhooks"
              body="Stripe-style signatures, exponential retry, full delivery log in your dashboard. Plug into anything that speaks HTTP."
            />
            <Feature
              icon={<Webhook className="h-5 w-5" />}
              title="Live transaction view"
              body="Watch deposits hit the mempool, confirm on-chain, and trigger your store — all in real time, all from the dashboard."
            />
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Built on TEXITcoin"
              body="First-class support for TXC alongside the majors. Bring your own explorer endpoint or use ours."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 comb-bg opacity-40" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl rounded-3xl border border-primary/30 bg-card/70 px-6 py-14 text-center backdrop-blur">
          <NectarMark className="mx-auto h-12 w-12" />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
            Stop bleeding 2.9% to a custodian.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Spin up an account, paste your public key, and start keeping every cent your customers send.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-lg shadow-primary/30">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create your gateway
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/pricing">See pricing →</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-primary/80">
            No keys · No fees · No middleman
          </p>
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
    <div className="group rounded-xl border border-border bg-card/50 p-5 transition hover:border-primary/40 hover:bg-card/80">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary transition group-hover:bg-primary/25">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Stat({ big, label, sub }: { big: string; label: string; sub: string }) {
  return (
    <div>
      <div className="font-mono text-5xl font-semibold tabular-nums honey-text md:text-6xl">
        {big}
      </div>
      <div className="mt-2 text-sm font-medium text-foreground">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function KitItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/15 text-primary">
        {icon}
      </span>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
    </li>
  );
}
