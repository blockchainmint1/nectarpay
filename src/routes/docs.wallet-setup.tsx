import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bitcoin,
  Coins,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/docs/wallet-setup")({
  head: () => ({
    meta: [
      { title: "Wallet setup guide — xpubs & addresses · Nectar.Pay" },
      {
        name: "description",
        content:
          "Step-by-step guide to finding the xpub, extended public key, or receive address you need to plug each chain into Nectar.Pay — Bitcoin, TEXITcoin, Ethereum, Base, Tron, Solana, Dogecoin, Iskander, ZCU.",
      },
      { property: "og:title", content: "Wallet setup guide · Nectar.Pay" },
      {
        property: "og:description",
        content:
          "How to find the xpub or address for every chain Nectar.Pay supports — without exposing your private keys.",
      },
    ],
  }),
  component: WalletSetupGuide,
});

function WalletSetupGuide() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <Link
          to="/docs"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All docs
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Wallet setup guide
        </h1>
        <p className="mt-3 text-muted-foreground">
          Nectar.Pay is non-custodial. You give us a <strong>public</strong> key —
          either an extended public key (xpub) for UTXO chains or a single
          receive address for account-based chains — and we derive payment
          addresses for each invoice. Your private keys never leave your wallet.
        </p>

        {/* Safety banner */}
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-sm">
            <p className="font-medium">Never paste a private key, seed phrase, mnemonic, or "xprv".</p>
            <p className="mt-1 text-muted-foreground">
              An <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">xpub</code> starts with{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">xpub / ypub / zpub</code>.
              An <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">xprv / yprv / zprv</code>{" "}
              starts the same but the second letter is <strong>“prv”</strong> — those grant access to funds. If
              you see 12/24 words or a string starting with <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">xprv</code>, stop.
            </p>
          </div>
        </div>

        {/* TOC */}
        <nav className="mt-8 rounded-lg border border-border bg-card/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Jump to chain
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <li><a href="#btc" className="hover:text-primary">Bitcoin (BTC)</a></li>
            <li><a href="#txc" className="hover:text-primary">TEXITcoin (TXC)</a></li>
            <li><a href="#eth" className="hover:text-primary">Ethereum (ETH)</a></li>
            <li><a href="#base" className="hover:text-primary">Base</a></li>
            <li><a href="#tron" className="hover:text-primary">Tron (TRX/USDT)</a></li>
            <li><a href="#sol" className="hover:text-primary">Solana (SOL/USDC)</a></li>
            <li><a href="#doge" className="hover:text-primary">Dogecoin (DOGE)</a></li>
            <li><a href="#isk" className="hover:text-primary">Iskander (ISK)</a></li>
            <li><a href="#zcu" className="hover:text-primary">ZCU</a></li>
          </ul>
        </nav>

        {/* Concept */}
        <h2 className="mt-12 text-xl font-semibold">Two patterns, one job</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card/60 p-5">
            <div className="flex items-center gap-2">
              <Bitcoin className="h-4 w-4 text-primary" />
              <div className="font-medium">UTXO chains — xpub</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              BTC, TXC, DOGE, ISK, ZCU. We use BIP32 to derive a fresh receive
              address per invoice from your extended public key.
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              You provide: <span className="font-mono text-foreground">xpub / ypub / zpub</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card/60 p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <div className="font-medium">Account chains — single address</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              ETH, Base, Tron, Solana. Every invoice goes to your one
              public address with a unique on-chain memo / reference / amount.
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              You provide: <span className="font-mono text-foreground">0x… / T… / Sol address</span>
            </div>
          </div>
        </div>

        {/* BTC */}
        <ChainSection
          id="btc"
          title="Bitcoin (BTC)"
          kind="xpub"
          tagline="Recommended format: zpub (native SegWit, bech32 bc1…)"
        >
          <Steps>
            <li>
              <strong>Sparrow Wallet</strong> (recommended desktop):
              <ol className="ml-4 mt-1 list-decimal space-y-1 text-muted-foreground">
                <li>Open your wallet → <em>Settings</em> tab → <em>Script Type</em> shows your derivation.</li>
                <li>Click <em>Advanced</em> → copy the <strong>Master Public Key</strong>. It will start with <code className="font-mono">zpub</code>, <code className="font-mono">ypub</code>, or <code className="font-mono">xpub</code>.</li>
              </ol>
            </li>
            <li>
              <strong>Electrum</strong>: <em>Wallet → Information</em> → copy the <em>Master Public Key</em>.
            </li>
            <li>
              <strong>Ledger / Trezor</strong>: pair with Sparrow or use the vendor app's <em>Show extended public key</em> option — never the “export keystore.”
            </li>
            <li>
              <strong>BlueWallet (mobile)</strong>: open the wallet → ⋯ menu → <em>XPUB</em>. Tap to reveal, then copy.
            </li>
            <li>Paste into Nectar.Pay → <em>Stores → Chains → Bitcoin → xpub</em>.</li>
          </Steps>
          <Note>
            Nectar.Pay accepts all three formats (xpub / ypub / zpub) and derives the
            correct address type automatically. zpub gives the cheapest fees for
            your buyers; use it if your wallet supports it.
          </Note>
        </ChainSection>

        {/* TXC */}
        <ChainSection
          id="txc"
          title="TEXITcoin (TXC)"
          kind="xpub"
          tagline="Litecoin-derived. Use the TEXITcoin Core wallet or a Litecoin-compatible HD wallet."
        >
          <Steps>
            <li>
              <strong>TEXITcoin Core</strong>:
              <ol className="ml-4 mt-1 list-decimal space-y-1 text-muted-foreground">
                <li>Open the wallet and unlock it.</li>
                <li>Use the console: <em>Window → Console</em>.</li>
                <li>Run <code className="font-mono text-xs">listdescriptors</code> and copy the descriptor's xpub portion (the long string between <code>pkh(</code> or <code>wpkh(</code> and the next <code>/</code>).</li>
              </ol>
            </li>
            <li>
              <strong>HD wallet compatible</strong>: use SLIP-44 coin type <code className="font-mono">696969</code> and BIP32 version bytes <code className="font-mono">0x0488B21E</code> (standard Bitcoin xpub). P2PKH addresses start with the letter matching prefix <code className="font-mono">0x42</code>.
            </li>
            <li>Paste into Nectar.Pay → <em>Stores → Chains → TEXITcoin → xpub</em>.</li>
          </Steps>
        </ChainSection>

        {/* ETH */}
        <ChainSection
          id="eth"
          title="Ethereum (ETH + USDC/USDT)"
          kind="address"
          tagline="One address receives ETH and any ERC-20 stables you've enabled."
        >
          <Steps>
            <li>
              <strong>MetaMask</strong>: click your account name at the top — the address (starts with <code className="font-mono">0x</code>) copies to clipboard.
            </li>
            <li>
              <strong>Rabby / Frame / Trust</strong>: tap the account header to copy.
            </li>
            <li>
              <strong>Ledger / Trezor via MetaMask</strong>: connect, select the Ledger account, copy that address. Do <em>not</em> use a Ledger address that you also use as a sweep/cold-storage account — Nectar.Pay will receive money there but you'll need to move it.
            </li>
            <li>
              <strong>Coinbase / exchange wallet</strong>: skip. Exchange deposit addresses can rotate or be deactivated and won't safely receive arbitrary payments. Use a self-custody wallet.
            </li>
            <li>Paste into Nectar.Pay → <em>Stores → Chains → Ethereum → Receive address</em>.</li>
          </Steps>
          <Note>
            Tip: create a dedicated MetaMask account just for Nectar.Pay payouts so
            you can see incoming revenue cleanly and sweep on a schedule.
          </Note>
        </ChainSection>

        {/* BASE */}
        <ChainSection
          id="base"
          title="Base (USDC, ETH)"
          kind="address"
          tagline="Same address format as Ethereum — the chain ID is different."
        >
          <Steps>
            <li>Any Ethereum wallet works on Base — the address is identical.</li>
            <li>In MetaMask, switch networks to <em>Base</em> (chain ID 8453) before testing — the wallet shows your Base balance separately even though the address is the same.</li>
            <li>For lowest fees on stablecoin payments, Base is usually our top pick. Recommend it to your buyers.</li>
            <li>Paste your <code className="font-mono">0x…</code> address into Nectar.Pay → <em>Stores → Chains → Base → Receive address</em>.</li>
          </Steps>
        </ChainSection>

        {/* TRON */}
        <ChainSection
          id="tron"
          title="Tron (TRX + USDT-TRC20)"
          kind="address"
          tagline="Tron addresses start with capital T (e.g. T9yD…)."
        >
          <Steps>
            <li>
              <strong>TronLink</strong> (browser extension): click the account name to copy. Your address starts with <code className="font-mono">T</code>.
            </li>
            <li>
              <strong>Trust Wallet</strong>: open the Tron asset → tap <em>Receive</em> → copy.
            </li>
            <li>
              <strong>Ledger</strong>: install the Tron app, pair with TronLink, copy the address.
            </li>
            <li>
              <strong>Important — TRC20 vs ERC20</strong>: USDT on Tron is a different token contract than USDT on Ethereum. Make sure your wallet shows the <em>TRC20</em> network when you copy the address.
            </li>
            <li>Paste into Nectar.Pay → <em>Stores → Chains → Tron → Receive address</em>.</li>
          </Steps>
          <Note>
            New Tron accounts may need to be "activated" with a small amount of
            TRX before receiving USDT-TRC20. Send yourself 1 TRX first if your
            wallet is brand new.
          </Note>
        </ChainSection>

        {/* SOL */}
        <ChainSection
          id="sol"
          title="Solana (SOL + USDC)"
          kind="address"
          tagline="A 32–44 character base58 string. We match payments by an on-invoice memo."
        >
          <Steps>
            <li>
              <strong>Phantom</strong>: tap your account name at the top — address copies.
            </li>
            <li>
              <strong>Solflare</strong>: same — tap the account header.
            </li>
            <li>
              <strong>Backpack</strong>: account dropdown → copy.
            </li>
            <li>
              <strong>Ledger via Phantom</strong>: connect, choose the Ledger Solana account, copy.
            </li>
            <li>Paste into Nectar.Pay → <em>Stores → Chains → Solana → Receive address</em>.</li>
          </Steps>
          <Note>
            Nectar.Pay issues each invoice with a unique 8-character memo. Your
            wallet will show the memo on the incoming transaction so you can
            reconcile manually if needed — but our watcher does it for you.
          </Note>
        </ChainSection>

        {/* DOGE */}
        <ChainSection
          id="doge"
          title="Dogecoin (DOGE)"
          kind="xpub"
          tagline="Legacy P2PKH only — addresses start with D."
        >
          <Steps>
            <li>
              <strong>Dogecoin Core</strong>: <em>Window → Console</em> → run <code className="font-mono text-xs">getdescriptorinfo "pkh([fingerprint/44h/3h/0h]xpub…/0/*)"</code> or use Sparrow with Dogecoin support.
            </li>
            <li>
              <strong>BitKeep / Trust Wallet</strong>: export the receive xpub from settings if available; otherwise use a single static address (we'll reuse it for every invoice — works but reduces buyer privacy).
            </li>
            <li>SLIP-44 coin type: <code className="font-mono">3</code>. Default address prefix: <code className="font-mono">0x1e</code>.</li>
          </Steps>
        </ChainSection>

        {/* ISK */}
        <ChainSection
          id="isk"
          title="Iskander (ISK)"
          kind="xpub"
          tagline="Honest.Money ecosystem coin. Use the official Iskander wallet."
        >
          <Steps>
            <li>Open the Iskander wallet → <em>Settings → Advanced → Master Public Key</em>.</li>
            <li>Copy the xpub (starts with <code className="font-mono">xpub</code>) — never the seed phrase.</li>
            <li>If you're running a self-hosted Iskander Core, use <code className="font-mono text-xs">listdescriptors</code> in the console.</li>
            <li>Paste into Nectar.Pay → <em>Stores → Chains → Iskander → xpub</em>.</li>
          </Steps>
        </ChainSection>

        {/* ZCU */}
        <ChainSection
          id="zcu"
          title="ZCU"
          kind="xpub"
          tagline="Honest.Money ecosystem coin. Wallet flow mirrors Bitcoin Core."
        >
          <Steps>
            <li>Open ZCU Core → <em>Window → Console</em> → <code className="font-mono text-xs">listdescriptors</code>.</li>
            <li>Copy the xpub portion of the receive descriptor (between <code>pkh(</code> and the next <code>/</code>).</li>
            <li>Paste into Nectar.Pay → <em>Stores → Chains → ZCU → xpub</em>.</li>
          </Steps>
        </ChainSection>

        {/* Verify */}
        <h2 className="mt-12 flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Before you go live
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>Test with a tiny invoice first.</strong> Create a $1 invoice for each chain
            you've configured. Pay it from a separate wallet. Confirm the funds land in the
            wallet you actually own — not someone else's.
          </li>
          <li>
            <strong>For xpub chains:</strong> Nectar.Pay will show you the next 3 derived
            addresses. Open your wallet and confirm those exact addresses appear in your
            receive tab. If they don't match, the xpub belongs to a different wallet.
          </li>
          <li>
            <strong>Bookmark your wallet.</strong> If you lose access to your wallet, you
            lose access to funds. Nectar.Pay cannot recover anything — we never had it.
          </li>
        </ol>

        <div className="mt-10 rounded-lg border border-border bg-card/60 p-5 text-sm">
          <div className="font-medium">Still stuck?</div>
          <p className="mt-1 text-muted-foreground">
            Hit the <Link to="/docs" className="text-primary hover:underline">main docs</Link> for
            the API + webhook reference, or join the discussion in the{" "}
            <a
              href="https://honest.money"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Honest.Money community <ExternalLink className="h-3 w-3" />
            </a>
            . The maintainers hang out there.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

// ---------- helpers ----------

function ChainSection({
  id,
  title,
  kind,
  tagline,
  children,
}: {
  id: string;
  title: string;
  kind: "xpub" | "address";
  tagline: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {kind === "xpub" ? <Coins className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="ml-auto rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {kind === "xpub" ? "xpub" : "single address"}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
      <div className="mt-4 space-y-3 text-sm">{children}</div>
    </section>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5">{children}</ol>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
