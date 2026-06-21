import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cash-out")({
  head: () => ({
    meta: [
      { title: "Cash Out — Crypto Cards, Banks & Off-Ramps | payHME" },
      {
        name: "description",
        content:
          "payHME settles crypto straight to your wallet. Here's where merchants actually spend it, convert to fiat, or hold it as stablecoins — without surrendering custody to a CEX.",
      },
      { property: "og:title", content: "Cash Out — Honest Off-Ramps for Merchants" },
      {
        property: "og:description",
        content:
          "Crypto debit cards, self-custodial banking, peer-to-peer fiat, and CEX off-ramps — curated by chain and region. Skip the exchange when you can.",
      },
    ],
  }),
  component: CashOutPage,
});

type Option = {
  name: string;
  url: string;
  blurb: string;
  chains: string;
  regions: string;
  custody: "Self-custody" | "Custodial" | "Hybrid";
  affiliate?: boolean;
};

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-24 scroll-mt-24">
      <p className="text-[0.7rem] uppercase tracking-[0.5em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        {title}
      </h2>
      {intro ? (
        <div className="mt-6 space-y-4 text-base leading-relaxed text-foreground/80">
          {intro}
        </div>
      ) : null}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Card({ o }: { o: Option }) {
  return (
    <a
      href={o.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex flex-col rounded-lg border border-border/70 bg-card/40 p-5 transition hover:border-primary hover:bg-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary">
          {o.name}
        </h3>
        <span className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
          {o.custody}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground/80">{o.blurb}</p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
        <span>Chains: {o.chains}</span>
        <span>Region: {o.regions}</span>
        {o.affiliate ? <span className="text-primary/70">Affiliate</span> : null}
      </div>
    </a>
  );
}

function CashOutPage() {
  return (
    <article className="mx-auto max-w-5xl px-6 py-20">
      <Link
        to="/"
        className="mb-12 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground"
      >
        ← payHME
      </Link>

      <header className="border-y border-border/60 py-10 text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.6em] text-muted-foreground">
          Honest off-ramps
        </p>
        <h1 className="mt-4 text-4xl font-bold uppercase leading-tight sm:text-5xl">
          Cash <span className="text-primary">Out</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-foreground/75">
          payHME settles every payment directly to <em>your</em> wallet.
          We never touch the funds. Here's the honest map of what you can
          actually do with crypto once it lands — sorted by{" "}
          <strong>least custodial first</strong>.
        </p>
      </header>

      {/* HERO ESSAY — CASH OUT ALTERNATIVES */}
      <section className="mt-16 space-y-6 text-lg leading-relaxed text-foreground/85">
        <h2 className="text-2xl font-bold uppercase tracking-tight">
          Don't want to use a centralized exchange?
        </h2>
        <p>
          You shouldn't have to. The whole point of self-custody is that the
          moment your crypto lands in a custodian's account, it stops being
          yours — it's a claim on a balance sheet, subject to freezes,
          KYC re-verification, withdrawal limits, and the occasional
          insolvency. The good news: in 2026 you can run almost your entire
          financial life on crypto rails without ever wiring it back to a
          bank.
        </p>
        <p>
          The cleanest path is the <strong>crypto debit card</strong>. Load
          a balance (or, in the best ones, sign a transaction at point of
          sale) and swipe it anywhere Visa or Mastercard works. The card
          provider handles the merchant-side fiat conversion. You keep your
          coins until the moment you spend them. No bank account required,
          no monthly transfer to a checking account, no chargeback risk to
          your wallet.
        </p>
        <p>
          The next tier is <strong>self-custodial neobanking</strong> —
          accounts that look like a bank app but settle on-chain. You hold
          the keys, the app gives you a routing/IBAN number, and ACH/SEPA
          deposits auto-convert to a stablecoin you control. When you need
          to spend, you swipe a linked card or send the stablecoin
          directly. This is as close to "a bank account that runs on
          crypto" as the regulated world currently permits.
        </p>
        <p>
          Below that sits <strong>peer-to-peer fiat</strong> (Bisq,
          HodlHodl, Robosats, LocalCoinSwap) — slower, but no KYC, no
          custodian, and you set the price. Then{" "}
          <strong>Bitcoin-native services</strong> — pay your rent,
          mortgage, utilities, or buy gift cards directly in BTC/Lightning
          via Strike, Bitrefill, and Fold. Many merchants will never need
          fiat at all once they see how much of life is already pay-able in
          sats.
        </p>
        <p>
          And only as a <em>last resort</em>: the centralized exchange. Use
          one if you must, withdraw fast, and never treat it as savings.
          payHME is not in that business and never will be. We get the
          crypto into your wallet, cheap as hell. What you do next is your
          sovereignty.
        </p>

        <nav className="mt-10 grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-5 sm:grid-cols-2">
          <p className="col-span-full text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
            Jump to
          </p>
          <a href="#cards" className="text-sm hover:text-primary">→ Crypto debit cards</a>
          <a href="#neobanks" className="text-sm hover:text-primary">→ Self-custodial neobanks</a>
          <a href="#spend" className="text-sm hover:text-primary">→ Spend directly (bills, gift cards)</a>
          <a href="#p2p" className="text-sm hover:text-primary">→ Peer-to-peer fiat</a>
          <a href="#dex" className="text-sm hover:text-primary">→ DEX swaps (stay on-chain)</a>
          <a href="#cex" className="text-sm hover:text-primary">→ Centralized exchanges</a>
        </nav>
      </section>

      <Section
        id="cards"
        eyebrow="Tier 1 — best"
        title="Crypto debit cards"
        intro={
          <p>
            Swipe anywhere Visa/Mastercard is accepted. You hold the coins;
            the issuer settles in fiat to the merchant. Most charge 0% FX
            and rebate 1–8% in crypto. A few are genuinely non-custodial
            (Gnosis Pay, Holyheld) — the rest are custodial but the card
            balance is small and turnover is fast, so the surface area is
            minimal.
          </p>
        }
      >
        <Card o={{ name: "Gnosis Pay", url: "https://gnosispay.com", blurb: "Self-custodial Visa card backed by a Gnosis Safe on Gnosis Chain. You sign every transaction; funds never leave your Safe until swipe.", chains: "Gnosis Chain (EURe, GBPe)", regions: "EU, UK", custody: "Self-custody" }} />
        <Card o={{ name: "Holyheld", url: "https://holyheld.com", blurb: "EU Mastercard with on-chain settlement from your own wallet. Supports 30+ chains and 100+ tokens at swipe time.", chains: "ETH, Base, Polygon, Arbitrum, +", regions: "EU", custody: "Self-custody" }} />
        <Card o={{ name: "Ether.fi Cash", url: "https://ether.fi/cash", blurb: "Visa card that draws against on-chain collateral (no sale required). Earn yield on the deposit while you spend.", chains: "ETH, Base, Arbitrum", regions: "Global (ex-US)", custody: "Hybrid" }} />
        <Card o={{ name: "Crypto.com Visa", url: "https://crypto.com/cards", blurb: "Custodial but globally accepted. Tiered cashback in CRO. Load from BTC/ETH/USDC and spend in 90+ countries.", chains: "BTC, ETH, USDC, +", regions: "Global", custody: "Custodial" }} />
        <Card o={{ name: "Bybit Card", url: "https://bybit.com/en/cards", blurb: "Custodial Mastercard with strong international acceptance and low FX. Settles from your Bybit funding wallet at swipe.", chains: "BTC, ETH, USDT, +", regions: "EU, UK, APAC, LATAM", custody: "Custodial" }} />
        <Card o={{ name: "Nexo Card", url: "https://nexo.com/cards", blurb: "Credit card that borrows against your crypto collateral — spend without selling. Dual-mode debit/credit in some regions.", chains: "BTC, ETH, USDC, +", regions: "EU, UK", custody: "Custodial" }} />
      </Section>

      <Section
        id="neobanks"
        eyebrow="Tier 2 — close second"
        title="Self-custodial neobanks & on-chain accounts"
        intro={
          <p>
            Bank-like UX, crypto rails underneath. You get an IBAN or ACH
            routing number; deposits auto-swap to a stablecoin you actually
            hold. Withdrawals work the same way in reverse.
          </p>
        }
      >
        <Card o={{ name: "Beam (Squads)", url: "https://beam.is", blurb: "Self-custodial USD account on Solana. Real ACH routing/account numbers, instant USDC settlement, you hold the keys.", chains: "Solana (USDC)", regions: "US", custody: "Self-custody" }} />
        <Card o={{ name: "Monerium", url: "https://monerium.com", blurb: "E-money licensed IBAN that mints/burns EURe 1:1 on-chain. Send SEPA, receive on Ethereum/Gnosis/Polygon, no custodian.", chains: "ETH, Gnosis, Polygon, Arbitrum", regions: "EEA, UK", custody: "Self-custody" }} />
        <Card o={{ name: "Fold", url: "https://foldapp.com", blurb: "Bitcoin-rewards debit card + sats-back on every swipe. FDIC-insured USD partner, BTC held with qualified custodian.", chains: "Bitcoin", regions: "US", custody: "Hybrid" }} />
        <Card o={{ name: "Juno", url: "https://onjuno.com", blurb: "Crypto-friendly checking. Auto-convert paychecks to USDC on receipt and self-custody from there.", chains: "ETH, Polygon, Solana", regions: "US", custody: "Hybrid" }} />
      </Section>

      <Section
        id="spend"
        eyebrow="Tier 3"
        title="Spend crypto directly (skip fiat entirely)"
        intro={
          <p>
            Bills, rent, groceries, flights, gift cards — most of life is
            already pay-able in BTC/Lightning/USDC. If you don't need cash,
            don't convert to cash.
          </p>
        }
      >
        <Card o={{ name: "Bitrefill", url: "https://bitrefill.com", blurb: "Gift cards and bill payments for 5,000+ merchants in 170 countries. Amazon, Walmart, utilities, mobile top-ups — all in BTC/LN/USDC.", chains: "BTC, LN, ETH, USDC, +", regions: "Global", custody: "Self-custody", affiliate: true }} />
        <Card o={{ name: "Strike", url: "https://strike.me", blurb: "Send Lightning, pay any US bill, route ACH/wire out of BTC. Best-in-class Lightning UX.", chains: "BTC, Lightning", regions: "US, EU, LATAM, Africa", custody: "Custodial", affiliate: true }} />
        <Card o={{ name: "Spritz Finance", url: "https://spritz.finance", blurb: "Pay mortgages, rent, car loans, utilities directly from your self-custodial wallet. ACH on the back end, on-chain on the front.", chains: "ETH, Base, Polygon", regions: "US", custody: "Self-custody" }} />
        <Card o={{ name: "Travala", url: "https://travala.com", blurb: "Book 3M+ hotels and flights in 100+ cryptocurrencies. AVA rewards, no KYC for most bookings.", chains: "BTC, ETH, USDT, AVA, +", regions: "Global", custody: "Custodial" }} />
        <Card o={{ name: "The Bitcoin Company", url: "https://thebitcoincompany.com", blurb: "Discounted gift cards (up to 20% off) paid in BTC/Lightning. No account required.", chains: "BTC, Lightning", regions: "US, UK, EU, AU", custody: "Self-custody" }} />
        <Card o={{ name: "CoinsBee", url: "https://coinsbee.com", blurb: "4,500+ brand gift cards from 185 countries, paid in 250+ cryptocurrencies. Strong EU/Asia coverage.", chains: "BTC, ETH, USDT, USDC, +", regions: "Global", custody: "Self-custody" }} />
      </Section>

      <Section
        id="p2p"
        eyebrow="Tier 4"
        title="Peer-to-peer fiat (no KYC)"
        intro={
          <p>
            Trade directly with another human. Slower, sometimes wider
            spreads, but no custodian and (depending on payment method)
            often no KYC.
          </p>
        }
      >
        <Card o={{ name: "Bisq", url: "https://bisq.network", blurb: "Decentralized P2P exchange. Desktop app, Tor by default, no signup, no servers holding orders.", chains: "BTC", regions: "Global", custody: "Self-custody" }} />
        <Card o={{ name: "Robosats", url: "https://learn.robosats.com", blurb: "Lightning-only P2P. Generate a robot avatar, no email, no KYC, hold-invoice escrow.", chains: "BTC, Lightning", regions: "Global", custody: "Self-custody" }} />
        <Card o={{ name: "HodlHodl", url: "https://hodlhodl.com", blurb: "Multisig P2P BTC trading. No custody, no KYC, supports any fiat payment method the counterparty accepts.", chains: "BTC", regions: "Global", custody: "Self-custody" }} />
        <Card o={{ name: "Peach Bitcoin", url: "https://peachbitcoin.com", blurb: "Mobile-first P2P BTC for EU/UK. SEPA, Revolut, Wise, cash by post.", chains: "BTC, Lightning", regions: "EU, UK, LATAM", custody: "Self-custody" }} />
      </Section>

      <Section
        id="dex"
        eyebrow="Tier 5"
        title="Stay on-chain — DEX swaps to stables"
        intro={
          <p>
            If "cashing out" just means moving from volatile crypto to a
            stablecoin, never leave the chain. These aggregators route for
            the best price across DEXs.
          </p>
        }
      >
        <Card o={{ name: "Jupiter", url: "https://jup.ag", blurb: "The Solana liquidity aggregator. Best route for SOL/SPL → USDC in one signature.", chains: "Solana", regions: "Global", custody: "Self-custody" }} />
        <Card o={{ name: "1inch", url: "https://1inch.io", blurb: "Multi-chain DEX aggregator (Ethereum, Base, Arbitrum, Polygon, BNB, +). Strong on EVM stable swaps.", chains: "EVM (all major)", regions: "Global", custody: "Self-custody" }} />
        <Card o={{ name: "Uniswap", url: "https://app.uniswap.org", blurb: "The canonical EVM DEX. Direct, no aggregator, deep liquidity on the majors.", chains: "ETH, Base, Arbitrum, +", regions: "Global", custody: "Self-custody" }} />
        <Card o={{ name: "Thorchain", url: "https://thorchain.org", blurb: "Cross-chain native swaps (BTC ↔ ETH ↔ DOGE ↔ +) without wrapped assets or bridges.", chains: "BTC, ETH, DOGE, LTC, BCH, +", regions: "Global", custody: "Self-custody" }} />
      </Section>

      <Section
        id="cex"
        eyebrow="Last resort"
        title="Centralized exchanges (if you must)"
        intro={
          <p>
            Use these for the off-ramp <em>only</em>. Deposit, sell,
            withdraw — same day. Never custody savings here. We list them
            because pretending they don't exist doesn't help anyone.
          </p>
        }
      >
        <Card o={{ name: "Kraken", url: "https://kraken.com", blurb: "Long-standing, strong security track record, supports nearly every chain payHME does. Good fiat rails in US/EU.", chains: "BTC, ETH, SOL, DOGE, +", regions: "Global (ex-some US states)", custody: "Custodial", affiliate: true }} />
        <Card o={{ name: "Coinbase", url: "https://coinbase.com", blurb: "Easiest US fiat off-ramp, expensive on retail flow — use Coinbase Advanced for better fees.", chains: "BTC, ETH, SOL, USDC, +", regions: "US, EU, UK", custody: "Custodial" }} />
        <Card o={{ name: "Bitstamp", url: "https://bitstamp.net", blurb: "EU-regulated, clean SEPA in/out, no shenanigans. Smaller asset list, which is a feature.", chains: "BTC, ETH, +", regions: "EU, UK, US", custody: "Custodial" }} />
        <Card o={{ name: "Bitvavo", url: "https://bitvavo.com", blurb: "EU-only, cheapest SEPA off-ramp in the region. Good Solana/Doge support.", chains: "BTC, ETH, SOL, DOGE, +", regions: "EEA", custody: "Custodial" }} />
      </Section>

      <section className="mt-24 rounded-lg border border-border/60 bg-muted/20 p-8">
        <p className="text-[0.7rem] uppercase tracking-[0.5em] text-muted-foreground">
          Honesty disclosure
        </p>
        <h2 className="mt-3 text-2xl font-bold uppercase tracking-tight">
          What payHME earns from this page
        </h2>
        <p className="mt-4 text-base text-foreground/80">
          Links tagged <span className="text-primary/80">Affiliate</span>{" "}
          may pay payHME a referral fee. It does not change what you pay or
          how we rank the options. We led with self-custody because it's
          objectively better for merchants — not because it pays us more.
          If you spot a service we missed or an option that's gone
          downhill, email{" "}
          <a className="text-primary underline" href="mailto:hello@honest.money">
            hello@honest.money
          </a>
          .
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          None of this is financial, tax, or legal advice. Crypto rules
          vary wildly by jurisdiction. Verify availability and compliance
          for your country before using any service listed.
        </p>
      </section>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-8 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          ← Back to payHME
        </Link>
        <div className="flex gap-6">
          <Link to="/manifesto" className="text-muted-foreground hover:text-foreground">
            Manifesto
          </Link>
          <Link to="/docs" className="text-muted-foreground hover:text-foreground">
            Docs
          </Link>
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground">
            Pricing
          </Link>
        </div>
      </div>
    </article>
  );
}
