import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, Minus, Zap, Shield, Globe, Coins, Cpu, MapPin } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Nectar.Pay vs BitPay, BTCPay, IVPay, Strike — Honest Comparison" },
      {
        name: "description",
        content:
          "Side-by-side: non-custodial settlement, branded hardware, merchant map, multi-chain support, and fees. The only network that ships all four.",
      },
      { property: "og:title", content: "Nectar.Pay vs the field" },
      {
        property: "og:description",
        content:
          "1,200 terminals shipping. Non-custodial. 8+ chains. First-party merchant map. Compare us to BitPay, BTCPay, IVPay, Strike, and Square.",
      },
    ],
  }),
  component: ComparePage,
});

type Cell = { v: "yes" | "no" | "partial"; note?: string };
type Row = { label: string; icon?: typeof Check; cells: Record<string, Cell> };

const COLS = ["nectar", "bitpay", "btcpay", "ivpay", "strike", "square"] as const;
const COL_LABELS: Record<(typeof COLS)[number], string> = {
  nectar: "Nectar.Pay",
  bitpay: "BitPay",
  btcpay: "BTCPay Server",
  ivpay: "IVPay",
  strike: "Strike",
  square: "Square",
};

const ROWS: Row[] = [
  {
    label: "Non-custodial settlement (funds go straight to your wallet)",
    icon: Shield,
    cells: {
      nectar: { v: "yes" },
      bitpay: { v: "no", note: "Custodial" },
      btcpay: { v: "yes" },
      ivpay: { v: "no", note: "Custodial" },
      strike: { v: "no", note: "Custodial" },
      square: { v: "no", note: "Custodial" },
    },
  },
  {
    label: "Branded countertop terminals shipping at scale",
    icon: Cpu,
    cells: {
      nectar: { v: "yes", note: "1,200 in production" },
      bitpay: { v: "no" },
      btcpay: { v: "no" },
      ivpay: { v: "yes" },
      strike: { v: "no" },
      square: { v: "yes", note: "Fiat-first" },
    },
  },
  {
    label: "First-party merchant heatmap (find where to spend)",
    icon: MapPin,
    cells: {
      nectar: { v: "yes", note: "/where" },
      bitpay: { v: "partial", note: "Directory only" },
      btcpay: { v: "no" },
      ivpay: { v: "yes" },
      strike: { v: "no" },
      square: { v: "no" },
    },
  },
  {
    label: "Multi-chain (BTC + EVM + Solana + Tron + L2s)",
    icon: Globe,
    cells: {
      nectar: { v: "yes", note: "8+ chains" },
      bitpay: { v: "yes" },
      btcpay: { v: "partial", note: "BTC + LN, plugins" },
      ivpay: { v: "partial" },
      strike: { v: "no", note: "BTC only" },
      square: { v: "no", note: "BTC only" },
    },
  },
  {
    label: "Stablecoins (USDC, USDT, pyUSD) on EVM L2s",
    icon: Coins,
    cells: {
      nectar: { v: "yes", note: "1-click enable" },
      bitpay: { v: "yes" },
      btcpay: { v: "partial" },
      ivpay: { v: "partial" },
      strike: { v: "no" },
      square: { v: "no" },
    },
  },
  {
    label: "Sub-15s confirmation on fast chains (Base, BSC)",
    icon: Zap,
    cells: {
      nectar: { v: "yes", note: "Mempool accept" },
      bitpay: { v: "partial" },
      btcpay: { v: "partial" },
      ivpay: { v: "partial" },
      strike: { v: "yes", note: "LN only" },
      square: { v: "partial" },
    },
  },
  {
    label: "KYC-optional for the merchant",
    cells: {
      nectar: { v: "yes" },
      bitpay: { v: "no" },
      btcpay: { v: "yes" },
      ivpay: { v: "no" },
      strike: { v: "no" },
      square: { v: "no" },
    },
  },
  {
    label: "Self-hosting required",
    cells: {
      nectar: { v: "no", note: "Hosted, non-custodial" },
      bitpay: { v: "no" },
      btcpay: { v: "yes", note: "DIY infra" },
      ivpay: { v: "no" },
      strike: { v: "no" },
      square: { v: "no" },
    },
  },
  {
    label: "WooCommerce + REST API + webhooks",
    cells: {
      nectar: { v: "yes" },
      bitpay: { v: "yes" },
      btcpay: { v: "yes" },
      ivpay: { v: "partial" },
      strike: { v: "yes" },
      square: { v: "yes" },
    },
  },
  {
    label: "Flat monthly fee (no % of revenue)",
    cells: {
      nectar: { v: "yes", note: "$0–$99/mo" },
      bitpay: { v: "no", note: "1% per tx" },
      btcpay: { v: "yes", note: "Self-hosted" },
      ivpay: { v: "no" },
      strike: { v: "no" },
      square: { v: "no", note: "2.6%+ per tx" },
    },
  },
];

