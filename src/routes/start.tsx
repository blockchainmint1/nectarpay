import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { NectarMark } from "@/components/marketing-shell";
import { PosLaunchChooser } from "@/components/pos-launch-chooser";
import { Welcome, Business, WalletLink, TerminalDefaults, Done } from "@/components/onboarding/steps";



export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start accepting crypto · Nectar.Pay" },
      {
        name: "description",
        content:
          "Mobile-first onboarding. Sign in with your wallet, name your business, link a wallet, done. About 90 seconds.",
      },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
          { property: "og:url", content: "https://app.nectar-pay.com/start" },
],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/start" }],
  }),
  component: StartPage,
});

type Step = "welcome" | "business" | "wallet" | "terminal" | "done";
const STEPS: Step[] = ["welcome", "business", "wallet", "terminal", "done"];

function StartPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [storeId, setStoreId] = useState<string | null>(null);






  // Once signed in, find their first store (or stay ready to create one).
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStep("welcome");
      return;
    }
    void (async () => {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const s = stores?.[0];
      if (s?.id) {
        setStoreId(s.id);
        setStep((cur) => (cur === "welcome" ? (s.name ? "wallet" : "business") : cur));
      } else {
        setStep((cur) => (cur === "welcome" ? "business" : cur));
      }
    })();
  }, [loading, user]);

  const stepIdx = STEPS.indexOf(step);
  const progress = Math.round(((stepIdx + 1) / STEPS.length) * 100);

  return (
    <>
    <PosLaunchChooser />
    <div className="min-h-[100dvh] bg-background flex flex-col">

      <header className="flex items-center justify-between px-5 pt-5">
        {/* In the POS/APK shell the logo is the way back to the launch chooser. */}
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.removeItem("pos.launch.chosen"); } catch { /* ignore */ }
            window.location.href = "/start?launch=1";
          }}
          className="flex items-center gap-2"
        >
          <NectarMark className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-tight">Nectar-PAY</span>
        </button>
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Step {Math.max(1, stepIdx + 1)} / {STEPS.length}
        </span>
      </header>

      <div className="px-5 pt-3">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        {step === "welcome" && <Welcome signedIn={!!user} />}
        {step === "business" && user && (
          <Business
            userId={user.id}
            storeId={storeId}
            onCreated={(id) => {
              setStoreId(id);
              setStep("wallet");
            }}
          />
        )}
        {step === "wallet" && storeId && (
          <WalletLink storeId={storeId} onDone={() => setStep("terminal")} />
        )}
        {step === "terminal" && storeId && (
          <TerminalDefaults storeId={storeId} onDone={() => setStep("done")} />
        )}
        {step === "done" && storeId && (
          <Done
            storeId={storeId}
            onDashboard={() => navigate({ to: "/stores/$storeId", params: { storeId } })}
          />
        )}
      </main>
    </div>
    </>
  );
}


/* ---------------- Welcome ---------------- */

