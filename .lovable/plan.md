# NectarPay POS Terminal — v1

A locked-down web app that runs in Chrome on the Senraise H10P handheld and accepts crypto payments against a paired NectarPay store. Same shell will later wrap in an Android APK.

Borrowed wholesale from the ImagineNation terminal we built in Rails Tools: pairing flow, fullscreen shell, PIN + idle auto-lock, tax/tip configuration, native-bridge hooks for the APK, brick-splash if unpaired.

---

## 1. Database

Two new tables. Both store-scoped, no PII.

`terminals`
- `id` uuid pk
- `store_id` uuid → stores.id (cascade)
- `label` text (e.g. "Front counter")
- `hmac_secret_hash` text — sha-256 of the secret; raw secret is shown to the device exactly once at pairing
- `last_seen_at` timestamptz
- `revoked_at` timestamptz nullable
- `created_at`

`terminal_pairing_codes`
- `id` uuid pk
- `store_id` uuid → stores.id (cascade)
- `code` text unique — 6-char A-Z2-9 (no 0/O/1/I)
- `label` text — label to assign to the terminal once paired
- `expires_at` timestamptz — 5 min from issue
- `consumed_at` timestamptz nullable
- `consumed_terminal_id` uuid nullable

RLS: store owner can read/write rows for their own stores (uses existing `owns_store(store_id)`). Service role full access. No anon access — pairing/HMAC happens server-side in `/api/public/v1/terminals/*`.

## 2. Public API endpoints

All under `src/routes/api/public/v1/terminals/` so they bypass auth on published sites; security is enforced inside each handler.

`POST /api/public/v1/terminals/pair`
- Body: `{ code }`
- Looks up the pairing code (unconsumed + unexpired), mints a new `terminals` row, generates a 32-byte hmac_secret (returned raw, stored hashed), marks the code consumed.
- Returns: `{ terminal_id, hmac_secret, store_id, store_name, api_base }`

`POST /api/public/v1/terminals/invoice` (HMAC-signed)
- Headers: `X-Terminal-Id`, `X-Timestamp`, `X-Signature` (= HMAC-SHA256(secret, `${timestamp}.${rawBody}`), hex)
- Body: `{ amount_cents, currency, memo?, expires_in_seconds? }`
- Verifies signature (timing-safe), rejects if timestamp is >2 min skewed, looks up terminal (not revoked), creates a **chain-less** invoice on that store (existing path in `api.public.v1.invoices.ts`), updates `last_seen_at`.
- Returns: `{ id, checkout_url, fiat_amount, currency, expires_at }`

`GET /api/public/v1/terminals/invoice/:id` (HMAC-signed)
- For polling status. Returns `{ id, status, chain, crypto_amount, address, tx_hash, paid_at }`. Scoped to the terminal's store.

`POST /api/public/v1/terminals/invoice/:id/cancel` (HMAC-signed)
- Cashier cancel button.

`POST /api/public/v1/terminals/heartbeat` (HMAC-signed)
- Optional, bumps `last_seen_at`.

## 3. Merchant UI

New route: `src/routes/_authenticated.stores.$storeId.terminals.tsx`
- Lists paired terminals (label, last_seen_at, revoke button)
- "Pair a new terminal" → opens a modal that calls a server fn to mint a pairing code + label, shows the 6-char code BIG + a QR encoding `{code, api: <origin>}` for 5 minutes with a live countdown
- Revoke flips `revoked_at`; the terminal's next API call returns 401 → it brick-splashes back to pair screen

Add a "Terminals" link inside the store sidebar (alongside Chains / Keys / KYC).

## 4. POS app

New top-level public routes — intentionally OUTSIDE `_authenticated/` because the terminal isn't a Supabase user; it auths to the server with its HMAC.

- `/pos` — main terminal
- `/pos/pair` — pairing
- `/pos/history` — last 50 invoices created from this terminal
- `/pos/settings` — tax %, tip presets (3 slots), PIN (4-digit, sha-256 hashed in localStorage), idle auto-lock

Shell rules (lifted from ImagineNation):
- `fixed inset-0` dark `#0a0d12`, no marketing chrome, no footer
- `head()` sets `viewport-fit=cover`, `maximum-scale=1`, `user-scalable=no`, `theme-color`
- 4-digit PIN lock with sha-256 hash + configurable idle auto-lock (1/3/5/15 min, or never)
- "Brick splash" screens for `checking pairing…`, `terminal not paired`, `terminal revoked`

