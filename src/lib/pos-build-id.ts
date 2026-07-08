/**
 * Web-content freshness for the POS Android WebView.
 *
 * Vite's `define` bakes __BUILD_ID__ into every bundle. When the server
 * later ships a new bundle, /pos-build-id returns a new value. The
 * watcher polls that endpoint and prompts the operator to reload when
 * the two disagree — bypassing the WebView's HTTP cache.
 */

declare const __BUILD_ID__: string;

export const LOCAL_BUILD_ID: string =
  typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";

export async function fetchServerBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/pos-build-id?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: string };
    return data.buildId ?? null;
  } catch {
    return null;
  }
}

/**
 * Nuke every cache the WebView might be holding on to and hard-reload.
 * Used by both the update-available toast and the manual FORCE REFRESH
 * button in Settings.
 */
export async function hardRefreshPos(): Promise<void> {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // ignore
  }
  // Cache-busting query param forces the WebView to re-fetch the HTML.
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString());
  window.location.replace(url.toString());
}
