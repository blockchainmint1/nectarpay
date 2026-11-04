import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, CreditCard, HeartHandshake, Plus, Store } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { normalizeDomains } from "@/lib/card-partners";
import { setCardPartnerSecret } from "@/lib/card-partners.functions";
import { EGIVING_PROGRAM_ADDRESS } from "@/lib/egiving";

export const Route = createFileRoute("/_authenticated/admin/give")({
  component: AdminGive,
  head: () => ({
    meta: [
      { title: "Wallets & Give · NectarPay Admin" },
      { name: "description", content: "Approved tap-card wallets and approved eGiving donation recipients." },
      { property: "og:title", content: "Wallets & Give · NectarPay Admin" },
      { property: "og:description", content: "Manage approved wallets and donation recipients for eGiving." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminGive() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Wallets & Give</h1>
        <p className="text-sm text-muted-foreground">
          Who can pay with a tap card, and where the church and program shares are allowed to go.
        </p>
      </div>
      <Card className="space-y-1 border-primary/40 bg-primary/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Program wallet (fixed)</p>
        <p className="font-semibold">NectarGive · HME Give</p>
        <p className="break-all font-mono text-sm">{EGIVING_PROGRAM_ADDRESS}</p>
        <p className="text-sm text-muted-foreground">Receives the program share: 2% of each Give Back sale (20% of the donation). Built in — it can't be changed here.</p>
      </Card>
      <WalletsSection />
      <MerchantsSection />
    </div>
  );
}

function SectionHeader({ icon, title, text, onAdd, adding }: { icon: ReactNode; title: string; text: string; onAdd: () => void; adding: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3">
        <div className="mt-0.5 text-primary">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
      <Button size="sm" variant={adding ? "outline" : "default"} onClick={onAdd}>
        <Plus className="mr-1 h-4 w-4" />{adding ? "Close" : "Add"}
      </Button>
    </div>
  );
}

function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "good" | "primary" }) {
  const cls = tone === "good" ? "bg-primary/15 text-primary" : tone === "primary" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground";
  return <span className={`rounded px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

/* ---------------- Approved wallets ---------------- */

type Partner = { id: string; name: string; pay_url: string; card_domains: string[]; wallet_address: string | null; secret_fingerprint: string | null; uses_legacy_secret: boolean; is_default: boolean; active: boolean };

function WalletsSection() {
  const q = useQuery({
    queryKey: ["admin", "card-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("card_partners")
        .select("id, name, pay_url, card_domains, wallet_address, secret_fingerprint, uses_legacy_secret, is_default, active").order("created_at");
      if (error) throw error;
      return data as Partner[];
    },
  });
  const rq = useQuery({
    queryKey: ["admin", "egiving-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("egiving_recipients").select("*").eq("kind", "church");
      if (error) throw error;
      return data;
    },
  });
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [domains, setDomains] = useState("");
  const [wallet, setWallet] = useState("");

  async function add() {
    if (wallet.trim() && !/^[A-Za-z0-9]{25,90}$/.test(wallet.trim())) return toast.error("Enter a valid TEXITcoin wallet address.");
    if (!name.trim() || !/^https:\/\/\S+$/.test(url.trim())) return toast.error("Enter a name and an https:// payment address.");
    const { data, error } = await supabase.from("card_partners")
      .insert({ name: name.trim(), pay_url: url.trim(), card_domains: normalizeDomains(domains), wallet_address: wallet.trim() || null, active: false }).select("id").single();
    if (error) return toast.error(error.message);
    setName(""); setUrl(""); setDomains(""); setWallet(""); setAdding(false);
    toast.success("Wallet added. Set its key, then switch it on.");
    await q.refetch();
    if (data) setOpen(data.id);
  }

  return (
    <section className="space-y-4">
      <SectionHeader icon={<CreditCard className="h-5 w-5" />} title="Wallets & donation recipients"
        text="Every partner has its own TEXITcoin wallet, which signs its requests. Switch on Gets donations for churches and causes: a Give sale only gets the community discount when the donation goes to one of those wallets plus the NectarGive program wallet."
        onAdd={() => setAdding((a) => !a)} adding={adding} />

      {adding && (
        <Card className="grid gap-3 p-4 md:grid-cols-[1fr_1.5fr_1.5fr_1.2fr_auto] md:items-center">
          <Input placeholder="Wallet name (e.g. HME Wallet)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Payment address (https://…/card/pay)" value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
          <Input placeholder="Card domains (e.g. hmewallet.com)" value={domains} onChange={(e) => setDomains(e.target.value)} />
          <Input placeholder="TEXITcoin wallet (signer)" value={wallet} onChange={(e) => setWallet(e.target.value)} className="font-mono" />
          <Button onClick={add}>Add wallet</Button>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[1fr_1fr_1.2fr_auto_auto_auto_2rem] gap-4 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span>Partner</span><span>Card domains</span><span>Wallet</span><span>Donations</span><span>Key</span><span>On</span><span />
        </div>
        {q.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> :
          (q.data ?? []).length === 0 ? <p className="p-4 text-sm text-muted-foreground">No wallets yet.</p> :
          (q.data ?? []).map((p) => (
            <WalletRow key={p.id} p={p} recipient={(rq.data ?? []).find((r) => r.address === p.wallet_address) ?? null} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} onChange={() => { void q.refetch(); void rq.refetch(); }} />
          ))}
      </Card>
    </section>
  );
}

function WalletRow({ p, recipient, open, onToggle, onChange }: { p: Partner; recipient: Recipient | null; open: boolean; onToggle: () => void; onChange: () => void }) {
  const [url, setUrl] = useState(p.pay_url);
  const [domains, setDomains] = useState(p.card_domains.join(", "));
  const [wallet, setWallet] = useState(p.wallet_address ?? "");
  const [key, setKey] = useState("");
  const [shown, setShown] = useState("");
  const saveKey = useServerFn(setCardPartnerSecret);
  const hasKey = Boolean(p.secret_fingerprint) || p.uses_legacy_secret;

  async function update(patch: Partial<Pick<Partner, "pay_url" | "card_domains" | "wallet_address" | "active" | "is_default">>) {
    if (patch.is_default) {
      const { error } = await supabase.from("card_partners").update({ is_default: false }).eq("is_default", true);
      if (error) return toast.error(error.message);
    }
    const { error } = await supabase.from("card_partners").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Saved.");
    onChange();
  }

  async function setDonations(on: boolean) {
    if (on && !p.wallet_address) return toast.error("Save a TEXITcoin wallet for this partner first.");
    const addr = p.wallet_address!;
    const { data: existing } = await supabase.from("egiving_recipients").select("kind").eq("address", addr).maybeSingle();
    if (existing && existing.kind !== "church") {
      return toast.error("This wallet is the Give program wallet — it already receives the program share, so it can't also be a donation recipient.");
    }
    const { error } = existing
      ? await supabase.from("egiving_recipients").update({ active: on, blocked: false, name: p.name }).eq("address", addr)
      : await supabase.from("egiving_recipients").insert({ address: addr, kind: "church", name: p.name, active: true });
    if (error) return toast.error(error.message.includes("egiving_recipients_pkey")
      ? "This wallet is already on the Give list (it's a program wallet), so it can't also be a donation recipient."
      : error.message);
    toast.success(on ? `${p.name} now gets donations.` : `${p.name} no longer gets donations.`);
    onChange();
  }

  async function storeKey(secret = key) {
    try {
      const r = await saveKey({ data: { id: p.id, secret } });
      setKey("");
      toast.success(`Key saved — fingerprint ${r.fingerprint}.`);
      onChange();
      return true;
    } catch { toast.error("Key must be 24–256 characters."); return false; }
  }

  async function createKey() {
    if (hasKey && !confirm(`Replace ${p.name}'s key? Their wallet stops working until they paste the new one.`)) return;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    if (await storeKey(secret)) setShown(secret);
  }

  return (
    <div className="border-b border-border/60 last:border-0">
      <div className="grid cursor-pointer grid-cols-[1fr_auto_2rem] items-center gap-4 px-4 py-3 hover:bg-muted/30 md:grid-cols-[1fr_1fr_1.2fr_auto_auto_auto_2rem]" onClick={onToggle}>
        <div className="flex flex-wrap items-center gap-2 font-medium">
          {p.name}{p.is_default && <Pill tone="primary">Default</Pill>}
        </div>
        <div className="hidden truncate text-sm text-muted-foreground md:block">{p.card_domains.join(", ") || "—"}</div>
        <div className="hidden truncate font-mono text-xs text-muted-foreground md:block">{p.wallet_address ? `${p.wallet_address.slice(0, 8)}…${p.wallet_address.slice(-6)}` : "—"}</div>
        <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
          <Switch checked={Boolean(recipient?.active)} onCheckedChange={(v) => void setDonations(v)} aria-label={`${p.name} gets donations`} />
        </div>
        <div className="hidden md:block">{hasKey ? <Pill tone="good">Set</Pill> : <Pill>Missing</Pill>}</div>
        <div onClick={(e) => e.stopPropagation()}>
          <Switch checked={p.active} disabled={!hasKey && !p.active} onCheckedChange={(v) => update({ active: v })} aria-label={`${p.name} on`} />
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="space-y-4 border-t border-border/60 bg-muted/20 px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Key: {p.secret_fingerprint ? <>fingerprint <span className="font-mono">{p.secret_fingerprint}</span></> : p.uses_legacy_secret ? "using the original NFC payment key" : "not set"}
          </p>
          <div className="grid gap-3 md:grid-cols-[2fr_1.5fr_2fr_auto] md:items-end">
            <label className="space-y-1 text-xs text-muted-foreground">Payment address
              <Input value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" /></label>
            <label className="space-y-1 text-xs text-muted-foreground">Card domains
              <Input value={domains} onChange={(e) => setDomains(e.target.value)} /></label>
            <label className="space-y-1 text-xs text-muted-foreground">TEXITcoin wallet (signs requests)
              <Input value={wallet} onChange={(e) => setWallet(e.target.value)} className="font-mono" /></label>
            <Button variant="outline" onClick={() => {
              if (!/^https:\/\/\S+$/.test(url.trim())) return toast.error("Payment address must start with https://");
              if (wallet.trim() && !/^[A-Za-z0-9]{25,90}$/.test(wallet.trim())) return toast.error("Enter a valid TEXITcoin wallet address.");
              void update({ pay_url: url.trim(), card_domains: normalizeDomains(domains), wallet_address: wallet.trim() || null });
            }}>Save</Button>
          </div>
          {shown && (
            <div className="space-y-2 rounded-md border border-primary/50 bg-primary/10 p-3">
              <p className="text-sm font-medium text-foreground">New key for {p.name} — copy it now and send it to them. It won't be shown again.</p>
              <div className="flex gap-2">
                <Input readOnly value={shown} className="font-mono" onFocus={(e) => e.currentTarget.select()} />
                <Button onClick={() => { void navigator.clipboard.writeText(shown); toast.success("Key copied."); }}>Copy</Button>
                <Button variant="outline" onClick={() => setShown("")}>Done</Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={createKey}>{hasKey ? "Create new key (replaces old one)" : "Create key"}</Button>
            <span className="text-xs text-muted-foreground">Makes a strong key, saves it here, and shows it once for you to copy to them.</span>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-1 text-xs text-muted-foreground">{hasKey ? "Or paste a replacement key they gave you" : "Or paste a key the wallet already uses"}
              <Input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} className="font-mono" /></label>
            <Button variant="outline" disabled={key.trim().length < 24} onClick={() => storeKey()}>Save key</Button>
          </div>
          <div className="flex items-center gap-2 text-sm md:hidden">
            <Switch checked={Boolean(recipient?.active)} onCheckedChange={(v) => void setDonations(v)} aria-label={`${p.name} gets donations (mobile)`} /> Gets donations
          </div>
          {recipient && <div className="space-y-1"><p className="text-xs text-muted-foreground">Details members see on the public church list</p><CauseDetails r={recipient} onSaved={onChange} /></div>}
          {!p.is_default && <Button size="sm" variant="outline" onClick={() => update({ is_default: true })}>Make default</Button>}
        </div>
      )}
    </div>
  );
}

/* ---------------- Approved donation recipients ---------------- */

function RecipientsSection() {
  const q = useQuery({
    queryKey: ["admin", "egiving-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("egiving_recipients").select("*").eq("kind", "church").order("name");
      if (error) throw error;
      return data;
    },
  });
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const kind = "church" as const;

  async function add() {
    const a = address.trim();
    if (!name.trim() || !/^[A-Za-z0-9]{25,90}$/.test(a)) return toast.error("Enter a name and a valid TEXITcoin address.");
    const { error } = await supabase.from("egiving_recipients").insert({ address: a, kind, name: name.trim() });
    if (error) return toast.error(error.message);
    setName(""); setAddress(""); setAdding(false);
    toast.success("Recipient added.");
    void q.refetch();
  }

  async function toggle(addr: string, active: boolean) {
    // For HME Give churches, switching off is a local block that survives their next list update.
    const { error } = await supabase.from("egiving_recipients").update({ active, blocked: false }).eq("address", addr);
    if (error) return toast.error(error.message);
    void q.refetch();
  }

  return (
    <section className="space-y-4">
      <SectionHeader icon={<HeartHandshake className="h-5 w-5" />} title="Approved donation recipients"
        text="A payment only gets the community discount when the non-store shares go to a church listed here plus the NectarGive program wallet above."
        onAdd={() => setAdding((a) => !a)} adding={adding} />


      {adding && (
        <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-center">
          <Input placeholder="Name (e.g. Christ Church of the Valley)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="TEXITcoin address" value={address} onChange={(e) => setAddress(e.target.value)} className="font-mono" />
          <Button onClick={add}>Add</Button>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[1fr_auto_1.4fr_auto_2rem] gap-4 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span>Name</span><span>Type</span><span>Address</span><span>On</span><span />
        </div>
        {q.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : (q.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No recipients yet. Add at least one church.</p>
        ) : (q.data ?? []).map((r) => {
          const isOpen = open === r.address;
          return (
            <div key={r.address} className="border-b border-border/60 last:border-0">
              <div className="grid cursor-pointer grid-cols-[1fr_auto_auto_2rem] items-center gap-4 px-4 py-3 hover:bg-muted/30 md:grid-cols-[1fr_auto_1.4fr_auto_2rem]"
                onClick={() => setOpen(isOpen ? null : r.address)}>
                <span className="font-medium">{r.name}</span>
                <Pill tone={r.source === "hme_give" ? "good" : "primary"}>{r.source === "hme_give" ? "Old HME Give entry" : "Church"}</Pill>
                <span className="hidden truncate font-mono text-xs text-muted-foreground md:block">{r.address.slice(0, 8)}…{r.address.slice(-6)}</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch checked={r.active} onCheckedChange={(v) => toggle(r.address, v)} aria-label={`${r.name} on`} />
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
              {isOpen && (
                <div className="space-y-2 border-t border-border/60 bg-muted/20 px-4 py-4 text-sm">
                  <div className="text-xs text-muted-foreground">Full TEXITcoin address</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="break-all font-mono text-xs">{r.address}</code>
                    <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(r.address); toast.success("Copied."); }}>Copy</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.active ? "Payments to this address count toward the eGiving discount." : "Switched off — payments to this address won't qualify."}
                  </p>
                  {r.kind === "church" && <CauseDetails r={r} onSaved={() => void q.refetch()} />}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </section>
  );
}

type Recipient = CauseRow & { active: boolean; name: string };
type CauseRow = { address: string; code: string | null; city: string | null; blurb: string | null; featured: boolean };

function CauseDetails({ r, onSaved }: { r: CauseRow; onSaved: () => void }) {
  const [code, setCode] = useState(r.code ?? "");
  const [city, setCity] = useState(r.city ?? "");
  const [blurb, setBlurb] = useState(r.blurb ?? "");
  const [featured, setFeatured] = useState(r.featured);
  async function save() {
    const c = code.trim().toUpperCase();
    if (c && !/^[A-Z0-9]{2,12}$/.test(c)) return toast.error("Code must be 2–12 letters or numbers.");
    if (blurb.length > 500) return toast.error("Keep the description under 500 characters.");
    const { error } = await supabase.from("egiving_recipients")
      .update({ code: c || null, city: city.trim() || null, blurb: blurb.trim() || null, featured })
      .eq("address", r.address);
    if (error) return toast.error(error.message.includes("egiving_recipients_code_ci") ? "That code is already used by another church." : error.message);
    toast.success("Saved — wallets see it on the public list.");
    onSaved();
  }
  return (
    <div className="grid gap-2 pt-2 sm:grid-cols-[8rem_1fr]">
      <Input placeholder="Code (e.g. CCV)" value={code} onChange={(e) => setCode(e.target.value)} className="font-mono uppercase" />
      <Input placeholder="City (e.g. Peoria, AZ)" value={city} onChange={(e) => setCity(e.target.value)} />
      <Input placeholder="Short description members will see" value={blurb} onChange={(e) => setBlurb(e.target.value)} className="sm:col-span-2" />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch checked={featured} onCheckedChange={setFeatured} aria-label="Featured" /> Suggest to members
      </label>
      <div className="sm:text-right"><Button size="sm" onClick={save}>Save details</Button></div>
    </div>
  );
}

/* ---------------- Participating merchants ---------------- */

function MerchantsSection() {
  const [filter, setFilter] = useState("");
  const q = useQuery({
    queryKey: ["admin", "egiving-merchants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name, egiving_enabled").order("name");
      if (error) throw error;
      return data;
    },
  });
  async function toggle(id: string, v: boolean) {
    const { error } = await supabase.from("stores").update({ egiving_enabled: v }).eq("id", id);
    if (error) return toast.error(error.message);
    void q.refetch();
  }
  const rows = (q.data ?? []).filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => Number(b.egiving_enabled) - Number(a.egiving_enabled));
  const on = (q.data ?? []).filter((s) => s.egiving_enabled).length;
  return (
    <section className="space-y-4">
      <div className="flex gap-3">
        <div className="mt-0.5 text-primary"><Store className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-semibold">Participating merchants</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">Stores that accept Give payments at the community discount. {on} of {q.data?.length ?? 0} are in.</p>
        </div>
      </div>
      <Input placeholder="Find a store" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
      <Card className="max-h-[28rem] overflow-y-auto p-0">
        {q.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No stores found.</p> :
          rows.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3 last:border-0">
              <span className="font-medium">{s.name}</span>
              <Switch checked={s.egiving_enabled} onCheckedChange={(v) => toggle(s.id, v)} aria-label={`${s.name} in Give`} />
            </div>
          ))}
      </Card>
    </section>
  );
}
