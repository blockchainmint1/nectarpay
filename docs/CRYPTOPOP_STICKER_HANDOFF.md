# CryptoPOP → NectarPay sticker payments

NectarPay implementation added 1 November 2026. **Republish NectarPay before using these new endpoints at the production URL.** CryptoPOP snapshot inspected: `058378e6`; its scanner does not yet recognize `/s/<code>` and needs the changes below. This chat cannot modify the other project.

## The existing sticker stays unchanged

The actual screenshot QR decodes to `https://app.nectar-pay.com/s/dQdbix`.
Recognize HTTPS on exactly `app.nectar-pay.com`, path `/s/([0-9A-Za-z]{6})`, optional trailing slash; reject credentials, ports, unrelated hosts, query parameters and fragments. Preserve case. Do not follow arbitrary QR URLs from the server.

## Shared authentication (server only)

Reuse CryptoPOP's existing `NFC_PAY_SECRET` and `claimHeaders` in `src/lib/pop-claim.server.ts`.
NectarPay uses the active default CryptoPOP partner; optionally send `X-HME-Partner: 75a5d16d-b29c-4702-aa5e-727860024f49` to pin it explicitly.

- `Content-Type: application/json`
- `X-HME-Timestamp`: Unix seconds
- `X-HME-Signature`: lowercase hex HMAC-SHA256(secret, timestamp + "." + exact raw JSON body)
- Five-minute freshness window. Never expose the shared key to browser code.

## 1. Scan → show vendor, logo, amount entry

`POST https://app.nectar-pay.com/api/public/v1/stickers/lookup`

```json
{"code":"dQdbix","request_id":"dc48a500-9a25-43de-a3c5-5e5d38360114"}
```

Generate a fresh request UUID per user action. Reply:

```json
{
  "request_id":"dc48a500-9a25-43de-a3c5-5e5d38360114",
  "code":"dQdbix",
  "store_id":"3d1f9270-4657-4866-8cdb-ff61706c9716",
  "merchant":{"id":"3d1f9270-4657-4866-8cdb-ff61706c9716","name":"Cold Coin Auto Test","website":null,"logo_url":null},
  "chain":"txc","token_symbol":"TSD","currency":"USD",
  "address":"TdQdbixtqGqKL1S1MxPrZ7pXDyesTQCTck",
  "egiving":{"accepted":true,"discountPct":10,"program_address":"ToaRhmGqAW7PyvPJvbLJo69mnZwhaaA1vu"},
  "requires_invoice":true,"min_amount":0.5,"max_amount":250,
  "valid_until":"<actual UTC expiry>"
}
```

Example merchant/address verified from the enrolled test coin. Other stores return their real details. Logo/website can be null. **Do not send just from this lookup: create the tracked sale below first.**

## Verify every successful response on the CryptoPOP server

Read the exact response text before parsing it. Response headers are `X-HME-Timestamp` and `X-HME-Signature`.

```
requestHash = lowercaseHex(SHA256(exactRequestBody))
signedMessage = "sticker-response." + responseTimestamp + "." + requestHash + "." + exactResponseBody
expected = lowercaseHex(HMAC-SHA256(secret, signedMessage))
```

Use constant-time comparison, five-minute response freshness, matching request_id/code, validate TXC/TSD/USD, and fail closed. Require the selected request to match the UI's current sticker, not a stale earlier scan. Signed replies prevent a result for one request from being substituted into another. The wallet receives the address it needs; shared credentials remain server-only. No database-wide anonymous address read was added.

## 2. Pay → create invoice → sign/send to returned invoice address

`POST https://app.nectar-pay.com/api/public/v1/stickers/invoice`

```json
{"code":"dQdbix","request_id":"dc48a500-9a25-43de-a3c5-5e5d38360114","amount":2.50}
```