function CellGlyph({ cell, isUs }: { cell: Cell; isUs: boolean }) {
  const base = "inline-flex h-5 w-5 items-center justify-center rounded-full";
  if (cell.v === "yes")
    return (
      <span
        className={`${base} ${isUs ? "bg-primary text-primary-foreground" : "bg-emerald-500/15 text-emerald-500"}`}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  if (cell.v === "no")
    return (
      <span className={`${base} bg-muted text-muted-foreground/60`}>
        <X className="h-3.5 w-3.5" />
      </span>
    );
  return (
    <span className={`${base} bg-amber-500/15 text-amber-600 dark:text-amber-400`}>
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
}

function ComparePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            The honest comparison
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            Non-custodial. <span className="text-primary">Branded hardware.</span>
            <br />A real merchant map.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            We're the only network shipping all four. BitPay holds your funds. BTCPay makes you host
            your own server. Strike and Square own your settlement. IVPay is closest — but still
            custodial. Here's the field, on one page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Start free in 90 seconds</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/where">See the merchant map</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-4">
          <Pillar n="1,200" label="Terminals in production" />
          <Pillar n="8+" label="Chains supported" />
          <Pillar n="0%" label="Of your revenue taken" />
          <Pillar n="0" label="Keys we hold" />
        </div>
      </section>

      {/* Comparison Table */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Feature by feature.</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Researched from each company's public docs and product pages. If something's wrong, tell
            us — we'll fix it the same day.
          </p>

          <div className="mt-8 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Feature</th>
                  {COLS.map((c) => (
                    <th
                      key={c}
                      className={`px-3 py-3 text-center text-xs font-semibold ${
                        c === "nectar" ? "bg-primary/10 text-primary" : "text-foreground"
                      }`}
                    >
                      {COL_LABELS[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const Icon = row.icon;
                  return (
                    <tr key={row.label} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-2">
                          {Icon ? (
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <span className="mt-0.5 h-4 w-4 shrink-0" />
                          )}
                          <span>{row.label}</span>
                        </div>
                      </td>
                      {COLS.map((c) => {
                        const cell = row.cells[c];
                        const isUs = c === "nectar";
                        return (
                          <td
                            key={c}
                            className={`px-3 py-3 text-center align-top ${
                              isUs ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <CellGlyph cell={cell} isUs={isUs} />
                              {cell.note ? (
                                <span className="text-[10px] leading-tight text-muted-foreground">
                                  {cell.note}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <Legend swatch="bg-emerald-500/15 text-emerald-500" icon={Check} label="Yes" />
            <Legend swatch="bg-amber-500/15 text-amber-600" icon={Minus} label="Partial" />
            <Legend swatch="bg-muted text-muted-foreground/60" icon={X} label="No" />
          </div>
        </div>
      </section>

      {/* Head-to-head cards */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Why merchants are switching.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Versus
              title="vs BitPay"
              gap="BitPay holds your crypto and takes 1% per transaction."
              win="We never touch your funds. Flat monthly fee. Same chains, no escrow risk."
            />
            <Versus
              title="vs BTCPay Server"
              gap="BTCPay is great — if you run your own Linux box, Postgres, and Lightning node."
              win="Same non-custodial principles. Hosted, multi-chain, hardware, and a map — out of the box."
            />
            <Versus
              title="vs IVPay"
              gap="Branded terminals and a merchant map — but they still custody your funds."
              win="Same in-person experience. Funds settle directly to the merchant's wallet."
            />
            <Versus
              title="vs Strike"
              gap="BTC-only, custodial, US-centric. No countertop hardware."
              win="Take BTC, stables, ETH, SOL, TRX — and ship a terminal to any country."
            />
            <Versus
              title="vs Square"
              gap="2.6%+ per tap and a fiat-only rail. Crypto is bolt-on at best."
              win="Crypto-native, sub-15s confirmations, and we don't skim a percentage."
            />
            <Versus
              title="vs Pundi X"
              gap="Once the leader in crypto POS. Largely dormant today."
              win="Actively shipping. 1,200 terminals in production. Live merchant map."
            />
          </div>
        </div>
      </section>

      {/* For partners */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              For resellers, ISOs &amp; partners
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              The category is wide open.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Non-custodial + branded hardware + first-party map is an empty quadrant. The custodial
              incumbents can't move into it without rebuilding their entire compliance stack. The
              self-hosted projects can't ship hardware. We can do both — and we already are.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <Bullet>Co-branded terminals available — your logo on the boot screen.</Bullet>
              <Bullet>Revenue share on every merchant signup you bring in.</Bullet>
              <Bullet>Map placement and regional showcase pages for partner networks.</Bullet>
              <Bullet>Direct line to engineering for new chain or wallet integrations.</Bullet>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <a href="mailto:partners@nectar-pay.com">Become a partner</a>
              </Button>
              <Button asChild variant="outline">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-6">
            <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              The opportunity
            </div>
            <div className="mt-6 space-y-5">
              <Stat big="$1.4T" small="Global crypto market cap, with no dominant POS network" />
              <Stat big="0" small="Networks shipping non-custodial branded hardware at scale" />
              <Stat big="1,200" small="Nectar.Pay terminals already in production" />
              <Stat big="8+" small="Chains supported on day one" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border/60 bg-primary/[0.04]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Sweeter than a percentage.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Connect your wallet, print a QR, get paid. We never see your money. Try the free plan —
            no card, no KYC for the merchant, no leash.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function Pillar({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-4xl tracking-tight text-primary">{n}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Versus({ title, gap, win }: { title: string; gap: string; win: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-background/60 p-5">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground/80">The gap: </span>
        {gap}
      </p>
      <p className="mt-3 text-sm">
        <span className="font-medium text-primary">We win: </span>
        {win}
      </p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div>
      <div className="font-mono text-3xl tracking-tight">{big}</div>
      <div className="mt-1 text-xs text-muted-foreground">{small}</div>
    </div>
  );
}

function Legend({
  swatch,
  icon: Icon,
  label,
}: {
  swatch: string;
  icon: typeof Check;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${swatch}`}>
        <Icon className="h-3 w-3" />
      </span>
      {label}
    </span>
  );
}
