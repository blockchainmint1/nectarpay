import type { CapacitorConfig } from "@capacitor/cli";

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

const config: CapacitorConfig = {
  appId: "money.honest.nectarpos",
  appName: isTestBuild ? "NectarPay TEST" : "NectarPay POS",
  webDir: "dist",
  server: {
    // Live-loaded UI. The terminal needs internet on boot.
    url: isTestBuild ? "https://httpbin.org/get" : "https://nectar-pay.com/start",
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
