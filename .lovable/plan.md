
# Merchant Apps (iOS + Android) — Plan

## App landscape

Three distinct apps, one shared web codebase:

| App | Platform | Distribution | Purpose |
|---|---|---|---|
| **NectarPay POS** (existing) | Android only | Sideloaded APK on Senraise terminals | Full hardware POS: NFC tap, thermal printer, Tangem card |
| **NectarPay Merchant** (new) | iOS | App Store | Dashboard + virtual terminal |
| **NectarPay Merchant** (new) | Android | Play Store | Dashboard + virtual terminal |

The two Merchant apps share the same code, same Capacitor config, same `appId`, and differ only by platform build. The existing Senraise terminal app keeps its current `appId` (`money.honest.nectarpos`) and stays sideload-only.

## What the Merchant app does

**Dashboard** (already exists on web, wrap it):
- Sales overview, recent transactions, payout status
- Store settings, staff, terminals list
- Invoices, customers, KYC status
- Notifications / alerts

**Virtual Terminal** (new flow, no hardware):
- Enter amount → generate a payment request
- Present as QR code for the customer to scan with any crypto wallet
- Optionally send as a payment link (SMS / email / share sheet)
- Live "waiting for payment" screen that flips to "paid" when the chain confirms (reuse existing invoice + watcher infra)
- Refund / void from transaction detail

Explicitly **not** in the Merchant app: NFC tap-to-pay, receipt printer, Tangem SDK bridge. Those stay Android-native on the Senraise terminal build.

## Technical approach

New Capacitor project alongside the existing one:

- New `appId`: `money.honest.nectarpay.merchant` (distinct from terminal so both can install side-by-side and get separate App Store / Play listings).
- New `appName`: "NectarPay" (merchant-facing).
- Add both platforms: `ios/` + a second Android target.
- Point `server.url` at `https://nectar-pay.com/m` — a new merchant-only entry route that hides terminal-only UI and boots straight into the dashboard.
- Add a lightweight `isMerchantApp()` runtime check (via Capacitor platform + a build flag) so the web app can:
  - hide NFC / printer / pair-terminal UI
  - show a "Virtual Terminal" tile instead of "Take Payment (tap)"
  - route push notifications to native OS notifications

Two build configs, one repo:

```text
capacitor.config.ts          → Senraise terminal (Android only, existing)
capacitor.merchant.config.ts → Merchant app (iOS + Android, new)
```

Build scripts:
- `bun run build:terminal` → syncs terminal config, builds Android APK
- `bun run build:merchant:ios` → syncs merchant config, opens Xcode
- `bun run build:merchant:android` → syncs merchant config, builds AAB

## New web surface needed

- `/m` — merchant app entry route (auto-redirects to dashboard if signed in, else `/auth`)
- `/m/virtual-terminal` — amount pad → QR / share flow
- Detect `Capacitor.getPlatform() === 'ios' | 'android'` + merchant build flag to gate terminal-only UI everywhere it appears

## Store listing prep (do later, not this pass)

- App icons (1024 iOS, adaptive Android)
- Screenshots (5 per device size)
- Privacy policy URL (already exists on marketing site)
- App Store description, keywords, category (Finance)
- Play Store description, content rating, data safety form

## Open questions before I build

1. **Confirm virtual terminal scope**: QR + share-link is the MVP I'm proposing. Do you also want manual card entry (would require a payment processor integration on top of crypto), or crypto-only for v1?
2. **Push notifications**: want native push for "payment received" / "payout sent" on day one, or ship without and add later?
3. **Biometric unlock** (Face ID / fingerprint to open the app): yes for v1, or skip?
4. **Naming**: keep both apps called "NectarPay" in the stores, or differentiate ("NectarPay" for merchant, since Senraise app is never public)?

Once you answer those, I'll scaffold `/m`, the virtual terminal flow, the second Capacitor config, and add the iOS platform.
