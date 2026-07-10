import type { CapacitorConfig } from "@capacitor/cli";

/**
 * NectarPay POS — Merchant app (iOS + Android).
 *
 * This is a separate Capacitor project from the Senraise terminal build
 * (see capacitor.config.ts). It ships to the App Store and Play Store
 * for merchants who want the dashboard + virtual terminal (QR / share
 * link) in their pocket — no NFC, no printer, no Tangem hardware.
 *
 * Use with the merchant scripts:
 *   bun run sync:merchant       — syncs this config to ios/ and android/
 *   bun run ios:merchant        — opens Xcode
 *   bun run android:merchant    — opens Android Studio
 *
 * The shell injects window.__NECTAR_APP_MODE__ = "merchant" via
 * `src/main.tsx` so the web app hides terminal-only UI (see
 * `src/lib/app-mode.ts`).
 */
const config: CapacitorConfig = {
  appId: "money.honest.nectarpay",
  appName: "NectarPay POS",
  webDir: "dist",
  server: {
    // Live-loaded UI so store updates ship without a resubmit.
    url: "https://nectar-pay.com/m?mode=merchant",
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
