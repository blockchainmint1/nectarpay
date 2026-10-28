import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { normalizeDomains } from "@/lib/card-partners";
import { setCardPartnerSecret } from "@/lib/card-partners.functions";

export const Route = createFileRoute("/_authenticated/admin/card-partners")({
  component: AdminCardPartners,
  head: () => ({
    meta: [
      { title: "Giving partners · NectarPay Admin" },
      { name: "description", content: "Wallet partners whose cards can pay at NectarPay terminals." },
      { property: "og:title", content: "Giving partners · NectarPay Admin" },
      { property: "og:description", content: "Manage tap-card wallet partners, their keys and payment addresses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Partner = { id: string; name: string; pay_url: string; card_domains: string[]; secret_fingerprint: string | null; uses_legacy_secret: boolean; is_default: boolean; active: boolean };

function AdminCardPartners() {
  const q = useQuery({
    queryKey: ["admin", "card-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("card_partners")
        .select("id, name, pay_url, card_domains, secret_fingerprint, uses_legacy_secret, is_default, active").order("created_at");
      if (error) throw error;
      return data as Partner[];
    },
  });
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [domains, setDomains] = useState("");

  async function add() {
    if (!name.trim() || !/^https:\/\/\S+$/.test(url.trim())) return toast.error("Enter a name and an https:// payment address.");
    const { error } = await supabase.from("card_partners").insert({ name: name.trim(), pay_url: url.trim(), card_domains: normalizeDomains(domains), active: false });
    if (error) return toast.error(error.message);
    setName(""); setUrl(""); setDomains("");
    toast.success("Partner added. Set its key, then switch it on.");
    void q.refetch();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Giving partners</h1>
        <p className="text-sm text-muted-foreground">
          Wallets whose tap cards can pay at NectarPay terminals. When a card is tapped, its web address picks the
          partner below; cards with no recognised address go to the default partner. Every payment is still checked
          on the blockchain before a sale is marked paid.
        </p>
      </div>

      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_2fr_1.5fr_auto] md:items-center">
        <Input placeholder="Partner name (e.g. HME Wallet)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Payment address (https://…/card/pay)" value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
        <Input placeholder="Card domains (e.g. hmewallet.com)" value={domains} onChange={(e) => setDomains(e.target.value)} />
        <Button onClick={add}>Add partner</Button>
      </CardContent></Card>

      {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
        (q.data ?? []).map((p) => <PartnerCard key={p.id} p={p} onChange={() => void q.refetch()} />)}
    </div>
  );
}

function PartnerCard({ p, onChange }: { p: Partner; onChange: () => void }) {
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
    <Card><CardContent className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{p.name} {p.is_default && <span className="ml-2 rounded bg-secondary px-2 py-0.5 text-xs">Default</span>}</h2>
          <p className="text-xs text-muted-foreground">
            Key: {p.secret_fingerprint ? <>fingerprint <span className="font-mono">{p.secret_fingerprint}</span></> : p.uses_legacy_secret ? "using the original NFC payment key" : "not set"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!p.is_default && <Button size="sm" variant="outline" onClick={() => update({ is_default: true })}>Make default</Button>}
          <label className="flex items-center gap-2 text-sm">On
            <Switch checked={p.active} disabled={!hasKey && !p.active} onCheckedChange={(v) => update({ active: v })} />
          </label>
        </div>
      </div>
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
        <label className="space-y-1 text-xs text-muted-foreground">{hasKey ? "Replace shared key" : "Shared key (paste the same key the partner uses)"}
          <Input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} className="font-mono" /></label>
        <Button disabled={key.trim().length < 24} onClick={storeKey}>Save key</Button>
      </div>
    </CardContent></Card>
  );
}
