import { createFileRoute } from "@tanstack/react-router";
import { cloneElement, isValidElement, useId, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Coins, Loader2, Store, ShieldCheck, Zap, ScanLine, Search, Globe } from "lucide-react";

import { MarketingFooter, MarketingNav } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lookupFastWebsite } from "@/lib/fast-website.functions";
import { mergeWebsiteDetails } from "@/lib/fast-website";
import { CountryRegionFields } from "@/components/store/CountryRegionFields";
import { FastSignaturePad } from "@/components/fast-signature-pad";
import { FastCoinScanner } from "@/components/fast-coin-scanner";
import { FAST_ACKNOWLEDGEMENTS } from "@/lib/fast-consent";
import { HONEYPOT_FIELD } from "@/lib/fast-enroll";
import { checkFastCoin, submitFastEnrollment, type CoinCheck } from "@/lib/fast-enroll.functions";

export const Route = createFileRoute("/fast")({
  head: () => ({
    meta: [
      { title: "Fast Start Program — NectarPay" },
      { name: "description", content: "Sign a new merchant up in a few minutes with nothing but their Cold Storage Coin ID." },
      { property: "og:title", content: "Fast Start Program — NectarPay" },
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
  website: "",
  description: "",
  category: "",
  street: "",
  city: "",
  region: "",
  postalCode: "",
  country: "United States",
};

function FastPage() {
  const [f, setF] = useState(empty);
  const websiteLookup = useServerFn(lookupFastWebsite);
  const [lookingUp, setLookingUp] = useState(false);
  const [websiteMessage, setWebsiteMessage] = useState("");
  const currentWebsite = useRef(f.website);
  currentWebsite.current = f.website;
  const [coinId, setCoinId] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [coin, setCoin] = useState<CoinCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [give, setGive] = useState(true);
  const [directory, setDirectory] = useState(true);
  const [nonCustodial, setNonCustodial] = useState(false);
  const [basicSetup, setBasicSetup] = useState(false);
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [companyUrl, setCompanyUrl] = useState("");
  const [done, setDone] = useState<{ coin_id: string; tsd_address: string; name: string; live?: boolean; emailed?: boolean } | null>(null);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function fillFromWebsite() {
    const requested = f.website;
    setLookingUp(true); setWebsiteMessage("");
    try {
      const found = await websiteLookup({ data: { website: requested } });
      if (currentWebsite.current !== requested) return;
      if (!found.ok) { setWebsiteMessage(found.message); return; }
      setF((p) => mergeWebsiteDetails(p, found.details));
      setWebsiteMessage(Object.values(found.details).some(Boolean) ? "Website details found — please review them before signing." : "No contact details found. Please fill in the remaining fields.");
    } catch (err) { setWebsiteMessage(err instanceof Error ? err.message : "Couldn't read the website. Please enter the details."); }
    finally { setLookingUp(false); }
  }

  async function check(id = coinId, scannedKey?: string | null) {
    setChecking(true);
    try {
      const found = await checkFastCoin({ data: { coinId: id } });
      if (found.ok && scannedKey && found.address !== scannedKey) {
        setCoin({ ok: false, message: "The scanned public key doesn't match Cold Storage Coins. Please check the coin." });
        setPublicKey("");
      } else {
        setCoin(found);
        setPublicKey(found.ok ? found.address : "");
      }
    } catch {
      setCoin({ ok: false, message: "Lookup failed. Try again." });
    }
    setChecking(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!coin?.ok || coin.taken) return toast.error("Check the coin ID first.");
    if (!nonCustodial || !basicSetup || !signature) return toast.error("Please acknowledge both statements and sign.");
    setSaving(true);
    try {
      const row = await submitFastEnrollment({ data: { ...f, coinId, egivingOptIn: give, companyUrl, directoryOptIn: directory, nonCustodial: true, basicSetup: true, signature } });
      setDone({ ...row, name: f.businessName });
      setF(empty);
      setCoinId("");
      setPublicKey("");
      setCoin(null);
      setGive(true);
      setCompanyUrl("");
      setSignature(""); setNonCustodial(false); setBasicSetup(false); setDirectory(true);
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
          <h1 className="mt-4 text-2xl font-semibold">
            {done.live ? `${done.name} is live — you can take TSD now` : `Thank you — ${done.name} is in the queue`}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {done.live
              ? done.emailed
                ? "We just emailed your welcome kit: your payment page, Telegram alerts, and how to finish your account."
                : "Your sticker works now. Your welcome email didn't go out yet — our team will follow up."
              : "We'll finish setting the store up shortly."}
          </p>
          {done.live && (
            <a className="mt-4 inline-block text-primary underline" href={`/s/${encodeURIComponent(done.coin_id)}`}>Open my payment page</a>
          )}
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
      <main className="mx-auto max-w-6xl px-5 pb-10 pt-6 sm:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-1 text-xs font-medium uppercase tracking-widest text-primary">COIN. STICKERS. OPEN FOR BUSINESS.</p>
            <h1 className="text-3xl font-semibold">Fast Start Program</h1></div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Zap className="h-4 w-4 text-primary" /> TSD on TEXITcoin · Instant acceptance</div>
        </header>
        <form onSubmit={submit} className="grid gap-6 md:grid-cols-2 md:gap-8">
          <section className="space-y-2 border-b border-border pb-4 md:col-span-2">
            <Label htmlFor="fast-website" className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Business website</Label>
            <div className="flex gap-2">
              <Input id="fast-website" type="text" inputMode="url" autoComplete="url" spellCheck={false} value={f.website} onChange={(e) => { setF((p) => ({ ...p, website: e.target.value })); setWebsiteMessage(""); }} maxLength={200} placeholder="example.com" className="h-12 min-w-0 text-base" />
              <Button type="button" variant="outline" className="h-12 shrink-0" disabled={lookingUp || !f.website.trim()} onClick={() => void fillFromWebsite()}>{lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {lookingUp ? "Reading…" : "Look up"}</Button>
            </div>
            {websiteMessage && <p role="status" className="text-xs text-muted-foreground">{websiteMessage}</p>}
          </section>

          <div className="space-y-5">
            <section className="space-y-2 border-b border-border pb-4">
              <h2 className="flex items-center gap-2 text-sm font-medium"><Coins className="h-4 w-4" /> Cold Storage Coin</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="h-10 shrink-0" disabled={checking} onClick={() => setScannerOpen(true)}><ScanLine className="h-4 w-4" /> Scan QR</Button>
                <Input
                  value={coinId}
                  onChange={(e) => {
                    setCoinId(e.target.value.trim());
                    setCoin(null);
                    setPublicKey("");
                  }}
                  disabled={checking}
                  placeholder="e.g. oaRhmG"
                  maxLength={6}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-10 w-32 min-w-0 font-mono text-base"
                  aria-label="Coin asset ID"
                />
                <Button type="button" className="h-10" onClick={() => void check()} disabled={coinId.length !== 6 || checking}>
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                </Button>
              </div>
              <Label htmlFor="fast-public-key" className="sr-only">Full public key · TSD receive address</Label>
              <Input id="fast-public-key" value={publicKey} readOnly placeholder="Full public key · TSD receive address" className="h-10 w-full min-w-0 font-mono text-xs" />
              {coin && !coin.ok && <p className="text-sm text-destructive">{coin.message}</p>}
              {coin?.ok && coin.taken && <p className="text-sm text-destructive">This coin is already assigned to another merchant.</p>}
              {coin?.ok && !coin.taken && (
                <p className="break-all text-sm text-primary">
                  ✓ Found{coin.chain ? ` on ${coin.chain}` : ""}: <span className="font-mono">{coin.address}</span>
                </p>
              )}
            </section>
            <section className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <h2 className="flex items-center gap-2 font-medium sm:col-span-2"><Store className="h-4 w-4 text-primary" /> Business details · USA</h2>
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
            <Field label="ZIP code">
              <Input value={f.postalCode} onChange={set("postalCode")} maxLength={20} />
            </Field>
            <CountryRegionFields
              country="United States"
              showCountry={false}
              region={f.region}
              onCountry={(c) => setF((p) => ({ ...p, country: c, region: "" }))}
              onRegion={(r) => setF((p) => ({ ...p, region: r }))}
            />
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="fast-description">Business description</Label><Textarea id="fast-description" value={f.description} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} maxLength={1000} rows={2} /></div>
          </section>

          </div>
          <div className="space-y-4 md:border-l md:border-border md:pl-8">
          <section className="space-y-3 border-b border-border pb-4">
          <h2 className="font-medium">Your starter options</h2>
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={directory} onCheckedChange={(v) => setDirectory(v === true)} className="mt-1" />
            <span><span className="font-medium">List my business in the shop directory</span>
            <span className="mt-1 block text-sm text-muted-foreground">Publish my business name, category, location, phone and website. My contact name, email and signature stay private.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={give} onCheckedChange={(v) => setGive(v === true)} className="mt-1" />
            <span>
              <span className="font-medium">Join the Give Back program</span>
              <span className="block text-sm text-muted-foreground">
                Shoppers using a giving wallet get 10% off; that 10% goes to their church and the program.
              </span>
            </span>
          </label>

          </section>
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Acknowledge & sign</h2>
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={nonCustodial} onCheckedChange={(v) => setNonCustodial(v === true)} className="mt-1" />
              <span className="text-sm"><span className="mb-1 block font-semibold">NectarPay is non-custodial. *</span><span className="text-muted-foreground">{FAST_ACKNOWLEDGEMENTS.nonCustodial}</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={basicSetup} onCheckedChange={(v) => setBasicSetup(v === true)} className="mt-1" />
              <span className="text-sm"><span className="mb-1 block font-semibold">Basic setup & instant acceptance *</span><span className="text-muted-foreground">{FAST_ACKNOWLEDGEMENTS.basicSetup}</span></span>
            </label>
            <FastSignaturePad value={signature} onChange={setSignature} />
            <p className="text-xs text-muted-foreground">By signing, I confirm I am authorized to enroll this business and acknowledge the statements above.</p>
          </section>
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

          <Button type="submit" className="h-14 w-full text-lg" disabled={saving || lookingUp || !coin?.ok || coin.taken || !nonCustodial || !basicSetup || !signature}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Start accepting TSD"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have a NectarPay account? Add the store from your dashboard instead — it goes live right away.
          </p>
          </div>
        </form>
      </main>
      <MarketingFooter />
      <FastCoinScanner open={scannerOpen} onOpenChange={setScannerOpen} onResult={(scanned) => {
        setScannerOpen(false);
        setCoinId(scanned.coinId);
        setPublicKey(scanned.publicKey ?? "");
        setCoin(null);
        void check(scanned.coinId, scanned.publicKey);
      }} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {isValidElement<{ id?: string; className?: string }>(children) ? cloneElement(children, { id, className: "h-10 text-base" }) : children}
    </div>
  );
}
