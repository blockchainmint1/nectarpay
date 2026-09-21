// Hourly billing rollover: handle past_due subscriptions, expire grace periods,
// auto-renew paid plans from TXC balance, send grace-period warnings.

import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/lib/cron-auth.server";
import { notifyUser } from "@/lib/notify.server";
import { getUsdRate } from "@/lib/rates.functions";
import { scanTxcDeposits } from "@/lib/txc-deposit-scanner.server";

function displayDate(value: Date): string {
  return value.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function displayPlanName(value: string): string {
  return value.trim().toLowerCase() === "cheap" ? "Merchant" : value.trim();
}

async function rolloverBilling(): Promise<{
  renewed: number;
  blocked: number;
  warned: number;
  txc_scanned: number;
  txc_credited: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let renewed = 0,
    blocked = 0,
    warned = 0;

  const txcRate = (await getUsdRate("TXC")) || 0.1;
  const now = new Date();

  // 1) Expire grace periods → block
  const { data: graceExpired } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, plan_id")
    .lte("grace_period_ends_at", now.toISOString())
    .in("status", ["past_due", "canceled"]);
  for (const s of graceExpired ?? []) {
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "blocked", grace_period_ends_at: null })
      .eq("user_id", s.user_id);
    await notifyUser(s.user_id, {
      event: "grace_warning",
      subject: "Let’s get your NectarPay account running again",
      text: "Your subscription grace period has ended. Top up your TXC balance to restore API access.",
      metadata: {
        status: "blocked",
        planName: displayPlanName(s.plan_id),
      },
    });
    blocked++;
  }

  // 2) Renew subscriptions whose period has ended
  const { data: dueRenewal } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, plan_id, plans!subscriptions_plan_id_fkey!inner(monthly_price_usd, name)")
    .lte("current_period_end", now.toISOString())
    .eq("status", "active")
    .neq("plan_id", "free");

  for (const sub of dueRenewal ?? []) {
    const priceUsd = Number((sub.plans as { monthly_price_usd: number }).monthly_price_usd);
    const planName = (sub.plans as { name: string }).name;
    const friendlyPlanName = displayPlanName(planName);
    const txcOwed = Number((priceUsd / txcRate).toFixed(8));

    const { data: balRow } = await supabaseAdmin.rpc("txc_balance", { _user_id: sub.user_id });
    const balance = Number(balRow ?? 0);

    if (balance >= txcOwed) {
      const newStart = new Date();
      const newEnd = new Date();
      newEnd.setUTCMonth(newEnd.getUTCMonth() + 1);
      await supabaseAdmin.from("txc_credit_ledger").insert({
        user_id: sub.user_id,
        amount_txc: -txcOwed,
        kind: "subscription_debit",
        txc_usd_rate: txcRate,
        usd_value: priceUsd,
        reference: `${sub.plan_id}:${newStart.toISOString()}`,
        notes: `Auto-renewal for ${planName} plan`,
      });
      await supabaseAdmin
        .from("subscriptions")
        .update({
          current_period_start: newStart.toISOString(),
          current_period_end: newEnd.toISOString(),
          last_charged_at: newStart.toISOString(),
          grace_period_ends_at: null,
          status: "active",
        })
        .eq("user_id", sub.user_id);
      await notifyUser(sub.user_id, {
        event: "plan_renewed",
        subject: "You’re all set for another month!",
        text: `${txcOwed} TXC ($${priceUsd}) debited for next month.`,
        metadata: {
          status: "renewed",
          planName: friendlyPlanName,
          priceUsd: `$${priceUsd.toFixed(2)}`,
          txcCharged: `${txcOwed.toFixed(8)} TXC`,
          txcBalance: `${Math.max(0, balance - txcOwed).toFixed(8)} TXC`,
          nextRenewal: displayDate(newEnd),
        },
      });
      renewed++;
    } else {
      const graceEnds = new Date();
      graceEnds.setUTCDate(graceEnds.getUTCDate() + 7);
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "past_due", grace_period_ends_at: graceEnds.toISOString() })
        .eq("user_id", sub.user_id);
      await notifyUser(sub.user_id, {
        event: "grace_warning",
        subject: "A quick TXC top-up will keep NectarPay running",
        text: `Auto-renewal failed. Need ${txcOwed} TXC, have ${balance.toFixed(2)}. You have 7 days to top up.`,
        metadata: {
          status: "payment_due",
          planName: friendlyPlanName,
          priceUsd: `$${priceUsd.toFixed(2)}`,
          txcNeeded: `${txcOwed.toFixed(8)} TXC`,
          txcBalance: `${balance.toFixed(8)} TXC`,
          graceEnds: displayDate(graceEnds),
        },
      });
      warned++;
    }
  }

  let txc_scanned = 0;
  let txc_credited = 0;
  try {
    const r = await scanTxcDeposits();
    txc_scanned = r.scanned;
    txc_credited = r.credited;
  } catch (e) {
    console.error("scanTxcDeposits failed", e);
  }

  return { renewed, blocked, warned, txc_scanned, txc_credited };
}

export const Route = createFileRoute("/api/public/cron/billing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronAuth(request);
        if (unauthorized) return unauthorized;
        try {
          const result = await rolloverBilling();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          return Response.json(
            { ok: false, error: (e as Error).message },
            { status: 500 },
          );
        }
      },
      GET: async ({ request }) => {
        const unauthorized = requireCronAuth(request);
        if (unauthorized) return unauthorized;
        const result = await rolloverBilling();
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
