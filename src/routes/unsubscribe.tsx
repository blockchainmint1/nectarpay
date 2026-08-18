import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailX, Check, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Unsubscribe — NectarPay Alerts" },
      {
        name: "description",
        content:
          "Stop receiving NectarPay email alerts about payments, deposits, and billing events.",
      },
      { property: "og:title", content: "Unsubscribe — NectarPay Alerts" },
      {
        property: "og:description",
        content: "Manage your NectarPay email alert preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnsubscribePage,
});

type State = "loading" | "valid" | "invalid" | "used" | "done" | "error";

function UnsubscribePage() {
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null;

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`);
        const json = (await res.json()) as {
          valid?: boolean;
          email?: string;
          used?: boolean;
        };
        if (json.used) setState("used");
        else if (json.valid) {
          setEmail(json.email ?? null);
          setState("valid");
        } else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  async function confirm() {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <MailX className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Email preferences</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {state === "loading" && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
            </p>
          )}

          {state === "valid" && (
            <>
              <p className="text-muted-foreground">
                Unsubscribe {email ? <strong>{email}</strong> : "this address"} from NectarPay
                emails? You can still get instant alerts via Telegram.
              </p>
              <Button className="w-full" onClick={confirm} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm unsubscribe
              </Button>
            </>
          )}

          {state === "used" && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-emerald-500" /> You're already unsubscribed.
            </p>
          )}

          {state === "done" && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-emerald-500" /> Done — you won't receive further
              NectarPay emails at this address.
            </p>
          )}

          {(state === "invalid" || state === "error") && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> This unsubscribe link is invalid
              or expired. Update your preferences in your dashboard under Notifications.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
