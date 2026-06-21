# Wallet-Only Auth + Admin Panel

## Decisions locked in
- **Wallet**: TXC mobile app, QR code + `payhme://` deep link (no extension)
- **Existing users**: wiped, wallet-only going forward (clean slate)
- **Admin role**: comma-separated `ADMIN_WALLETS` env var, auto-promoted on login
- **Merchant panel**: reuse existing `/dashboard` + `/stores/*` (already there, no rename)
- **New `/admin`**: built fresh

## QR login — yes, this is a real pattern

Standard flow (Sign-In-With-Wallet, mobile-scans-desktop variant):

```text
Desktop /auth                                TXC Mobile Wallet
─────────────────                            ─────────────────
1. POST /challenge                           
   ← { id, nonce, expires_at }               
2. Render QR with                            
   payhme://login?id=…&nonce=…&cb=…  ─scan→  3. Show "Sign in to payHME?"
                                             4. User taps Approve
                                             5. Sign: nonce + domain + ts
3a. Poll /status?id=…                ←POST── 6. POST /callback {id, address, sig}
                                             ←── { ok }
4. /status returns { token }
5. Exchange token → Supabase session
6. Navigate to /dashboard or /admin
```

Same desktop-with-extension path (future): skip QR, `window.txc.signMessage(nonce)` inline, same callback.

## Database changes (single migration)

1. **Drop email/password users**: truncate `auth.users` cascade (wipes profiles, stores, invoices, everything — clean slate as requested)
2. **New table `wallet_accounts`**: `(wallet_address PK, user_id FK auth.users, chain text default 'TXC', first_seen_at, last_login_at)` — one wallet ↔ one auth.users row
3. **New table `wallet_login_challenges`**: `(id uuid PK, nonce text, wallet_address text nullable, status enum[pending|signed|consumed|expired], one_time_token text nullable, expires_at, created_at)` — short-lived (5 min)
4. **Update `handle_new_user` trigger**: stop assuming email; pull display name from `wallet_address` truncated
5. **Add `admin` role to existing `app_role` enum** (already there as `'admin'`)
6. RLS + GRANTs on both new tables

## TXC signature verification

TEXITcoin is a Bitcoin-derivative. Use Bitcoin-style message signing (`\x18Bitcoin Signed Message:\n` prefix + recoverable ECDSA, base64). Pure-JS, Worker-safe via `bitcoinjs-message` package.

**Open question for the TXC wallet team**: confirm
- Exact magic-string prefix (default `\x18TEXITcoin Signed Message:\n` matching their daemon's `signmessage` RPC)
- Address format (P2PKH base58 vs bech32) and version byte
- Whether they sign the raw nonce or a SIWE-style structured message

I'll build with sensible defaults (BTC-compatible) + a clearly-marked `verifyTxcSignature()` function so swapping the spec later is one file.

## Server routes (all under `/api/public/auth/`)

| Route | Method | Purpose |
|---|---|---|
| `/api/public/auth/wallet-challenge` | POST | Create nonce, return `{id, nonce, deep_link, qr_data, expires_at}` |
| `/api/public/auth/wallet-callback` | POST | Wallet posts `{id, address, signature}`, server verifies, marks challenge `signed`, mints one-time token |
| `/api/public/auth/wallet-status` | GET `?id=` | Desktop polls; returns `pending` or `{status:'signed', token}` once |
| `/api/public/auth/wallet-exchange` | POST | Desktop posts one-time token → server creates/loads `auth.users` row for wallet, issues Supabase session via admin API, returns session tokens |

All public-prefix bypasses auth at the edge; each handler validates input with Zod and uses constant-time compare on the one-time token.

## Frontend

1. **Replace `/auth`**: rip out email/password forms. Show:
   - Big QR (renders the `payhme://` URI)
   - Deep-link button for same-device mobile
   - "Don't have TXC wallet?" link → wallet download page
   - Polling indicator + 5-min countdown
   - On success: store session, redirect to `search.redirect ?? /dashboard` (or `/admin` if wallet is in `ADMIN_WALLETS`)
2. **`src/lib/wallet-auth.functions.ts`**: client helpers (`createChallenge`, `pollStatus`, `exchange`)
3. **Update `_authenticated/route.tsx` gate**: no functional change — Supabase session check still works; wallet just becomes the login method
4. **New `/admin` layout**: pathless `_admin` group under `_authenticated`, `beforeLoad` checks `has_role('admin')`, redirects non-admins to `/dashboard`
5. **`/admin` pages (skeleton, expand later)**:
   - `/admin` — overview (users, stores, invoice volume, errors)
   - `/admin/users` — list, search, suspend
   - `/admin/stores` — global store list
   - `/admin/invoices` — global invoice search
   - `/admin/system` — chain configs, rate cache, watcher cursors, KYC provider toggles

## Admin role promotion

On every wallet exchange, server fn:
```ts
const admins = (process.env.ADMIN_WALLETS ?? '').split(',').map(s => s.trim().toLowerCase());
if (admins.includes(address.toLowerCase())) {
  await supabaseAdmin.from('user_roles').upsert({ user_id, role: 'admin' });
}
```
You add `ADMIN_WALLETS` once (your TXC address); next login auto-promotes.

## What I'll build now vs defer

**This turn (foundation):**
- Migration (drop users, new tables, RLS, GRANTs)
- All 4 server routes with Zod validation + Bitcoin-message-style signature verification stub
- New `/auth` page with QR + polling
- `/admin` layout gate + overview placeholder + 4 child pages with real data tables
- `ADMIN_WALLETS` secret added

**Defer (needs TXC wallet team input):**
- Final signature spec (magic prefix, address encoding)
- Wallet download page content
- WebSocket replacement for polling (nice-to-have)
- Multi-wallet-per-user, wallet rotation

## Risks
- **Anyone with TXC wallet can sign up** — that's the design, but no email = no rate-limit-by-identity. Mitigation: per-IP rate limit on `/wallet-challenge`.
- **Signature spec drift**: if TXC wallet implements signing differently than `bitcoinjs-message` expects, login breaks. Mitigation: `verifyTxcSignature()` is isolated; spec change = 1-file fix.
- **Wiping users**: this is a hard reset. If there's anyone real in the DB right now, they're gone. Confirm before I run the migration.

## Confirm before I build
1. **Wipe is OK?** Truncate `auth.users` cascade — destroys all stores, invoices, KYC records. Y/N
2. **Your admin TXC wallet address** — I need it (or a placeholder) to seed `ADMIN_WALLETS`. Or I'll add the secret empty and you fill it in via the secrets UI.
3. **Deep link scheme**: `payhme://login?...` OK? Or `txc://`?
