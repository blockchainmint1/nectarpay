
# NFC Tap-to-Pay: Terminal → Customer Wallet

Yes, this is doable — and it's basically how Apple Pay / Google Pay work under the hood, just with our own wallet and crypto rails instead of EMV. Here's the realistic shape.

## The honest constraints first

Android phones can read NFC freely. **iPhones cannot read arbitrary NFC tags from third-party apps in the background** — only Apple's Wallet auto-launches on tap, and only for EMV/transit. So:

- **Android**: full magic flow works (tap → HME Wallet auto-opens with invoice loaded).
- **iOS**: tap shows a system notification banner with a URL; user taps the banner to open HME Wallet. One extra tap, but still smooth.

The Senraise terminal acts as an **NFC tag emitter (HCE-style)**, not a reader. The customer's phone reads it.

## The flow

```text
1. Merchant POS:  builds invoice → "choose payment method" screen
                  POS asks Nectar API for invoice ID + short-lived nonce
                  POS pushes an NDEF payload to the Senraise NFC chip:
                    hme://pay?inv=<id>&t=<nonce>
                    (or https://pay.hme.app/i/<id>?t=<nonce> for iOS fallback)

2. Customer taps phone to terminal
                  Android: OS sees the URI scheme → auto-launches HME Wallet
                  iOS:     OS shows banner with the https URL → user taps it

3. HME Wallet opens, fetches invoice from Nectar:
                    GET /api/public/v1/invoices/<id>?t=<nonce>
                  Wallet sees: $9 USD, merchant "Joe's Coffee"
                  Wallet scans local balances → picks best option
                    (priority: stable on cheap chain, then native)
                  Wallet shows: "Pay $9 with USDC on Base • [Approve]"

4. Customer taps Approve
                  Wallet signs + broadcasts the tx
                  Wallet POSTs tx hash to Nectar:
                    POST /api/public/v1/invoices/<id>/claim
                      { txHash, chain, token, payerAddress, sig(nonce) }

5. Nectar watcher confirms on-chain (already built — hot-scan in pos polling)
   POS terminal flips to "PAID" within seconds
```

## What we'd need to build

**Nectar.Pay side** (this project):
- New endpoint `GET /api/public/v1/invoices/:id` (public, nonce-gated, returns invoice + merchant name + accepted chains/tokens — no PII).
- New endpoint `POST /api/public/v1/invoices/:id/claim` — wallet declares its choice; we derive the right receiving address for that chain/token on demand (we already do this in `selectInvoiceChain`) and return it so the wallet knows where to send.
- POS UI: a "Tap to Pay" button on the payment-method screen that emits the NDEF push to the Senraise terminal (this is the Senraise SDK integration — needs their NFC write API).
- Nonce is a short-lived single-use token bound to the invoice (5 min, revoked on first claim).

**HME Wallet side** (separate project):
- Register URL scheme `hme://` (Android intent filter) + universal link for `https://pay.hme.app/i/*` (iOS associated domain).
- "Pay flow" screen: fetch invoice, pick best asset, show approve button.
- Asset-selection logic: prefer stable > native, prefer cheap chain (Base/BSC) > expensive (ETH mainnet), prefer chains the merchant accepts.

**Senraise terminal**:
- We need their SDK / docs to confirm they expose NFC write (HCE or tag emulation). If their NFC is read-only (card reader mode), the flow inverts: customer phone would emit an NDEF tag and terminal reads it — that works too but is less elegant because customer has to enter the amount in the wallet first. Worth checking before committing to a direction.

## Open questions for you

1. Do we have Senraise SDK docs confirming NFC write/HCE mode is available, or do we need to ask them?
2. iOS universal-link domain — do we own `pay.hme.app` (or similar) for the associated-domain file? Or piggyback on `nectar-pay.com`?
3. Wallet asset-priority rules — do you want merchants to influence this (e.g., "I prefer USDC on Base, take that first if available"), or is it 100% customer-side preference?
4. For the "best asset" pick, do we surface a chooser if the customer has multiple eligible balances, or just auto-pick and let them swap before approving?

## Why this is genuinely magical

- No QR scanning, no typing addresses, no app-switching dance.
- Customer's wallet picks the cheapest rail automatically — settles in seconds on Base/BSC for cents.
- Merchant terminal flow is identical whether the customer taps or scans a QR — NFC is just a faster handoff.
- It's the first crypto checkout that actually feels like Apple Pay.

Sleep on it. When you're back, answer the four questions above (or just say "you decide") and I'll write the build plan.
