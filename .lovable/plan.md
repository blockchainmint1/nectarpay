## Goal

Ship the full terminal customization surface, but keep it **quiet**: nothing new appears on the POS home/checkout screens by default. Everything lives in either:
- **Dashboard** → `/stores/$storeId/pos-settings` (merchant-wide, store-level)
- **Terminal** → `/pos/settings` (device-local overrides + danger zone)

A feature only shows up in the cashier flow once the merchant explicitly turns it on.

## What we'll add (all default OFF unless noted)

### Tier 1 — reconciliation
1. **External reference** (invoice → POS/cart link)
   - Per-store: `ext_ref_mode` = `off | prompt_before | prompt_after`, `ext_ref_required` bool, `ext_ref_label` ("Order #", "Ticket", …)
   - Per-terminal override of the same three.
   - Stored on `invoices.external_ref`, echoed on receipt, webhook payload, CSV export.
2. **Scan mode** — toggle: ref field auto-focuses and accepts barcode/QR keyboard-wedge input (no UI change beyond a tiny scanner icon when enabled).
3. **Tipping** — already partly wired; expose `pos_tip_enabled` + preset bps in store settings (it currently lives only on the device). Tip line stamped on invoice.
4. **Tax mode** — `tax_mode` = `none | inclusive | added`, `tax_bps`. Default `none` (matches current behavior).

### Tier 2 — operator UX
5. **Cashier PIN per terminal** (already on device; add optional `require_cashier_pin` per-store enforcement, hash stays local).
6. **Custom tender label** — free-text auto-fill for `external_ref` (e.g. "Table 4"). Off by default.
7. **Quick-item buttons** — JSON list of `{label, amount, ext_ref?}`. Empty by default → nothing renders.
8. **Receipt customization** — already partly wired (`receipt_*` columns exist). Add `receipt_email_enabled`, `receipt_sms_enabled`, `receipt_reprint_enabled`.
9. **Idle auto-lock** — already on device; mirror as store default.

### Tier 3 — money handling
10. **Refund/void** — `pos_refund_enabled`, `pos_void_enabled`, reason-code list. New `invoice_refunds` table (id, invoice_id, amount, reason, operator, created_at).
11. **Open tabs / hold orders** — `pos_hold_enabled`. New `invoice_holds` (terminal_id, label, payload, created_at). Recall by label.
12. **Other tender (cash)** — `pos_other_tender_enabled` + label list. Logs a "tender-only" row in `invoices` (status `tender_recorded`) so EOD totals match.
13. **End-of-day report** — `pos_eod_enabled`. Server fn aggregates by terminal/day.

### Tier 4 — fleet
14. **Per-terminal chain allow-list** — `terminals.allowed_chains text[]` (NULL = inherit store).
15. **Per-terminal currency display** — `terminals.display_currency` (NULL = inherit).
16. **Terminal groups** — `terminals.group_label text`.
17. **Remote lock/wipe** — `terminals.lock_requested_at`, `terminals.wipe_requested_at`. Heartbeat endpoint returns these flags; POS app honors them.

## Where the UI lives

### `/stores/$storeId/pos-settings` (dashboard)
Reorganize into collapsed accordion sections, all collapsed by default:
- Reconciliation (ext_ref, scan mode, tipping, tax)
- Operator (PIN policy, quick items, custom tender)
- Receipt (existing fields + new toggles)
- Money handling (refund/void/hold/other-tender/EOD)
- Fleet defaults (default chain allow-list, default currency)

### `/stores/$storeId/terminals` (dashboard)
Add a **gear icon** per terminal → modal with per-terminal overrides (allow-list, currency, group, ext_ref mode override, lock/wipe buttons).

### `/pos/settings` (terminal)
Keep current shape. Add a collapsed "Advanced" section with: ext_ref mode override, scan mode toggle, custom tender quick-fill, quick-item editor, "other tender" labels. All off → POS home looks exactly as today.

## What the cashier sees (zero change unless toggled)
- POS home: same grid. Quick-item buttons appear only if defined.
- Amount entry: ext_ref prompt appears only if mode = `prompt_before`.
- Confirmation screen: ext_ref prompt appears only if mode = `prompt_after`.
- "Hold", "Other tender", "Refund" buttons only render when their respective flags are on.
- Tip screen already gated by `pos_tip_enabled`.

## Backend changes

### Migration 1 — store-level settings
Add to `stores`:
- `ext_ref_mode text default 'off'`, `ext_ref_required bool default false`, `ext_ref_label text`
- `ext_ref_scan_mode bool default false`
- `tax_mode text default 'none'`, `tax_bps int default 0`
- `pos_quick_items jsonb default '[]'`, `pos_custom_tenders jsonb default '[]'`
- `pos_refund_enabled bool default false`, `pos_void_enabled bool default false`, `pos_hold_enabled bool default false`, `pos_other_tender_enabled bool default false`, `pos_eod_enabled bool default false`
- `pos_require_cashier_pin bool default false`
- `receipt_email_enabled bool default false`, `receipt_sms_enabled bool default false`, `receipt_reprint_enabled bool default true`
- `default_allowed_chains text[]`, `default_display_currency text`

### Migration 2 — terminal overrides + new tables
Add to `terminals`: `allowed_chains text[]`, `display_currency text`, `group_label text`, `ext_ref_mode text`, `ext_ref_required bool`, `lock_requested_at timestamptz`, `wipe_requested_at timestamptz`.
Add to `invoices`: `external_ref text`, `tip_bps int`, `tax_bps int`, `tender_kind text` (`crypto`/`cash`/`other`).
New tables: `invoice_refunds`, `invoice_holds`. Full GRANTs + RLS via `owns_store`.

### API surface
- `GET /api/public/v1/terminals/options` — extend response with `experience.ext_ref`, `experience.quick_items`, `experience.refund_enabled`, etc. (additive, won't break Bee Keeper).
- `POST /api/public/v1/terminals/invoice` — accept optional `external_ref`, `tip_bps`, `tender_kind`.
- `GET /api/public/v1/terminals/heartbeat` — include `lock`, `wipe` flags.
- New: `/terminals/refund`, `/terminals/hold`, `/terminals/eod` — all check store flags.

## Out of scope this turn
- Actually wiring refund execution on-chain (just records the intent + sends a notification for now).
- Email/SMS receipt sending pipeline (toggle stored, sender service stubbed).
- Real POS-system integrations (Square/Clover/Shopify) — `external_ref` is the hook they'll use later.

## Rollout order (one PR each)
1. Migration 1 + dashboard pos-settings accordion (Tier 1 + 2 UI only).
2. Migration 2 + invoice + heartbeat API extensions + cashier-side conditional rendering.
3. Refund/hold/EOD tables + endpoints + UI sections.
4. Fleet per-terminal modal on `/terminals`.

Confirm and I'll start with step 1.