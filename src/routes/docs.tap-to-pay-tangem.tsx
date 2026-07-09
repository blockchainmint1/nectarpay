import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/docs/tap-to-pay-tangem")({
  head: () => ({
    meta: [
      { title: "Tap-to-Pay with Tangem — Nectar.Pay" },
      {
        name: "description",
        content:
          "Customers tap their Tangem hardware wallet on a NectarPOS terminal to pay in USDC on Ethereum. No app, no scanning, one tap.",
      },
      { property: "og:title", content: "Tap-to-Pay with Tangem — Nectar.Pay" },
      {
        property: "og:description",
        content:
          "Hardware-wallet security, contactless-card speed. One tap to pay merchants in USDC.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TangemDocsPage,
});

function TangemDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <article className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-medium text-primary">Nectar.Pay Docs</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Tap-to-Pay with Tangem
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Your customer taps their Tangem card on the merchant's NectarPOS
          terminal. USDC moves from the card's Ethereum address straight to the
          merchant. Three seconds, one tap, hardware-wallet security.
        </p>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
            <li>Merchant enters the amount on NectarPOS and shows "Tap to pay".</li>
            <li>
              Customer taps their Tangem card on the back of the terminal. The
              POS reads the card's public key over NFC.
            </li>
            <li>
              Nectar.Pay builds the USDC transfer transaction and sends the
              32-byte digest back to the card.
            </li>
            <li>
              The Tangem card's secure element (EAL6+) signs the digest inside
              the chip. The private key never leaves the card.
            </li>
            <li>
              Nectar.Pay assembles the signed transaction and broadcasts it to
              Ethereum. Merchant sees a check mark. Done.
            </li>
          </ol>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">What customers need</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              A Tangem card (any 2.0+ card, single or backup set), activated
              via the official Tangem app.
            </li>
            <li>USDC on Ethereum mainnet loaded to the card's ETH address.</li>
            <li>
              A small ETH balance (~$2 worth) for network gas. NectarPOS shows a
              clear error if the card can't cover gas.
            </li>
          </ul>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">What merchants need</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              A NectarPOS Android terminal (v0.1.4+ — the version that ships
              with the Tangem NFC plugin).
            </li>
            <li>
              A USDC (Ethereum) payout address configured on your store. Set it
              at <span className="font-mono">Store → Chains → USDC (Ethereum)</span>.
            </li>
          </ul>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">Security model</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              Signing keys live in the Tangem card's certified secure element.
              Nectar.Pay never touches them.
            </li>
            <li>
              Each tap creates a single-use payment intent with a 60-second
              TTL. Once broadcast, the intent is retired.
            </li>
            <li>
              Server-side ecrecover verifies the signature matches the card's
              address before broadcast. A wrong or tampered signature is
              rejected.
            </li>
            <li>
              The on-chain nonce is fetched at build time — replaying the same
              signed tx after confirmation fails at the mempool.
            </li>
          </ul>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">Fees</h2>
          <p className="text-muted-foreground">
            Nectar.Pay charges no per-tap fee for Tangem payments during the
            initial rollout. Customers pay Ethereum network gas (typically
            $0.30 – $2 depending on network conditions). Merchants receive the
            full USDC amount at their payout address.
          </p>
        </section>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">Coming soon</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>USDC on Base and Arbitrum (gas well under $0.05).</li>
            <li>Tangem cards with an access code / PIN for high-value taps.</li>
            <li>Merchant-side refunds via a store treasury Tangem card.</li>
          </ul>
        </section>

        <div className="mt-16 border-t border-border pt-8">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Back to Nectar.Pay
          </Link>
        </div>
      </article>
    </div>
  );
}