LocalStorage keys (namespaced):
- `pos.terminal.id`, `pos.terminal.secret`, `pos.terminal.apiBase`
- `pos.settings` (tax bps, tip preset bps[3], pin hash, idle lock ms)

POS flow (state machine):
1. **Amount** — big numpad, live subtotal, auto-computed tax line, CLEAR / CHARGE buttons
2. **Tip** — three preset % buttons + "no tip" + custom amount
3. **Waiting** — calls `POST /terminals/invoice` with `amount_cents = subtotal + tax + tip`, gets back `checkout_url = /i/<id>`, renders a fullscreen QR of that URL + amount + countdown. Polls `GET /terminals/invoice/:id` every 2s for `status` transitions.
4. **Paid** — checkmark, amount, chain it landed on, tx hash, "NEW SALE"
5. **Cancelled/Expired** — "NEW SALE" button

Because we picked "customer picks on the QR screen", the invoice is chain-less (the existing `/api/public/v1/invoices` already handles this — `chain: null` is valid). The QR points at `/i/<id>`, which is the hosted checkout page that lets the buyer pick a chain.

## 5. APK bridge hooks

Same shape as ImagineNation, so the Android wrapper later just implements:
- `window.TerminalAuth.save(id, secret)` — push creds into native keychain
- `window.Pairing.startScan()` / `stopScan()` — native camera takes over QR scanning
- `window.onPairingScan(payload)` — native pushes a scan result back into the page

The web build still works standalone via `getUserMedia` + `@zxing/browser` when no native bridge is present.

## 6. What this v1 does NOT include

- NFC tap-to-pay (no offline-card infra in NectarPay)
- Cashier-scans-wallet-QR-to-push (no per-user wallet model here)
- Receipts/printer integration (the H10P has a printer but driver work goes in the APK)
- Multi-cashier accounts on one terminal — terminal = device, owner controls revocation

---

## Technical details

**HMAC signing on the client.** SubtleCrypto in the browser:
```ts
async function sign(secretHex: string, body: string, ts: string) {
  const key = await crypto.subtle.importKey(
    "raw", hexToBytes(secretHex),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${body}`));
  return bytesToHex(new Uint8Array(sig));
}
```
Server side verifies with `node:crypto` (`createHmac` + `timingSafeEqual`), rejects >120s skew. Secret is generated server-side as 32 random bytes (hex-encoded), shown to the device exactly once at pairing, only sha-256 hash stored in DB.

**Pairing code format.** 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no confusing 0/O/1/I). Server retries on uniqueness violation. Codes expire after 5 min; consumed codes can't be reused.

**Invoice creation.** The terminal endpoint internally calls the existing `deriveInvoiceAddress` machinery — but with `chain: null` it skips derivation (matches the existing chain-less branch in `api.public.v1.invoices.ts`). The `/i/<id>` page already supports chain selection for chain-less invoices.

**File layout.**
```
src/lib/terminals.functions.ts         — server fns for the merchant UI (createPairingCode, listTerminals, revokeTerminal)
src/lib/terminals.server.ts            — shared helpers (codegen, hmac verify) — server only
src/lib/pos-client.ts                  — browser HMAC + fetch wrappers for the POS app
src/routes/api/public/v1/terminals/
  pair.ts
  invoice.ts
  invoice.$id.ts
  invoice.$id.cancel.ts
  heartbeat.ts
src/routes/pos.tsx                     — main terminal + shell (PIN, idle, fullscreen)
src/routes/pos.pair.tsx
src/routes/pos.history.tsx
src/routes/pos.settings.tsx
src/routes/_authenticated.stores.$storeId.terminals.tsx
```

## Order of operations

1. Migration: `terminals` + `terminal_pairing_codes` + grants + RLS + policies
2. Server helpers + 5 public endpoints (HMAC verify, pairing, invoice create/get/cancel, heartbeat)
3. Merchant terminals UI under `/stores/:storeId/terminals` (issue code, list, revoke)
4. POS app shell + pair screen + amount/tip/waiting/paid screens + settings + history
5. Manual test: pair from a phone "merchant" tab, create a sale on `/pos`, scan QR with another device, confirm paid status flows back

ETA after approval: this is a meaty one (probably 6–8 files of real logic), but no architectural unknowns — every piece has a precedent in either Rails Tools or this codebase.
