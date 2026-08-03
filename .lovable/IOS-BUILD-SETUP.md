# iOS Build Setup — NectarPay Merchant App

Target: `capacitor.merchant.config.ts` (appId `money.honest.nectarpay`,
live-loads `https://app.nectar-pay.com/m?mode=merchant`).

iOS builds **require a Mac** (Apple Silicon strongly preferred). There is no
supported way to build/sign an iOS app on Windows or Linux.

## 1. Install on the new machine

| Tool | How | Notes |
| --- | --- | --- |
| Xcode 16+ | Mac App Store | ~10 GB, get coffee |
| Xcode Command Line Tools | `xcode-select --install` | |
| Accept license | `sudo xcodebuild -license accept` | |
| iOS simulator runtime | Xcode → Settings → Components → iOS 18 | |
| Homebrew | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` | |
| Git | `brew install git` | |
| Bun | `curl -fsSL https://bun.sh/install \| bash` | project uses bun, not npm |
| CocoaPods | `brew install cocoapods` | Capacitor iOS needs it |
| (optional) Fastlane | `brew install fastlane` | for CI/TestFlight automation |

Apple account: you need an **Apple Developer Program** membership ($99/yr) to
ship to TestFlight/App Store. A free Apple ID can only run on your own device
for 7 days.

## 2. Clone + first build

```bash
git clone <repo-url> nectarpay && cd nectarpay
bun install
bun run build              # produces dist/
bun run ios:merchant:add   # creates the ios/ folder (first time only)
bun run sync:merchant      # copies config + plugins into ios/
bun run ios:merchant       # opens Xcode
```

`ios/` is created locally by `cap add ios`; it is not committed today. If you
want reproducible CI builds later, commit the generated `ios/` folder.

## 3. Xcode configuration (once)

1. Select the **App** target → *Signing & Capabilities*.
2. Team = your Apple Developer team; check *Automatically manage signing*.
3. Bundle Identifier = `money.honest.nectarpay` (must match the config).
4. Deployment target: iOS 15.0 or later.
5. Capabilities to add: *Associated Domains* only if you want universal links
   for `app.nectar-pay.com`. NFC/printer are **terminal-only** — do not add
   them here.
6. Info.plist: the app live-loads over HTTPS, so no ATS exceptions needed.
   Add `NSCameraUsageDescription` ("Scan payment QR codes") if the merchant
   app uses the camera scanner.

## 4. Run

- Simulator: pick a device in the toolbar → ⌘R.
- Real device: plug in iPhone, trust the Mac, select it, ⌘R.
- Since `server.url` points at the live site, most UI changes need no rebuild —
  just relaunch the app.

## 5. Ship to TestFlight

1. Xcode → *Product* → *Archive* (Any iOS Device selected).
2. Organizer → *Distribute App* → *App Store Connect* → *Upload*.
3. App Store Connect → TestFlight → add internal testers.

Bump `CFBundleShortVersionString` / `CFBundleVersion` for each upload.

## Gotchas

- After every `bun run build`, run `bun run sync:merchant` before archiving.
- `pod install` runs automatically via `cap sync`; if it fails, run
  `cd ios/App && pod install --repo-update`.
- Rosetta is not needed; Capacitor 8 pods build native on Apple Silicon.
- Do NOT use `capacitor.config.ts` for iOS — that one is the Senraise Android
  terminal build (NFC/printer/Tangem) and will not compile for iOS.
