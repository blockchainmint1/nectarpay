import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, Minus, ShieldAlert, Wallet, Receipt } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

const TITLE = "Crypto Payment Gateway Comparison: Nectar.Pay vs BitPay vs CoinGate";
const DESCRIPTION =
  "An honest crypto payment gateway comparison: Nectar.Pay's non-custodial, flat-fee model versus BitPay and CoinGate's custodial accounts and percentage-based fees.";
const URL = "https://nectar-pay.com/compare/bitpay-coingate-vs-nectar";

const FAQ = [
  {
    q: "What is a crypto payment gateway?",
    a: "A crypto payment gateway lets a business accept Bitcoin, stablecoins, and other digital assets at checkout or in person. It generates a payment request, watches the blockchain for the funds, and confirms the sale. The critical difference between gateways is who holds the coins after the customer pays — the merchant, or the gateway.",
  },
  {
    q: "Is BitPay or CoinGate custodial?",
    a: "Both BitPay and CoinGate take custody of incoming funds and settle to the merchant afterwards, which is why both require business verification and can freeze or delay payouts. Nectar.Pay is non-custodial: payments land in the merchant's own wallet address directly on-chain.",
  },
  {
    q: "Which crypto payment gateway has the lowest fees?",
    a: "BitPay and CoinGate charge roughly 1% of every transaction, so cost scales with revenue. Nectar.Pay charges a flat monthly membership ($0–$99) and takes 0% of transaction volume — the only cost per payment is the network's own gas fee, paid by the customer's wallet.",
  },
  {
    q: "Can I accept crypto in person, not just online?",
    a: "Nectar.Pay ships branded countertop and mobile terminals — about 1,200 in production — alongside a WooCommerce plugin, PrestaShop module, and REST API. BitPay and CoinGate are primarily online checkout products.",
  },
];

export const Route = createFileRoute("/compare_/bitpay-coingate-vs-nectar")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          mainEntityOfPage: URL,
          author: { "@type": "Organization", name: "Nectar.Pay" },
          publisher: { "@type": "Organization", name: "Nectar.Pay" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: GuidePage,
});

type V = "yes" | "no" | "partial";
const ROWS: { label: string; nectar: [V, string?]; bitpay: [V, string?]; coingate: [V, string?] }[] = [
  {
    label: "Non-custodial — funds settle to your wallet",
    nectar: ["yes", "On-chain, direct"],
    bitpay: ["no", "Custodial"],
    coingate: ["no", "Custodial"],
  },
  {
    label: "Percentage taken from each sale",
    nectar: ["yes", "0%"],
    bitpay: ["no", "~1% per tx"],
    coingate: ["no", "~1% per tx"],
  },
  {
    label: "Flat monthly pricing",
    nectar: ["yes", "$0–$99/mo"],
    bitpay: ["no"],
    coingate: ["no"],
  },
  {
    label: "Merchant KYC required to start",
    nectar: ["no", "KYC-optional"],
    bitpay: ["yes"],
    coingate: ["yes"],
  },
  {
    label: "Branded in-person terminals",
    nectar: ["yes", "1,200 shipping"],
    bitpay: ["no"],
    coingate: ["partial", "Partner POS"],
  },
  {
    label: "First-party merchant map",
    nectar: ["yes", "Public map"],
    bitpay: ["partial", "Directory"],
    coingate: ["no"],
  },
  {
    label: "Multi-chain (BTC, EVM, Solana, Tron, L2s)",
    nectar: ["yes", "8+ chains"],
    bitpay: ["yes"],
    coingate: ["yes"],
  },
  {
    label: "Payout freeze / account-closure risk",
    nectar: ["no", "We hold nothing"],
    bitpay: ["yes"],
    coingate: ["yes"],
  },
];

