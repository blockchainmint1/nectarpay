import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, RefreshCw, Fingerprint, Fuel, AlertTriangle, ShieldCheck } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/docs/address-rotation")({
  head: () => ({
    meta: [
      { title: "Address derivation & rotation policy · Nectar.Pay" },
      {
        name: "description",
        content:
          "How Nectar.Pay picks a receiving address for every invoice: fresh HD addresses on UTXO chains, recycled addresses on EVM, and shared addresses with amount tagging on Solana and static Tron.",
      },
      { property: "og:title", content: "Address derivation & rotation policy · Nectar.Pay" },
      {
        property: "og:description",
        content:
          "Fresh address per invoice on UTXO chains, gas-aware recycling on EVM, amount-tagged matching on shared-address chains — and why it matters for your privacy and sweep costs.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://app.nectar-pay.com/docs/address-rotation" },
    ],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/docs/address-rotation" }],
  }),
  component: AddressRotationDoc,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function AddressRotationDoc() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <article className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <Link
          to="/docs"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All docs
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Address derivation &amp; rotation
        </h1>
        <p className="mt-3 text-muted-foreground">
          Every invoice needs an address that only your wallet controls. How we choose that
          address depends on the chain — because the accounting model of each chain changes what
          &ldquo;a fresh address&rdquo; costs you. This page explains what happens, why, and what it means for
          your privacy, your sweep costs, and your bookkeeping.
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>
            None of this involves your private keys. Nectar.Pay only ever holds a{" "}
            <strong>public</strong> key (xpub) or a public receive address. Derivation is a
            one-way, public-key-only operation.
          </p>
        </div>

        <Section title="The short version">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>UTXO / HD chains (BTC, TXC + TSD, LTC, DOGE, BCH, DASH, ISK):</strong> a brand
              new address for every single invoice. Never reused.
            </li>
            <li>
              <strong>EVM chains (ETH, Base, BSC, ZCU):</strong> HD addresses too, but idle ones are
              recycled after a cool-down window instead of burning a new address on every unpaid
              invoice.
            </li>
            <li>
              <strong>Solana, and Tron when you supply a single T-address:</strong> one shared
              address, with each invoice given a unique cent-level amount tag so payments still
              match to exactly one invoice.
            </li>
          </ul>
        </Section>

        <Section title="Fresh address per invoice (UTXO chains)">
          <p>
            Give us an xpub and we derive <span className="font-mono">m/0/n</span>, incrementing{" "}
            <span className="font-mono">n</span> on every invoice. Address #0 goes to the first
            invoice, #1 to the second, and so on — the index never moves backwards and an address is
            never handed to a second invoice.
          </p>
          <p>
            <strong>Why:</strong> on UTXO chains an extra address costs nothing. Consolidating coins
            later is a single transaction with many inputs, so there is no per-address penalty. The
            upside is real: each customer sees an address that has never appeared on-chain before, so
            no observer can total your daily takings by watching one address, and every payment maps
            to exactly one invoice with zero ambiguity.
          </p>
          <p>
            This also means a customer who pays <em>late</em> — after the invoice expired — still
            pays to an address you control. Nothing is lost; use the{" "}
            <Link to="/verify" className="text-primary underline">
              address verifier
            </Link>{" "}
            to prove ownership and reconcile it.
          </p>
        </Section>

        <Section title="Rotation with recycling (EVM chains)">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-foreground">
            <Fuel className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm">
              EVM is account-based: <strong>every address you receive into must be swept
              individually, and every sweep costs gas</strong> — per address, per token. A thousand
              abandoned checkout pages would leave you with a thousand dust accounts to pay gas on.
            </p>
          </div>
          <p>
            So on EVM we still derive from your xpub at <span className="font-mono">m/0/n</span>, but
            before minting a new index we look for an address on the same store and chain that is
            safe to reuse. An address qualifies only when:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>it is derivable from your <em>current</em> xpub (addresses from a rotated-out key are never reused);</li>
            <li>no invoice on it is still live (pending, detected, or underpaid); and</li>
            <li>every invoice ever issued on it is older than the <strong>1 hour</strong> cool-down.</li>
          </ul>
          <p>
            Oldest-idle addresses are drained first. The practical effect: a busy store settles into a
            small working set of addresses that are cheap to sweep, while any address with money in
            flight is untouchable. The tradeoff is that a payment arriving more than an hour after its
            invoice went cold may land on an address that has since been assigned to a new invoice —
            still your money, still your address, but reconciliation is manual.
          </p>
        </Section>

        <Section title="Shared address with amount tagging (Solana, static Tron)">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-foreground">
            <Fingerprint className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">
              When there is only one address, the <em>amount</em> becomes the invoice ID.
            </p>
          </div>
          <p>
            Solana wallets hand out a single account address, and some Tron wallets do the same. When
            we only have one address, two open invoices would be indistinguishable — so we nudge the
            crypto amount by a unique three-digit nonce in decimal places 3–5. A{" "}
            <span className="font-mono">$69.65</span> charge becomes{" "}
            <span className="font-mono">69.65042 USDT</span>. The watcher then matches on (address,
            token, amount ± tolerance) and lands the payment on exactly one invoice.
          </p>
          <p>
            We always round <em>up</em> to the next cent before adding the tag, so the customer is
            never underbilled and you are never short. If you supply a Tron account-level xpub instead
            of a single T-address, Tron switches to fresh-address-per-invoice like the UTXO chains.
          </p>
        </Section>

        <Section title="Who sets the policy?">
          <p>
            Nectar.Pay sets it, per chain, and it is not merchant-configurable today. The policy is
            driven by the chain&rsquo;s accounting model rather than by preference — a fresh address on
            EVM is not a privacy upgrade so much as a gas bill, and a shared address on Bitcoin would
            be a privacy downgrade with no offsetting benefit.
          </p>
          <p>
            What you <em>do</em> control is the input: supply an xpub and you get rotation; supply a
            single static address and you get the shared-address path with amount tagging. On Tron
            that choice is yours directly. Rotating your xpub at any time immediately retires the old
            derivation set — old addresses are never recycled after a key change.
          </p>
        </Section>

        <Section title="What this means for your bookkeeping">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Your wallet should be an <strong>HD wallet scanning the full account</strong>, not
              watching one address. Beekeeper, Ledger, Trezor, Sparrow, and Electrum all do this by
              default.
            </li>
            <li>
              Raise your wallet&rsquo;s <strong>gap limit</strong> if it stops finding funds — unpaid
              invoices leave gaps in the derivation sequence on UTXO chains.
            </li>
            <li>
              Anything that looks orphaned can be traced with the{" "}
              <Link to="/verify" className="text-primary underline">
                address verifier
              </Link>
              , which checks your live index plus a 60-address lookahead and tells you which store and
              index owns it.
            </li>
          </ul>
        </Section>

        <div className="mt-12 flex flex-wrap gap-4 border-t pt-6 text-sm">
          <Link to="/docs/wallet-setup" className="inline-flex items-center gap-2 text-primary underline">
            <RefreshCw className="h-4 w-4" /> Wallet setup guide
          </Link>
          <Link to="/docs" className="inline-flex items-center gap-2 text-primary underline">
            <AlertTriangle className="h-4 w-4" /> Full API docs
          </Link>
        </div>
      </article>

      <MarketingFooter />
    </div>
  );
}