Returns the same merchant metadata plus `id`, `invoice_id`, `status`, `fiat_amount`, `crypto_amount`, `address`, `expires_at`, `checkout_url`, and `egiving.merchantMinimumUsd`. Uses **USD full sale amount**, not the discounted merchant slice. TSD amount is equal to USD. Use this invoice's address, and refuse to send after expiry. Reconfirm vendor if details changed since scan.

- Existing range: $0.50–$250, whole cents.
- One active checkout per static address. Concurrent/replayed creation returns 409, not another payable invoice.
- No automatic creation retries. A response lost after creation is not permission to broadcast from cached lookup data; open checkout or wait for expiry.
- Existing pre-checkout tx snapshot and atomic txid claim are preserved. Never send first and register later.
- Give remains optional and merchant-opt-in; fetch approved causes from the existing signed causes endpoint, use the program address in the verified reply and the existing 90/8/2 send-to-many flow. Plain TSD sends pay the full sale. NectarPay still verifies the real split.

## 3. Sent → confirmation → POP

After successful broadcast call **POST https://app.nectar-pay.com/api/public/v1/stickers/paid** from the CryptoPOP server using the same exact-body HMAC and request-bound response verification as lookup/start:

```json
{"code":"dQdbix","request_id":"dc48a500-9a25-43de-a3c5-5e5d38360114","invoice_id":"15be9491-ae83-4170-b751-7f1df4751d80","txid":"9573726df81ddb1c120c9737a477ecd48ccb73ef73ea850caa156abd7d639861"}
```

Use the invoice created **before** sending; never create another invoice or rebroadcast to retry this callback. Retain the same callback request_id/invoice_id/txid on retries, with fresh signature timestamps. Persist callback attempts so closing the wallet cannot lose them. Retry network/503 errors with bounded backoff; stop automatic retries on 400/401/404.

The signed reply includes `request_id`, `code`, `invoice_id`, `txid`, `status`, `transaction_found`, and `paid`. `paid: true` requires that this exact transaction was verified and the invoice is confirmed/overpaid. HTTP 200 alone is not payment proof; `paid: false` means wait/retry, not send again. Validate all identifiers against the original event. NectarPay fetches chain data itself and preserves property/address/amount/split/snapshot/atomic-claim checks.

NectarPay also scans sticker invoices on its regular scheduled checker without requiring a browser or an xpub. Expired bills are revisited for a day; only blockchain payments timestamped inside the original checkout window can recover them. The signed callback can request recovery later too. Cancelled/failed bills and ordinary expired invoices remain closed.

CryptoPOP snapshot `2801f97e` confirmed invoice creation already happens before signing/sending. Add this callback after broadcast in `src/components/wallet/nectarpay-sheet.tsx`, via a server function reusing `src/lib/nectarpay-sticker.server.ts`. The current `chaseReward` retries POP but does not trigger invoice verification. Broadcast success is not settlement proof.

Use existing `claimSendReward` → `startClaim` → `POST /api/public/v1/pop/claim`. Rewards use full sale USD, rounded **up**: $2.50 → 3 POP, only if eligible. Do not promise immediate +3 POP: test/new stores have a 14-day hold; own-store purchases and daily caps apply. Do not duplicate minting. Keep errors visible rather than silently routing to a direct address send.

## Wallet changes needed

- `src/lib/wallet/scan-parse.ts` + its tests: add a dedicated sticker intent for the existing URL.
- `src/lib/nectarpay.functions.ts`: add server-only signed lookup/start calls and response verification; reuse `claimHeaders` without pulling server-only secrets into client modules.
- The component owning Scan/Send: show vendor/logo with TSD selected, enter amount; the Pay action creates the invoice before using the existing wallet signer/send flow. Disable double-tap while creating/signing/sending. Preserve Give controls and confirmation/reward states.
- Verify real CryptoPOP-origin signatures against the lookup first; older NFC tests reported a key mismatch and have not yet established that both sites hold matching keys.
- Republish both sites; test scan → correct vendor/address → enter $2.50 → create invoice → cardholder-approved send → confirmed sale and notifications → eligible/held reward decision. No real funds were sent by the NectarPay implementation test.