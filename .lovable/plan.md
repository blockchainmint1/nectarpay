
# NectarPay POS — Android app scaffold + CI build

Turn the existing web POS (`/pos/*` routes) into a signed APK that runs on Senraise terminals, drives the printer + NFC reader via native bridges, is built automatically by GitHub Actions, and is installed as the final step of `/start` onboarding.

---

## What gets built

### 1. Capacitor scaffold (`android/`)

New folder in repo:

```text
android/
  app/
    build.gradle
    src/main/
      AndroidManifest.xml         (NFC + INTERNET perms, single-task launcher)
      java/money/honest/nectarpos/
        MainActivity.java         (Capacitor bridge + NFC foreground dispatch)
        NectarPrinterPlugin.java  (binds Senraise AIDL, exposes printReceipt/cut/qr)
        NectarNfcPlugin.java      (reads NDEF, emits event to JS)
        NdefRouter.java           (parses tag: nectar:// URI, EIP-681, Solana Pay,
                                   BIP-21 bitcoin:, TXC address, plain URL)
      aidl/com/recieptservice/    (copied verbatim from your SDK)
        PrinterInterface.aidl
        PSAMCallback.aidl
        PSAMData.aidl
      assets/public/              (built web app copied here by Capacitor)
    libs/
      printer.jar                 (from java_2025.zip)
      guavalib.jar                (from NFC SDK)
  build.gradle
  settings.gradle
  gradle/wrapper/*
capacitor.config.ts               (webDir points at Vite build; server.url points
                                   at published site so terminals get live updates
                                   without reinstalling the APK)
```

Two Capacitor plugins the web app can call:

```ts
// src/lib/pos-native.ts (already-safe wrappers, no-op on desktop)
NectarPrinter.printReceipt({ header, lines, qr, footer })
NectarNfc.startReader()   // returns { format, raw, parsed: { address?, chain?, amount? } }
NectarNfc.stopReader()
```

The web app detects Capacitor at runtime (`window.Capacitor?.isNativePlatform`) and swaps the "Print" button + "Tap card" flow to the native calls; browser POS keeps working unchanged.

### 2. NDEF card format (what we recommend printing on the cards)

Two-record NDEF, both wallets and our own cards satisfy it:

- Record 1: `application/vnd.nectar.pay+json` with `{"v":1,"addr":"...","chain":"txc","label":"..."}`
- Record 2: `bitcoin:...` / `ethereum:...` / `solana:...` / plain URL (fallback the terminal understands anyway)

