// Detects which native shell the web app is running inside.
//
// Three build targets share this single web codebase:
//   • "terminal"  — the Senraise Android POS app (bundled with NFC, printer,
//     Tangem SDK bridge). Sideloaded only, never on the app stores.
//   • "merchant"  — the merchant iOS / Android app on the App Store and
//     Play Store. Dashboard + virtual POS (QR / share link). No hardware.
//   • "web"       — plain browser at nectar-pay.com.
//
// The native shell writes its identity into a build-time flag on window.
// We fall back to Capacitor platform detection when the flag is absent
// (older APKs), and finally to "web".

import { Capacitor } from "@capacitor/core";

export type AppMode = "terminal" | "merchant" | "web";

declare global {
  interface Window {
    __NECTAR_APP_MODE__?: AppMode;
  }
}

export function getAppMode(): AppMode {
  if (typeof window === "undefined") return "web";
  const flag = window.__NECTAR_APP_MODE__;
  if (flag === "terminal" || flag === "merchant") return flag;
  // Legacy Senraise APKs don't set the flag — they were the only native shell.
  if (Capacitor.isNativePlatform?.()) return "terminal";
  return "web";
}

export const isMerchantApp = () => getAppMode() === "merchant";
export const isTerminalApp = () => getAppMode() === "terminal";
export const isNativeApp = () => getAppMode() !== "web";
