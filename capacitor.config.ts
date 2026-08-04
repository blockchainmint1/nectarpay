import type { CapacitorConfig } from "@capacitor/cli";

import merchantConfig from "./capacitor.merchant.config";

/**
 * NectarPay POS — Capacitor config.
 *
 * `server.url` points at the deployed web app so the terminal always runs
 * the latest UI without needing an APK reinstall. Swap to a bundled build
 * by commenting `server.url` and running `bun run build && npx cap sync`.
 *
 * Set NECTAR_TEST_URL=1 before `npx cap sync` to build a diagnostic APK
 * that loads https://httpbin.org/get instead. If that build shows the
 * JSON response on the terminal, WebView networking is fine and the
 * problem is specific to nectar-pay.com (Cloudflare / TLS / UA gating).
 * If it also fails with ERR_CONNECTION_REFUSED, the WebView itself is
 * the culprit (outdated Android System WebView, captive portal, etc).
 */
const isTestBuild = process.env.NECTAR_TEST_URL === "1";

// Capacitor 8 removed the `--config` CLI flag, so the merchant app is
// selected with NECTAR_APP=merchant (see the `*:merchant` package scripts).
const isMerchant = process.env.NECTAR_APP === "merchant";

const terminalConfig: CapacitorConfig = {
  appId: "money.honest.nectarpos",
  appName: isTestBuild ? "NectarPay TEST" : "NectarPay POS",
  webDir: ".output/public",
  server: {
    // Live-loaded UI. The terminal needs internet on boot.
    url: isTestBuild ? "https://httpbin.org/get" : "https://app.nectar-pay.com/start",
    androidScheme: "https",
    cleartext: false,
    // Anything NOT in this list opens in the external browser. Older APKs
    // booted from nectar-pay.com / nectarpay.lovable.app, so a redirect to
    // app.nectar-pay.com was treated as "outbound" and kicked the merchant
    // out to Chrome mid-pairing. Keep every historical origin here.
    allowNavigation: [
      "app.nectar-pay.com",
      "nectar-pay.com",
      "www.nectar-pay.com",
      "nectarpay.honest.money",
      "nectarpay.lovable.app",
      "nectarpay-app.lovable.app",
      "*.lovable.app",
      "*.supabase.co",
      "accounts.google.com",
    ],
  },
  android: {
    allowMixedContent: false,
    // Terminals often ship without Google Play Services — avoid Play-only APIs.
    webContentsDebuggingEnabled: true,
  },
};

const config: CapacitorConfig = isMerchant ? merchantConfig : terminalConfig;

export default config;
