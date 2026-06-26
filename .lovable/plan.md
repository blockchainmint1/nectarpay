## Goal

Replace the placeholder cartoon-bee `NectarMark` and inline SVG favicon with the new beehive identity from `logo_nectar_pay.pdf` everywhere it appears in the app.

## What the new logo is

- Icon: concentric honey-gradient arcs forming a beehive dome (warm amber → orange).
- Wordmark: "Pay" in matching gradient (paired with "Nectar" in app type to read as "NectarPay").
- We'll treat the **hive dome** as the standalone mark (used at favicon/nav/hero sizes) and let the existing text "Nectar/Pay" continue rendering as type next to it, since the PDF wordmark is a static raster and won't theme well at small sizes.

## Steps

1. **Upload assets to CDN** (via `lovable-assets`):
   - `nectar-hive-mark.png` — square transparent crop of just the hive (for nav + favicon + hero).
   - `nectar-hive-mark.svg` — vector version if extractable from the PDF; otherwise rely on the PNG.
   - `nectar-pay-lockup.png` — full hive + "Pay" lockup (for the marketing footer / share cards).
   - Source PDF copy `nectar-pay-logo.pdf` (kept as the canonical brand file, linked from a brand section if useful — optional).

2. **Replace `NectarMark` component** in `src/components/marketing-shell.tsx`:
   - Swap the inline cartoon-bee SVG for `<img src={hiveAsset.url} alt="NectarPay" className={...} />`.
   - Preserve the `className` API so all existing call sites (`h-3.5 w-3.5`, `h-4 w-4`, `h-6 w-6`, `h-12 w-12`) keep working at every size.
   - Keep export name so `src/routes/index.tsx` imports stay untouched.

3. **Update favicon** in `src/routes/__root.tsx`:
   - Replace the inline `data:image/svg+xml` icon with the CDN URL pointing at `nectar-hive-mark.png` (use a `.png` `rel="icon"` link; add an `apple-touch-icon` link to the same asset).

4. **Update OG image** in `src/routes/__root.tsx` head defaults — point `og:image` / `twitter:image` to the full `nectar-pay-lockup.png` so social shares show the new brand.

5. **POS theme check** — POS already uses honey/amber accents, so the new mark drops in cleanly. No color changes required.

## Out of scope (this turn)

- Redesigning the marketing hero / wordmark typography.
- Replacing the `/where` map pin icons (still generic category pins).
- Generating dark-on-light vs light-on-dark variants — the transparent PNG works on both walnut and cream surfaces in this app.

## Technical notes

- All four image assets live on the Lovable CDN under `/__l5e/assets-v1/...`; the repo only holds `.asset.json` pointers.
- `NectarMark` becomes a thin `<img>` wrapper — no logic, no SVG inline. This avoids re-encoding the PDF artwork as hand-written paths.
- Favicon switches from `image/svg+xml` to `image/png`; browsers cache aggressively, so a hard refresh may be needed to see the new tab icon during testing.