Router accepts, in order:
1. Our JSON record → highest trust, use as-is.
2. `nectar://` URI (for pre-signed pay intents when we get there).
3. BIP-21 `bitcoin:` / EIP-681 `ethereum:` / Solana Pay `solana:` / `tron:`.
4. Any plaintext hex/base58 that decodes as a supported chain address.
5. Bare URL → open in in-app browser (probably the customer's hosted-wallet link).

Card recommendation lives in a new doc `.lovable/CARDS.md` (specs to hand a printer: NTAG213 for cheap 144-byte tags, NTAG216 if we want ~888 bytes for signed intents, ISO 14443A, print-in-quantity vendors).

### 3. GitHub Actions signed release (`.github/workflows/pos-apk.yml`)

Triggers: push to `pos-app` branch, manual `workflow_dispatch`, and git tag `pos-v*`.

Steps:

```text
1. Checkout
2. Setup JDK 17, Android SDK, Bun
3. bun install && bun run build            (builds the Vite web app)
4. npx cap sync android
5. Decode ${{ secrets.ANDROID_KEYSTORE_BASE64 }} → keystore.jks
6. gradlew assembleRelease -PkeyAlias=... -PkeyPassword=... -PstorePassword=...
7. Upload nectar-pos-<version>.apk as workflow artifact
8. On tag: also create GitHub Release + upload APK
9. Post APK URL back to Lovable Cloud storage bucket 'pos-releases'
   so the /start page can serve the latest download
```

Required GitHub repo secrets (I'll write the exact instructions in the workflow file's header comment):
- `ANDROID_KEYSTORE_BASE64` — base64 of `keystore.jks`
- `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_STORE_PASSWORD`
- `LOVABLE_UPLOAD_TOKEN` — service-role key so the workflow can PUT the APK into the storage bucket

First-run helper: `scripts/generate-keystore.sh` runs `keytool` locally to produce the keystore + prints the base64 to paste into GitHub. One command, no Android Studio.

### 4. `/start` onboarding — new final step

Insert after the existing terminal-pairing step:

```text
Step N: Install POS app on your terminal
  - Latest version badge:  v1.0.3   (fetched from pos-releases bucket)
  - [ Download APK ]  →  direct link to signed APK
  - [ Copy install URL ]  →  short URL like nectar-pay.com/pos-apk (302 to latest)
  - Terminal instructions (3 lines, big text)
  - Pairing code auto-loaded — first launch of the APK auto-pairs with this merchant
```

Wire-up:

- New `pos_releases` table (version, apk_url, sha256, published_at, notes) — populated by the CI workflow.
- New server fn `getLatestPosRelease()` — public, cached.
- New public route `/pos-apk` → 302 to `apk_url` of the latest release.
- Update `src/routes/start.tsx` to add the install step.

### 5. Kiosk / launcher polish (deferred, documented)

Not built in this pass — but `.lovable/POS-DEPLOYMENT.md` documents:

- `adb shell cmd package set-home-activity money.honest.nectarpos/.MainActivity` to make the POS app the default launcher.
- Task-lock via `startLockTask()` gated by a merchant PIN in POS Settings.
- In-app "Check for update" that hits `getLatestPosRelease()` and downloads/installs the new APK if the terminal permits it. If Senraise blocks self-install we fall back to ADB re-push instructions.

---

## What you have to do (once)

1. Run `scripts/generate-keystore.sh` on your machine → get 4 values.
2. Paste those 4 values into GitHub repo Secrets.
3. Push to trigger first build. Download the APK. Sideload once to confirm it runs on a Senraise unit.
4. Tell me which card vendor you're leaning toward and I'll finalize the NDEF write template + a small "encode card" utility page in the admin panel.

---

## Roadblocks I expect (I'll flag as we hit them)

- **Senraise's printer AIDL package name** — I'm using `com.recieptservice` from the AIDL you sent; if their actual service is `com.iboxpay.print` or similar we'll see `ServiceConnection` returning null on first boot and fix in ~5 min.
- **NFC intent filter vs. foreground dispatch** — some Senraise firmwares consume NFC intents before the app sees them. Fallback is `NfcAdapter.enableReaderMode()` which we register in `MainActivity.onResume`. Both approaches wired.
- **APK self-install** — Android requires `REQUEST_INSTALL_PACKAGES` + user tap. On locked-down terminal firmware even that may be blocked; the doc covers ADB fallback.
- **Capacitor `server.url` pointing at the live web app means updates ship instantly** — but the terminal needs internet. If you want fully-offline POS, we swap to bundled webDir and rely on APK updates for every change. Recommend live-URL mode for v1.

---

## Files to be created/modified

New:
- `android/**` (full Capacitor project, ~40 files)
- `capacitor.config.ts`
- `.github/workflows/pos-apk.yml`
- `scripts/generate-keystore.sh`
- `src/lib/pos-native.ts`
- `src/lib/pos-releases.functions.ts`
- `src/routes/pos-apk.ts` (302 redirect)
- `supabase/migrations/*_pos_releases.sql`
- `.lovable/CARDS.md`
- `.lovable/POS-DEPLOYMENT.md`

Modified:
- `src/routes/pos.index.tsx` (call native printer / NFC when available)
- `src/routes/start.tsx` (new install step)
- `package.json` (add `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`)

---

## Order of operations

1. Capacitor scaffold + copy SDK jars + AIDL.
2. Native plugins (printer + NFC reader).
3. Web-side wrappers + swap POS UI to use them when native.
4. GitHub Actions workflow + keystore script.
5. Releases table + `/pos-apk` redirect + `/start` install step.
6. Docs (CARDS.md, POS-DEPLOYMENT.md).

Approve and I'll rip through all six in one pass.
