import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Hexagon, Printer, Snowflake, Zap } from "lucide-react";
import posTerminalAsset from "@/assets/nectar-pos-terminal.jpg.asset.json";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { recordPlanIntent } from "@/lib/plan-intent.functions";

const PENDING_PLAN_KEY = "nectar.pending_plan";

function stashPendingPlan(plan: "free" | "cheap" | "unlimited", source: string, terminalKit = false) {
  try {
    localStorage.setItem(
      PENDING_PLAN_KEY,
      JSON.stringify({ plan_id: plan, source, terminal_kit: terminalKit, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing · Nectar.Pay" },
      {
        name: "description",
        content:
          "Free, Cheap ($19/mo), or Unlimited ($99/mo) — all paid in TEXITcoin. Non-custodial. No monthly minimums.",
      },
      { property: "og:title", content: "Pricing · Nectar.Pay" },
      {
        property: "og:description",
        content: "Free, $19/mo, or $99/mo. Pay in TEXITcoin. Non-custodial settlement.",
      },
          { property: "og:url", content: "https://nectar-pay.com/pricing" },
],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <PricingPlansBody />
      <TerminalKitSection />
      <MarketingFooter />
    </div>
  );
}

export function PricingPlansBody() {
  return (
    <section className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Pricing.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Three membership plans. All paid in TEXITcoin. Funds always settle straight to your
          wallet — we never touch them.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <PlanCard
            planId="free"
            name="Free"
            price="$0"
            priceSuffix=""
            tagline="Get started. Limited transactions per month."
            cta="Start free"
            features={[
              "Limited transactions per month",
              "BTC, TEXITcoin, USDC/USDT (Ethereum + Base)",
              "Merchant dashboard",
              "WooCommerce plugin",
              "Webhook delivery + retry",
              "KYC-optional checkout",
              "Community support",
            ]}
            footnote="Monthly transaction limit set by us — designed for hobby stores and pilots."
          />
          <PlanCard
            planId="cheap"
            name="Cheap"
            price="$19"
            priceSuffix="/mo"
            tagline="Unlimited transactions. No caps."
            cta="Be Cheap"
            highlight
            features={[
              "Everything in Free",
              "Unlimited transactions",
              "Point of Sale terminal support",
              "CSV export (invoices, payouts)",
              "Reports & analytics",
              "Multiple stores",
              "API keys & webhooks",
              "Email support",
            ]}
            footnote="Billed annually in TEXITcoin. Pay from any TXC wallet."
          />
          <PlanCard
            planId="unlimited"
            name="Unlimited"
            price="$99"
            priceSuffix="/mo"
            tagline="No transaction caps. Built for scale."
            cta="Go Unlimited"
            features={[
              "Everything in Cheap",
              "Advanced APIs (REST + WebSocket)",
              "Customized chain support",
              "Expanded chain coverage",
              "SLA-backed webhook delivery",
              "Team seats + audit log",
              "Custom KYC rules",
              "Priority support",
              "Dedicated account manager",
            ]}
            footnote="Billed monthly in TEXITcoin. Cancel anytime."
          />
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          All plans paid in TEXITcoin. Transaction limits on Free are managed by our team and
          may change as the network grows.
        </p>
      </div>
    </section>
  );
}

export function TerminalKitSection() {
  const kitUrl =
    "https://blockchainmint.com/buy/nectar-pay-mobile-pos-terminal?clear=1";
  const { user } = useAuth();

  async function handleClaim() {
    stashPendingPlan("cheap", "terminal_kit", true);
    if (user) {
      try {
        await recordPlanIntent({
          data: { plan_id: "cheap", source: "terminal_kit", terminal_kit: true },
        });
      } catch {
        /* non-blocking */
      }
    }
  }

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background py-20 text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'><polygon points='30,1 59,17 59,35 30,51 1,35 1,17' fill='none' stroke='%23F6A21E' stroke-width='1'/></svg>\")",
        }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs text-primary">
            <Hexagon className="h-3.5 w-3.5" />
            Merchant Start-up Kit · Ships from Blockchain Mint
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
            Open the box. <span className="text-primary">Start taking crypto.</span>
          </h2>
          <p className="mt-4 max-w-lg text-foreground/70">
            Everything a shop needs to go non-custodial in an afternoon — the countertop
            terminal, a cold-storage coin that <em>is</em> your wallet, and a receipt printer
            that turns every sale into a paper trail your customer walks out with.
          </p>

          <div className="mt-8 space-y-5">
            <KitItem
              icon={<Printer className="h-5 w-5" />}
              title="NectarPay Mobile POS Terminal"
              body="Android-based, 4G + Wi-Fi, built-in thermal QR printer. Boots straight into the NectarPay POS."
            />
            <KitItem
              icon={<Snowflake className="h-5 w-5" />}
              title="BeeKeeper Cold Storage Coin"
              body="A physically-minted coin holding the xpub seed for the terminal. Air-gapped, tamper-evident, yours forever."
            />
            <KitItem
              icon={<Zap className="h-5 w-5" />}
              title="Ready to provision & pair"
              body="Arrives ready to link to your Nectar-Pay account. No messy config required — scan, link, take your first payment."
            />
          </div>

          <div className="mt-10 flex flex-wrap items-end gap-6">
            <div>
              <div className="font-mono text-5xl text-primary">$499</div>
              <div className="mt-1 text-[11px] tracking-widest text-foreground/50">
                ONE-TIME · NO PER-TX FEES, EVER
              </div>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <a href={kitUrl} target="_blank" rel="noreferrer" onClick={handleClaim}>
                Claim your kit <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Checkout on{" "}
            <a
              href="https://blockchainmint.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-primary/60 underline-offset-2 hover:text-foreground"
            >
              blockchainmint.com
            </a>{" "}
            · ships worldwide
          </p>
        </div>

        <a
          href={kitUrl}
          target="_blank"
          rel="noreferrer"
          onClick={handleClaim}
          className="group relative block rounded-2xl border border-border/50 bg-card/60 p-3 shadow-2xl shadow-primary/20 transition hover:-translate-y-1 hover:border-primary/40"
        >
          <img
            src={posTerminalAsset.url}
            alt="NectarPay POS terminal with BeeKeeper cold-storage coin and printed QR receipt"
            loading="lazy"
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
          <div className="flex items-center justify-between px-2 pt-3 pb-1 text-xs text-muted-foreground">
            <span>NectarPay POS · BeeKeeper Coin · QR receipts</span>
            <span className="text-primary group-hover:translate-x-0.5 transition">
              $499 →
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}

function KitItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-1 text-sm text-foreground/60">{body}</div>
      </div>
    </div>
  );
}

