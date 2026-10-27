# NectarPay — Lovable connector application (draft)

## Listing
- **Name:** NectarPay
- **Tagline:** Accept crypto payments straight to your own wallet. Zero fees. Non-custodial. Instant.
- **Category:** Payments
- **Description:** Add a crypto checkout to any Lovable app. Create invoices for BTC, TEXITcoin (TXC), Texas Stable Dollar (TSD), ETH/Base stablecoins (USDC, USDT, PYUSD, DAI), Solana, Tron, LTC, DOGE and more. Customers pay on a hosted page with a QR code; your app gets a signed webhook when the payment confirms. NectarPay never holds funds — they settle directly to the merchant's wallet. Part of the honest.money ecosystem.
- **Website:** https://app.nectar-pay.com · **Docs:** https://app.nectar-pay.com/docs · **OpenAPI:** https://app.nectar-pay.com/openapi.json
- **Status:** https://app.nectar-pay.com/status · **Changelog:** https://app.nectar-pay.com/changelog
- **Terms / Privacy:** /terms · /privacy
- **Support contact:** _TODO (Bobby): named contact + response-time promise_

## Connect form
| Field | Type | Help text |
|---|---|---|
| `NECTARPAY_API_KEY` | secret | Starts with `sk_live_`. Get it at https://app.nectar-pay.com/docs/api-keys |
| `NECTARPAY_WEBHOOK_SECRET` | secret, optional | Needed only to verify webhooks. Stores → Webhooks. |

Base URL is fixed: `https://app.nectar-pay.com`. Verify the connection with `GET /api/public/v1/me`.

## Instructions for the AI agent
1. Never call the API from the browser — use a server function; read `NECTARPAY_API_KEY` from env.
2. Create an invoice: `POST /api/public/v1/invoices` `{ amount, currency, order_id, redirect_url }`. Redirect the shopper to `checkout_url`.
3. Omit `chain` to let the shopper pick a coin on the hosted page.
4. Mark orders paid only from a verified webhook (`X-TXCPay-Signature`, HMAC-SHA256 over `{t}.{rawBody}`, reject if older than 5 min) on `invoice.confirmed` (or `invoice.overpaid`). As a fallback, poll `GET /api/public/v1/invoices/{id}`.
5. Webhook handlers belong at a public server route, e.g. `/api/public/nectarpay-webhook`.
6. Errors return `{ error, code }`. On `429 rate_limited`, wait `Retry-After` seconds. Limit: 120 requests/minute/key.
7. Keys cannot move funds; one key = one store.

## Open items (decide at desk)
- Test mode (sandbox keys / "mark as paid")
- Scoped keys (read-only vs create invoices)
- Legal: jurisdiction, prohibited uses, screening
- Named support contact + SLA
- Demo Lovable shop
