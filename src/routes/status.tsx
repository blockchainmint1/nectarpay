import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "API Status · NectarPay" },
      { name: "description", content: "Live status of the NectarPay payment API and hosted checkout." },
      { property: "og:title", content: "NectarPay API Status" },
      { property: "og:description", content: "Live status of the NectarPay payment API and hosted checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatusPage,
});

type State = "checking" | "up" | "down";

async function check(url: string, ok: (r: Response) => boolean): Promise<[State, number]> {
  const t = performance.now();
  try {
    const r = await fetch(url, { cache: "no-store" });
    return [ok(r) ? "up" : "down", Math.round(performance.now() - t)];
  } catch {
    return ["down", 0];
  }
}

function StatusPage() {
  const [rows, setRows] = useState<{ name: string; state: State; ms: number }[]>([
    { name: "Payment API", state: "checking", ms: 0 },
    { name: "Developer docs", state: "checking", ms: 0 },
  ]);
  useEffect(() => {
    Promise.all([
      // A request with no key should be politely refused (401) when the API is healthy.
      check("/api/public/v1/me", (r) => r.status === 401),
      check("/openapi.json", (r) => r.ok),
    ]).then(([a, b]) =>
      setRows([
        { name: "Payment API", state: a[0], ms: a[1] },
        { name: "Developer docs", state: b[0], ms: b[1] },
      ]),
    );
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">System status</h1>
        <p className="mt-2 text-muted-foreground">
          Checked live from your browser. Payments settle on-chain straight to merchant wallets, so
          funds are never held up by an outage on our side.
        </p>
        <div className="mt-8 divide-y divide-border rounded-lg border border-border bg-card/40">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between p-4">
              <span>{r.name}</span>
              <span className={r.state === "up" ? "text-primary" : r.state === "down" ? "text-destructive" : "text-muted-foreground"}>
                {r.state === "checking" ? "Checking…" : r.state === "up" ? `Operational · ${r.ms} ms` : "Not responding"}
              </span>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