function PlanCard({
  planId,
  name,
  price,
  priceSuffix,
  tagline,
  cta,
  features,
  highlight,
  footnote,
}: {
  planId: "free" | "cheap" | "unlimited";
  name: string;
  price: string;
  priceSuffix: string;
  tagline: string;
  cta: string;
  features: string[];
  highlight?: boolean;
  footnote?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleChoose() {
    stashPendingPlan(planId, "pricing");
    if (user) {
      try {
        await recordPlanIntent({ data: { plan_id: planId, source: "pricing" } });
      } catch {
        /* non-blocking */
      }
    }
    navigate({ to: "/signup", search: { plan: planId } as never });
  }

  return (
    <div
      className={`flex flex-col rounded-xl border p-6 ${
        highlight ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-card/60"
      }`}
    >
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {name}
      </h2>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-4xl tracking-tight">{price}</span>
        {priceSuffix ? (
          <span className="text-sm text-muted-foreground">{priceSuffix}</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex-1" />
      <Button
        onClick={handleChoose}
        className="mt-2 w-full"
        variant={highlight ? "default" : "outline"}
      >
        {cta}
      </Button>
      {footnote ? (
        <p className="mt-3 text-xs text-muted-foreground">{footnote}</p>
      ) : null}
    </div>
  );
}
