import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Gift, Wallet, ArrowRight, Share2, Download, FileText, QrCode } from "lucide-react";
import QRCode from "qrcode";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  ensureMyAffiliateCode,
  getMyAffiliateData,
  chooseAffiliateReward,
} from "@/lib/affiliate-program.functions";
import {
  FLYER_VARIANTS,
  generateAffiliateFlyer,
  downloadBlob,
  type FlyerVariant,
} from "@/lib/affiliate-flyer";

const LANDING_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: "/", label: "Homepage", hint: "General intro to NectarPay" },
  { value: "/onramp", label: "Merchant Start-up Kit ($727)", hint: "Best for reward-qualifying referrals" },
  { value: "/pricing", label: "Pricing", hint: "Plans and processing fees" },
  { value: "/affiliates", label: "Affiliate program", hint: "Recruit sub-affiliates" },
  { value: "custom", label: "Custom path…", hint: "Any page on nectar-pay.com" },
];

export const Route = createFileRoute("/_authenticated/affiliate")({
  head: () => ({ meta: [{ title: "Affiliate · Nectar.Pay" }] }),
  component: AffiliateDashboardPage,
});

function AffiliateDashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    ensureMyAffiliateCode()
      .then(() => qc.invalidateQueries({ queryKey: ["affiliate-data"] }))
      .catch(() => {});
  }, [user, qc]);

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-data", user?.id],
    queryFn: () => getMyAffiliateData(),
    enabled: !!user,
  });

  const [landing, setLanding] = useState<string>("/onramp");
  const [customPath, setCustomPath] = useState<string>("/");

  const effectivePath = useMemo(() => {
    const raw = landing === "custom" ? customPath : landing;
    if (!raw) return "/";
    return raw.startsWith("/") ? raw : `/${raw}`;
  }, [landing, customPath]);

  const trackingUrl = useMemo(() => {
    if (!data?.code) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://nectar-pay.com";
    const sep = effectivePath.includes("?") ? "&" : "?";
    return `${origin}${effectivePath}${sep}r=${data.code}`;
  }, [data?.code, effectivePath]);

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 md:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Affiliate</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your link. When a merchant you refer buys the $727 Merchant Start-up Kit, pick
            your reward — a year of free processing, or $50 to your wallet.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/affiliates">Program details</Link>
        </Button>
      </div>

      {/* Tracking URL */}
      <div className="mt-8 rounded-lg border border-border bg-card/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Your tracking link
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Send visitors to</label>
            <select
              value={landing}
              onChange={(e) => setLanding(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              {LANDING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {landing === "custom" && (
              <input
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="/some-page"
                className="w-40 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
              />
            )}
          </div>
        </div>
        {isLoading || !data?.code ? (
          <div className="mt-3 h-10 animate-pulse rounded-md bg-muted" />
        ) : (
          <TrackingUrlBox url={trackingUrl} code={data.code} />
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {LANDING_OPTIONS.find((o) => o.value === landing)?.hint}
        </p>
      </div>

      {/* QR + Flyer */}
      {data?.code && trackingUrl ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <QrPanel url={trackingUrl} code={data.code} />
          <FlyerPanel url={trackingUrl} code={data.code} />
        </div>
      ) : null}



      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Clicks" value={isLoading ? "…" : String(data?.clicks ?? 0)} />
        <Stat label="Signups" value={isLoading ? "…" : String(data?.signups ?? 0)} />
        <Stat label="Activations" value={isLoading ? "…" : String(data?.activations ?? 0)} />
        <Stat
          label="Rewards earned"
          value={isLoading ? "…" : String(data?.chosenCount ?? 0)}
        />
      </div>

      {/* Rewards */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Your rewards</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One row per referred merchant who purchased the Merchant Start-up Kit.
        </p>

        {isLoading ? (
          <div className="mt-4 rounded-lg border border-border bg-card/50 p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (data?.rewards ?? []).length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-card/30 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Gift className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-medium">No qualifying referrals yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Once a merchant you referred picks up the $727 Start-up Kit, you'll pick your reward
              here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card/50">
            {data!.rewards.map((r) => (
              <RewardRow key={r.id} reward={r} />
            ))}
          </ul>
        )}
      </div>

      {/* Referrals */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Recent signups</h2>
        {isLoading ? (
          <div className="mt-4 rounded-lg border border-border bg-card/50 p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (data?.referrals ?? []).length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-card/30 p-6 text-sm text-muted-foreground">
            No signups attributed to your link yet.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card/50">
            {data!.referrals.slice(0, 20).map((ref) => (
              <li
                key={ref.user_id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {ref.user_id.slice(0, 8)}…
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(ref.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TrackingUrlBox({ url, code }: { url: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm">
        {url}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const shareData = {
              title: "Nectar.Pay",
              text: "Accept crypto the honest way — check out Nectar.Pay:",
              url,
            };
            if (typeof navigator !== "undefined" && navigator.share) {
              try {
                await navigator.share(shareData);
              } catch {
                /* ignore */
              }
            }
          }}
        >
          <Share2 className="mr-1 h-4 w-4" /> Share
        </Button>
      </div>
      <div className="text-xs text-muted-foreground sm:ml-2">
        Code: <span className="font-mono">{code}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-2xl tabular-nums">{value}</div>
    </div>
  );
}

type RewardRowData = {
  id: string;
  referred_user_id: string;
  status: string;
  choice: string | null;
  chosen_at: string | null;
  granted_at: string | null;
  created_at: string;
};

function RewardRow({ reward }: { reward: RewardRowData }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (choice: "free_year" | "cash_50") =>
      chooseAffiliateReward({ data: { reward_id: reward.id, choice } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliate-data"] }),
  });

  return (
    <li className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">
            Referral{" "}
            <span className="font-mono text-xs text-muted-foreground">
              {reward.referred_user_id.slice(0, 8)}…
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Qualified {new Date(reward.created_at).toLocaleDateString()}
          </div>
        </div>
        {reward.choice ? (
          <div className="flex items-center gap-2 text-sm">
            {reward.choice === "free_year" ? (
              <>
                <Gift className="h-4 w-4 text-primary" /> Free year chosen
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 text-primary" /> $50 to wallet
              </>
            )}
            {reward.granted_at ? (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                Granted
              </span>
            ) : (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Pending
              </span>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={mut.isPending}
              onClick={() => mut.mutate("free_year")}
            >
              <Gift className="mr-1 h-4 w-4" /> 1 year free
            </Button>
            <Button
              size="sm"
              disabled={mut.isPending}
              onClick={() => mut.mutate("cash_50")}
            >
              <Wallet className="mr-1 h-4 w-4" /> $50 cash <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
