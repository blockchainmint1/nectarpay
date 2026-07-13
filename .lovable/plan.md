# Kit checkout on Nectar.Pay, BlockchainMint as fulfillment backend

Goal: sell the Terminal Kit ($499) + optional first-year fee ($228) from `/checkout` on nectar-pay.com, paid in crypto via our own invoice system. BlockchainMint (BM) receives the fulfillment order once the invoice is paid and ships the kit.

## User flow

1. `/price` "Get the Kit" button → `/checkout`
2. `/checkout` (single page):
   - Line items: **Kit $499** (required) + **First year $228** (toggle, default on)
   - Fields: email, full name, phone, shipping address (street/city/state/postal/country)
   - Pay-with: BTC / TXC / USDC (uses our existing invoice creation)
   - Submit → creates a `kit_orders` row + an invoice → redirects to our existing `/pay/{invoiceId}`
3. Buyer pays. Our existing paid-invoice handler fires.
4. New hook: if invoice is linked to a `kit_orders` row, POST the order to BM's fulfillment endpoint. Store returned `bm_order_id` and `bm_synced_at`.
5. `/checkout/thanks?order=…` — shows order number, payment confirmation, "we've handed it off to fulfillment, expect a tracking email" copy.

## Database

New table `public.kit_orders`:

- `id uuid pk`
- `user_id uuid null` (if logged in)
- `invoice_id uuid null references invoices(id)`
- `email text`, `full_name text`, `phone text`
- `ship_line1/line2/city/region/postal/country text`
- `include_first_year boolean default true`
- `subtotal_usd numeric`, `total_usd numeric`
- `status text` — `pending_payment` | `paid` | `submitted_to_bm` | `bm_failed` | `shipped` | `canceled`
- `bm_order_id text null`, `bm_synced_at timestamptz null`, `bm_last_error text null`
- `created_at`, `updated_at`

RLS: users see their own; anon can insert via server function only (no direct anon insert); service_role full.

## Server functions (this project)

- `src/lib/kit-checkout.functions.ts`
  - `createKitCheckout({ email, shipping, includeFirstYear, payChain })` — validates with Zod, creates invoice, creates kit_orders row, returns `{ invoiceId, payUrl, orderId }`.
  - `getKitOrder({ orderId })` — for thanks page.
- Extend existing paid-invoice handler (wherever `invoices.status → paid` is written) with `maybeForwardToBm(invoiceId)`:
  - Look up kit_orders by invoice_id. If exists and not yet submitted, POST to BM.
  - Endpoint: `${BM_FULFILLMENT_URL}` with `Authorization: Bearer ${BM_FULFILLMENT_SECRET}`.
  - Body: `{ external_order_id, email, shipping, line_items, paid_amount_usd, invoice_id, tx_ref }`.
  - Timing-safe HMAC over body optional; token auth is fine for v1.
  - On success: set `bm_order_id`, `bm_synced_at`, `status='submitted_to_bm'`.
  - On failure: log to `bm_last_error`, `status='bm_failed'`; a small server function `retryKitOrderToBm(orderId)` for admin retry.

## Secrets (this project)

- `BM_FULFILLMENT_URL` — full URL to BM intake endpoint (e.g. `https://blockchainmint.com/api/public/v1/external-orders`)
- `BM_FULFILLMENT_SECRET` — bearer token BM will verify

Requested via `add_secret` after the pages exist.

## Pages / components

- `src/routes/checkout.tsx` — kit checkout page (line items, shipping form, submit).
- `src/routes/checkout.thanks.tsx` — post-payment confirmation, reads `?order=`.
- `src/components/kit-checkout/*` — form pieces (line items, address form).
- Update `/price` Terminal Kit CTA button to link to `/checkout`.

## BlockchainMint side (separate project — I'll draft the endpoint spec)

BM needs to build `POST /api/public/v1/external-orders`:
- Header: `Authorization: Bearer ${BM_FULFILLMENT_SECRET}` (BM stores same secret).
- Verify, then create an internal order in `orders` table with `source='nectarpay_external'`, `payment_status='paid'`, `payhme_invoice_id`, shipping, line items.
- Return `{ order_id, order_number }`.

I'll ship the spec as `docs/BM_FULFILLMENT_ENDPOINT.md` in this project so it can be handed to BM. Actual BM implementation happens in the BlockchainMint.com project.

## Out of scope (this pass)

- Multi-item cart. Only Kit + optional first-year.
- Tax / shipping quotes (kit ships flat; first-year is digital). If BM needs to compute shipping later, we add a `getShippingQuote` call before invoice creation.
- Refund flow (BM's existing refund path handles it, we mirror status via a webhook back from BM in a later pass).
