import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { notifyNewStore } from "@/lib/notify-events.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/stores/new")({
  head: () => ({ meta: [{ title: "New store · Nectar.Pay" }] }),
  component: NewStorePage,
});

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

function NewStorePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          website: website.trim() || null,
          fiat_currency: currency,
          webhook_url: webhookUrl.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Store created");
      // Fire-and-forget admin notification
      notifyNewStore({ data: { storeId: data.id } }).catch((e) =>
        console.error("[stores.new] notify admin failed", e),
      );
      navigate({ to: "/stores/$storeId", params: { storeId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create store");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
      <Link
        to="/stores"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to stores
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">New store</h1>

      <form
        className="mt-8 space-y-5 rounded-xl border border-border bg-card/60 p-6"
        onSubmit={handleSubmit}
      >
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="My WooCommerce store"
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={200}
            placeholder="https://store.example.com"
          />
        </div>
        <div>
          <Label htmlFor="currency">Default fiat currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="webhook">Webhook URL (optional)</Label>
          <Input
            id="webhook"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            maxLength={500}
            placeholder="https://store.example.com/?wc-api=txc_pay"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Where we'll POST signed status updates. You can change this any time.
          </p>
        </div>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Creating…" : "Create store"}
        </Button>
      </form>
    </div>
  );
}
