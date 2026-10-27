# NectarPay for WooCommerce

Non-custodial crypto payments (BTC, TEXITcoin, stablecoins) for WooCommerce.

## Install

1. Zip the `nectarpay-woocommerce/` folder (the root of the zip must be the `nectarpay-woocommerce/` folder).
2. In WordPress admin → **Plugins → Add New → Upload Plugin**, upload the zip and activate.
3. Go to **WooCommerce → Settings → Payments → NectarPay** and paste:
   - **API key** — from your NectarPay dashboard → API keys
   - **Webhook secret** — from your NectarPay dashboard → Webhooks → Signing secret
   - **API base URL** — leave as `https://app.nectar-pay.com`
4. In the NectarPay dashboard, set your store's webhook URL to:
   `https://your-shop.example/?wc-api=nectarpay`

## How it works

- On checkout, the plugin creates a NectarPay invoice via `POST /api/public/v1/invoices` and redirects the shopper to the hosted pay page (QR code, per-chain amounts).
- NectarPay delivers a signed webhook (`invoice.confirmed`) to `?wc-api=nectarpay`; the signature (`X-TXCPay-Signature: t=…,v1=…`, HMAC-SHA256 of `t.rawBody`) is verified and the order is marked paid. Webhook retries are idempotent.

## Compatibility

- WordPress 5.8+, WooCommerce 6.0+ (tested through 9.x), PHP 7.4+
- HPOS (High-Performance Order Storage) compatible

## License

MIT.
