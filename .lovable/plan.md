
# TEXITcoin Pay — Crypto Payment Gateway MVP

A non-custodial, multi-chain payment gateway. Merchants register, paste an xpub per chain, get API credentials, and drop a plugin into WooCommerce (or call our REST API from any platform with open gateway settings). We never touch funds.

## Scope of this build

**Live (end-to-end) in v1:** BTC, EVM stablecoins (USDC/USDT on Ethereum + a low-fee L2 like Base), TEXITcoin (TXC).
**Stubbed (UI + "coming soon"):** ISK, ZCU, DOGE, plus future chains. The architecture treats every chain as a pluggable adapter so adding them later is config-only.

**Custody:** non-custodial only. Merchant supplies xpub (BTC) / extended pub or single address (EVM) / TXC pub. Private keys never leave the merchant. We derive deposit addresses, watch them, and notify.

## Visual direction

No brand provided, so I'll go with a serious "infra fintech" look modeled on BitPay / CoinGate / OpenNode dashboards: near-black background, single bright accent (electric green `#00E07A`), monospaced numerals (JetBrains Mono) for hashes/amounts, Inter for UI. Dense data tables, status pills, no marketing fluff inside the app. A light public marketing/docs surface uses the same palette inverted. If you want a different aesthetic, say so before I implement and I'll generate design directions.

## User-facing flow (merchant)

1. **Sign up** — email + password, Google sign-in.
2. **Create a store** — name, website, default fiat currency, webhook URL.
3. **Add chains** — for each chain, paste xpub (BTC), extended/static address (EVM), or TXC pub. We derive + verify a sample address client-side so they confirm ownership before saving.
4. **Get credentials** — publishable key + secret API key (shown once), plus webhook signing secret.
5. **Invoices & transactions** — list, filter, drill-down: requested amount in fiat, locked crypto amount, deposit address, derivation index, confirmations, tx hashes, status timeline, webhook delivery log with retry.
6. **Settings** — fee rules, confirmation thresholds per chain, allowed currencies, rate-source preference, webhook secret rotation, team members.

## Public API (what merchants/plugins call)

```
POST /api/public/v1/invoices          create invoice, returns address + amounts
GET  /api/public/v1/invoices/:id      poll status
POST /api/public/v1/invoices/:id/cancel
GET  /api/public/v1/rates?fiat=USD    current rates
POST webhook  → merchant URL, HMAC-SHA256 signed (Stripe-style)
```

Auth: `Authorization: Bearer sk_live_…`. All `/api/public/*` handlers verify the API key against a hashed secret and rate-limit per key.

## Watcher service (the hard part)

A scheduled job (pg_cron hitting an internal `/api/public/watcher/tick` endpoint with a shared secret) every ~30s:

- **BTC:** query a public Esplora/Blockstream/Mempool API for each active deposit address; on first-seen mark `detected`, on N confirmations mark `confirmed`.
- **EVM stables:** query an RPC (Alchemy/Infura — merchant-agnostic, our key) for ERC-20 `Transfer` logs to deposit address; track confirmations.
- **TXC:** assume an Esplora-compatible explorer endpoint (will need a URL from you — see Open questions); same flow as BTC.

Each adapter implements `deriveAddress(xpub, index)`, `getIncomingTxs(address, sinceBlock)`, `confirmations(tx)`. Adding DOGE/ISK/ZCU later = new adapter file.

Underpayment, overpayment, and late payment have explicit states. Exchange rate locked at invoice creation with a configurable expiry window (default 15 min).

## WooCommerce plugin

A small PHP plugin (`txc-pay-woocommerce/`) generated as a downloadable zip from the dashboard. Implements `WC_Payment_Gateway`:
- Settings page for API key + webhook secret.
- On checkout: call `POST /invoices`, redirect to our hosted payment page (`/pay/:invoiceId` — chain picker, QR code, live status via polling).
- Webhook listener at `/?wc-api=txc_pay` verifies HMAC, marks order paid/failed.

Plugin is shipped as static files under `public/plugins/` for download; not built/compiled.

## Technical plan

**Stack:** existing TanStack Start + Lovable Cloud (Postgres + Auth + storage). All chain/secret code in server functions or `/api/public/*` server routes — never the browser.

