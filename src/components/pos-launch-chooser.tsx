// APK launch screen. When the NectarPay POS app opens, we intercept the
// normal web landing pages and offer three intents so the merchant isn't
// forced back through onboarding on every cold start:
//
//   • Return to POS      — resume the paired terminal (only if creds exist)
//   • New terminal       — same merchant, fresh device (sign-in re-pair)
//   • New merchant       — full onboarding from scratch
//
// Renders nothing on the web — browsers keep the normal marketing pages.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Download, Loader2, RefreshCw, Smartphone, Store, UserPlus } from "lucide-react";

import { isNative } from "@/lib/pos-native";
import { loadCreds, type TerminalCreds } from "@/lib/pos-client";
import { getDeviceInfo, type PosDeviceInfo } from "@/lib/pos-device";
import { checkForUpdate, downloadUpdate, type UpdateStatus } from "@/lib/pos-updater";

type State =
  | { kind: "loading" }
  | { kind: "web" }
  | { kind: "native"; creds: TerminalCreds | null };

/**
 * Returns true and renders the APK launch chooser; returns false when we
 * should fall through to the normal page (web browsers, or before hydration).
 * Use as `if (PosLaunchChooser.shouldShow()) return <PosLaunchChooser />;`
 * — but since hooks can't be conditional, the component itself renders
 * `null` in the fall-through case and callers use `<PosLaunchChooser />`
 * as an early sibling that decides whether to take over the screen.
 */
export function PosLaunchChooser({ onFallthrough }: { onFallthrough?: () => void }) {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [device, setDevice] = useState<PosDeviceInfo | null>(null);
  const [update, setUpdate] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // `?launch=1` forces the chooser in a normal browser so it can be
    // previewed/tested without building the APK.
    const forced =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("launch") === "1";
    if (!isNative() && !forced) {
      setState({ kind: "web" });
      onFallthrough?.();
      return;
    }

    // Once the merchant picks a tile in this session, don't nag them again
    // when they navigate back to `/` or `/start`.
    if (sessionStorage.getItem("pos.launch.chosen") === "1") {
      setState({ kind: "web" });
      onFallthrough?.();
      return;
    }
    setState({ kind: "native", creds: loadCreds() });
    void getDeviceInfo().then(setDevice);
  }, [onFallthrough]);

  // Auto-check once when the chooser appears, so a stale terminal is flagged
  // before the merchant starts taking payments.
  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      setUpdate(await checkForUpdate());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (state.kind !== "native") return;
    void runCheck();
  }, [state.kind, runCheck]);

  if (state.kind === "loading") {
    // Brief blank while we decide — prevents a flash of the web landing
    // page inside the APK before the chooser mounts.
    return (
      <div className="fixed inset-0 z-[100] bg-black" aria-hidden />
    );
  }

  if (state.kind === "web") return null;

  const { creds } = state;

  // Dismiss the overlay and go where the merchant asked. Navigating to the
  // route we're already on (e.g. "New merchant" while sitting on /start) is a
  // no-op in the router, so we must also drop the overlay locally — otherwise
  // the button appears dead.
  const choose = (to: "/pos" | "/pos/pair-signin" | "/start") => {
    sessionStorage.setItem("pos.launch.chosen", "1");
    setState({ kind: "web" });
    onFallthrough?.();
    if (typeof window !== "undefined" && window.location.pathname === to) return;
    navigate({ to, replace: true });
  };

  const installedVersion = update?.currentVersion ?? device?.appVersion ?? null;
  const serial = device?.serial ?? device?.androidId ?? null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-black text-white">
      <div className="flex flex-1 flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-[10px] font-bold tracking-[0.3em] text-amber-300/80">
            NECTAR·PAY POS
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            What are we doing?
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Pick how you want to start this session.
          </p>

          {/* Version + update status, before anything else happens. */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-[0.2em] text-white/40">
                  APP VERSION
                </div>
                <div className="mt-1 font-mono text-sm font-bold">
                  {installedVersion ? `v${installedVersion}` : "unknown"}
                  {update?.latestVersion && (
                    <span className="ml-2 text-[11px] font-normal text-white/40">
                      latest v{update.latestVersion}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => void runCheck()}
                disabled={checking}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold tracking-widest text-white/80 active:scale-[0.98] disabled:opacity-50"
              >
                {checking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                CHECK
              </button>
            </div>

            {update?.updateAvailable && update.downloadUrl && (
              <button
                onClick={async () => {
                  setInstalling(true);
                  try {
                    await downloadUpdate(update.downloadUrl!);
                  } finally {
                    setInstalling(false);
                  }
                }}
                disabled={installing}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-xs font-bold tracking-widest text-black active:scale-[0.98] disabled:opacity-60"
              >
                {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                UPDATE TO v{update.latestVersion}
              </button>
            )}
            {update && !update.updateAvailable && !update.error && (
              <p className="mt-2 text-[11px] text-emerald-400/80">You&apos;re on the latest build.</p>
            )}
            {update?.error && (
              <p className="mt-2 text-[11px] text-red-400/80">Update check failed: {update.error}</p>
            )}

            {serial && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="text-[10px] font-bold tracking-[0.2em] text-white/40">
                  TERMINAL SERIAL
                </div>
                <div className="mt-1 font-mono text-xs text-white/80">{serial}</div>
                {device?.model && (
                  <div className="text-[10px] text-white/40">
                    {device.manufacturer} {device.model} · Android {device.androidVersion}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {creds && (
              <Tile
                primary
                icon={<Store className="h-6 w-6" />}
                title="Return to POS"
                subtitle="Resume this paired terminal"
                onClick={() => choose("/pos")}
              />
            )}
            <Tile
              icon={<UserPlus className="h-6 w-6" />}
              title="New merchant"
              subtitle="Set up a brand-new store from scratch"
              onClick={() => choose("/start")}
            />
            <Tile
              icon={<Smartphone className="h-6 w-6" />}
              title="New terminal"
              subtitle="Existing merchant · sign in to re-pair this device"
              onClick={() => choose("/pos/pair-signin")}
            />
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-4 text-center text-[10px] tracking-widest text-white/40">
        NECTAR·PAY · TERMINAL
      </div>
    </div>
  );
}

function Tile({
  icon,
  title,
  subtitle,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        primary
          ? "group flex items-center gap-4 rounded-2xl border border-amber-400 bg-amber-500 px-5 py-4 text-left text-black shadow-lg shadow-amber-500/20 active:scale-[0.98]"
          : "group flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-left text-white active:scale-[0.98]"
      }
    >
      <div
        className={
          primary
            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/15 text-black"
            : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"
        }
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold tracking-wide">{title}</div>
        <div className={primary ? "text-[11px] text-black/70" : "text-[11px] text-white/60"}>
          {subtitle}
        </div>
      </div>
      <ArrowRight className={primary ? "h-4 w-4 text-black/70" : "h-4 w-4 text-white/40"} />
    </button>
  );
}
