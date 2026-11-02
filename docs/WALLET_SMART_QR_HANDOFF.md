# Smart register QR — hand-off for CryptoPOP and HME Give

## What changed in the QR
TEXITcoin (and other Bitcoin-style) payment codes from the NectarPay register and checkout page now end with a sale id:

```
texitcoin:<address>?amount=2&omni=<TSD>&token=TSD&label=honest.money&inv=<invoice uuid>
```

- Other wallets ignore `inv` (BIP-21 unknown, non `req-` parameter). MetaMask/EVM codes are unchanged.
- `inv` is only a pointer. Never trust store, Give or discount details from the QR.

## Signed lookup
`POST https://app.nectar-pay.com/api/public/v1/qr/lookup`

Same auth as the sticker API: headers `X-HME-Partner` (optional, default partner), `X-HME-Timestamp` (unix seconds), `X-HME-Signature` = hex HMAC-SHA256(partner secret, `"<timestamp>.<exact raw body>"`). Responses carry `X-HME-Timestamp` / `X-HME-Signature` = HMAC(secret, `sticker-response.<ts>.<sha256 hex of request body>.<response body>`); verify before showing anything.

Body (one of):
- `{ "request_id": "<uuid>", "invoice_id": "<inv from QR>" }`
- `{ "request_id": "<uuid>", "address": "<scanned address>" }` — for old codes without `inv`

Responses:
- `kind: "invoice"` — `invoice_id, status, fiat_amount, currency, chain, token_symbol, crypto_amount, address, expires_at, merchant {id,name,website,logo_url,slug}, egiving {accepted, discountPct, merchantMinimumUsd, discountUsd, program_address}, checkout_url`
- `kind: "sticker"` with `code` — the address is a Fast Start sticker; continue with `/api/public/v1/stickers/lookup`.
- 404 no open sale; 409 several open sales on that address (ask the shopper to scan the register again).

Wallet rule: the address you send to must equal the `address` in the signed response. After sending, use the existing payment report flow.
