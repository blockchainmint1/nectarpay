import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";

export type BillingOverview = {
  subscription: {
    plan_id: string;
    status: string;
    free_tier_metric: "days" | "invoices" | "volume" | null;
    free_tier_started_at: string;
    current_period_end: string | null;
    grace_period_ends_at: string | null;
    last_charged_at: string | null;
  };
  plan: {
    id: string;
    name: string;
    monthly_price_usd: number;
    invoice_limit: number | null;
    volume_limit_usd: number | null;
    features: string[];
  };
  plans: Array<{
    id: string;
    name: string;
    monthly_price_usd: number;
    invoice_limit: number | null;
    volume_limit_usd: number | null;
    features: string[];
    sort_order: number;
  }>;
  usage: { invoice_count: number; volume_usd: number; period_start: string };
  balance_txc: number;
  txc_usd_rate: number;
  deposit_address: { address: string; memo: string | null };
  ledger: Array<{
    id: string;
    amount_txc: number;
    kind: string;
    usd_value: number | null;
    reference: string | null;
    created_at: string;
  }>;
  is_active: boolean;
  free_tier_progress: { used: number; limit: number; unit: string } | null;
};

async function getTxcRate(): Promise<number> {
  const { getUsdRate } = await import("./rates.functions");
  const r = await getUsdRate("TXC");
  return r > 0 ? r : 0.1; // fallback if rates haven't polled yet
}

function periodStart(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

async function ensureDepositAddress(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("txc_deposit_addresses")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing;

  // Derive a unique TXC address per user from the platform xpub at m/0/<seq>.
  const xpub = process.env.TXC_PLATFORM_XPUB;
  if (!xpub) throw new Error("TXC_PLATFORM_XPUB is not configured");
  const { deriveBtcLikeAddress } = await import("./chains/derive.server");
  const { TXC_NETWORK } = await import("./chains/networks");

  const { data: seqRow, error: seqErr } = await supabaseAdmin
    .rpc("nextval" as never, { _seq: "public.txc_deposit_address_index_seq" } as never)
    // Fallback: call via raw SQL since nextval isn't an exposed RPC by default.
    .single<{ nextval: number }>()
    .then((r) => r, () => ({ data: null, error: { message: "fallback" } as { message: string } }));

  let index: number;
  if (!seqErr && seqRow && typeof (seqRow as { nextval: number }).nextval === "number") {
    index = (seqRow as { nextval: number }).nextval;
  } else {
    // Raw SQL fallback
    const { data: maxRow } = await supabaseAdmin
      .from("txc_deposit_addresses")
      .select("address_index")
      .order("address_index", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    index = ((maxRow?.address_index as number | null) ?? -1) + 1;
  }

  const address = deriveBtcLikeAddress(xpub, TXC_NETWORK, index);
  const memo = userId.slice(0, 8);
  const { data, error } = await supabaseAdmin
    .from("txc_deposit_addresses")
    .insert({ user_id: userId, address, memo, address_index: index })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function ensureUsageRow(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ps = periodStart();
  await supabaseAdmin
    .from("usage_counters")
    .upsert(
      { user_id: userId, period_start: ps, invoice_count: 0, volume_usd: 0 },
      { onConflict: "user_id,period_start", ignoreDuplicates: true },
    );
}

export const getBillingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    await ensureUsageRow(userId);
    const depositAddress = await ensureDepositAddress(userId);
    const txcRate = await getTxcRate();

    const [{ data: sub }, { data: plans }, { data: usage }, { data: ledger }, { data: balanceRow }, { data: activeRow }] =
      await Promise.all([
        supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId).single(),
        supabaseAdmin.from("plans").select("*").eq("active", true).order("sort_order"),
        supabaseAdmin
          .from("usage_counters")
          .select("*")
          .eq("user_id", userId)
          .eq("period_start", periodStart())
          .maybeSingle(),
        supabaseAdmin
          .from("txc_credit_ledger")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabaseAdmin.rpc("txc_balance", { _user_id: userId }),
        supabaseAdmin.rpc("is_subscription_active", { _user_id: userId }),
      ]);

    if (!sub) throw new Error("Subscription not found");
    const plan = plans?.find((p) => p.id === sub.plan_id);
    if (!plan) throw new Error("Plan not found");

    let progress: BillingOverview["free_tier_progress"] = null;
    if (sub.plan_id === "free" && sub.free_tier_metric) {
      const freePlan = plans?.find((p) => p.id === "free");
      if (sub.free_tier_metric === "days") {
        const elapsed = Math.floor(
          (Date.now() - new Date(sub.free_tier_started_at).getTime()) / 86400000,
        );
        progress = { used: elapsed, limit: 30, unit: "days" };
      } else if (sub.free_tier_metric === "invoices") {
        progress = {
          used: usage?.invoice_count ?? 0,
          limit: freePlan?.invoice_limit ?? 50,
          unit: "invoices",
        };
      } else {
        progress = {
          used: Number(usage?.volume_usd ?? 0),
          limit: Number(freePlan?.volume_limit_usd ?? 2500),
          unit: "USD",
        };
      }
    }

    return {
      subscription: {
        plan_id: sub.plan_id,
        status: sub.status,
        free_tier_metric: sub.free_tier_metric as BillingOverview["subscription"]["free_tier_metric"],
        free_tier_started_at: sub.free_tier_started_at,
        current_period_end: sub.current_period_end,
        grace_period_ends_at: sub.grace_period_ends_at,
        last_charged_at: sub.last_charged_at,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        monthly_price_usd: Number(plan.monthly_price_usd),
        invoice_limit: plan.invoice_limit,
        volume_limit_usd: plan.volume_limit_usd === null ? null : Number(plan.volume_limit_usd),
        features: (plan.features as string[]) ?? [],
      },
      plans: (plans ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        monthly_price_usd: Number(p.monthly_price_usd),
        invoice_limit: p.invoice_limit,
        volume_limit_usd: p.volume_limit_usd === null ? null : Number(p.volume_limit_usd),
        features: (p.features as string[]) ?? [],
        sort_order: p.sort_order,
      })),
      usage: {
        invoice_count: usage?.invoice_count ?? 0,
        volume_usd: Number(usage?.volume_usd ?? 0),
        period_start: usage?.period_start ?? periodStart(),
      },
      balance_txc: Number(balanceRow ?? 0),
      txc_usd_rate: txcRate,
      deposit_address: { address: depositAddress.address, memo: depositAddress.memo },
      ledger: (ledger ?? []).map((l) => ({
        id: l.id,
        amount_txc: Number(l.amount_txc),
        kind: l.kind,
        usd_value: l.usd_value === null ? null : Number(l.usd_value),
        reference: l.reference,
        created_at: l.created_at,
      })),
      is_active: Boolean(activeRow),
      free_tier_progress: progress,
    };
  });

