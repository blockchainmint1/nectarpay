# Merchant reports suite (/reports)

A new "Reports" section in the merchant dashboard that turns raw payment data into
answers: what sold, when, how people paid, and what it's worth.

## The page

New nav item **Reports** (sidebar + mobile "more" menu), landing at `/reports`.

Shared controls at the top of every report:
- Date range (Today, 7d, 30d, 90d, Year to date, Custom)
- Store filter (all stores you can see, respecting team access)
- Chain / coin filter
- Compare to previous period (on by default)
- Download this report as CSV

## The reports

1. **Summary** (`/reports`)
   - Headline tiles: gross paid volume, payment count, average payment, unpaid /
     expired value, and % change vs the previous period.
   - Revenue over time chart (daily or monthly depending on range).
   - Quick links to every other report.

2. **Sales over time** (`/reports/sales`)
   - Day / week / month bars with paid volume and count, plus a running total.
   - Best day, best week, and busiest hour callouts.

3. **Payment methods** (`/reports/methods`)
   - Breakdown by chain and by coin (BTC, TXC, TSD, USDC, Lightning, etc.):
     share of volume, count, average ticket.
   - Stablecoin vs volatile-coin split.

4. **Stores & terminals** (`/reports/locations`)
   - Volume and count per store, per terminal, and per share link.
   - Terminal last-seen and city so quiet devices stand out.

5. **Customers & invoices** (`/reports/invoices`)
   - Emailed payment requests: sent, opened, paid, expired, and average time to pay.
   - Repeat payers by email where we have one.

6. **Settlement & fees** (`/reports/settlement`)
   - What landed per chain in coin terms and in dollars.
   - Estimated savings versus a 2.9% + 30c card rate, cumulative and for the period.

7. **Tax & accounting** (`/reports/tax`)
   - Monthly totals by currency with tax collected (from the store's tax setting).
   - Year-to-date table built for handing to a bookkeeper, plus QuickBooks CSV.

## Technical notes

- Data comes from a new `src/lib/reports.functions.ts` with authenticated server
  functions (`requireSupabaseAuth`), one per report, each taking
  `{ storeIds, chains, from, to }` and returning already-aggregated rows so the
  browser never pulls raw invoice lists. Aggregation logic lives in
  `src/lib/reports.server.ts`.
- Queries read `invoices` + `transactions` (+ `terminals`, `public_terminals`,
  `stores`) through the caller's Supabase client, so existing RLS and the new
  store-team access levels apply with no extra checks. Viewer-level members see
  reports; wallet data stays out of this section.
- Routes are `src/routes/_authenticated.reports.tsx` (layout with the filter bar +
  sub-tabs) and one leaf per report; filters live in the URL search params so a
  report can be bookmarked and shared.
- Charts use `recharts` (already in the shadcn stack) via `@/components/ui/chart`.
- CSV download reuses the existing export helper pattern; each report exposes its
  own column set.
- Empty/loading states on every report, and dollar formatting per store currency.
