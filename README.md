<p align="center">
  <img src="docs/images/nectarpay-hero.png" alt="NectarPay — accept crypto, keep every cent" width="920">
</p>

<h1 align="center">Nectar.Pay</h1>

<p align="center">
  <strong>Non-custodial crypto payments for real shops.</strong><br>
  A customer pays. The money lands in the merchant's own wallet. Nothing ever sits here.
</p>

<p align="center">
  <a href="https://app.nectar-pay.com"><img src="https://img.shields.io/badge/live-app.nectar--pay.com-F6A21E?style=flat-square&logo=googlechrome&logoColor=0D1B33" alt="Live app"></a>
  <img src="https://img.shields.io/badge/TanStack%20Start-React%2019-0D1B33?style=flat-square&logo=react&logoColor=F6A21E" alt="TanStack Start">
  <img src="https://img.shields.io/badge/TypeScript-strict-0D1B33?style=flat-square&logo=typescript&logoColor=F6A21E" alt="TypeScript">
  <img src="https://img.shields.io/badge/tests-240%20passing-0D1B33?style=flat-square&logo=vitest&logoColor=F6A21E" alt="240 tests passing">
  <img src="https://img.shields.io/badge/custody-0%25-0D1B33?style=flat-square&logo=lock&logoColor=F6A21E" alt="Zero custody">
  <img src="https://img.shields.io/badge/part%20of-honest.money-F6A21E?style=flat-square" alt="Part of the honest.money ecosystem">
</p>

---

**Nectar.Pay is a payment gateway that never holds money.** A merchant pastes in their own
public wallet key, and every sale settles straight into that wallet — Bitcoin, TEXITcoin,
Litecoin, Dogecoin, Ethereum, Base, or Zero Chill Units. There is no balance, no withdrawal
queue, and no percentage skimmed off the top. API keys can create a bill and read their own
sales; they can never move a coin.

Built for the people who actually run the counter: a barista, a bar owner, a market stall, a
one-person web shop. If you can print a sticker and paste a key, you can take crypto tomorrow
morning.

> [!NOTE]
> This repository is the whole product — merchant app, shopper checkout, public REST API,
> webhooks, shop plugins, and the Android POS terminal, in one TanStack Start codebase.

## Contents

