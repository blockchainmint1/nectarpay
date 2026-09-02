# NectarPay for Zen Cart

Non-custodial crypto payments for Zen Cart 1.5.8+ / 2.x — BTC, TEXITcoin (TXC), and stablecoins settle straight to your wallet.

## Install

1. Copy `includes/` and `nectarpay_webhook.php` into your Zen Cart root.
2. Admin → Modules → Payment → install **NectarPay**.
3. Paste your **API key** (`sk_live_…`) and **webhook secret**.
4. NectarPay dashboard → Webhooks → set URL: `https://your-store.com/nectarpay_webhook.php`

## Flow

Order created → `POST /api/public/v1/invoices` → shopper redirected to the hosted NectarPay pay page → signed webhook flips the order to Processing on `invoice.confirmed` (idempotent — retries are safe).