function Glyph({ v, us }: { v: V; us?: boolean }) {
  const base = "inline-flex h-5 w-5 items-center justify-center rounded-full";
  if (v === "yes")
    return (
      <span className={`${base} ${us ? "bg-primary text-primary-foreground" : "bg-emerald-500/15 text-emerald-500"}`}>
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  if (v === "no")
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

function GuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <article>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-3xl px-4 py-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Comparison guide
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Choosing a crypto payment gateway:{" "}
              <span className="text-primary">Nectar.Pay vs BitPay vs CoinGate</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Every crypto payment gateway promises the same thing — take Bitcoin and stablecoins at
              checkout. The real difference is what happens the second your customer hits send. With
              BitPay and CoinGate, the coins land in <em>their</em> account and you wait for a
              payout, minus roughly 1%. With Nectar.Pay, the coins land in your wallet and we never
              touch them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Sign in to get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/price">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-card/30">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-3">
            <Card
              icon={Wallet}
              title="Custody is the whole story"
              body="A custodial gateway is a payment processor plus an exchange account you didn't ask for. Nectar.Pay derives an address from your own xpub — there is no Nectar balance to withdraw, because the money was never ours."
            />
            <Card
              icon={Receipt}
              title="Percentages punish growth"
              body="1% of $50k/mo is $500/mo. 1% of $500k/mo is $5,000/mo for the exact same API call. A flat $0–$99 membership doesn't get more expensive because you had a good quarter."
            />
            <Card
              icon={ShieldAlert}
              title="Freeze risk is real"
              body="Custodial processors can hold, review, or close a merchant account — and the funds sitting in it. Non-custodial settlement removes that failure mode entirely."
            />
          </div>
        </section>

        <section className="border-b border-border/60">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Side by side, feature by feature
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Compiled from each provider's public pricing and documentation. Spot something out of
              date? Tell us and we'll correct it the same day.
            </p>
            <div className="mt-8 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Feature</th>
                    <th className="bg-primary/10 px-3 py-3 text-center text-xs font-semibold text-primary">
                      Nectar.Pay
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold">BitPay</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold">CoinGate</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.label} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 align-top">{r.label}</td>
                      {([["nectar", r.nectar], ["bitpay", r.bitpay], ["coingate", r.coingate]] as const).map(
                        ([key, cell]) => (
                          <td
                            key={key}
                            className={`px-3 py-3 text-center align-top ${key === "nectar" ? "bg-primary/5" : ""}`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Glyph v={cell[0]} us={key === "nectar"} />
                              {cell[1] ? (
                                <span className="text-[10px] leading-tight text-muted-foreground">
                                  {cell[1]}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-card/30">
          <div className="mx-auto max-w-3xl space-y-10 px-4 py-16">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Nectar.Pay vs BitPay</h2>
              <p className="mt-3 text-muted-foreground">
                BitPay is the oldest name in the category and it shows: broad coin support, mature
                invoicing, and enterprise integrations. It is also fully custodial. Payments settle
                into BitPay's system, merchants complete business verification before going live,
                and roughly 1% of every transaction stays behind. For a store doing serious volume,
                that percentage becomes the single largest line item in the stack.
              </p>
              <p className="mt-3 text-muted-foreground">
                Nectar.Pay keeps the parts merchants actually want — hosted infrastructure,
                multi-chain support, webhooks, WooCommerce and PrestaShop plugins — and removes the
                escrow. Funds go straight to your wallet, the merchant KYC step is optional, and the
                bill is a flat membership instead of a slice of revenue.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Nectar.Pay vs CoinGate</h2>
              <p className="mt-3 text-muted-foreground">
                CoinGate is the friendlier European option: clean checkout, fiat settlement to SEPA,
                and a long list of supported assets. The trade-off is identical to BitPay's —
                custody plus about 1% per transaction, with the account verification and payout
                schedule that custody requires.
              </p>
              <p className="mt-3 text-muted-foreground">
                If fiat settlement is a hard requirement, a custodial gateway is a reasonable
                choice. If you want to actually hold the crypto you earn — or you're selling in
                person and need real hardware on the counter — non-custodial is the only model that
                gets you there. Nectar.Pay ships branded terminals, a public merchant map, and
                sub-15-second confirmations on fast chains like Base and BSC.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                So what should you actually pick?
              </h2>
              <ul className="mt-4 space-y-3 text-muted-foreground">
                <Li>
                  <strong className="text-foreground">You want automatic fiat conversion and
                  bank settlement:</strong>{" "}
                  a custodial gateway like BitPay or CoinGate fits, and you pay ~1% for it.
                </Li>
                <Li>
                  <strong className="text-foreground">You want to keep the crypto:</strong> go
                  non-custodial. Nectar.Pay settles on-chain to an address only you control.
                </Li>
                <Li>
                  <strong className="text-foreground">You sell in person:</strong> you need
                  hardware, not just a checkout page — that's the terminal fleet.
                </Li>
                <Li>
                  <strong className="text-foreground">Your volume is growing:</strong> flat monthly
                  pricing beats a percentage the moment you're past a few thousand dollars a month.
                </Li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Crypto payment gateway FAQ
            </h2>
            <dl className="mt-8 space-y-6">
              {FAQ.map((f) => (
                <div key={f.q} className="rounded-xl border border-border bg-card/40 p-5">
                  <dt className="font-medium">{f.q}</dt>
                  <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-b border-border/60 bg-primary/[0.04]">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Keep 100% of what you earn.</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Connect a wallet, print a QR, get paid on-chain. No custody, no percentage, no leash.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/compare">Compare the whole field</Link>
              </Button>
            </div>
          </div>
        </section>
      </article>

      <MarketingFooter />
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Wallet;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-5">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 font-medium">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}
