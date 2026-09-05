import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export interface LightningAdminStatus {
  configured: boolean;
  error: string | null;
  node: {
    alias: string;
    pubkey: string;
    version: string;
    syncedToChain: boolean;
    syncedToGraph: boolean;
    blockHeight: number;
    activeChannels: number;
    inactiveChannels: number;
    pendingChannels: number;
    peers: number;
    uris: string[];
  } | null;
  balances: {
    onchainConfirmedSats: number;
    onchainUnconfirmedSats: number;
    localSats: number;
    remoteSats: number;
    pendingOpenLocalSats: number;
  } | null;
  channels: {
    channelPoint: string;
    remotePubkey: string;
    active: boolean;
    capacitySats: number;
    localSats: number;
    remoteSats: number;
    private: boolean;
  }[];
  owedSats: number;
  owedByStore: { storeId: string; storeName: string; sats: number }[];
  recentInvoices: {
    id: string;
    storeName: string;
    amountSats: number;
    amountPaidSats: number;
    state: string;
    createdAt: string;
    settledAt: string | null;
  }[];
  recentSweeps: {
    id: string;
    storeName: string;
    amountSats: number;
    feeSats: number | null;
    address: string;
    txid: string | null;
    status: string;
    createdAt: string;
    error: string | null;
  }[];
  btcUsd: number | null;
}

async function btcUsdRate(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { bitcoin?: { usd?: number } };
    return json.bitcoin?.usd ?? null;
  } catch {
    return null;
  }
}

export const getLightningAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LightningAdminStatus> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ln = await import("@/lib/chains/lightning.server");

    const empty: LightningAdminStatus = {
      configured: ln.lightningConfigured(),
      error: null,
      node: null,
      balances: null,
      channels: [],
      owedSats: 0,
      owedByStore: [],
      recentInvoices: [],
      recentSweeps: [],
      btcUsd: null,
    };

    // Database side (always available)
    const [storesRes, creditsRes, invoicesRes, sweepsRes, rate] = await Promise.all([
      supabaseAdmin.from("stores").select("id, name"),
      supabaseAdmin.from("lightning_credits").select("store_id, amount_sats, sweep_id"),
      supabaseAdmin
        .from("lightning_invoices")
        .select("id, store_id, amount_sats, amount_paid_sats, state, created_at, settled_at")
        .order("created_at", { ascending: false })
        .limit(25),
      supabaseAdmin
        .from("lightning_sweeps")
        .select("id, store_id, amount_sats, fee_sats, address, txid, status, created_at, error")
        .order("created_at", { ascending: false })
        .limit(25),
      btcUsdRate(),
    ]);

    const storeName = new Map<string, string>(
      (storesRes.data ?? []).map((s) => [s.id, s.name] as const),
    );

    const owedMap = new Map<string, number>();
    for (const c of creditsRes.data ?? []) {
      if (c.sweep_id) continue;
      owedMap.set(c.store_id, (owedMap.get(c.store_id) ?? 0) + Number(c.amount_sats ?? 0));
    }
    const owedByStore = [...owedMap.entries()]
      .map(([storeId, sats]) => ({
        storeId,
        storeName: storeName.get(storeId) ?? "Unknown store",
        sats,
      }))
      .sort((a, b) => b.sats - a.sats);

    empty.owedByStore = owedByStore;
    empty.owedSats = owedByStore.reduce((n, s) => n + s.sats, 0);
    empty.btcUsd = rate;
    empty.recentInvoices = (invoicesRes.data ?? []).map((i) => ({
      id: i.id,
      storeName: storeName.get(i.store_id) ?? "—",
      amountSats: Number(i.amount_sats ?? 0),
      amountPaidSats: Number(i.amount_paid_sats ?? 0),
      state: i.state,
      createdAt: i.created_at,
      settledAt: i.settled_at,
    }));
    empty.recentSweeps = (sweepsRes.data ?? []).map((s) => ({
      id: s.id,
      storeName: storeName.get(s.store_id) ?? "—",
      amountSats: Number(s.amount_sats ?? 0),
      feeSats: s.fee_sats === null ? null : Number(s.fee_sats),
      address: s.address,
      txid: s.txid,
      status: s.status,
      createdAt: s.created_at,
      error: s.error,
    }));

    if (!empty.configured) return empty;

    try {
      const [info, balances, channels, pending] = await Promise.all([
        ln.lndGetInfo(),
        ln.lndBalances(),
        ln.lndListChannels(),
        ln.lndPendingChannelCount(),
      ]);
      empty.node = {
        alias: info.alias,
        pubkey: info.identityPubkey,
        version: info.version,
        syncedToChain: info.syncedToChain,
        syncedToGraph: info.syncedToGraph,
        blockHeight: info.blockHeight,
        activeChannels: info.numActiveChannels,
        inactiveChannels: info.numInactiveChannels,
        pendingChannels: pending,
        peers: info.numPeers,
        uris: info.uris,
      };
      empty.balances = balances;
      empty.channels = channels;
    } catch (e) {
      empty.error = e instanceof Error ? e.message : String(e);
    }

    return empty;
  });

/** Fresh on-chain deposit address so the admin can top the node up. */
export const getLightningDepositAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const ln = await import("@/lib/chains/lightning.server");
    return { address: await ln.lndNewAddress() };
  });

/** Connect to a peer and open a channel with on-chain funds. */
export const openLightningChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { uri: string; amountSats: number; satPerVbyte?: number }) => {
    const uri = input.uri.trim();
    const match = /^([0-9a-fA-F]{66})@([^\s]+:\d+)$/.exec(uri);
    if (!match) throw new Error("Enter a node URI like <66-char pubkey>@host:9735");
    const amountSats = Math.round(Number(input.amountSats));
    if (!Number.isFinite(amountSats) || amountSats < 20000) {
      throw new Error("Channel size must be at least 20,000 sats");
    }
    const satPerVbyte = Math.max(1, Math.round(Number(input.satPerVbyte ?? 2)));
    return { pubkey: match[1]!, host: match[2]!, amountSats, satPerVbyte };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const ln = await import("@/lib/chains/lightning.server");
    await ln.lndConnectPeer(data.pubkey, data.host);
    const txid = await ln.lndOpenChannel(data.pubkey, data.amountSats, data.satPerVbyte);
    return { txid };
  });
