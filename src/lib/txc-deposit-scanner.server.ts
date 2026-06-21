// Scans every TXC subscription deposit address and credits confirmed
// incoming transactions to txc_credit_ledger. Idempotent by reference.

import { TXC_NETWORK } from "./chains/networks";
import { getAddressTxs, getTipHeight, extractIncoming } from "./chains/btc-like.server";
import { notifyUser } from "./notify.server";

export async function scanTxcDeposits(): Promise<{ scanned: number; credited: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: addrs } = await supabaseAdmin
    .from("txc_deposit_addresses")
    .select("address, user_id");
  if (!addrs || addrs.length === 0) return { scanned: 0, credited: 0 };

  const tip = await getTipHeight(TXC_NETWORK);
  const { getUsdRate } = await import("./rates.functions");
  const rate = (await getUsdRate("TXC")) || 0.1;

  let credited = 0;
  for (const a of addrs) {
    let txs: Awaited<ReturnType<typeof getAddressTxs>>;
    try {
      txs = await getAddressTxs(TXC_NETWORK, a.address);
    } catch (e) {
      console.error(`TXC fetch failed for ${a.address}`, e);
      continue;
    }
    const incoming = extractIncoming(txs, a.address, tip);
    for (const c of incoming) {
      if (c.confirmations < TXC_NETWORK.confirmationsRequired) continue;
      const reference = `txc_deposit:${c.txid}:${c.vout}`;
      const { data: existing } = await supabaseAdmin
        .from("txc_credit_ledger")
        .select("id")
        .eq("reference", reference)
        .eq("kind", "deposit")
        .maybeSingle();
      if (existing) continue;

      const amountTxc = c.amountSats / 1e8;
      const { error } = await supabaseAdmin.from("txc_credit_ledger").insert({
        user_id: a.user_id,
        amount_txc: amountTxc,
        kind: "deposit",
        txc_usd_rate: rate,
        usd_value: Number((amountTxc * rate).toFixed(4)),
        reference,
        notes: `TXC deposit to ${a.address}`,
      });
      if (error) {
        console.error("ledger insert failed", error);
        continue;
      }
      credited++;
      await notifyUser(a.user_id, {
        event: "txc_deposit_received",
        subject: `Received ${amountTxc} TXC`,
        text: `${amountTxc} TXC ($${(amountTxc * rate).toFixed(2)}) was credited to your subscription balance.`,
      }).catch(() => {});
    }
  }

  return { scanned: addrs.length, credited };
}
