import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Restaurant", "Bar", "Cafe", "Retail", "Grocery", "Services", "Health & Beauty", "Auto", "Lodging", "Online", "Other"];
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Presence = "physical" | "online" | "both";
type Form = {
  name: string;
  listed: boolean;
  visibility: "city_only" | "full";
  business_address: string;
  business_city: string;
  business_region: string;
  business_country: string;
  business_phone: string;
  business_presence: Presence;
  business_category: string;
  business_description: string;
  business_logo_url: string;
};

const EMPTY: Form = {
  name: "", listed: false, visibility: "city_only", business_address: "", business_city: "",
  business_region: "", business_country: "", business_phone: "", business_presence: "physical",
  business_category: "", business_description: "", business_logo_url: "",
};

export function StoreInfoForm({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const { data: store } = useQuery({
    queryKey: ["store-info", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, listing_visibility, business_address, business_city, business_region, business_country, business_phone, business_presence, business_category, business_description, business_logo_url")
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!store) return;
    const vis = store.listing_visibility ?? "city_only";
    setForm({
      name: store.name ?? "",
      listed: vis !== "hidden",
      visibility: vis === "full" ? "full" : "city_only",
      business_address: store.business_address ?? "",
      business_city: store.business_city ?? "",
      business_region: store.business_region ?? "",
      business_country: store.business_country ?? "",
      business_phone: store.business_phone ?? "",
      business_presence: (store.business_presence as Presence) ?? "physical",
      business_category: store.business_category ?? "",
      business_description: store.business_description ?? "",
      business_logo_url: store.business_logo_url ?? "",
    });
  }, [store]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Store name is required");
      const { error } = await supabase
        .from("stores")
        .update({
          name: form.name.trim(),
          listing_visibility: form.listed ? form.visibility : "hidden",
          business_address: form.business_address || null,
          business_city: form.business_city || null,
          business_region: form.business_region || null,
          business_country: form.business_country || null,
          business_phone: form.business_phone || null,
          business_presence: form.business_presence,
          business_category: form.business_category || null,
          business_description: form.business_description || null,
          business_logo_url: form.business_logo_url || null,
        })
        .eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Store info saved");
      qc.invalidateQueries({ queryKey: ["store-info", storeId] });
      qc.invalidateQueries({ queryKey: ["store", storeId] });
      qc.invalidateQueries({ queryKey: ["stores"] });
      qc.invalidateQueries({ queryKey: ["merchant-map-pins"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  async function onLogo(file: File) {
    if (!LOGO_TYPES.includes(file.type)) return toast.error("Use a PNG, JPG or WebP image");
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2 MB");
    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${storeId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-logos").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      set("business_logo_url", `${window.location.origin}/api/public/store-logo/${path}`);
      toast.success("Logo uploaded — click Save to keep it");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-6">
      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        {/* Logo */}
        <div>
          <Label>Logo</Label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex aspect-square w-full max-w-[14rem] items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background/40 hover:bg-accent/40"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : form.business_logo_url ? (
              <img src={form.business_logo_url} alt="Store logo" className="h-full w-full object-contain p-3" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                <ImagePlus className="h-6 w-6" /> Upload logo
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onLogo(f);
              e.target.value = "";
            }}
          />
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {form.business_logo_url ? "Replace" : "Choose file"}
            </Button>
            {form.business_logo_url && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set("business_logo_url", "")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG or WebP, up to 2 MB.</p>
        </div>

        <div className="min-w-0 space-y-6">
          {/* Public listing */}
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium">Public listing</div>
                <p className="text-sm text-muted-foreground">Show this store on the public "where to spend crypto" map.</p>
              </div>
              <Switch checked={form.listed} onCheckedChange={(v) => set("listed", v)} aria-label="Public listing" />
            </div>
            {form.listed && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {([
                  { v: "city_only", t: "City pin only", d: "Anonymous pin near your city. No name or address." },
                  { v: "full", t: "Full listing", d: "Name, address, logo, phone and description." },
                ] as const).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set("visibility", o.v)}
                    className={cn(
                      "rounded-md border p-3 text-left transition-colors",
                      form.visibility === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40",
                    )}
                  >
                    <div className="text-sm font-medium">{o.t}</div>
                    <div className="text-xs text-muted-foreground">{o.d}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="si-name">Store name</Label>
              <Input id="si-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="si-phone">Phone</Label>
              <Input id="si-phone" type="tel" value={form.business_phone} onChange={(e) => set("business_phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label>Where do you sell?</Label>
              <Select value={form.business_presence} onValueChange={(v) => set("business_presence", v as Presence)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">In person (physical location)</SelectItem>
                  <SelectItem value="online">Online only</SelectItem>
                  <SelectItem value="both">Both in person and online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.business_category} onValueChange={(v) => set("business_category", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.business_presence !== "online" && (
              <div className="md:col-span-2">
                <Label htmlFor="si-addr">Street address</Label>
                <Input id="si-addr" value={form.business_address} onChange={(e) => set("business_address", e.target.value)} placeholder="123 Main St" />
              </div>
            )}
            <div>
              <Label htmlFor="si-city">City</Label>
              <Input id="si-city" value={form.business_city} onChange={(e) => set("business_city", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="si-region">State</Label>
                <Input id="si-region" value={form.business_region} onChange={(e) => set("business_region", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="si-country">Country</Label>
                <Input id="si-country" value={form.business_country} onChange={(e) => set("business_country", e.target.value)} placeholder="United States" />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="si-desc">Description</Label>
              <Textarea id="si-desc" rows={3} maxLength={280} value={form.business_description} onChange={(e) => set("business_description", e.target.value)} placeholder="Texas BBQ, family-run since 2014." />
              <div className="mt-1 text-right text-xs text-muted-foreground">{form.business_description.length}/280</div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/stores/$storeId/promote"
              params={{ storeId: storeSlug }}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Sparkles className="h-4 w-4" /> Specials, promotions & offers →
            </Link>
            <Button onClick={() => save.mutate()} disabled={save.isPending || uploading}>
              {save.isPending ? "Saving…" : "Save store info"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
