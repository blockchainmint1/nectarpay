# NectarPay for Craft Commerce

Non-custodial crypto payments for Craft Commerce 4/5 — BTC, TEXITcoin (TXC), and stablecoins settle straight to your wallet.

## Install

1. Copy this folder to `plugins/nectarpay` (or wire it as a path composer repo), then `php craft plugin/install nectarpay`.
2. Commerce → Settings → Gateways → **New gateway** → *NectarPay*. Paste your **API key** (`sk_live_…` — env vars like `$NECTARPAY_KEY` supported) and **webhook secret**.
3. Select NectarPay as a payment method on your cart/checkout templates.
4. NectarPay dashboard → Webhooks → set URL: `https://your-site.com/actions/nectarpay/webhook`

## Flow

Checkout → `POST /api/public/v1/invoices` → shopper redirected to the hosted pay page → signed webhook (`X-TXCPay-Signature` HMAC-SHA256, 5-minute freshness) marks the order paid on `invoice.confirmed`.

> Note: built against the Commerce 4/5 gateway API — smoke-test on a staging store before production.
