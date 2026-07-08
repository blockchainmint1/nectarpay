/**
 * "Check for updates" helper for the POS Android app.
 *
 * Compares the installed native app version (from @capacitor/app) against
 * the newest row in pos_releases (via getLatestPosRelease). When newer,
 * opens the signed /pos-apk download URL in Chrome so Android's package
 * installer takes over — the in-app WebView can't drive a .apk install.
 *
 * All calls no-op safely on the web so the same settings page renders
 * cleanly in a normal browser.
 */

import { getLatestPosRelease } from "@/lib/pos-releases.functions";
import { isNative } from "@/lib/pos-native";

export interface UpdateStatus {
  supported: boolean;              // false in a normal browser
  currentVersion: string | null;   // installed APK version, e.g. "0.4.2"
  latestVersion: string | null;    // newest published version
  updateAvailable: boolean;
  publishedAt: string | null;
  notes: string | null;
  downloadUrl: string | null;      // absolute URL to /pos-apk
  error: string | null;
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  const base: UpdateStatus = {
    supported: isNative(),
    currentVersion: null,
    latestVersion: null,
    updateAvailable: false,
    publishedAt: null,
    notes: null,
    downloadUrl: null,
    error: null,
  };

  try {
    let current: string | null = null;
    if (isNative()) {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      current = info.version;
    }

    const latest = await getLatestPosRelease();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://nectar-pay.com";
    const dl = latest.url ? new URL(latest.url, origin).toString() : null;

    return {
      ...base,
      currentVersion: current,
      latestVersion: latest.version,
      updateAvailable: !!(current && latest.version && isNewer(latest.version, current)),
      publishedAt: latest.publishedAt,
      notes: latest.notes,
      downloadUrl: dl,
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Download the APK and launch Android's installer.
 *
 * - Preferred (APK 0.1.6+): native NectarUpdater plugin downloads inside
 *   the app and hands off to the package installer via FileProvider.
 *   Two taps end-to-end: "Update" here → "Install" in Android's dialog.
 * - Fallback (older APKs without the plugin): open the URL in Chrome so
 *   Android's downloader picks it up. Users then tap the notification.
 * - Web preview: plain navigation.
 */
export async function downloadUpdate(url: string): Promise<void> {
  const { NectarUpdater } = await import("@/lib/pos-native");
  if (NectarUpdater.isAvailable()) {
    await NectarUpdater.downloadAndInstall(url);
    return;
  }
  if (isNative()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
    return;
  }
  if (typeof window !== "undefined") window.location.href = url;
}

/** Semver-ish comparison: "1.10.0" > "1.9.9". Falls back to string compare. */
function isNewer(a: string, b: string): boolean {
  const pa = a.replace(/^v/, "").split(".").map((n) => parseInt(n, 10));
  const pb = b.replace(/^v/, "").split(".").map((n) => parseInt(n, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return a > b;
    if (x !== y) return x > y;
  }
  return false;
}
