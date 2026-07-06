# POS Terminal Deployment Notes

## Building the APK

Two paths:

**Cloud (recommended)** — GitHub Actions. See `.github/workflows/pos-apk.yml`.

1. Run `./scripts/generate-keystore.sh` locally (one time). Requires JDK.
2. Paste the four values into GitHub → Settings → Secrets → Actions.
3. Push to `pos-app` branch (or manual run via Actions tab) → artifact APK.
4. Push git tag `pos-v0.1.0` → GitHub Release + auto-publish to Lovable Cloud
   → visible in the `/start` install card.

**Local** — Android Studio.

1. `bun run build && npx cap sync android`
2. Open `android/` in Android Studio → Build → Generate Signed Bundle / APK

## Installing on a Senraise terminal

1. On terminal: Settings → Security → **Install unknown apps** → allow the
   browser (or file manager).
2. Open browser → navigate to `nectar-pay.com/pos-apk` (or scan the QR on the
   printed onboarding card).
3. Tap the download when it finishes → **Install** → **Open**.
4. First-run: the app auto-pairs using a code embedded in the download URL
   (deferred — v1 asks the merchant to type the pairing code shown on
   `/start`).

## Making it the terminal's launcher (optional)

Attach the terminal to a laptop via USB, enable ADB (usually a hidden
Settings toggle — Google the model), then:

```bash
adb shell cmd package set-home-activity money.honest.nectarpos/.MainActivity
adb reboot
```

Powered-on → boots straight into POS. Restore normal launcher with:

```bash
adb shell cmd package set-home-activity com.android.launcher3/.Launcher
```

## Updating in the field

Two mechanisms, use whichever is easier:

1. **Live-reload web UI (default)** — `capacitor.config.ts` sets
   `server.url` to the live web app. Any deploy of Nectar.Pay is instantly
   live on every terminal on the next screen refresh. No APK reinstall
   needed for web-side changes.
2. **Native updates (printer/NFC changes)** — push a new `pos-v*` tag →
   `nectar-pay.com/pos-apk` now serves the new APK. Terminals can be
   updated by re-opening the URL and reinstalling. A future "check for
   updates" button in POS Settings will do this in-app.

## Known constraints

- Some Senraise firmware locks down `REQUEST_INSTALL_PACKAGES` — in that
  case updates require ADB (`adb install -r nectar-pos.apk`).
- Live-reload mode requires the terminal to have wifi/data. For offline-
  first deployment, comment out `server.url` in `capacitor.config.ts`,
  rebuild, and every UI change ships as a new APK.
- The printer service package name in the AIDL we were given is
  `recieptservice.com.recieptservice`. If a specific Senraise unit exposes
  a differently-named service the printer plugin will fail to bind — check
  `adb logcat | grep SrPrinter` and update the AIDL directory + `SrPrinter`
  target if so.

## Debugging on-device

- Chrome DevTools → `chrome://inspect` picks up the WebView when USB is
  connected (webContentsDebuggingEnabled is on in `AndroidManifest.xml`).
- `adb logcat | grep -i 'nectar\|SrPrinter\|Nfc'` for native events.
- Printer test: open the POS, tap a payment as paid → receipt should
  auto-print. If nothing happens, native-side error is logged with tag
  `NectarPrinter`.
