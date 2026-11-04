# NectarPay partner signing (per-wallet keys)

Every wallet/Give partner now has its **own** key, created on NectarPay's Admin → Wallets & Give page and copied to the partner once. The old shared `NFC_PAY_SECRET` is only a fallback for CryptoPOP's original row.

## Partner IDs
| Partner | X-HME-Partner | Card domain |
|---|---|---|
| CryptoPOP | `75a5d16d-b29c-4702-aa5e-727860024f49` | cryptopop.org |
| HME Give | `446c19d0-d1b6-4bc1-84d7-c46585cb78ae` | give.honest.money |
| Christ Church of the Valley | `2e9515a4-0f0b-4c6e-80d2-b7bdda495f7f` | ccv.honest.money |

## Requests you send NectarPay
Endpoints: `/api/public/v1/stickers/lookup`, `/stickers/invoice`, `/stickers/paid`, `/qr/lookup`, `/pop/claim` (base `https://app.nectar-pay.com`).

Headers on every request:
- `X-HME-Partner: <your id above>` — **required in practice**; without it NectarPay assumes the CryptoPOP default and your signature fails.
- `X-HME-Timestamp: <unix seconds>` (within 5 minutes)
- `X-HME-Signature: hex(HMAC-SHA256(your key, "<timestamp>.<exact raw body>"))`

Verify responses: `X-HME-Signature` = hex HMAC-SHA256(your key, `sticker-response.<ts>.<sha256 hex of your request body>.<response body>`). Show nothing if it fails.

## NFC card taps (NectarPay → your pay_url)
NectarPay picks the partner from the card's NDEF web-address domain, then signs its call to your `pay_url` with **your** key, in the same `X-HME-Timestamp` / `X-HME-Signature` format. Verify with your own key (not the old shared secret). Poll tokens you get back start with your partner id — return them unchanged.

## Key rotation
If Bobby presses "Create new key", the old key stops working immediately. Store the key as a server secret; never in app code.

## Give split
Read `program_address` and recipient addresses from NectarPay's signed replies / `/api/public/v1/egiving/causes` on every payment. Never hard-code them.