- [The idea, in one picture](#the-idea-in-one-picture)
- [What you get](#what-you-get)
- [Coins and networks](#coins-and-networks)
- [Quick start](#quick-start)
- [Repo map](#repo-map)
- [How a payment settles](#how-a-payment-settles)
- [Public API](#public-api)
- [Drop-in checkout](#drop-in-checkout)
- [Shop plugins](#shop-plugins)
- [Mobile apps](#mobile-apps)
- [Security posture](#security-posture)
- [Tests and quality](#tests-and-quality)
- [Docs in this repo](#docs-in-this-repo)
- [The ecosystem](#the-ecosystem)

## The idea, in one picture

```text
   shopper                  NectarPay                   merchant wallet
      │                          │                             │
      │  scan QR / open link     │                             │
      ├─────────────────────────>│                             │
      │                          │  derive a fresh address     │
      │                          │  from the merchant's xpub   │
      │  "send 412.03 TSD"       │                             │
      │<─────────────────────────┤                             │
      │                          │                             │
      │  pay from their wallet   │                             │
      ├──────────────────────────────────────────────────────> │
      │                          │                             │
      │                     watch the chain ─────────────────> │  funds arrive
      │                          │                             │
      │                          │  exact amount? record it    │
      │  receipt + merchant alert│  email · Telegram · webhook │
      │<─────────────────────────┤<────────────────────────────┤
```

Money only ever moves **shopper → merchant**. NectarPay watches, matches, and tells everyone
what happened.

## What you get

<p align="center">
  <img src="docs/images/nectarpay-onramp.png" alt="Merchant onramp" width="880">
</p>

| | |
|---|---|
| **Checkout** | Hosted invoice page, BIP-21 payment codes, QR, live countdown and paid-in-full / short / over payments, with a merchant-branded page. |
| **Fast Start Program** | Paste a Cold Storage Coin ID, sign on screen, and the coin-and-sticker kit ships to a ready-to-take-payments store with its own `/s/<code>` sticker URL. |
| **Terminal (POS)** | Browser register with a product catalogue, cash/tender split, change, tip, **NFC tap-to-pay cards**, customer signature capture, and a printed or emailed receipt. |
| **Give Back** | A shopper can pay less by routing part of the sale to a church and the program — a 10% discount, split 8% church / 2% program. |
| **POP Rewards** | Shoppers earn 1 non-spendable POP per US dollar spent, rounded up, on every sale. |
| **Merchant Directory** | A public map and listing of shops that accept crypto, with a partner feed anyone can read. |
| **Reports** | Daily sales by tender and network, CSV export, per-sticker and per-terminal reports, and a customer list with separate marketing consent. |
| **Alerts** | Email and Telegram when a sale lands, a payment looks wrong, or a wallet key changes. |
| **Team** | Staff accounts with per-person permissions, MFA, and an audit trail you cannot edit. |

## Coins and networks

| Network | Status | Notes |
|---|---|---|
| **TEXITcoin** | live | Native coin plus **TSD** stablecoin on the Omni layer; the platform's home chain. |
| **Bitcoin** | live | Native only, bech32 receive addresses. |
| **Litecoin / Dogecoin** | live | Native coins; one xpub covers each family. |
| **Ethereum** | live | Native plus USDC, USDT, PYUSD and DAI. |
| **Base** | live | Native plus USDC, USDT and DAI. |
| **Zero Chill Units (ZCU)** | live | EVM fork watched over its own public RPC; native coin only. |
| **BNB Smart Chain** | retired, but watched | Hidden from shoppers; a free public node still watches for stablecoins sent here by mistake and credits real sales. |
| **Tron, Solana, Bitcoin Cash, Dash** | retired | Saved keys are kept, new bills are refused, so no watcher burns paid RPC calls. |
| **Bitcoin Lightning** | off | Gated in code and blocked by a database constraint. |
| **ISK** | not yet wired | Same shape as TEXITcoin with a different address path. |

## Quick start

You need [Bun](https://bun.sh) and a Lovable Cloud backend for this project.

```bash
bun install
bun run dev        # http://localhost:8080
```

The backend URL and publishable key are written into `.env` by Lovable Cloud — you don't hand
edit them. Chain providers (Alchemy), email (AWS SES), Telegram, and partner signing secrets
live as server-side environment variables; the app runs with whatever is present and hides the
features that need a missing one.

| Command | What it does |
|---|---|
| `bun run dev` | Dev server with hot reload. |
| `bun run build` | Production build. |
| `bun run preview` | Serve the built app. |
| `bun run lint` / `bun run format` | ESLint and Prettier. |
| `bunx vitest run` | The full test suite. |
| `bun run sync:terminal` | Sync the POS app into its Android project. |
| `bun run sync:merchant` | Sync the merchant app into its iOS/Android projects. |

## Repo map

```text
src/
  routes/            144 route files: merchant app, checkout, docs, /api/public/v1/*
  lib/               domain logic — chains, wallet-link, vault-link, give, pop, email, sdk
    chains/          one watcher per network (BTC-like, EVM, Omni, Solana, Tron, ZCU, …)
  components/        UI, including the admin list sort header
  integrations/      generated backend client (don't hand edit)
  styles.css         Tailwind v4 theme — the navy/amber design tokens
supabase/migrations/  95 migrations, applied in order
docs/                handoff notes for partners and teammates
public/              9 shop plugins, the JS SDK, how-to screenshots, llms.txt, openapi.json
android/             the POS terminal app (Capacitor)
scripts/             keystore and iOS prep helpers
.github/workflows/   pos-apk.yml — builds and signs the terminal APK
AGENTS.md            the project's own rules, and one per folder
roadmap.md           what's done, what's next
```

## How a payment settles

1. **A bill is created.** A fresh receive address is derived from the merchant's own public
   key, so every sale gets an address that has never been used before, and the private key
   never touches this server.
2. **The chain is watched.** A cron watcher reads each network, and Alchemy push notifications
   act as a hint for the EVM chains. A hint is never trusted on its own — the shared on-chain
   scanner confirms it.
3. **Matching is exact.** The amount has to match the bill. Under- and over-payments are
   recorded as what they are, and anything that can't be matched goes to a merchant-visible
   *unmatched payments* pile instead of being guessed at.
4. **Settlement writes one row.** A guarded, idempotent database function records the
   transaction and settles the sale exactly once, even if two watchers race.
5. **Everyone is told.** Email, Telegram, and the merchant's own webhook all come out of a
   durable outbox, so a callback can't be lost mid-request, and retries keep going for up to
   24 hours.

## Public API

Base URL `https://app.nectar-pay.com` · auth `Authorization: Bearer sk_live_...` ·
120 requests/minute per key (429 + `Retry-After`).

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/public/v1/me` | Who this key belongs to. |
| `POST` | `/api/public/v1/invoices` | Create a bill and get its checkout URL. |
| `GET` | `/api/public/v1/invoices` | List this key's bills, filterable. |
| `GET` | `/api/public/v1/invoices/{id}` | One bill and its payment state. |
| `POST` | `/api/public/v1/invoices/{id}/email` | Email the receipt to a buyer. |
| `GET` | `/api/public/v1/invoices/{id}/webhooks` | Delivery log for one bill. |
| `GET` | `/api/public/v1/rates` | Current exchange rates. |
| `GET` | `/api/public/v1/store` | Public store profile. |
| `GET`/`POST` | `/api/public/v1/links` | Hosted pay links (also `PATCH`/`DELETE /{slug}`). |
| `GET` | `/api/public/v1/directory` | The public merchant directory. |

```bash
curl -X POST https://app.nectar-pay.com/api/public/v1/invoices \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
        "amount": 25,
        "currency": "USD",
        "chain": "txc",
        "order_id": "order-123",
        "description": "Espresso flight",
        "redirect_url": "https://yourshop.test/thanks"
      }'
```

```json
{
  "id": "5954d3c4-…",
  "address": "TXC1q…",
  "crypto_amount": 412.03,
  "rate": 0.6067,
  "checkout_url": "https://app.nectar-pay.com/i/5954d3c4-…",
  "expires_at": "2026-11-20T13:04:00Z"
}
```

`chain` is optional — leave it out and the shopper picks their own coin.

### Webhooks

Every event is signed. Verify before you trust it:

```js
import crypto from "node:crypto";

// Header: X-TXCPay-Signature: t=<unix>,v1=<hex>
function verify(rawBody, header, webhookSecret) {
  const t = Number(header.match(/t=(\d+)/)[1]);
  const got = header.match(/v1=([0-9a-f]+)/)[1];
  const want = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  return (
    crypto.timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(want, "hex")) &&
    Math.abs(Date.now() / 1000 - t) < 300
  );
}
```

Events: `invoice.paid`, `invoice.underpaid`, `invoice.overpaid`, `invoice.confirmed`.
Retries back off over 24 hours, up to eight attempts.

## Drop-in checkout

One script tag and a button:

```html
<script src="https://app.nectar-pay.com/sdk/payhme.js"></script>

<button data-payhme
        data-api-key="sk_live_..."
        data-amount="25"
        data-currency="USD"
        data-chain="txc"
        data-order-id="order-123">
  Pay with crypto
</button>
```

Or drive it yourself and listen for the result:

```js
const result = await PayHME.checkout({ amount: 25, currency: "USD", chain: "txc" });
// { status: "paid" | "closed" | "expired", invoiceId, tx }
```

No code at all: create a hosted link and send shoppers to `https://app.nectar-pay.com/t/<slug>`,
or point a printed sticker at `https://app.nectar-pay.com/s/<code>`.

<p align="center">
  <img src="docs/images/nectarpay-directory.png" alt="Public merchant directory" width="880">
</p>

## Shop plugins

Ready-to-install modules for the shops people already run — each one is a downloadable archive
under `public/plugins/`:

**WooCommerce** · **Magento 2** · **PrestaShop** · **OpenCart** · **CS-Cart** · **Zen Cart** ·
**WHMCS** · **Easy Digital Downloads** · **Craft Commerce**

## Mobile apps

| App | How it ships |
|---|---|
| **POS terminal** | A signed Android APK built by the `POS APK` GitHub Action — push the `pos-app` branch or tag `pos-v*`, and the download lands at `/pos.apk`. |
| **Merchant app** | A Capacitor wrapper around the web app (`bun run sync:merchant`, then open it in Xcode or Android Studio). |

## Security posture

- **Nothing to steal.** No private keys, no stored balances, no withdrawal queue.
- **Row-level security everywhere.** Every table is locked down by policy; some columns
  (webhook secrets, terminal and API-key secrets) are readable only through narrow,
  server-side paths.
- **Merchants can't mark their own sales paid.** A database trigger rejects any client-side
  write that would set payment or status fields.
- **Payout changes are slow on purpose.** Swapping a wallet key needs a code emailed to the
  owner, and a replacement key waits four hours before it can receive anything. Every change
  lands in an append-only audit trail, and the alert cannot be muted.
- **Links are checked twice.** Any URL the app will navigate to or hand to a customer must
  pass a safe-HTTP check, at input and again before use.
- **Throwaway signups are stopped in the database**, not just on the screen.
- **Unmatched money is parked, never guessed.** Payments that don't fit a bill wait for a
  human rather than being auto-credited.

## Tests and quality

```bash
bunx vitest run
```

**45 test files, 240 tests**, covering the parts that must not break: invoice write guards,
address derivation, exact-match settlement, webhook signing and replay, wallet-link pairing,
give splits, POP eligibility, and the retired-network switches. Security tests run under a
standalone Vitest config so they don't need the whole app to boot. TypeScript runs in strict
mode.

## Docs in this repo

| File | For |
|---|---|
| `docs/CRYPTOPOP_STICKER_HANDOFF.md` | NFC sticker payments and terminal pairing |
| `docs/WALLET_SMART_QR_HANDOFF.md` | Wallet-side QR lookup |
| `docs/PARTNER_SIGNING_HANDOFF.md` | Partner request signing |
| `docs/AFFILIATE_SALE_WEBHOOK.md` | Referral and affiliate reporting |
| `docs/BM_FULFILLMENT_ENDPOINT.md` | Order fulfilment for a partner |
| `docs/DEMO_SCRIPTS.md` | Walkthroughs for live demos |
| `docs/LOVABLE_CONNECTOR_LISTING.md` | Connector listing copy |
| `AGENTS.md` | The rules this project runs by, with one per folder |
| `roadmap.md` | What's shipped and what's next |

Merchants get their own illustrated guide in the app at **Docs** — twelve chapters from
enrollment to tech stuff.

## The ecosystem

Nectar.Pay is one piece of the **Honest Money Ecosystem** — [honest.money](https://honest.money).

- [TEXITcoin](https://texitcoin.org/build) — the blockchain this runs on, with TSD on its Omni layer
- [Zero Chill Units](https://zerochill.com/build) — an EVM fork with its own RPC and explorer
- [Beekeeper](https://beekeeper.honest.money) — a wallet you can link straight to a store
- HME Vault and HME SSO — link a merchant's wallet by QR, and sign in across the ecosystem

---

<p align="center">
  Part of the <a href="https://honest.money">honest.money</a> ecosystem ·
  <a href="https://app.nectar-pay.com/terms">Terms</a> ·
  <a href="https://app.nectar-pay.com/privacy">Privacy</a> ·
  <a href="https://app.nectar-pay.com/manifesto">Manifesto</a>
</p>

<p align="center">
  <sub>Private and proprietary. No license is granted to this code. Money moves only between a
  shopper and a merchant — this software never holds funds.</sub>
</p>
