// MFA gate for the authenticated area. When a merchant has TOTP 2FA enabled,
// their session signs in at aal1 and must be elevated to aal2 with an
// authenticator code before any dashboard content renders.

import { useEffect, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function MfaGate({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [state, setState] = useState<"checking" | "needs-code" | "ok">("checking");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error || !data) {
        setState("ok");
        return;
      }
      if (data.currentLevel === "aal1" && data.nextLevel === "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const f = factors?.totp?.find((x) => x.status === "verified");
        if (f) {
          setFactorId(f.id);
          setState("needs-code");
          return;
        }
      }
      setState("ok");
    })();
  }, []);

  async function verify() {
    if (!factorId) return;
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chalErr) throw chalErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: chal.id,
        code: token,
      });
      if (error) throw error;
      setState("ok");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code — try again");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (state === "needs-code") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card/60 p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Two-factor check</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app to finish signing in.
          </p>
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && void verify()}
            placeholder="123456"
            className="mt-6 h-14 w-full rounded-lg border border-input bg-background px-4 text-center font-mono text-2xl tracking-[0.5em]"
          />
          <Button
            size="lg"
            className="mt-3 h-12 w-full"
            disabled={busy || code.length !== 6}
            onClick={() => void verify()}
          >
            {busy ? "Verifying…" : "Verify"}
          </Button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-4 text-xs text-muted-foreground underline"
          >
            Sign out instead
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
