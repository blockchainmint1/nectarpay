# @nectarpay/capacitor-tangem

Capacitor plugin that wraps the official Tangem Android SDK so the NectarPOS
APK can scan a customer's Tangem card, get their Ethereum public key, and ask
the card to sign a 32-byte digest — all over NFC.

Pairs with the `startTangemPayment` / `submitTangemPayment` server functions
in the Nectar.Pay backend (see `src/lib/tangem-pay.functions.ts` in the web
project).

## Drop-in flow

```text
POS UI                     Plugin (Kotlin)           Backend
──────                     ───────────────           ───────
show "Tap card"
Tangem.scan()  ─────────► SessionEnvironment
                          + ScanTask
                          └► card public key
                          ◄──────── returns { publicKey, cardId }

                          startTangemPayment ─────► builds tx, returns {intentId, hash}
show "Signing…"
Tangem.signHash(hash) ──► SignHashCommand
                          └► r||s (64 bytes)

                          submitTangemPayment ────► ecrecover, broadcast
                          ◄──────── returns { txHash }
show ✓ + Etherscan link
```

## Files in this folder

- `src/definitions.ts` – TypeScript surface (`TangemPlugin` interface)
- `src/index.ts`       – web + Capacitor bridge glue
- `android/TangemPlugin.kt` – Android implementation
- `android/build.gradle`    – Gradle deps (Tangem SDK)

## Wiring into the POS APK

1. Copy this folder into your NectarPOS Capacitor project at `packages/capacitor-tangem/`.
2. In the app's `android/app/build.gradle`, add:
   ```gradle
   implementation project(':capacitor-tangem')
   implementation 'com.tangem:tangem-sdk-android:5.5.0'
   ```
3. In `android/settings.gradle`, add:
   ```gradle
   include ':capacitor-tangem'
   project(':capacitor-tangem').projectDir = new File('../packages/capacitor-tangem/android')
   ```
4. In `AndroidManifest.xml`, ensure NFC permissions are present:
   ```xml
   <uses-permission android:name="android.permission.NFC" />
   <uses-feature android:name="android.hardware.nfc" android:required="true" />
   ```
5. Register the plugin in `MainActivity.java`:
   ```java
   registerPlugin(money.honest.nectarpay.tangem.TangemPlugin.class);
   ```
6. In your web code (this repo) import the plugin:
   ```ts
   import { Tangem } from "@nectarpay/capacitor-tangem";
   const { publicKey, cardId } = await Tangem.scan();
   const { signature } = await Tangem.signHash({ cardId, publicKey, hash });
   ```

## API

### `Tangem.scan()`
Returns `{ cardId: string, publicKey: string, ethAddress: string, curve: "secp256k1" }`.
Presents the Tangem SDK's built-in NFC bottom sheet.

### `Tangem.signHash({ cardId, publicKey, hash })`
`hash` is a 0x-prefixed 32-byte hex string. Returns
`{ signature: string /* 64-byte r||s hex */ }`.

Errors surface as regular Capacitor plugin rejections with `.code`:
- `USER_CANCELLED` – customer pulled the card away
- `WRONG_CARD` – tapped card doesn't match the cardId from scan
- `NFC_DISABLED` – NFC is off in Android settings
