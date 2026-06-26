# Launch plan: logo, /where heatmap, /signup wizard

Three parallel workstreams for the 1,200-terminal launch.

---

## 1. New logo rollout

Once you re-attach the logo file, swap it in everywhere the current bee SVG (`NectarMark` in `src/components/marketing-shell.tsx`) is used:

- Marketing nav + footer
- Homepage hero
- POS pages (`pos.*.tsx`)
- Favicon + apple-touch-icon (root route head)
- OG/Twitter share image
- Auth screens, dashboard sidebar

Approach: keep the `NectarMark` component name (lots of imports) but replace its body with the new artwork. If raster, upload via `lovable-assets` and reference the CDN URL; if vector, inline as SVG so it stays crisp at favicon size.

---

## 2. `/where` merchant heatmap

### Data model (new migration)

Add to `stores`:
- `listing_visibility` — `'hidden' | 'city_only' | 'full'`, default `'city_only'`
- `business_address` — text (street, for geocoding)
- `business_city`, `business_region`, `business_country` — text
- `business_lat`, `business_lng` — numeric (filled by geocoder)
- `business_category` — text (Restaurant, Retail, Services, Online, etc.)
- `business_description` — text
- `business_logo_url` — text (reuses receipt_logo_url pattern)

Add to `terminals`:
- `last_seen_ip` — inet
- `last_seen_lat`, `last_seen_lng` — numeric (from GeoIP on heartbeat)
- `last_seen_city`, `last_seen_country` — text

New public view `public.merchant_map_pins`:
- For `listing_visibility='full'`: name, category, city, lat/lng (precise), website, logo
- For `listing_visibility='city_only'`: anonymous pin at city centroid only (lat/lng rounded), category, country
- Excludes `hidden` and stores with no active terminal in last 30 days

Narrow `TO anon` SELECT policy on the view so it's safe to read from a public route.

### Location resolution

Server function `resolveStoreLocation`:
1. If merchant supplied `business_address` → geocode (Mapbox or Google — needs API key via `add_secret`)
2. Else use most recent terminal's `last_seen_lat/lng`
3. Else city centroid from `last_seen_country/city`

GeoIP on terminal heartbeat (`src/routes/api/public/v1/terminals/heartbeat.ts`):
- Read `CF-Connecting-IP` header (Cloudflare Workers gives this for free)
- Use a free GeoIP service (ipapi.co / ipinfo lite) cached per IP — store result on terminal row, refresh weekly

### Settings UI

New section in `_authenticated.stores.$storeId.index.tsx` (or a new `.location.tsx` child route):
- Visibility radio: Hidden / City pin only / Full listing
- Address form (street, city, region, country) — required for "Full listing"
- Category dropdown
- Short description (140 chars)
- Logo upload (reuse receipt logo plumbing)
- Live preview of how the pin will appear

### Public `/where` page

New file `src/routes/where.tsx`:
- Public SSR route, marketing shell
- Hero: "Where to spend crypto"
- Interactive map (Mapbox GL JS — needs publishable token in `.env`, safe in client) with clustering at zoom-out, individual pins at zoom-in
- Sidebar list: filter by category, country, accepted assets
- Click pin → side panel with merchant name, address, website, accepted chains, link to their store
- For `city_only` pins: generic "Crypto merchant in {city}" card, no clickthrough
- Empty-state copy for early days: "1,200 terminals shipping now — pins light up as merchants come online"
- Full `head()` SEO: title, description, OG image

Link from marketing nav ("Find merchants") and footer.

---

## 3. Hybrid `/signup` onboarding wizard

Replace the bare `/auth?mode=signup` flow with a guided multi-step wizard at `/signup`. Each step saves progress so a merchant can drop off and resume.

### Step 1 — Account
Email + password (or Google OAuth). Creates `auth.users`, `profiles`, default `subscriptions` row (already wired via `handle_new_user` trigger).

### Step 2 — Business basics
- Business name (→ creates first `stores` row)
- Country
- Category
- Website (optional)
- Fiat currency

### Step 3 — Wallet
- Three big options: "I have a Beekeeper wallet" / "I have an xpub or address" / "I need a wallet"
- Beekeeper → existing wallet-link flow
- xpub → per-chain config screen (reuse existing chains editor, simplified)
- Need a wallet → link to Beekeeper download/docs, allow "skip for now" but flag store as not-payable

### Step 4 — Listing preferences
Same controls as the /where settings (visibility, address, category, description, logo). Defaults to "City pin only" so most stores show up automatically without extra effort.

### Step 5 — Terminal (optional)
Two cards:
- **"I have a terminal already"** → go to existing terminal pairing flow
- **"Order a terminal"** → deep-link to BlockchainMint.com with prefilled query params (`?ref=nectarpay&account={user_id}&store={store_id}&ship_to_email={email}`)
- **"Skip — I'll use BYO POS"** → straight to dashboard, POS works on any tablet/phone

### Step 6 — Confirmation
- Summary card
- "Test a $1 invoice" CTA
- Link to WooCommerce / API docs
- Link to dashboard

### Tracking
Add `onboarding_step` and `onboarding_completed_at` to `profiles` so we can resume mid-wizard, and `terminal_order_clicked_at` to track the BlockchainMint handoff (for later reconciliation when BCM sends back order/shipment data).

---

## Technical / decisions section

**Maps & geocoding:** Mapbox is the cleanest fit — one publishable token (safe in client) for GL JS rendering, server token for geocoding. Will need two secrets: `VITE_MAPBOX_TOKEN` (public, can live in code) and `MAPBOX_SECRET_TOKEN` (geocoding, via `add_secret`). Alternative: MapLibre + free Nominatim geocoder, slower and lower quality but $0.

**GeoIP:** start with free tier of ipapi.co (1000 req/day) called from heartbeat; cache result on the terminal row. If we outgrow free tier, swap to ipinfo paid.

**BlockchainMint integration:** for now, just a deep-link with query params — no API integration. Phase 2 would be a webhook from BCM back to a `/api/public/hooks/blockchainmint-order` endpoint to mark terminals as shipped/delivered in our dashboard.

**Pin clustering:** Mapbox GL JS supports it natively via `cluster: true` on the GeoJSON source — no extra library needed.

**Migration order:** stores listing fields → terminals geoip fields → `merchant_map_pins` view → grants/policies.

**Out of scope for this plan (call out for later):**
- BCM order-status webhook + shipment tracking UI
- Heatmap density layer (vs individual pins) — only needed once we have thousands of merchants
- Merchant-to-merchant chat / reviews on the map

---

## Suggested build order

1. Logo swap (small, unblocks branding)
2. DB migration for store listing + terminal GeoIP fields
3. `/where` settings UI in store dashboard
4. Heartbeat GeoIP enrichment
5. `merchant_map_pins` view + public server fn
6. `/where` public page with Mapbox
7. `/signup` wizard (refactor of existing auth flow)
8. BlockchainMint deep-link card in wizard step 5

Want me to flip to build mode and start with the logo + migration, or sequence differently?
