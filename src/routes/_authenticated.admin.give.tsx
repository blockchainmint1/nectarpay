import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, CreditCard, HeartHandshake, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { normalizeDomains } from "@/lib/card-partners";
import { setCardPartnerSecret } from "@/lib/card-partners.functions";

export const Route = createFileRoute("/_authenticated/admin/give")({
  component: AdminGive,
  head: () => ({
    meta: [
      { title: "Give · NectarPay Admin" },
      { name: "description", content: "Approved tap-card wallets and approved eGiving donation recipients." },
      { property: "og:title", content: "Give · NectarPay Admin" },
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
        <h1 className="text-xl font-semibold">Give</h1>
        <p className="text-sm text-muted-foreground">
          Who can pay with a tap card, and where the church and program shares are allowed to go.
        </p>
      </div>
      <WalletsSection />
      <RecipientsSection />
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

type Partner = { id: string; name: string; pay_url: string; card_domains: string[]; secret_fingerprint: string | null; uses_legacy_secret: boolean; is_default: boolean; active: boolean };

function WalletsSection() {
  const q = useQuery({
    queryKey: ["admin", "card-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("card_partners")
        .select("id, name, pay_url, card_domains, secret_fingerprint, uses_legacy_secret, is_default, active").order("created_at");
      if (error) throw error;
      return data as Partner[];
    },
  });
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [domains, setDomains] = useState("");

  async function add() {
    if (!name.trim() || !/^https:\/\/\S+$/.test(url.trim())) return toast.error("Enter a name and an https:// payment address.");
    const { data, error } = await supabase.from("card_partners")
      .insert({ name: name.trim(), pay_url: url.trim(), card_domains: normalizeDomains(domains), active: false }).select("id").single();
    if (error) return toast.error(error.message);
    setName(""); setUrl(""); setDomains(""); setAdding(false);
    toast.success("Wallet added. Set its key, then switch it on.");
    await q.refetch();
    if (data) setOpen(data.id);
  }

  return (
    <section className="space-y-4">
      <SectionHeader icon={<CreditCard className="h-5 w-5" />} title="Approved wallets"
        text="Wallets whose tap cards can pay at NectarPay terminals. A card's web address picks its wallet; unrecognised cards go to the default. Every payment is still checked on the blockchain."
        onAdd={() => setAdding((a) => !a)} adding={adding} />

      {adding && (
        <Card className="grid gap-3 p-4 md:grid-cols-[1fr_2fr_1.5fr_auto] md:items-center">
          <Input placeholder="Wallet name (e.g. HME Wallet)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Payment address (https://…/card/pay)" value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
          <Input placeholder="Card domains (e.g. hmewallet.com)" value={domains} onChange={(e) => setDomains(e.target.value)} />
          <Button onClick={add}>Add wallet</Button>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[1fr_1.4fr_auto_auto_2rem] gap-4 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span>Wallet</span><span>Card domains</span><span>Key</span><span>On</span><span />
        </div>
        {q.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> :
          (q.data ?? []).length === 0 ? <p className="p-4 text-sm text-muted-foreground">No wallets yet.</p> :
          (q.data ?? []).map((p) => (
            <WalletRow key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} onChange={() => void q.refetch()} />
          ))}
      </Card>
    </section>
  );
}

function WalletRow({ p, open, onToggle, onChange }: { p: Partner; open: boolean; onToggle: () => void; onChange: () => void }) {
  const [url, setUrl] = useState(p.pay_url);
  const [domains, setDomains] = useState(p.card_domains.join(", "));
  const [key, setKey] = useState("");
  const saveKey = useServerFn(setCardPartnerSecret);
  const hasKey = Boolean(p.secret_fingerprint) || p.uses_legacy_secret;

  async function update(patch: Partial<Pick<Partner, "pay_url" | "card_domains" | "active" | "is_default">>) {
    if (patch.is_default) {
      const { error } = await supabase.from("card_partners").update({ is_default: false }).eq("is_default", true);
      if (error) return toast.error(error.message);
    }
    const { error } = await supabase.from("card_partners").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Saved.");
    onChange();
  }

  async function storeKey() {
    try {
      const r = await saveKey({ data: { id: p.id, secret: key } });
      setKey("");
      toast.success(`Key saved — fingerprint ${r.fingerprint}, ${r.length} characters.`);
      onChange();
    } catch { toast.error("Key must be 24–256 characters."); }
  }

  return (
    <div className="border-b border-border/60 last:border-0">
      <div className="grid cursor-pointer grid-cols-[1fr_auto_2rem] items-center gap-4 px-4 py-3 hover:bg-muted/30 md:grid-cols-[1fr_1.4fr_auto_auto_2rem]" onClick={onToggle}>
        <div className="flex flex-wrap items-center gap-2 font-medium">
          {p.name}{p.is_default && <Pill tone="primary">Default</Pill>}
        </div>
        <div className="hidden truncate text-sm text-muted-foreground md:block">{p.card_domains.join(", ") || "—"}</div>
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
          <div className="grid gap-3 md:grid-cols-[2fr_1.5fr_auto] md:items-end">
            <label className="space-y-1 text-xs text-muted-foreground">Payment address
              <Input value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" /></label>
            <label className="space-y-1 text-xs text-muted-foreground">Card domains
              <Input value={domains} onChange={(e) => setDomains(e.target.value)} /></label>
            <Button variant="outline" onClick={() => {
              if (!/^https:\/\/\S+$/.test(url.trim())) return toast.error("Payment address must start with https://");
              void update({ pay_url: url.trim(), card_domains: normalizeDomains(domains) });
            }}>Save</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-1 text-xs text-muted-foreground">{hasKey ? "Replace shared key" : "Shared key (paste the same key the wallet uses)"}
              <Input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} className="font-mono" /></label>
            <Button disabled={key.trim().length < 24} onClick={storeKey}>Save key</Button>
          </div>
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
      const { data, error } = await supabase.from("egiving_recipients").select("*").order("kind").order("name");
      if (error) throw error;
      return data;
    },
  });
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [kind, setKind] = useState<"church" | "program">("church");

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
    const { error } = await supabase.from("egiving_recipients").update({ active }).eq("address", addr);
    if (error) return toast.error(error.message);
    void q.refetch();
  }

  return (
    <section className="space-y-4">
      <SectionHeader icon={<HeartHandshake className="h-5 w-5" />} title="Approved donation recipients"
        text="A payment only gets the community discount when the non-store shares go to a church listed here plus the eGiving program address."
        onAdd={() => setAdding((a) => !a)} adding={adding} />

      {adding && (
        <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto_auto] sm:items-center">
          <Input placeholder="Name (e.g. Christ Church of the Valley)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="TEXITcoin address" value={address} onChange={(e) => setAddress(e.target.value)} className="font-mono" />
          <div className="flex gap-1">
            {(["church", "program"] as const).map((k) => (
              <Button key={k} type="button" size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
                {k === "church" ? "Church" : "Program"}
              </Button>
            ))}
          </div>
          <Button onClick={add}>Add</Button>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[1fr_auto_1.4fr_auto_2rem] gap-4 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span>Name</span><span>Type</span><span>Address</span><span>On</span><span />
        </div>
        {q.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : (q.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No recipients yet. Add the program address and at least one church.</p>
        ) : (q.data ?? []).map((r) => {
          const isOpen = open === r.address;
          return (
            <div key={r.address} className="border-b border-border/60 last:border-0">
              <div className="grid cursor-pointer grid-cols-[1fr_auto_auto_2rem] items-center gap-4 px-4 py-3 hover:bg-muted/30 md:grid-cols-[1fr_auto_1.4fr_auto_2rem]"
                onClick={() => setOpen(isOpen ? null : r.address)}>
                <span className="font-medium">{r.name}</span>
                <Pill tone={r.kind === "church" ? "primary" : "muted"}>{r.kind === "church" ? "Church" : "Program"}</Pill>
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
