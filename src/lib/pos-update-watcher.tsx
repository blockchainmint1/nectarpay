/**
 * Background auto-checker for POS APK updates.
 *
 * Mounted once on the /pos layout so every terminal screen benefits.
 * - Checks on mount
 * - Re-checks every 4 hours
 * - Re-checks when the app returns to the foreground (native) or the
 *   browser tab regains visibility
 * - Shows a persistent sonner toast with an "Update now" action when a
 *   newer version is available. Dismissing the toast for a given version
 *   suppresses it until an even newer version is published.
 *
 * No-ops on the web (isNative() === false).
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { checkForUpdate, downloadUpdate } from "@/lib/pos-updater";
import { isNative } from "@/lib/pos-native";
import { LOCAL_BUILD_ID, fetchServerBuildId, hardRefreshPos } from "@/lib/pos-build-id";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours (APK)
const WEB_CHECK_INTERVAL_MS = 3 * 60 * 1000;  // 3 minutes (web bundle)
const DISMISS_KEY = "pos-update-dismissed-version";
const WEB_DISMISS_KEY = "pos-web-refresh-dismissed-build";


export function PosUpdateWatcher() {
  const shownForVersion = useRef<string | null>(null);
  const shownForBuild = useRef<string | null>(null);

  // ---- Native APK freshness (existing) ----------------------------------
  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        const status = await checkForUpdate();
        if (cancelled) return;
        if (!status.updateAvailable || !status.latestVersion || !status.downloadUrl) return;

        const dismissed =
          typeof localStorage !== "undefined"
            ? localStorage.getItem(DISMISS_KEY)
            : null;
        if (dismissed === status.latestVersion) return;
        if (shownForVersion.current === status.latestVersion) return;

        shownForVersion.current = status.latestVersion;
        toast(`Update available: v${status.latestVersion}`, {
          description: "A newer terminal build is ready to install.",
          duration: Infinity,
          action: {
            label: "Update now",
            onClick: () => {
              void downloadUpdate(status.downloadUrl!);
            },
          },
          onDismiss: () => {
            try {
              localStorage.setItem(DISMISS_KEY, status.latestVersion!);
            } catch {
              // ignore
            }
          },
          id: `pos-update-${status.latestVersion}`,
        });
      } catch {
        // silent — Settings page surfaces errors explicitly
      }
    };

    void run();
    timer = setInterval(run, CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void run();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }

    let removeResume: (() => void) | null = null;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("resume", () => {
          void run();
        });
        removeResume = () => {
          void handle.remove();
        };
      } catch {
        // capacitor not available
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
      if (removeResume) removeResume();
    };
  }, []);

  // ---- Web bundle freshness (new) ---------------------------------------
  // Runs on native AND in the browser — the terminal WebView is the primary
  // beneficiary, but stale desktop tabs get the same nudge.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      const serverBuild = await fetchServerBuildId();
      if (cancelled || !serverBuild) return;
      if (serverBuild === LOCAL_BUILD_ID) return;

      const dismissed =
        typeof localStorage !== "undefined"
          ? localStorage.getItem(WEB_DISMISS_KEY)
          : null;
      if (dismissed === serverBuild) return;
      if (shownForBuild.current === serverBuild) return;

      shownForBuild.current = serverBuild;
      toast("New version available", {
        description: "The app has been updated. Reload to get the latest.",
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => {
            void hardRefreshPos();
          },
        },
        onDismiss: () => {
          try {
            localStorage.setItem(WEB_DISMISS_KEY, serverBuild);
          } catch {
            // ignore
          }
        },
        id: `pos-web-refresh-${serverBuild}`,
      });
    };

    void check();
    timer = setInterval(check, WEB_CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    let removeResume: (() => void) | null = null;
    if (isNative()) {
      (async () => {
        try {
          const { App } = await import("@capacitor/app");
          const handle = await App.addListener("resume", () => { void check(); });
          removeResume = () => { void handle.remove(); };
        } catch {
          // capacitor not available
        }
      })();
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (removeResume) removeResume();
    };
  }, []);

  return null;
}

