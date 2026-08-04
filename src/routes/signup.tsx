// Desktop-friendly merchant sign-up. Heavily linked from the marketing site
// (nectar-pay.com → app.nectar-pay.com/signup). Shares the same onboarding
// steps as /start, but in a two-column desktop layout and WITHOUT the POS
// launch chooser (which is what made /start unusable on the terminal).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { NectarMark, MarketingFooter } from "@/components/marketing-shell";
import { Welcome, Business, WalletLink, TerminalDefaults, Done } from "@/components/onboarding/steps";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your merchant account · Nectar.Pay" },
      {
        name: "description",
        content:
          "Sign up for Nectar.Pay in minutes: create your merchant account, name your business, link a non-custodial wallet and start accepting Bitcoin, TSD and stablecoins with zero percentage fees.",
      },
      { property: "og:title", content: "Create your merchant account · Nectar.Pay" },
      {
        property: "og:description",
        content:
          "Create your Nectar.Pay merchant account, link a non-custodial wallet and start accepting crypto with zero percentage fees.",
      },
      { property: "og:url", content: "https://app.nectar-pay.com/signup" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/signup" }],
  }),
  component: SignupPage,
});

type Step = "welcome" | "business" | "wallet" | "terminal" | "done";
const STEPS: Step[] = ["welcome", "business", "wallet", "terminal", "done"];
const LABELS: Record<Step, string> = {
  welcome: "Create account",
  business: "Your business",
  wallet: "Link wallet",
  terminal: "Terminal defaults",
  done: "You're live",
};

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [storeId, setStoreId] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <a href="https://nectar-pay.com" className="flex items-center gap-2">
            <NectarMark className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight">Nectar-PAY</span>
          </a>
          <a
            href="/auth"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Already have an account? Sign in
          </a>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-6 py-10 lg:grid-cols-[320px_1fr]">
        {/* Desktop stepper / value prop rail */}
        <aside className="hidden lg:block">
          <p className="text-[11px] uppercase tracking-[0.35em] text-primary">Merchant sign-up</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
            Accept crypto at your counter, online, or both.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Non-custodial. Zero percentage fees. Funds land in your own wallet — we never hold them.
          </p>

          <ol className="mt-8 space-y-3">
            {STEPS.map((s, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      done
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary"
                        : active
                          ? "flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : "flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground"
                    }
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={active ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {LABELS[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Mobile progress */}
        <div className="lg:hidden">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.round(((stepIdx + 1) / STEPS.length) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Step {stepIdx + 1} / {STEPS.length} · {LABELS[step]}
          </p>
        </div>

        <section className="mx-auto flex w-full max-w-lg flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
          {step === "welcome" && <Welcome signedIn={!!user} redirectTo="/signup" />}
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
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