export const setFreeTierMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { metric: "days" | "invoices" | "volume" }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        free_tier_metric: data.metric,
        free_tier_started_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId)
      .eq("plan_id", "free");
    if (error) throw error;
    return { ok: true };
  });

export const changePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", data.plan_id)
      .eq("active", true)
      .single();
    if (planErr || !plan) throw new Error("Invalid plan");

    const priceUsd = Number(plan.monthly_price_usd);

    if (priceUsd === 0) {
      // Downgrade to free
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_id: "free",
          status: "trialing",
          current_period_start: null,
          current_period_end: null,
          grace_period_ends_at: null,
          canceled_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (error) throw error;
      return { ok: true, charged_txc: 0 };
    }

    // Paid plan: charge from TXC balance
    const txcRate = await getTxcRate();
    const { data: balanceRow } = await supabaseAdmin.rpc("txc_balance", { _user_id: userId });
    const balance = Number(balanceRow ?? 0);
    const txcOwed = Number((priceUsd / txcRate).toFixed(8));

    if (balance < txcOwed) {
      throw new Error(
        `Insufficient TXC balance. Need ${txcOwed} TXC ($${priceUsd}), have ${balance.toFixed(2)} TXC. Please top up your deposit address.`,
      );
    }

    // Debit balance
    const periodStartIso = new Date().toISOString();
    const periodEnd = new Date();
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

    const { error: ledgerErr } = await supabaseAdmin.from("txc_credit_ledger").insert({
      user_id: userId,
      amount_txc: -txcOwed,
      kind: "subscription_debit",
      txc_usd_rate: txcRate,
      usd_value: priceUsd,
      reference: `${data.plan_id}:${periodStartIso}`,
      notes: `Monthly fee for ${plan.name} plan`,
    });
    if (ledgerErr) throw ledgerErr;

    const { error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .update({
        plan_id: data.plan_id,
        status: "active",
        current_period_start: periodStartIso,
        current_period_end: periodEnd.toISOString(),
        grace_period_ends_at: null,
        last_charged_at: periodStartIso,
        canceled_at: null,
      })
      .eq("user_id", userId);
    if (subErr) throw subErr;

    return { ok: true, charged_txc: txcOwed };
  });

// DEV ONLY: simulate a TXC deposit hitting the user's address.
// TODO: remove once the TXC watcher writes to txc_credit_ledger automatically.
export const simulateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount_txc: number }) => d)
  .handler(async ({ data, context }) => {
    if (data.amount_txc <= 0 || data.amount_txc > 1_000_000) {
      throw new Error("Invalid amount");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const txcRate = await getTxcRate();
    const { error } = await supabaseAdmin.from("txc_credit_ledger").insert({
      user_id: context.userId,
      amount_txc: data.amount_txc,
      kind: "deposit",
      txc_usd_rate: txcRate,
      usd_value: Number((data.amount_txc * txcRate).toFixed(2)),
      reference: `sim:${Date.now()}`,
      notes: "Simulated deposit (dev)",
    });
    if (error) throw error;
    return { ok: true };
  });
