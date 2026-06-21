import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ShieldCheck, Info, Save } from "lucide-react";
import { toast } from "sonner";

import { getStoreKycSettings, saveStoreKycSettings } from "@/lib/kyc.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/stores/$storeId/kyc")({
  head: () => ({ meta: [{ title: "KYC · payHME" }] }),
  component: KycSettingsPage,
});

type Level = "none" | "basic" | "advanced";
type Provider = "none" | "sumsub" | "persona" | "didit" | "veriff";
const BASIC_CHECK_OPTIONS = [
  { key: "sanctions", label: "Sanctions screen (Chainalysis, free)" },
  { key: "risk", label: "Wallet risk score (GoPlus, free)" },
  { key: "geo", label: "Geo block (sanctioned countries)" },
] as const;

function KycSettingsPage() {
  const { storeId } = Route.useParams();
  const load = useServerFn(getStoreKycSettings);
  const save = useServerFn(saveStoreKycSettings);

  const { data, isLoading } = useQuery({
    queryKey: ["store-kyc", storeId],
    queryFn: () => load({ data: { storeId } }),
  });

  const [level, setLevel] = useState<Level>("none");
  const [threshold, setThreshold] = useState<string>("");
  const [basicChecks, setBasicChecks] = useState<string[]>(["sanctions", "risk", "geo"]);
  const [requireEmail, setRequireEmail] = useState(false);
  const [provider, setProvider] = useState<Provider>("none");
  const [apiKey, setApiKey] = useState("");
  const [appToken, setAppToken] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [appTokenSaved, setAppTokenSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setLevel((data.kyc_level as Level) ?? "none");
    setThreshold(data.kyc_threshold_usd != null ? String(data.kyc_threshold_usd) : "");
    setBasicChecks(data.kyc_basic_checks ?? ["sanctions", "risk", "geo"]);
    setRequireEmail(!!data.kyc_basic_require_email);
    setProvider((data.kyc_advanced_provider as Provider) ?? "none");
    setApiKey("");
    setAppToken("");
    setApiKeySaved(!!data.kyc_advanced_api_key_set);
    setAppTokenSaved(!!data.kyc_advanced_app_token_set);
  }, [data]);

  async function onSave() {
    setSaving(true);
    try {
      await save({
        data: {
          storeId,
          kycLevel: level,
          kycThresholdUsd: threshold ? Number(threshold) : null,
          kycBasicChecks: basicChecks as ("sanctions" | "risk" | "geo")[],
          kycBasicRequireEmail: requireEmail,
          kycAdvancedProvider: provider,
          kycAdvancedApiKey: apiKey || null,
          kycAdvancedAppToken: appToken || null,
        },
      });
      toast.success("KYC settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <div className="px-8 py-10 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Buyer verification (KYC)</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        payHME is non-custodial — we never hold funds and never collect buyer documents. These
        checks are optional, run on the buyer's behalf, and never store personal data on our side.
        Pass/fail only.
      </p>

      {/* Level */}
      <section className="mt-8 rounded-lg border border-border bg-card/60 p-5">
        <Label className="text-base">Verification level</Label>
        <div className="mt-3 grid gap-3">
          {(["none", "basic", "advanced"] as Level[]).map((l) => (
            <label
              key={l}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background/40 p-3 hover:bg-accent"
            >
              <input
                type="radio"
                checked={level === l}
                onChange={() => setLevel(l)}
                className="mt-1"
              />
              <div>
                <div className="font-medium capitalize">
                  {l === "none" ? "None — pure non-custodial" : l === "basic" ? "Basic (free)" : "Advanced (BYO provider)"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {l === "none"
                    ? "Buyer pays, invoice settles. Maximum privacy. Recommended default."
                    : l === "basic"
                    ? "Free wallet sanctions screen + risk score + country block. No buyer data stored."
                    : "Hosted document/selfie verification at your chosen provider. You pay them directly."}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-5">
          <Label htmlFor="threshold" className="text-sm">
            Threshold (USD) — only require verification on invoices ≥ this amount
          </Label>
          <Input
            id="threshold"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="Leave blank to apply to all invoices"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="mt-2 max-w-xs"
          />
        </div>
      </section>

      {/* Basic */}
      {(level === "basic" || level === "advanced") && (
        <section className="mt-6 rounded-lg border border-border bg-card/60 p-5">
          <Label className="text-base">Basic checks (free, always available)</Label>
          <div className="mt-3 space-y-2">
            {BASIC_CHECK_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={basicChecks.includes(opt.key)}
                  onCheckedChange={(c) =>
                    setBasicChecks((prev) =>
                      c ? Array.from(new Set([...prev, opt.key])) : prev.filter((k) => k !== opt.key),
                    )
                  }
                />
                {opt.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={requireEmail} onCheckedChange={(c) => setRequireEmail(!!c)} />
              Require buyer email (magic-link style) before pay
            </label>
          </div>
        </section>
      )}

      {/* Advanced */}
      {level === "advanced" && (
        <section className="mt-6 rounded-lg border border-border bg-card/60 p-5">
          <Label className="text-base">Advanced provider (you bring the key)</Label>
          <p className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            payHME proxies the buyer to your provider's hosted flow. We store only pass/fail and a
            reference ID. You're billed by the provider directly.
          </p>
          <div className="mt-4 grid gap-4">
            <div>
              <Label className="text-sm">Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— select —</SelectItem>
                  <SelectItem value="didit">Didit (advertises free unlimited)</SelectItem>
                  <SelectItem value="sumsub">Sumsub (~$1.20/verification)</SelectItem>
                  <SelectItem value="persona">Persona (~$1.50/verification)</SelectItem>
                  <SelectItem value="veriff">Veriff (~$1.30/verification)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="appToken" className="text-sm">App / Template / Level ID</Label>
              <Input
                id="appToken"
                value={appToken}
                onChange={(e) => setAppToken(e.target.value)}
                placeholder="e.g. Sumsub levelName, Persona template-id, Didit app_id"
                className="mt-2 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="apiKey" className="text-sm">API key (stored encrypted at rest)</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your provider API key"
                className="mt-2 font-mono"
              />
            </div>
          </div>
        </section>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