**Data model (public schema, with grants + RLS):**

```text
profiles(user_id pk → auth.users, email, name)
user_roles(user_id, role)                          -- admin/merchant
stores(id, owner_id, name, website, fiat, webhook_url, webhook_secret_hash)
api_keys(id, store_id, prefix, secret_hash, last_used_at, revoked_at)
chain_configs(id, store_id, chain, xpub_or_addr, next_derivation_index, confirmations_required, enabled)
invoices(id, store_id, chain, fiat_amount, fiat_currency, crypto_amount, rate, address, derivation_index, status, expires_at, created_at)
transactions(id, invoice_id, tx_hash, amount, confirmations, first_seen_at, confirmed_at)
webhook_deliveries(id, invoice_id, url, status_code, attempt, payload, signature, delivered_at, next_retry_at)
rates_cache(chain, fiat, rate, fetched_at)
```

All tables: `GRANT` block + RLS. Merchant policies scope by `store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())`. `api_keys.secret_hash`, `webhook_secret_hash`, and `chain_configs.xpub_or_addr` are server-read only (no `anon`/`authenticated` SELECT of the secret columns — read via security-definer functions that strip them).

**Server modules:**
- `src/lib/chains/{btc,evm,txc}.adapter.ts` — pure derivation + watching logic.
- `src/lib/chains/index.ts` — registry, exposes uniform interface.
- `src/lib/invoices.functions.ts` — `createInvoice`, `getInvoice`, `cancelInvoice` (merchant-authenticated server fns).
- `src/lib/webhooks.server.ts` — HMAC sign + send + retry with backoff.
- `src/routes/api/public/v1/invoices.ts`, `…/invoices.$id.ts`, `…/rates.ts` — external REST surface, API-key auth + Zod validation.
- `src/routes/api/public/watcher/tick.ts` — cron entry, shared-secret guarded.
- `src/routes/pay/$invoiceId.tsx` — hosted payment page (chain picker, QR via `qrcode`, live status).

**Frontend routes (under `_authenticated/`):**
`/dashboard`, `/stores`, `/stores/$id`, `/stores/$id/chains`, `/stores/$id/keys`, `/stores/$id/invoices`, `/stores/$id/invoices/$invoiceId`, `/stores/$id/settings`, `/docs`.

**Marketing routes (public):** `/`, `/pricing`, `/docs`, `/integrations/woocommerce`, `/auth`.

**Key npm packages:** `@scure/bip32` + `@scure/btc-signer` (BTC xpub derivation, Worker-safe), `viem` (EVM addresses + RPC), `qrcode`, `zod`, `@fontsource/inter`, `@fontsource/jetbrains-mono`. TXC adapter wraps the same BIP32 path if TXC is a BTC fork (very likely — please confirm).

**Build phases (so the first deploy is usable):**
1. Auth, profiles, stores, dashboard shell, marketing pages, design system.
2. Chain config CRUD + xpub validation + address preview (client-side derivation).
3. API key issuance + public REST endpoints + rate fetching (CoinGecko for BTC/EVM; TXC rate source TBD).
4. Hosted payment page + invoice lifecycle (status still manual).
5. Watcher adapters (BTC via Mempool.space, EVM via RPC, TXC via explorer URL) + cron.
6. Webhook delivery with retry + delivery log UI.
7. WooCommerce PHP plugin + downloadable zip + `/integrations/woocommerce` docs page.

## Open questions (won't block starting, but I'll need these before phases 3/5/7)

1. **TXC explorer / RPC endpoint URL** and whether it's Esplora-, Bitcoin-Core-, or custom-API-compatible. Also TXC rate source (is it on any exchange API, or do you self-publish a price feed?).
2. **EVM RPC provider:** OK if I default to a public RPC and add an Alchemy/Infura key later via `add_secret`?
3. **L2 choice for stables:** Base + Ethereum mainnet to start, or also Polygon/Arbitrum?
4. **Pricing/fees:** flat % per invoice? free during beta? (affects dashboard + marketing copy)
5. **Brand name** — I'll use "TEXITcoin Pay" as a working title; change anytime.

If you're good with this, approve and I'll start with phase 1 (auth + stores + dashboard shell + marketing). I'll come back for the open questions when each phase needs them.
