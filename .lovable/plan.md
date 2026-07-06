# Tangem Tap-to-Pay — USDC on Ethereum

Customer walks up to a NectarPOS terminal, taps their **existing Tangem card**, and USDC on Ethereum moves from their card's address to the merchant's payout address. Card = signer. POS APK = orchestrator. Our backend = invoice/nonce authority + broadcaster.

---

## Flow (happy path)

```text
Merchant enters amount ($42.00 USDC)
        │
        ▼
POS calls backend → creates invoice + tap_nonce (server-side, single-use)
        │
        ▼
POS shows "Tap card"  ──── customer taps Tangem card ────►  APK reads card pubkey
        │
        ▼
APK asks backend: "build EIP-1559 USDC transfer tx for THIS pubkey → merchant, amount X, nonce = on-chain nonce for that address, chainId 1"
        │
        ▼
Backend returns unsigned tx + EIP-712 / raw tx hash to sign
        │
        ▼
APK sends SIGN_HASH APDU to Tangem card  →  card returns secp256k1 signature
        │
        ▼
APK posts { signedTx } back to backend  →  backend broadcasts via Alchemy
        │
        ▼
Backend watches mempool + receipt → marks invoice PAID → POS shows check
```

Total customer interaction: **one tap, ~3 seconds**. No app on their phone.

---

## What we build

### 1. Capacitor Tangem plugin (native Android)
- New Capacitor plugin wrapping Tangem's official Android SDK (`com.tangem:tangem-sdk-android`, Kotlin, MIT-licensed).
- JS-side API surface for the POS:
  - `Tangem.scan()` → returns `{ cardId, walletPublicKey, ethAddress, curve }`
  - `Tangem.signHash({ cardId, walletPublicKey, hash })` → returns `{ signature }`
- Sits in `android/app/src/main/java/money/honest/nectarpay/tangem/` inside the POS Capacitor project (separate repo — not this webapp). We'll produce the Kotlin + TS wrapper files here and hand them over for the APK build.

### 2. Backend server functions (this repo)
- `src/lib/tangem-pay.functions.ts`
  - `startTangemPayment({ invoiceId, cardPublicKey, cardAddress })`
    - Verifies invoice is OPEN, verifies address has USDC balance ≥ amount + gas headroom
    - Fetches on-chain nonce for `cardAddress` via Alchemy
    - Builds unsigned EIP-1559 tx: `to=USDC contract`, `data=transfer(merchantPayoutAddress, amount)`, correct gas
    - Stores `{ invoiceId, cardAddress, unsignedTx, txHash }` in a new `tangem_pay_intents` table (single-use nonce)
    - Returns `{ intentId, txHashToSign, unsignedTx }`
  - `submitTangemPayment({ intentId, signature })`
    - Loads intent, verifies signature recovers to `cardAddress` (ecrecover)
    - Assembles signed raw tx, broadcasts via Alchemy `eth_sendRawTransaction`
    - Marks invoice as `AWAITING_CONFIRMATION`, stores tx hash
    - Existing watcher promotes to PAID on first confirmation

### 3. Database
New table `tangem_pay_intents`: `invoice_id`, `card_address`, `card_public_key`, `unsigned_tx_json`, `tx_hash_to_sign`, `signature`, `broadcast_tx_hash`, `status` (`pending`|`signed`|`broadcast`|`confirmed`|`failed`|`expired`), `expires_at` (60s TTL). RLS: merchant reads own via `stores.owner_id`; service_role writes.

Merchant payout USDC address stored on `stores` (new column `usdc_payout_address_eth` + validation).

### 4. Merchant setup UI (`/store/settings/crypto`)
- Field: "USDC (Ethereum) payout address"
- Toggle: "Accept USDC via Tangem tap-to-pay"
- Explains fees (customer pays gas from their Tangem address in ETH — they need ~$2 ETH on the card)

### 5. Docs page `/docs/tap-to-pay-tangem`
- How the flow works, what customers need (Tangem card + ETH for gas), fee model.

---

## Out of scope this pass

- Layer-2 USDC (Base, Arbitrum) — trivial follow-up once L1 works; same code path, different chainId + contract
- Tangem's multi-card backup / access code flow — v1 assumes cards without access codes; we'll show a clear error and add PIN entry in v2
- Refunds via Tangem (merchant side) — separate flow
- iOS support — Tangem SDK supports it, but our POS is Android-only today

---

## Technical detail (nerd section)

**Tangem APDU we care about**: `SIGN_HASH` (INS `0xA2`). Input: cardId + walletPublicKey + 32-byte hash. Output: 64-byte secp256k1 signature (r||s, no v). We recover `v` on the backend by trying both and matching `cardAddress`.

**Why hash-signing, not raw-tx-signing**: Tangem cards sign arbitrary 32-byte digests; they don't parse Ethereum txs. So backend builds tx → computes `keccak256(rlp(unsigned))` → card signs the digest → backend assembles `{r, s, v}` into the signed RLP envelope. This is the same pattern Tangem's own wallet app uses.

**Nonce/replay protection**: intent has 60s TTL and single-use `signature IS NULL` check; on-chain nonce prevents double-broadcast even if the intent leaks.

**Gas**: EIP-1559 `maxFeePerGas` = 2× current base fee, `maxPriorityFeePerGas` = 1.5 gwei, gasLimit = 65000 (USDC transfer). Backend simulates via `eth_estimateGas` first and aborts if the card's ETH balance can't cover it — POS shows "Not enough ETH for gas".

**USDC contract**: `0xA0b86991c6218b3c1b6c1c1c1c1c1c1c1c1c1c1c` (mainnet). Store in `chain_configs` for env parity.

**Secrets needed**: `ALCHEMY_ETH_MAINNET_URL` (probably already set — I'll check `fetch_secrets` before asking).

**Files to create/edit in this repo**:
- migration: `tangem_pay_intents` table + `stores.usdc_payout_address_eth` column
- `src/lib/tangem-pay.functions.ts` (server fns)
- `src/lib/tangem-pay.server.ts` (Alchemy client, tx builder, signature recovery — uses `viem`)
- `src/routes/_authenticated/store.settings.crypto.tsx` (merchant UI)
- `src/routes/docs.tap-to-pay-tangem.tsx` (public docs)
- `bun add viem` (tx building + ecrecover)

**Files delivered for the separate POS APK repo** (not built here, but I'll write them):
- `TangemPlugin.kt` (Capacitor plugin, ~80 lines wrapping Tangem SDK)
- `tangem.ts` (TS wrapper + types)
- README snippet for wiring into the APK's `build.gradle` + `AndroidManifest.xml`

---

## Order of build

1. Migration (`tangem_pay_intents` + `stores.usdc_payout_address_eth`)
2. `bun add viem`, server functions, signature recovery + broadcast
3. Merchant crypto settings page
4. Docs route
5. Capacitor plugin files (delivered as a folder in this repo under `pos-plugin-tangem/` for you to drop into the APK repo)
6. Wire an end-to-end test path — I'll add a `/dev/tangem-test` route that fakes a card scan so we can validate the backend without hardware

I'll flag Alchemy secret status before starting step 2.
