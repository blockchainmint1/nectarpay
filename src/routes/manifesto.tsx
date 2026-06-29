import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "The Nectar.Pay Manifesto — Honest Money for the Marketplace" },
      {
        name: "description",
        content:
          "Why Nectar.Pay exists: non-custodial crypto payments built on TEXITcoin and the Honest Money Ecosystem. A merchant gateway with no middleman, no debasement, no permission.",
      },
      { property: "og:title", content: "The Nectar.Pay Manifesto" },
      {
        property: "og:description",
        content:
          "A merchant payment rail for the Honest Money Ecosystem. Non-custodial, principled, and built to ignore the Fed.",
      },
    ],
  }),
  component: ManifestoPage,
});

function Rule() {
  return <div aria-hidden className="mx-auto my-12 h-px w-24 bg-border" />;
}

function ManifestoPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
    <article className="mx-auto max-w-3xl px-6 py-20">
      <Link
        to="/"
        className="mb-12 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground"
      >
        ← Nectar.Pay
      </Link>

      <header className="border-y border-border/60 py-10 text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.6em] text-muted-foreground">
          A Declaration
        </p>
        <h1 className="mt-4 text-4xl font-bold uppercase leading-tight sm:text-5xl">
          The Nectar<span className="text-primary">.Pay</span> Manifesto
        </h1>
        <p className="mt-6 text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground">
          Honest Money · For the Marketplace · 2026
        </p>
      </header>

      <section className="mt-16 space-y-6 text-lg leading-relaxed text-foreground/85">
        <p>
          Every payment is a vote. When a merchant accepts a debased currency,
          they ratify the system that debased it. When a customer pays with
          honest money, they walk a small piece of the economy out from under
          the printing press.
        </p>
        <p>
          Nectar.Pay is the till for that economy. A merchant payment gateway built
          for the <strong>Honest Money Ecosystem</strong> — non-custodial,
          permissionless, and aimed straight at the rails that already work.
        </p>
      </section>

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          What we believe
        </h2>
        <ol className="space-y-5 text-lg leading-relaxed text-foreground/85">
          <li>
            <strong>The merchant should hold the money, not us.</strong>{" "}
            Every Nectar.Pay invoice settles to an address the merchant controls.
            We never touch the funds. We never freeze them. We can't.
          </li>
          <li>
            <strong>If your great-grandparents wouldn't recognize it as
            money, look closer.</strong> We accept Bitcoin, TEXITcoin,
            Ethereum, Base, Tron, and Solana — cryptographically scarce
            ledgers no committee can debase.
          </li>
          <li>
            <strong>Competition between currencies isn't a threat.</strong>{" "}
            It's the only honest way to discover what people actually trust.
            So we let merchants accept any of them, on one rail, for one
            flat price.
          </li>
          <li>
            <strong>No middleman. No chargebacks. No "risk department".</strong>{" "}
            Sound money doesn't need a refund counter run by strangers.
          </li>
          <li>
            <strong>The next American revolution will be quiet.</strong>{" "}
            It will be won the moment enough merchants and customers simply
            stop transacting through institutions that have failed them.
          </li>
        </ol>
      </section>

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          Why a gateway?
        </h2>
        <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>
            Shopify, Stripe, PayPal — every one of them is a gatekeeper that
            can deplatform a merchant on Tuesday for the politics they posted
            on Monday. Their fee is not 2.9%. Their fee is the right to exist
            in commerce.
          </p>
          <blockquote className="my-8 border-l-2 border-primary/60 pl-6 text-xl italic text-foreground/90">
            "Humanity is not going to wait for permission to survive."
            <br />
            <span className="text-sm not-italic text-muted-foreground">
              — Robert J. Gray, testimony before the U.S. House
              Subcommittee on Domestic Monetary Policy, August 2, 2012
            </span>
          </blockquote>
          <p>
            Nectar.Pay is the merchant rail that ignores them. A drop-in
            checkout, a webhook, an invoice — same ergonomics, none of the
            custodial baggage. Built on the work Bobby Gray started in 2008
            with the American Open Currency Standard and continued in 2024
            with TEXITcoin.
          </p>
        </div>
      </section>

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          IR&nbsp;1207 — for merchants
        </h2>
        <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>
            Adapted from the four-line resolution Bobby proposed to Congress
            in 2012:
          </p>
          <ol className="space-y-3 border-l-2 border-primary/60 pl-6">
            <li>
              <strong>1.</strong> Price your goods in honest units — and
              accept them at the till.
            </li>
            <li>
              <strong>2.</strong> Settle to wallets <em>you</em> hold the
              keys to. Not an exchange. Not a custodian. You.
            </li>
            <li>
              <strong>3.</strong> Keep the rails that work — cards for
              dollars, chain for everything else — and stop apologizing for
              either.
            </li>
            <li>
              <strong>4.</strong> Do not try to compete with the Fed or with
              the card networks on their terms. Build on yours.
            </li>
          </ol>
        </div>
      </section>

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          Why no fees?
        </h2>
        <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>
            <strong>Because small business is hard enough.</strong> If you're
            just getting started, or you only take the occasional crypto
            payment, the free tier is yours. No card on file, no "starter"
            asterisk that turns into a bill at 10,001 in volume. We're just
            getting started too — grow with us.
          </p>
          <p>
            <strong>Because percentage fees are a tax on your success.</strong>{" "}
            Running a business and actually making money are two different
            sports, and most merchant processors siphon off the top of both.
            Why should we get paid <em>more</em> the better you do? Crush it,
            and we'll cheer for you — not invoice you for it.
          </p>
          <p>
            <strong>Because we built this in a day.</strong> Not three years.
            Not on a $40M Series B from suits who need their pound of flesh
            back. There is no boardroom upstairs demanding we monetize you
            harder this quarter. There is no boardroom upstairs.
          </p>
          <p>
            <strong>Because our win is downstream of yours.</strong> When you
            use TEXITcoin to sign in, to pay your flat monthly bill, or to
            offer your customers a checkout option that doesn't bleed 2.9% —{" "}
            <em>you</em> win first. We win on the back end, quietly, on a
            dozen small things across the Honest Money Ecosystem. We don't
            need to get rich off any single one of them.
          </p>
          <p>
            <strong>And that's the truth.</strong> Love us or hate us for it.
            You cannot run deceptive pricing and expect honest money to
            succeed in the marketplace. So we don't, and it will.
          </p>
        </div>
      </section>

      <Rule />

      <section className="text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground">
          Part of the
        </p>
        <p className="mt-2 text-xl font-semibold">
          <a href="https://honest.money" className="hover:text-primary">
            Honest Money Ecosystem
          </a>
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Read the original{" "}
          <a
            href="https://honest.money/manifesto"
            className="text-primary hover:underline"
          >
            Honest Money Manifesto
          </a>{" "}
          · learn about{" "}
          <a
            href="https://texitcoin.org"
            className="text-primary hover:underline"
          >
            TEXITcoin
          </a>
        </p>
      </section>
    </article>
      <MarketingFooter />
    </div>
  );
}
