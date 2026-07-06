#!/usr/bin/env bash
# Generate an Android release keystore and print the four values you need
# to paste into GitHub Actions Secrets.
#
# Usage:  ./scripts/generate-keystore.sh
#
# Requires: `keytool` (bundled with any JDK; `brew install --cask temurin`
# on macOS, `apt install default-jdk` on Linux).

set -euo pipefail

KEYSTORE=${1:-nectar-pos-release.jks}
ALIAS=${2:-nectar-pos}

if [[ -f "$KEYSTORE" ]]; then
  echo "Refusing to overwrite existing $KEYSTORE"
  exit 1
fi

read -srp "Choose a keystore password (remember this — losing it means you can never publish updates to installed terminals): " PW
echo
read -srp "Confirm: " PW2
echo
[[ "$PW" == "$PW2" ]] || { echo "Passwords do not match"; exit 1; }

keytool -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10950 \
  -storepass "$PW" -keypass "$PW" \
  -dname "CN=NectarPay POS, OU=Nectar.Pay, O=Honest Money, C=US"

echo
echo "=================================================================="
echo "Paste these into GitHub → Settings → Secrets and variables → Actions"
echo "=================================================================="
echo
echo "ANDROID_KEYSTORE_BASE64:"
base64 -i "$KEYSTORE" 2>/dev/null || base64 "$KEYSTORE"
echo
echo "ANDROID_KEY_ALIAS: $ALIAS"
echo "ANDROID_STORE_PASSWORD: (the password you just entered)"
echo "ANDROID_KEY_PASSWORD:   (the same password)"
echo
echo "Keep $KEYSTORE in a safe place (1Password, offline backup). If you"
echo "lose it, existing installations can never receive updates — you'd"
echo "have to uninstall + reinstall on every terminal in the field."
