#!/usr/bin/env bash
# Injects the Info.plist keys the merchant iOS app needs.
#
# WKWebView refuses getUserMedia() (the JS side then sees no
# navigator.mediaDevices, i.e. "Camera not available on this device")
# unless the app declares NSCameraUsageDescription. Run this after
# `cap add ios` / any time Xcode regenerates Info.plist.
set -euo pipefail

PLIST="${1:-ios/App/App/Info.plist}"

if [ ! -f "$PLIST" ]; then
  echo "Info.plist not found at $PLIST — run 'bun run ios:merchant:add' first." >&2
  exit 1
fi

set_string() {
  /usr/libexec/PlistBuddy -c "Set :$1 $2" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$PLIST"
}
set_bool() {
  /usr/libexec/PlistBuddy -c "Set :$1 $2" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :$1 bool $2" "$PLIST"
}

set_string NSCameraUsageDescription "Scan pairing and payment QR codes."
set_string NSPhotoLibraryAddUsageDescription "Save payment QR codes and receipts."
# Inline video playback for the scanner preview.
set_bool UIRequiresFullScreen false

echo "Patched $PLIST:"
/usr/libexec/PlistBuddy -c "Print :NSCameraUsageDescription" "$PLIST"

# --- App icon -------------------------------------------------------------
# `cap add ios` scaffolds Capacitor's default grey icon. Copy the NectarPay
# 1024x1024 (no alpha) mark over it so archives never ship the placeholder.
ICON_SRC="assets/ios/AppIcon.appiconset"
ICON_DEST="ios/App/App/Assets.xcassets/AppIcon.appiconset"
if [ -d "$ICON_SRC" ] && [ -d "ios/App/App/Assets.xcassets" ]; then
  rm -rf "$ICON_DEST"
  cp -R "$ICON_SRC" "$ICON_DEST"
  echo "Installed app icon -> $ICON_DEST"
else
  echo "Skipped app icon (missing $ICON_SRC or Xcode assets catalog)." >&2
fi
