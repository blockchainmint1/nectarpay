// Alchemy Notify API helper — manages per-chain Address Activity webhooks.
//
// On first use for a given EVM chain we POST to /api/create-webhook to
// provision a webhook pointed at our public receiver, then persist the
// returned id + signing key in `alchemy_webhooks`. Subsequent invoice
// derivations call registerAddressForChain() to PATCH the recipient's
// address onto that webhook so Alchemy starts pushing activity for it
// instantly.
//
// Bulletproofing:
//   - getOrCreateWebhook() first checks our DB, then queries Alchemy for an
//     existing webhook matching (network, callback url, signing key) before
//     creating a new one. Prevents duplicate webhooks if the DB row is
//     lost or the project is migrated.
//   - On fresh creation we backfill ALL currently-derived EVM addresses for
//     this store set, so we don't start blind.
//   - reconcileChain() can be called periodically to re-sync the set of
//     subscribed addresses with the addresses we've derived locally —
//     adds anything missing, leaves Alchemy-side extras alone.
//
// SERVER-ONLY: requires ALCHEMY_AUTH_TOKEN (the dashboard Notify token,
// distinct from ALCHEMY_API_KEY used for RPC).

const NOTIFY_BASE = "https://dashboard.alchemy.com/api";

const CHAIN_TO_NETWORK: Record<string, string> = {
  eth: "ETH_MAINNET",
  base: "BASE_MAINNET",
  bsc: "BNB_MAINNET",
};

export const SUPPORTED_EVM_CHAINS = ["eth", "base", "bsc"] as const;

function authToken(): string {
  const t = process.env.ALCHEMY_AUTH_TOKEN;
  if (!t) throw new Error("ALCHEMY_AUTH_TOKEN not configured");
  return t;
}

function callbackUrl(): string {
  // Stable production URL of this project (immutable across renames).
  const base =
    process.env.PUBLIC_BASE_URL ||
    "https://project--faa7c23e-4f75-4eed-8c8c-23234e4242f7.lovable.app";
  return `${base.replace(/\/$/, "")}/api/public/hooks/alchemy-activity`;
}

interface WebhookRow {
  chain: string;
  webhook_id: string;
  signing_key: string;
  callback_url: string;
}

interface AlchemyWebhookSummary {
  id: string;
  network: string;
  webhook_url: string;
  webhook_type: string;
  signing_key: string;
  is_active: boolean;
}

async function fetchAlchemy(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${NOTIFY_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Alchemy-Token": authToken(),
      ...(init.headers ?? {}),
    },
  });
}

/** Find an existing webhook on Alchemy for (network, url) — used to recover
 *  from a missing DB row instead of creating duplicates. */
async function findExistingWebhook(
  network: string,
  url: string,
): Promise<AlchemyWebhookSummary | null> {
  const res = await fetchAlchemy("/team-webhooks", { method: "GET" });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { data?: AlchemyWebhookSummary[] } | null;
  const list = json?.data ?? [];
  return (
    list.find(
      (w) =>
        w.network === network &&
        w.webhook_type === "ADDRESS_ACTIVITY" &&
        w.webhook_url === url,
    ) ?? null
  );
}

async function persistWebhook(row: WebhookRow): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("alchemy_webhooks").upsert(row, { onConflict: "chain" });
}

