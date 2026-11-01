import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, Smartphone, Mail } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing-shell";
import { fastTestPayment } from "@/lib/sticker.functions";
import { qrToDataURL } from "@/lib/qr";

const Search = z.object({ code: z.string().regex(/^[0-9A-Za-z]{6}$/), name: z.string().max(120).optional() });

export const Route = createFileRoute("/fast_/test")({
  validateSearch: (s) => Search.parse(s),
  head: () => ({
    meta: [
      { title: "Let's give it a test — NectarPay Fast Start" },
      { name: "description", content: "Scan your new merchant QR and take a small test payment in TSD." },
      { property: "og:title", content: "Let's give it a test — NectarPay Fast Start" },
      { property: "og:description", content: "Scan your new merchant QR and take a small test payment in TSD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FastTest,
});

function FastTest() {
  const { code, name } = Route.useSearch();
  const navigate = useNavigate();
  const check = useServerFn(fastTestPayment);
  const [qr, setQr] = useState("");
  const [since] = useState(() => new Date(Date.now() - 60_000).toISOString());
  const url = `https://app.nectar-pay.com/s/${code}`;

  useEffect(() => { qrToDataURL(url, { width: 560, margin: 1 }).then(setQr); }, [url]);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await check({ data: { code, since } });
        if (!stop && r.paid) navigate({ to: "/fast/success", search: { code, name, amount: r.amount } });
      } catch { /* keep watching */ }
    };
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [code, since, name, check, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-2 md:items-center">
        <div className="text-center">
          <div className="mx-auto w-fit rounded-2xl border bg-card p-4 shadow-sm">
            {qr ? <img src={qr} alt={`Payment QR for ${name ?? code}`} className="h-72 w-72" /> : <div className="h-72 w-72" />}
          </div>
          <p className="mt-4 font-mono text-4xl font-bold tracking-widest">{code}</p>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">You're live</p>
          <h1 className="mt-2 text-4xl font-semibold">Let's give it a test.</h1>
          <ol className="mt-6 space-y-4 text-lg">
            <li className="flex gap-3"><Smartphone className="mt-1 h-5 w-5 shrink-0 text-primary" /><span>Your rep, a friend, or your own wallet scans this code and sends <strong className="font-semibold">any amount</strong> in TSD.</span></li>
            <li className="flex gap-3"><Mail className="mt-1 h-5 w-5 shrink-0 text-primary" /><span>You get a payment alert by email (and Telegram, once connected from your welcome email).</span></li>
          </ol>
          <div className="mt-8 flex items-center gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Watching for the payment… this page moves on by itself.
          </div>
          <button className="mt-6 text-sm text-muted-foreground underline" onClick={() => navigate({ to: "/fast" })}>Skip the test — enroll another merchant</button>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
