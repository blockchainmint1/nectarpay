// APK launch screen. When the NectarPay POS app opens, we intercept the
// normal web landing pages and offer three intents so the merchant isn't
// forced back through onboarding on every cold start:
//
//   • Return to POS      — resume the paired terminal (only if creds exist)
//   • New terminal       — same merchant, fresh device (sign-in re-pair)
//   • New merchant       — full onboarding from scratch
//
// Renders nothing on the web — browsers keep the normal marketing pages.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Smartphone, Store, UserPlus } from "lucide-react";

import { isNative } from "@/lib/pos-native";
import { loadCreds, type TerminalCreds } from "@/lib/pos-client";

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

  useEffect(() => {
    if (!isNative()) {
      setState({ kind: "web" });
      onFallthrough?.();
      return;
    }
    setState({ kind: "native", creds: loadCreds() });
  }, [onFallthrough]);

  if (state.kind === "loading") {
    // Brief blank while we decide — prevents a flash of the web landing
    // page inside the APK before the chooser mounts.
    return (
      <div className="fixed inset-0 z-[100] bg-black" aria-hidden />
    );
  }

  if (state.kind === "web") return null;

  const { creds } = state;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
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

          <div className="mt-8 flex flex-col gap-3">
            {creds && (
              <Tile
                primary
                icon={<Store className="h-6 w-6" />}
                title="Return to POS"
                subtitle="Resume this paired terminal"
                onClick={() => navigate({ to: "/pos", replace: true })}
              />
            )}
            <Tile
              icon={<Smartphone className="h-6 w-6" />}
              title="New terminal"
              subtitle="Existing merchant · sign in to re-pair this device"
              onClick={() => navigate({ to: "/pos/pair-signin", replace: true })}
            />
            <Tile
              icon={<UserPlus className="h-6 w-6" />}
              title="New merchant"
              subtitle="Set up a brand-new store from scratch"
              onClick={() => navigate({ to: "/start", replace: true, search: { launch: "1" } as never })}
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
