import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CountryRegionFields } from "@/components/store/CountryRegionFields";
import { checkFastCoin, submitFastEnrollment, listFastEnrollments, type CoinCheck } from "@/lib/fast-enroll.functions";

export const Route = createFileRoute("/_authenticated/fast")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Fast merchant enrollment — NectarPay" },
      { name: "description", content: "Sign up a new merchant with their Cold Storage Coin in a few minutes." },
      { property: "og:title", content: "Fast merchant enrollment — NectarPay" },
      { property: "og:description", content: "Sign up a new merchant with their Cold Storage Coin in a few minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FastPage,
});

const empty = { businessName: "", contactName: "", email: "", phone: "", category: "", street: "", city: "", region: "", postalCode: "", country: "United States" };

function FastPage() {
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [coinId, setCoinId] = useState("");
  const [coin, setCoin] = useState<CoinCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [give, setGive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ coin_id: string; tsd_address: string; name: string } | null>(null);
  const recent = useQuery({ queryKey: ["fast-enrollments"], queryFn: () => listFastEnrollments() });
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function check() {
    setChecking(true);
    try { setCoin(await checkFastCoin({ data: { coinId } })); } catch { setCoin({ ok: false, message: "Lookup failed. Try again." }); }
    setChecking(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!coin?.ok || coin.taken) return toast.error("Check the coin ID first.");
    setSaving(true);
    try {
      const row = await submitFastEnrollment({ data: { ...f, coinId, egivingOptIn: give } });
      setDone({ ...row, name: f.businessName });
      setF(empty); setCoinId(""); setCoin(null); setGive(true);
      qc.invalidateQueries({ queryKey: ["fast-enrollments"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    }
    setSaving(false);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl p-6 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">{done.name} is enrolled</h1>
        <p className="mt-2 text-muted-foreground">Sticker code</p>
        <p className="font-mono text-4xl font-bold tracking-widest">{done.coin_id}</p>
        <p className="mt-3 break-all font-mono text-xs text-muted-foreground">Pays to {done.tsd_address}</p>
        <Button className="mt-6 h-12 w-full text-lg" onClick={() => setDone(null)}>Enroll another merchant</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Fast merchant enrollment</h1>
      <p className="mt-1 text-sm text-muted-foreground">The coin's 6-character ID is their TSD wallet and their sticker code.</p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <section className="rounded-xl border border-border p-4">
          <h2 className="flex items-center gap-2 font-medium"><Coins className="h-4 w-4" /> Cold Storage Coin</h2>
          <div className="mt-3 flex gap-2">
            <Input value={coinId} onChange={(e) => { setCoinId(e.target.value.trim()); setCoin(null); }} placeholder="e.g. oaRhmG" maxLength={6}
              autoCapitalize="off" autoCorrect="off" spellCheck={false} className="h-12 font-mono text-xl tracking-widest" aria-label="Coin ID" />
            <Button type="button" className="h-12" onClick={check} disabled={coinId.length !== 6 || checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Upper and lower case matter.</p>
          {coin && !coin.ok && <p className="mt-2 text-sm text-destructive">{coin.message}</p>}
          {coin?.ok && coin.taken && <p className="mt-2 text-sm text-destructive">This coin is already assigned to another merchant.</p>}
          {coin?.ok && !coin.taken && (
            <p className="mt-2 break-all text-sm text-primary">✓ Found{coin.chain ? ` on ${coin.chain}` : ""}: <span className="font-mono">{coin.address}</span></p>
          )}
        </section>

        <section className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
          <h2 className="font-medium sm:col-span-2">Business details</h2>
          <Field label="Business name *"><Input required value={f.businessName} onChange={set("businessName")} maxLength={120} /></Field>
          <Field label="Type of business"><Input value={f.category} onChange={set("category")} maxLength={80} placeholder="Coffee shop" /></Field>
          <Field label="Contact name *"><Input required value={f.contactName} onChange={set("contactName")} maxLength={120} /></Field>
          <Field label="Email *"><Input required type="email" value={f.email} onChange={set("email")} maxLength={255} /></Field>
          <Field label="Phone"><Input type="tel" value={f.phone} onChange={set("phone")} maxLength={40} /></Field>
          <Field label="Street address"><Input value={f.street} onChange={set("street")} maxLength={200} /></Field>
          <Field label="City"><Input value={f.city} onChange={set("city")} maxLength={120} /></Field>
          <Field label="ZIP / postal code"><Input value={f.postalCode} onChange={set("postalCode")} maxLength={20} /></Field>
          <CountryRegionFields country={f.country} region={f.region}
            onCountry={(c) => setF((p) => ({ ...p, country: c, region: "" }))} onRegion={(r) => setF((p) => ({ ...p, region: r }))} />
        </section>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
          <Checkbox checked={give} onCheckedChange={(v) => setGive(v === true)} className="mt-1" />
          <span>
            <span className="font-medium">Join the Give Back program</span>
            <span className="block text-sm text-muted-foreground">Shoppers using a giving wallet get 10% off; that 10% goes to their church and the program.</span>
          </span>
        </label>

        <Button type="submit" className="h-14 w-full text-lg" disabled={saving || !coin?.ok || coin.taken}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enroll merchant"}
        </Button>
      </form>

      {!!recent.data?.length && (
        <section className="mt-10">
          <h2 className="font-medium">Recent enrollments</h2>
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border text-sm">
            {recent.data.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-3">
                <span><span className="font-medium">{r.business_name}</span>{r.city ? ` · ${r.city}` : ""}{r.egiving_opt_in ? " · Give" : ""}</span>
                <span className="font-mono">{r.coin_id}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
