# NectarPay for WHMCS

Non-custodial crypto payments (BTC, TEXITcoin, stablecoins) for WHMCS 8.x.

## Install

1. Copy `modules/gateways/nectarpay.php` and `modules/gateways/callback/nectarpay.php`
   into your WHMCS installation (keeping the directory structure).
2. WHMCS admin → **System Settings → Payment Gateways** (or Apps & Integrations) →
   activate **NectarPay**.
3. Paste your **API key** and **Webhook secret** from the NectarPay dashboard.
4. In the NectarPay dashboard → Webhooks, set the URL to:
   `https://your-whmcs.com/modules/gateways/callback/nectarpay.php`

## How it works

- The unpaid invoice page shows a "Pay with crypto" button that creates a NectarPay
  invoice and sends the client to the hosted pay page (QR + amount).
- On on-chain confirmation NectarPay posts a signed webhook; the callback verifies
  the HMAC signature and marks the WHMCS invoice paid (idempotent).

## License

MIT.
