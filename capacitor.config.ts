import type { CapacitorConfig } from "@capacitor/cli";

/**
 * NectarPay POS — Capacitor config.
 *
 * `server.url` points at the deployed web app so the terminal always runs
 * the latest UI without needing an APK reinstall. Swap to a bundled build
 * by commenting `server.url` and running `bun run build && npx cap sync`.
 */
const config: CapacitorConfig = {
  appId: "money.honest.nectarpos",
  appName: "NectarPay POS",
  webDir: "dist",
  server: {
    // Live-loaded UI. The terminal needs internet on boot.
    url: "https://nectarpay.lovable.app/pos",
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    // Terminals often ship without Google Play Services — avoid Play-only APIs.
    webContentsDebuggingEnabled: true,
  },
};

export default config;
