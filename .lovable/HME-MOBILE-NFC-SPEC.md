# HME Mobile ↔ Nectar.Pay — NFC Tap-to-Pay Spec (v0.1)

> Status: draft. Backend endpoints are live on `https://nectar-pay.com`.
> Wallet team owns Sections 3–5; Nectar.Pay owns Sections 1–2 and 6.

## TL;DR

1. Customer taps phone to a Nectar.Pay terminal (Senraise hardware running an
   Android NFC writer that emits an NDEF tag).
2. The tag contains **two** URLs — one custom-scheme deep link, one HTTPS
   universal link. Whichever the OS opens first wins.
3. The wallet calls `GET /api/public/v1/pay/:invoiceId?t=<nonce>` to read the
   invoice.
4. The wallet picks the best asset the customer holds and calls
   `POST /api/public/v1/pay/:invoiceId?t=<nonce>` to lock in that
   chain/token. Server returns the receiving address + exact crypto amount.
5. Wallet signs + broadcasts the tx. Nectar.Pay watchers confirm it on-chain
   and the terminal flips to PAID within seconds.

The wallet **does not** post a tx hash back — we detect it through the
existing chain watchers (push notifications from Alchemy for EVM, polling
for others). One less round-trip, one less thing to break.

---

## 1. The NDEF tag (what the terminal writes)

The terminal app (Senraise SDK on Android) writes a single NDEF message with
**two URI records** to its NFC reader/writer in tag-emulation mode:

```
Record 1 (URI):   nectar://pay?inv=<invoice_id>&t=<nonce>
Record 2 (URI):   https://nectar-pay.com/pay/<invoice_id>?t=<nonce>
```

- **Android phone with HME Mobile installed** → OS routes the `nectar://` URI
  to the wallet via intent filter. Instant.
- **iPhone with HME Mobile installed** → OS shows the universal-link banner
  on the HTTPS URL; tap once → wallet opens.
- **Either OS without HME Mobile** → universal link lands on
  `https://nectar-pay.com/pay/<id>` which forwards to the existing hosted
  checkout `/i/<id>` (web fallback, QR + manual chain pick). The customer
  can install the wallet and re-tap; the nonce is valid for **10 minutes**.

Both URLs are also returned by the Nectar terminal invoice API in
`tap_url` and `tap_universal_url` so the terminal app doesn't have to build
them itself.

---

## 2. Backend endpoints (live now)

### Mint nonce — automatic

When the terminal calls `POST /api/public/v1/terminals/invoice` (existing
HMAC-signed endpoint) the response now includes:

```jsonc
{
  "id": "uuid",
  "checkout_url": "https://nectar-pay.com/i/<id>",
  "fiat_amount": 9,
  "currency": "USD",
  "status": "pending",
  "chain": null,                // null until wallet picks
  "address": null,
  "crypto_amount": null,
  "expires_at": "...",
  "tap_url": "nectar://pay?inv=<id>&t=<nonce>",
  "tap_universal_url": "https://nectar-pay.com/pay/<id>?t=<nonce>",
  "tap_expires_at": "..."       // ~10 min
}
```

### Read invoice (wallet → backend)

```
GET https://nectar-pay.com/api/public/v1/pay/:invoiceId?t=<nonce>
```

Response:

```jsonc
{
  "id": "uuid",
  "status": "pending",
  "fiat_amount": 9,
  "currency": "USD",
  "description": "...",
  "expires_at": "...",
  "merchant": { "name": "Joe's Coffee", "website": "https://joes.example" },
  "chain": null,             // pre-picked by merchant, usually null
  "token_symbol": null,
  "crypto_amount": null,
  "rate": null,
  "address": null,
  "options": [
    { "chain": "eth",  "tokenSymbol": "USDC", "key": "eth:USDC",
      "label": "USDC on Ethereum, Base or BSC" },
    { "chain": "base", "tokenSymbol": null,   "key": "base",
      "label": "Base" },
    { "chain": "btc",  "tokenSymbol": null,   "key": "btc",
      "label": "Bitcoin" }
    // ... whatever the merchant has enabled
  ]
}
```

Errors: `401` (bad/missing nonce), `410` (expired or already used),
`404` (unknown invoice).

### Select chain (wallet → backend, **consumes nonce**)

```
POST https://nectar-pay.com/api/public/v1/pay/:invoiceId?t=<nonce>
Content-Type: application/json

{ "option": "eth:USDC" }   // or "base", "tron:USDT", "btc", etc — must be
                            //  one of the `key`s from /pay GET
```

Response:

