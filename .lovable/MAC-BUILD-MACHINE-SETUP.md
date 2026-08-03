# Mac Build Machine — Multi-App Setup

One-time setup for a dedicated Mac used to build & publish many iOS/Android apps
(NectarPay POS, NectarPay Merchant, and future Lovable/Capacitor apps).

---

## 1. Command Line Tools

```bash
xcode-select --install
sudo xcodebuild -license accept
```

## 2. Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"

# Apple Silicon: add to PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
brew --version
```

## 3. Core toolchain

```bash
brew install git gh cocoapods watchman jq
brew install --cask temurin@21          # JDK 21 for Android/Gradle
brew install --cask android-studio      # SDK + emulator + adb
brew install --cask xcodes              # manage multiple Xcode versions
```

Bun (this repo uses bun, not npm):

```bash
curl -fsSL https://bun.sh/install | bash
exec zsh
bun --version
```

Node (some CLIs still need it):

```bash
brew install fnm
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
exec zsh
fnm install 22 && fnm default 22
```

## 4. Xcode

Install Xcode 16+ from the App Store (or `xcodes install --latest`), open it once,
let it install additional components, then:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

## 5. Android SDK env

Add to `~/.zshrc`:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
```

Then in Android Studio → SDK Manager install: Platform 35 + 34, Build-Tools 35,
Platform-Tools, Command-line Tools.

```bash
sdkmanager --licenses    # accept all
adb devices              # should list the POS terminal over USB
```

## 6. Accounts & signing (do once, reused by every app)

- **Apple Developer Program** ($99/yr) — enroll at developer.apple.com.
  In Xcode → Settings → Accounts, add the Apple ID; enable automatic signing.
- **Android keystore** — keep ONE release keystore per app, stored outside the
  repo (e.g. `~/keystores/<app>.jks`) and backed up. Losing it means you can
  never update that app on Play.
- **GitHub** — `gh auth login` so CI keystores/secrets and repo clones just work.

## 7. Workspace layout

```
~/apps/
  nectarpay/        # this repo
  <next-app>/
~/keystores/        # release keystores, backed up (1Password / encrypted drive)
```

## 8. Per-app build loop (Capacitor / Lovable)

```bash
git clone <repo> && cd <repo>
bun install
bun run build

# iOS
bun run ios:merchant:add     # first time only, creates ios/
bun run sync:merchant
bun run ios:merchant         # opens Xcode → set Team + bundle ID → ⌘R

# Android
bun run android:merchant:add # first time only
bun run sync:merchant
bun run android:merchant     # opens Android Studio → Build > Generate Signed APK
```

Rule of thumb: **`bun run build` before every `cap sync`** — Capacitor copies the
last web build, not your source.

## 9. Publishing

- **iOS** — Xcode → Product → Archive → Distribute → App Store Connect → TestFlight.
  Bump `CFBundleShortVersionString` + build number each upload.
- **Android** — signed AAB for Play, signed APK for terminal sideloading.
  This repo's GitHub Action builds APKs on `pos-v*` tags; prefer CI over local
  builds for anything shipped to terminals.

## 10. Useful extras

```bash
brew install --cask visual-studio-code
brew install --cask ngrok          # expose localhost to a terminal
brew install ios-deploy            # push .app to a tethered iPhone
brew install --cask betterdisplay  # force resolutions macOS hides
```

## Sanity check

```bash
brew --version && bun --version && node --version \
  && java -version && xcodebuild -version && adb --version && pod --version
```

All seven printing = machine is ready for any app in the workspace.
