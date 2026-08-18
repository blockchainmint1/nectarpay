// /stores/$storeId/share-links — merchant-facing management of public
// "virtual terminal" links: persistent, re-shareable URLs that render a
// POS terminal look-alike running this store's payment flow.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, Copy, ExternalLink, Plus, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { qrToDataURL } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/stores/$storeId/share-links")({
  head: () => ({ meta: [{ title: "Share links · Nectar.Pay" }] }),
  component: ShareLinksPage,
});

type Row = {
  id: string;
  slug: string;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  preset_amounts: number[] | null;
  allow_custom_amount: boolean;
  min_amount: number;
  max_amount: number;
  is_donation: boolean;
  active: boolean;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function ShareLinksPage() {
  const { storeId } = Route.useParams();
  const qc = useQueryClient();

  const { data: store } = useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, fiat_currency")
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rows } = useQuery({
    queryKey: ["share-links", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_terminals")
        .select(
          "id, slug, title, subtitle, cta_label, preset_amounts, allow_custom_amount, min_amount, max_amount, is_donation, active",
        )
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [presets, setPresets] = useState("25, 50, 100, 250, 500, 1000");
  const [donation, setDonation] = useState(true);

  useEffect(() => {
    if (creating && !slug && store?.name) setSlug(slugify(store.name));
    if (creating && !title && store?.name) setTitle(store.name);
  }, [creating, slug, title, store?.name]);

  const create = useMutation({
    mutationFn: async () => {
      const clean = slugify(slug);
      if (clean.length < 3) throw new Error("Pick a longer link name.");
      const amounts = presets
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      const { error } = await supabase.from("public_terminals").insert({
        store_id: storeId,
        slug: clean,
        title: title || store?.name || null,
        subtitle: subtitle || null,
        cta_label: donation ? "Donate" : "Pay",
        preset_amounts: amounts,
        is_donation: donation,
      });
      if (error) throw new Error(error.message.includes("duplicate") ? "That link name is taken." : error.message);
    },
    onSuccess: () => {
      toast.success("Share link created");
      setCreating(false);
      setSlug("");
      setSubtitle("");
      qc.invalidateQueries({ queryKey: ["share-links", storeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (r: Row) => {
      const { error } = await supabase
        .from("public_terminals")
        .update({ active: !r.active })
        .eq("id", r.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["share-links", storeId] }),
  });

  const remove = useMutation({
    mutationFn: async (r: Row) => {
      const { error } = await supabase.from("public_terminals").delete().eq("id", r.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Link deleted");
      qc.invalidateQueries({ queryKey: ["share-links", storeId] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Share links (virtual terminal)</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        A permanent URL that opens a POS terminal in the browser — anyone can pay or donate to this
        store&apos;s wallets, no account needed. Drop it in email signatures, newsletters, or behind a
        &ldquo;We accept crypto&rdquo; graphic. Add <code>?amount=50</code> to pre-fill a charge.
      </p>

      <div className="mt-8 space-y-4">
        {(rows ?? []).map((r) => (
          <LinkCard
            key={r.id}
            row={r}
            currency={store?.fiat_currency ?? "USD"}
            onToggle={() => toggle.mutate(r)}
            onDelete={() => remove.mutate(r)}
          />
        ))}
        {rows?.length === 0 && !creating && (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No share links yet.
          </p>
        )}
      </div>

      {creating ? (
        <div className="mt-6 space-y-4 rounded-lg border border-border bg-card/60 p-5">
          <Field label="Link name (URL)">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">/t/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={() => setSlug(slugify(slug))}
                placeholder="ron-paul-institute"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </Field>
          <Field label="Headline">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ron Paul Institute for Peace & Prosperity"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Subtitle">
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="We accept crypto donations — thank you for your support."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Suggested amounts (comma separated)">
            <input
              value={presets}
              onChange={(e) => setPresets(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={donation} onChange={(e) => setDonation(e.target.checked)} />
            Donation mode (button says &ldquo;Donate&rdquo;)
          </label>
          <div className="flex gap-2">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create link"}
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button className="mt-6" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" /> New share link
        </Button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function LinkCard({
  row,
  currency,
  onToggle,
  onDelete,
}: {
  row: Row;
  currency: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const origin = typeof window === "undefined" ? "https://app.nectar-pay.com" : window.location.origin;
  const base = `${origin}/t/${row.slug}`;
  const url = amount ? `${base}?amount=${encodeURIComponent(amount)}` : base;

  useEffect(() => {
    qrToDataURL(url, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(null));
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.title ?? row.slug}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                row.active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
              }`}
            >
              {row.active ? "live" : "off"}
            </span>
          </div>
          <p className="mt-1 break-all text-sm text-muted-foreground">{url}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Copy
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
            </a>
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggle}>
            {row.active ? "Turn off" : "Turn on"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete link">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            Pre-filled amount ({currency}) — optional
          </div>
          <input
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="e.g. 50"
            className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        {qr && (
          <div className="flex items-center gap-2">
            <img src={qr} alt={`QR code for ${url}`} className="h-24 w-24 rounded-md bg-white p-1" />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <QrCode className="h-3 w-3" /> Scan to test
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
