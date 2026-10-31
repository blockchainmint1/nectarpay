import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Coins, Loader2, Store, Tags } from "lucide-react";

import { MarketingFooter, MarketingNav } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryRegionFields } from "@/components/store/CountryRegionFields";
import { HONEYPOT_FIELD } from "@/lib/fast-enroll";
import { checkFastCoin, submitFastEnrollment, type CoinCheck } from "@/lib/fast-enroll.functions";

export const Route = createFileRoute("/fast")({
  head: () => ({
    meta: [
      { title: "Fast merchant enrollment — NectarPay" },
      { name: "description", content: "Sign a new merchant up in a few minutes with nothing but their Cold Storage Coin ID." },
      { property: "og:title", content: "Fast merchant enrollment — NectarPay" },
      { property: "og:description", content: "Bring a business into TEXITcoin payments with the coin ID printed on its sticker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/fast" }],
  }),
  component: FastPage,
});

const empty = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  category: "",
  street: "",
  city: "",
  region: "",
  postalCode: "",
  country: "United States",
};

function FastPage() {
  const [f, setF] = useState(empty);
  const [coinId, setCoinId] = useState("");
  const [coin, setCoin] = useState<CoinCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [give, setGive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyUrl, setCompanyUrl] = useState("");
  const [done, setDone] = useState<{ coin_id: string; tsd_address: string; name: string } | null>(null);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function check() {
    setChecking(true);
    try {
      setCoin(await checkFastCoin({ data: { coinId } }));
    } catch {
      setCoin({ ok: false, message: "Lookup failed. Try again." });
    }
    setChecking(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!coin?.ok || coin.taken) return toast.error("Check the coin ID first.");
    setSaving(true);
    try {
      const row = await submitFastEnrollment({ data: { ...f, coinId, egivingOptIn: give, companyUrl } });
      setDone({ ...row, name: f.businessName });
      setF(empty);
      setCoinId("");
      setCoin(null);
      setGive(true);
      setCompanyUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    }
    setSaving(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <MarketingNav />
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Thank you — {done.name} is in the queue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We'll check the details and set the store up. Nothing is live yet.
          </p>
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Sticker code</p>
          <p className="font-mono text-4xl font-bold tracking-widest">{done.coin_id}</p>
          <p className="mt-3 break-all font-mono text-xs text-muted-foreground">TSD payments land at {done.tsd_address}</p>
          <Button className="mt-8 h-12 w-full text-lg" onClick={() => setDone(null)}>
            Enroll another merchant
          </Button>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Fast merchant enrollment</h1>
        <p className="mt-2 text-muted-foreground">
          A new merchant needs nothing but their Cold Storage Coin ID. The same 6 characters become their TSD
          wallet and their sticker code.
        </p>

        <ol className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          {[
            { icon: <Coins className="h-4 w-4" />, t: "Check the coin", d: "We confirm it with Cold Storage Coins and show the wallet behind it." },
            { icon: <Store className="h-4 w-4" />, t: "Add the business", d: "Name, contact and address — that's all we need to get started." },
            { icon: <Tags className="h-4 w-4" />, t: "We review it", d: "The store goes live after a person looks it over. Nothing is live yet." },
          ].map((s) => (
            <li key={s.t} className="rounded-xl border border-border p-3">
              <span className="flex items-center gap-2 font-medium">{s.icon}{s.t}</span>
              <span className="mt-1 block text-muted-foreground">{s.d}</span>
            </li>
          ))}
        </ol>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <section className="rounded-xl border border-border p-4">
            <h2 className="flex items-center gap-2 font-medium">
              <Coins className="h-4 w-4" /> Cold Storage Coin
            </h2>
            <div className="mt-3 flex gap-2">
              <Input
                value={coinId}
                onChange={(e) => {
                  setCoinId(e.target.value.trim());
                  setCoin(null);
                }}
                placeholder="e.g. oaRhmG"
                maxLength={6}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="h-12 font-mono text-xl tracking-widest"
                aria-label="Coin ID"
              />
              <Button type="button" className="h-12" onClick={check} disabled={coinId.length !== 6 || checking}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Six characters, upper and lower case matter.</p>
            {coin && !coin.ok && <p className="mt-2 text-sm text-destructive">{coin.message}</p>}
            {coin?.ok && coin.taken && (
              <p className="mt-2 text-sm text-destructive">This coin is already assigned to another merchant.</p>
            )}
            {coin?.ok && !coin.taken && (
              <p className="mt-2 break-all text-sm text-primary">
                ✓ Found{coin.chain ? ` on ${coin.chain}` : ""}: <span className="font-mono">{coin.address}</span>
              </p>
            )}
          </section>

          <section className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <h2 className="font-medium sm:col-span-2">Business details</h2>
            <Field label="Business name *">
              <Input required value={f.businessName} onChange={set("businessName")} maxLength={120} />
            </Field>
            <Field label="Type of business">
              <Input value={f.category} onChange={set("category")} maxLength={80} placeholder="Coffee shop" />
            </Field>
            <Field label="Contact name *">
              <Input required value={f.contactName} onChange={set("contactName")} maxLength={120} />
            </Field>
            <Field label="Email *">
              <Input required type="email" value={f.email} onChange={set("email")} maxLength={255} />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={f.phone} onChange={set("phone")} maxLength={40} />
            </Field>
            <Field label="Street address">
              <Input value={f.street} onChange={set("street")} maxLength={200} />
            </Field>
            <Field label="City">
              <Input value={f.city} onChange={set("city")} maxLength={120} />
            </Field>
            <Field label="ZIP / postal code">
              <Input value={f.postalCode} onChange={set("postalCode")} maxLength={20} />
            </Field>
            <CountryRegionFields
              country={f.country}
              region={f.region}
              onCountry={(c) => setF((p) => ({ ...p, country: c, region: "" }))}
              onRegion={(r) => setF((p) => ({ ...p, region: r }))}
            />
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
            <Checkbox checked={give} onCheckedChange={(v) => setGive(v === true)} className="mt-1" />
            <span>
              <span className="font-medium">Join the Give Back program</span>
              <span className="block text-sm text-muted-foreground">
                Shoppers using a giving wallet get 10% off; that 10% goes to their church and the program.
              </span>
            </span>
          </label>

          {/* Bot trap: hidden from people, tempting to a script scraping field names. */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor={HONEYPOT_FIELD}>Company website URL</label>
            <input
              id={HONEYPOT_FIELD}
              name={HONEYPOT_FIELD}
              tabIndex={-1}
              autoComplete="off"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
            />
          </div>

          <Button type="submit" className="h-14 w-full text-lg" disabled={saving || !coin?.ok || coin.taken}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enroll merchant"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have a NectarPay account? Add the store from your dashboard instead — it goes live right away.
          </p>
        </form>
      </main>
      <MarketingFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
