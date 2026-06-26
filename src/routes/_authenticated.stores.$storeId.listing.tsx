import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, MapPin } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/stores/$storeId/listing")({
  head: () => ({ meta: [{ title: "Public listing · Nectar.Pay" }] }),
  component: ListingSettingsPage,
});

const CATEGORIES = [
  "Restaurant",
  "Bar",
  "Cafe",
  "Retail",
  "Grocery",
  "Services",
  "Health & Beauty",
  "Auto",
  "Lodging",
  "Online",
  "Other",
];

type ListingForm = {
  listing_visibility: "hidden" | "city_only" | "full";
  business_category: string;
  business_description: string;
  business_address: string;
  business_city: string;
  business_region: string;
  business_country: string;
  business_logo_url: string;
};

function ListingSettingsPage() {
  const { storeId } = Route.useParams();
  const qc = useQueryClient();

  const { data: store } = useQuery({
    queryKey: ["store-listing", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select(
          "id, name, listing_visibility, business_category, business_description, business_address, business_city, business_region, business_country, business_logo_url",
        )
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<ListingForm>({
    listing_visibility: "city_only",
    business_category: "",
    business_description: "",
    business_address: "",
    business_city: "",
    business_region: "",
    business_country: "",
    business_logo_url: "",
  });

  useEffect(() => {
    if (!store) return;
    setForm({
      listing_visibility:
        (store.listing_visibility as ListingForm["listing_visibility"]) ?? "city_only",
      business_category: store.business_category ?? "",
      business_description: store.business_description ?? "",
      business_address: store.business_address ?? "",
      business_city: store.business_city ?? "",
      business_region: store.business_region ?? "",
      business_country: store.business_country ?? "",
      business_logo_url: store.business_logo_url ?? "",
    });
  }, [store]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("stores")
        .update({
          listing_visibility: form.listing_visibility,
          business_category: form.business_category || null,
          business_description: form.business_description || null,
          business_address: form.business_address || null,
          business_city: form.business_city || null,
          business_region: form.business_region || null,
          business_country: form.business_country || null,
          business_logo_url: form.business_logo_url || null,
        })
        .eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing saved");
      qc.invalidateQueries({ queryKey: ["store-listing", storeId] });
      qc.invalidateQueries({ queryKey: ["merchant-map-pins"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>

      <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <MapPin className="h-5 w-5" /> Public listing
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Controls how your store appears on{" "}
        <Link to="/where" className="text-primary hover:underline">
          /where to spend crypto
        </Link>
        .
      </p>

      <section className="mt-8 rounded-xl border border-border bg-card/60 p-6">
        <Label className="text-sm font-medium">Visibility</Label>
        <RadioGroup
          className="mt-3 space-y-3"
          value={form.listing_visibility}
          onValueChange={(v) =>
            setForm((f) => ({
              ...f,
              listing_visibility: v as ListingForm["listing_visibility"],
            }))
          }
        >
          {[
            {
              v: "city_only",
              title: "City pin only (default)",
              desc: "Show an anonymous category pin at your approximate city. No name, address, or logo.",
            },
            {
              v: "full",
              title: "Full listing",
              desc: "Show your name, address, logo, description and website on the map.",
            },
            {
              v: "hidden",
              title: "Hidden",
              desc: "Don't list this store anywhere public.",
            },
          ].map((opt) => (
            <label
              key={opt.v}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-accent/40"
            >
              <RadioGroupItem value={opt.v} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">{opt.title}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </section>

      <section className="mt-6 space-y-5 rounded-xl border border-border bg-card/60 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="cat">Category</Label>
            <Select
              value={form.business_category}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, business_category: v }))
              }
            >
              <SelectTrigger id="cat">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              id="logo"
              type="url"
              value={form.business_logo_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, business_logo_url: e.target.value }))
              }
              placeholder="https://…/logo.png"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={form.business_description}
            onChange={(e) =>
              setForm((f) => ({ ...f, business_description: e.target.value }))
            }
            maxLength={280}
            placeholder="Texas BBQ, family-run since 2014."
            rows={2}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="addr">Street address</Label>
            <Input
              id="addr"
              value={form.business_address}
              onChange={(e) =>
                setForm((f) => ({ ...f, business_address: e.target.value }))
              }
              placeholder="123 Main St"
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={form.business_city}
              onChange={(e) =>
                setForm((f) => ({ ...f, business_city: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="region">State / region</Label>
            <Input
              id="region"
              value={form.business_region}
              onChange={(e) =>
                setForm((f) => ({ ...f, business_region: e.target.value }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={form.business_country}
              onChange={(e) =>
                setForm((f) => ({ ...f, business_country: e.target.value }))
              }
              placeholder="United States"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Until address-based geocoding is wired up, your pin position comes
          from your terminal's last-seen IP. Setting a city helps the map
          group you correctly.
        </p>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save listing"}
          </Button>
        </div>
      </section>
    </div>
  );
}
