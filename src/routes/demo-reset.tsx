import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Search = { token?: string };

export const Route = createFileRoute("/demo-reset")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Delete demo account · Nectar.Pay" },
      {
        name: "description",
        content:
          "Permanently erase a Nectar.Pay demo account and everything in it — one click, no undo.",
      },
      { property: "og:title", content: "Delete demo account · Nectar.Pay" },
      {
        property: "og:description",
        content: "Permanently erase a Nectar.Pay demo account and everything in it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoResetPage,
});

function DemoResetPage() {
  const { token } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ stores: number; invoices: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function nuke() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/public/demo-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as
        | { ok: true; stores: number; invoices: number }
        | { ok: false; reason: string };
      if (json.ok) {
        setDone({ stores: json.stores, invoices: json.invoices });
      } else {
        setError(
          json.reason === "used"
            ? "This link has already been used — that demo account is gone."
            : json.reason === "invalid"
              ? "This link isn't valid."
              : "Something went wrong. Try again in a moment.",
        );
      }
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7">
        {done ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Demo account erased</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Removed {done.stores} business{done.stores === 1 ? "" : "es"} and {done.invoices}{" "}
              invoice{done.invoices === 1 ? "" : "s"}, along with the login, terminals and API keys.
              Nothing is left.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/start">Start a fresh demo</Link>
            </Button>
          </>
        ) : (
          <>
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Delete this demo account?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This permanently erases the login, the business, and every invoice, terminal and API
              key created during the demo. It cannot be undone.
            </p>
            {!token && (
              <p className="mt-4 text-sm text-destructive">
                This link is missing its code. Open the link from the demo email directly.
              </p>
            )}
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            <Button
              variant="destructive"
              disabled={!token || busy}
              onClick={nuke}
              className="mt-6 h-12 w-full text-base"
            >
              {busy ? "Erasing…" : "Yes, blow it up"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