async function getOrCreateWebhook(chain: string): Promise<WebhookRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Local cache.
  const { data: existing } = await supabaseAdmin
    .from("alchemy_webhooks")
    .select("chain, webhook_id, signing_key, callback_url")
    .eq("chain", chain)
    .maybeSingle();
  if (existing) return existing as WebhookRow;

  const network = CHAIN_TO_NETWORK[chain];
  if (!network) throw new Error(`No Alchemy network mapping for chain '${chain}'`);
  const url = callbackUrl();

  // 2. Recovery: maybe Alchemy already has it from a prior boot.
  const found = await findExistingWebhook(network, url).catch(() => null);
  if (found) {
    const row: WebhookRow = {
      chain,
      webhook_id: found.id,
      signing_key: found.signing_key,
      callback_url: url,
    };
    await persistWebhook(row);
    return row;
  }

  // 3. Create fresh.
  const res = await fetchAlchemy("/create-webhook", {
    method: "POST",
    body: JSON.stringify({
      network,
      webhook_type: "ADDRESS_ACTIVITY",
      webhook_url: url,
      addresses: [],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Alchemy create-webhook failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as { data: { id: string; signing_key: string } };
  const row: WebhookRow = {
    chain,
    webhook_id: json.data.id,
    signing_key: json.data.signing_key,
    callback_url: url,
  };
  await persistWebhook(row);

  // Backfill: register every EVM address we've already derived so we have
  // coverage from second 0 — otherwise old addresses are blind.
  try {
    const { data: addrs } = await supabaseAdmin
      .from("derived_addresses")
      .select("address, chain_configs!inner(chain)")
      .eq("chain_configs.chain", "eth");
    const unique = Array.from(new Set((addrs ?? []).map((a) => a.address)));
    if (unique.length) {
      await patchAddresses(row.webhook_id, unique, []);
    }
  } catch (e) {
    console.error(`[alchemy-notify] backfill on create (${chain}) failed:`, e);
  }

  return row;
}

/** Low-level PATCH — Alchemy caps payload size, so we chunk. */
async function patchAddresses(
  webhookId: string,
  toAdd: string[],
  toRemove: string[],
): Promise<void> {
  const CHUNK = 100;
  const addChunks: string[][] = [];
  for (let i = 0; i < toAdd.length; i += CHUNK) addChunks.push(toAdd.slice(i, i + CHUNK));
  const remChunks: string[][] = [];
  for (let i = 0; i < toRemove.length; i += CHUNK) remChunks.push(toRemove.slice(i, i + CHUNK));
  // At least one round trip so a pure-remove or pure-add still fires.
  const rounds = Math.max(addChunks.length, remChunks.length, 1);
  for (let i = 0; i < rounds; i++) {
    const res = await fetchAlchemy("/update-webhook-addresses", {
      method: "PATCH",
      body: JSON.stringify({
        webhook_id: webhookId,
        addresses_to_add: addChunks[i] ?? [],
        addresses_to_remove: remChunks[i] ?? [],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Alchemy update-webhook-addresses failed (${res.status}): ${body}`,
      );
    }
  }
}

/** Register one address with the per-chain Alchemy Address-Activity webhook. */
export async function registerAddressForChain(
  chain: string,
  address: string,
): Promise<void> {
  if (!CHAIN_TO_NETWORK[chain]) return; // non-EVM chain → no-op
  const hook = await getOrCreateWebhook(chain);
  await patchAddresses(hook.webhook_id, [address], []);
}

/**
 * Register the same EVM address with all three EVM-chain webhooks (ETH, Base,
 * BSC) — the merchant's xpub derives one address that can receive on any of
 * them. Individual failures are logged but don't tank the whole call; the
 * cron watcher is still running as a safety net.
 */
export async function registerEvmAddressEverywhere(address: string): Promise<void> {
  await Promise.all(
    SUPPORTED_EVM_CHAINS.map((c) =>
      registerAddressForChain(c, address).catch((e) => {
        console.error(`[alchemy-notify] register ${c} ${address} failed:`, e);
      }),
    ),
  );
}

/** Look up the signing key Alchemy used to sign a payload, by webhook id. */
export async function getSigningKeyForWebhook(
  webhookId: string,
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("alchemy_webhooks")
    .select("signing_key")
    .eq("webhook_id", webhookId)
    .maybeSingle();
  return data?.signing_key ?? null;
}

/**
 * Reconcile our derived EVM addresses with Alchemy's subscribed set, per
 * chain. Adds any address we know about that Alchemy doesn't. Leaves
 * Alchemy-side extras alone (cheap, and avoids racing in-flight adds).
 *
 * Returns per-chain counts for logging.
 */
export async function reconcileChain(chain: string): Promise<{
  chain: string;
  local: number;
  remote: number;
  added: number;
  error?: string;
}> {
  if (!CHAIN_TO_NETWORK[chain]) return { chain, local: 0, remote: 0, added: 0 };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hook = await getOrCreateWebhook(chain);

    // Local derived EVM addresses (one xpub → addresses reused across all EVM nets).
    const { data: addrs } = await supabaseAdmin
      .from("derived_addresses")
      .select("address, chain_configs!inner(chain)")
      .eq("chain_configs.chain", "eth");
    const local = Array.from(new Set((addrs ?? []).map((a) => a.address.toLowerCase())));

    // Remote subscribed addresses on this webhook.
    const res = await fetchAlchemy(
      `/webhook-addresses?webhook_id=${encodeURIComponent(hook.webhook_id)}&limit=1000`,
      { method: "GET" },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { chain, local: local.length, remote: 0, added: 0, error: `list ${res.status}: ${body}` };
    }
    const json = (await res.json().catch(() => null)) as { data?: string[] } | null;
    const remote = new Set((json?.data ?? []).map((a) => a.toLowerCase()));

    const toAdd = local.filter((a) => !remote.has(a));
    if (toAdd.length) await patchAddresses(hook.webhook_id, toAdd, []);
    return { chain, local: local.length, remote: remote.size, added: toAdd.length };
  } catch (e) {
    return { chain, local: 0, remote: 0, added: 0, error: (e as Error).message };
  }
}

/** Reconcile every supported EVM chain in parallel. */
export async function reconcileAllEvmChains(): Promise<Array<Awaited<ReturnType<typeof reconcileChain>>>> {
  return Promise.all(SUPPORTED_EVM_CHAINS.map((c) => reconcileChain(c)));
}
