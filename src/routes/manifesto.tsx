import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "The payHME Manifesto — Honest Money for the Marketplace" },
      {
        name: "description",
        content:
          "Why payHME exists: non-custodial crypto payments built on TEXITcoin and the Honest Money Ecosystem. A merchant gateway with no middleman, no debasement, no permission.",
      },
      { property: "og:title", content: "The payHME Manifesto" },
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
    <article className="mx-auto max-w-3xl px-6 py-20">
      <Link
        to="/"
        className="mb-12 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground"
      >
        ← payHME
      </Link>

      <header className="border-y border-border/60 py-10 text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.6em] text-muted-foreground">
          A Declaration
        </p>
        <h1 className="mt-4 text-4xl font-bold uppercase leading-tight sm:text-5xl">
          The pay<span className="text-primary">HME</span> Manifesto
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
          payHME is the till for that economy. A merchant payment gateway built
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
            Every payHME invoice settles to an address the merchant controls.
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
            payHME is the merchant rail that ignores them. A drop-in
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
          </a>{" "}
          · explore the{" "}
          <a
            href="https://honest.money/aocs"
            className="text-primary hover:underline"
          >
            American Open Currency Standard
          </a>
        </p>
      </section>
    </article>
  );
}
