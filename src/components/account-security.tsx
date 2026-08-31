// Sign-in & security controls for /account: change email (double-confirmed
// via branded email-change template) and TOTP two-factor authentication
// (enroll with QR, verify with a code, disable later).

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, Mail, ShieldCheck, ShieldOff, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TotpFactor = {
  id: string;
  friendly_name?: string;
  status: string;
};

export function AccountSecurity() {
  const { user } = useAuth();

  return (
    <section className="mt-8 space-y-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Profile & security
      </h2>
      <DisplayNameCard userId={user?.id ?? ""} />
      <ChangeEmailCard currentEmail={user?.email ?? ""} />
      <TwoFactorCard />
      <SessionsCard />
    </section>
  );
}

function DisplayNameCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();
      setName(data?.full_name ?? "");
    })();
  }, [userId]);

  async function save() {
    const trimmed = (name ?? "").trim();
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed || null })
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Display name saved");
      await qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save name");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Display name</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Shown on receipts, invoices, and admin views.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="display-name" className="sr-only">
            Display name
          </Label>
          <Input
            id="display-name"
            value={name ?? ""}
            disabled={name === null}
            placeholder="Your name"
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={save} disabled={busy || name === null}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function SessionsCard() {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function signOutEverywhere() {
    setBusy(true);
    try {
      // Global scope revokes every refresh token for this user — all
      // browsers, phones, and paired terminal browsers are signed out.
      await supabase.auth.signOut({ scope: "global" });
      toast.success("Signed out of all devices");
    } catch {
      // Even if the revoke call fails, still clear the local session.
      await signOut();
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="flex items-center gap-2">
        <LogOut className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Sessions</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        If you lose a device or spot a sign-in you don&apos;t recognize, revoke every active session
        at once. You&apos;ll need to sign back in everywhere, including this device.
      </p>
      <div className="mt-4">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void signOutEverywhere()}>
          {busy ? "Signing out…" : "Sign out of all devices"}
        </Button>
      </div>
    </div>
  );
}

function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (trimmed === currentEmail.toLowerCase()) {
      toast.error("That's already your email address");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: trimmed },
        { emailRedirectTo: `${window.location.origin}/account` },
      );
      if (error) throw error;
      toast.success(
        `Confirmation sent. Click the link in the email we sent to ${trimmed} to finish the change.`,
      );
      setEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Email address</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Currently <span className="text-foreground">{currentEmail}</span>. Changing it sends a
        confirmation link to the new address — nothing changes until you click it.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="new-email" className="sr-only">
            New email address
          </Label>
          <Input
            id="new-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="new@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button onClick={submit} disabled={busy || !email.trim()} variant="outline">
          {busy ? "Sending…" : "Change email"}
        </Button>
      </div>
    </div>
  );
}

function TwoFactorCard() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const verified = factors.find((f) => f.status === "verified");

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) setFactors(data.totp as TotpFactor[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function startEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (error) throw error;
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start 2FA setup");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnroll() {
    if (!enroll) return;
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    setBusy(true);
    try {
      const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({
        factorId: enroll.id,
      });
      if (chalErr) throw chalErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId: enroll.id,
        challengeId: chal.id,
        code: token,
      });
      if (error) throw error;
      toast.success("Two-factor authentication is on");
      setEnroll(null);
      setCode("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code — try again");
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnroll() {
    if (enroll) {
      // Unenroll the half-finished factor so it doesn't linger unverified.
      await supabase.auth.mfa.unenroll({ factorId: enroll.id }).catch(() => {});
    }
    setEnroll(null);
    setCode("");
    await refresh();
  }

  async function disable(factorId: string) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("Two-factor authentication is off");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disable 2FA");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="flex items-center gap-2">
        {verified ? (
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
        ) : (
          <ShieldOff className="h-4 w-4 text-muted-foreground" />
        )}
        <h3 className="font-medium">Two-factor authentication</h3>
        {verified && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
            On
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {verified
          ? "After signing in, you'll also enter a 6-digit code from your authenticator app."
          : "Add a second step at sign-in: a 6-digit code from an authenticator app (Google Authenticator, 1Password, etc.)."}
      </p>

      {loading ? (
        <p className="mt-4 text-xs text-muted-foreground">Loading…</p>
      ) : enroll ? (
        <div className="mt-4 space-y-4 rounded-lg border border-border bg-background/60 p-4">
          <p className="text-sm">
            Scan this with your authenticator app, then enter the 6-digit code it shows.
          </p>
          <div className="flex justify-center">
            {enroll.qr.trimStart().startsWith("<svg") ? (
              <div
                className="rounded-lg bg-white p-3"
                dangerouslySetInnerHTML={{ __html: enroll.qr }}
              />
            ) : (
              <img src={enroll.qr} alt="2FA QR code" className="rounded-lg bg-white p-3" />
            )}
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Can&apos;t scan? Enter the key manually</summary>
            <code className="mt-2 block select-all rounded bg-muted/40 p-2 font-mono break-all">
              {enroll.secret}
            </code>
          </details>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center font-mono tracking-[0.5em] sm:max-w-40"
            />
            <Button onClick={verifyEnroll} disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Enable 2FA"}
            </Button>
            <Button variant="ghost" onClick={cancelEnroll} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : verified ? (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void disable(verified.id)}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {busy ? "Working…" : "Disable 2FA"}
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <Button variant="outline" size="sm" disabled={busy} onClick={startEnroll}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            {busy ? "Working…" : "Enable 2FA"}
          </Button>
        </div>
      )}
    </div>
  );
}