```jsonc
{
  "id": "uuid",
  "status": "pending",
  "chain": "eth",
  "token_symbol": "USDC",
  "address": "0xPayThisAddress…",
  "crypto_amount": 9.000123,   // exact wei/satoshi amount, includes nonce
                               // disambiguator on shared-address chains
  "rate": 1,
  "fiat_amount": 9,
  "currency": "USD",
  "expires_at": "..."
}
```

After this call the wallet signs `crypto_amount` of `token_symbol` (or the
native asset if `token_symbol` is null) on `chain` to `address`. **Use
exactly `crypto_amount` — don't round.** Our watcher matches by amount on
shared-address chains (Solana, Tron in static mode).

Nonce is single-use. A retry returns `410`. The wallet should treat the
first 2xx as authoritative and cache `{address, crypto_amount, chain,
token_symbol}` locally.

---

## 3. Wallet asset-selection rules (HME Mobile)

The customer's wallet picks the best option from the `options` array
**without asking** (we discussed: one tap to approve, no chooser). Priority:

1. **`eth:USDC`** — settles on Base/BSC, sub-cent gas. Default.
2. Other stables on cheap rails: `tron:USDT`, `sol:USDC`, `base:USDT`.
3. Native on cheap chains: `base`, `sol`, `tron`, `txc`.
4. Stables on expensive chains: `eth:USDC` on Ethereum mainnet (only if
   nothing else qualifies).
5. Native on expensive chains: `eth`, `btc`.

Within stables, prefer the chain where the customer **already has a
balance ≥ `fiat_amount`** + a gas cushion. If multiple qualify, prefer the
one with cheaper estimated gas at submission time.

If no option qualifies (insufficient balance everywhere), show "Add funds
to pay" — don't POST `/select`. The nonce stays unconsumed; customer can
retry once they top up.

---

## 4. Approve UX

Single screen. No chooser, no advanced options, no fees breakdown unless
the user taps a small "details" affordance.

```
┌─────────────────────────────────┐
│  Joe's Coffee                   │
│                                 │
│     $9.00                       │
│   Pay with USDC on Base         │
│                                 │
│  [   Approve   ]   [ Cancel ]   │
└─────────────────────────────────┘
```

On Approve: sign + broadcast. Show "Broadcasting…" → "Sent. Waiting for
confirmation." The user can close the wallet — the terminal confirms
independently via chain watchers.

---

## 5. iOS universal-link setup

We host the apple-app-site-association file at:

```
https://nectar-pay.com/.well-known/apple-app-site-association
```

(Will be served as `application/json`, no extension, no redirect. Coming
next — let us know the **App ID prefix** + **bundle ID** for HME Mobile
and we'll publish it the same day.)

Android intent filter goes in the wallet's `AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="nectar" android:host="pay" />
</intent-filter>
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="nectar-pay.com"
        android:pathPrefix="/pay/" />
</intent-filter>
```

We'll host the matching `assetlinks.json` at
`https://nectar-pay.com/.well-known/assetlinks.json` — send us the
SHA-256 cert fingerprint.

---

## 6. What we still need from you

1. **HME Mobile bundle/package details:** iOS App ID prefix + bundle ID,
   Android package name + signing-cert SHA-256.
2. **Scheme registration:** register `nectar://pay` as an intent filter on
   Android and confirm no collision with another installed app. (We picked
   `nectar://` over `hme://` to keep the consumer wallet distinct from the
   merchant Beekeeper/HME Wallet scheme.)
3. **Asset-balance read:** the wallet needs to enumerate balances across at
   least Base/USDC, Tron/USDT, Sol/USDC, ETH/USDC, BTC, TXC to do
   priority pick. Confirm that's already supported.
4. **Test wallet build:** ETA for a sideload-able test build so we can run
   end-to-end against a live terminal.

We'll wire the Senraise NFC tag-writer on our terminal app once your
schemes are confirmed.

---

## 7. Error / edge cases (decided)

- **Tap twice:** second tap re-reads the tag, hits `/pay GET` with the same
  nonce. Allowed any number of times until consumed. After consumption,
  `/pay GET` returns 410 — wallet should show "Payment in progress" and
  rely on its own broadcast.
- **Customer cancels in wallet:** nothing to do. Nonce is consumed if they
  hit `/select`; otherwise it expires in 10 min. Invoice can be cancelled
  by the merchant from the POS as today.
- **Network drop mid-broadcast:** wallet retries the broadcast directly to
  RPC; Nectar watchers will still detect it. No callback needed.
- **Multiple wallets installed:** OS-level chooser. Out of our hands.
- **iPhone, no HME Mobile:** universal link lands on `/pay/:id` which
  forwards to `/i/:id` — the existing hosted checkout. Same nonce works
  on subsequent install if customer comes back within TTL.

---

*Questions / changes → message Lovable agent on the Nectar.Pay project.*
