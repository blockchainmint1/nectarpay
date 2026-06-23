// Alchemy Notify API helper — manages per-chain Address Activity webhooks.
//
// On first use for a given EVM chain we POST to /api/create-webhook to
// provision a webhook pointed at our public receiver, then persist the
// returned id + signing key in `alchemy_webhooks`. Subsequent invoice
// derivations call updateAddresses() to PATCH the recipient's address
// onto that webhook so Alchemy starts pushing activity for it instantly.
//
// SERVER-ONLY: requires ALCHEMY_AUTH_TOKEN (the dashboard Notify token,
// distinct from ALCHEMY_API_KEY used for RPC).

const NOTIFY_BASE = "https://dashboard.alchemy.com/api";

const CHAIN_TO_NETWORK: Record<string, string> = {
  eth: "ETH_MAINNET",
  base: "BASE_MAINNET",
  bsc: "BNB_MAINNET",
};

function authToken(): string {
  const t = process.env.ALCHEMY_AUTH_TOKEN;
  if (!t) throw new Error("ALCHEMY_AUTH_TOKEN not configured");
  return t;
}

function callbackUrl(): string {
  // Stable production URL of this project.
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

async function getOrCreateWebhook(chain: string): Promise<WebhookRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("alchemy_webhooks")
    .select("chain, webhook_id, signing_key, callback_url")
    .eq("chain", chain)
    .maybeSingle();
  if (existing) return existing as WebhookRow;

  const network = CHAIN_TO_NETWORK[chain];
  if (!network) throw new Error(`No Alchemy network mapping for chain '${chain}'`);

  const url = callbackUrl();
  const res = await fetch(`${NOTIFY_BASE}/create-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Alchemy-Token": authToken(),
    },
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
  const json = (await res.json()) as {
    data: { id: string; signing_key: string };
  };
  const row: WebhookRow = {
    chain,
    webhook_id: json.data.id,
    signing_key: json.data.signing_key,
    callback_url: url,
  };
  await supabaseAdmin
    .from("alchemy_webhooks")
    .upsert(row, { onConflict: "chain" });
  return row;
}

/** Register one address with the per-chain Alchemy Address-Activity webhook. */
export async function registerAddressForChain(
  chain: string,
  address: string,
): Promise<void> {
  if (!CHAIN_TO_NETWORK[chain]) return; // non-EVM chain → no-op
  const hook = await getOrCreateWebhook(chain);
  const res = await fetch(`${NOTIFY_BASE}/update-webhook-addresses`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Alchemy-Token": authToken(),
    },
    body: JSON.stringify({
      webhook_id: hook.webhook_id,
      addresses_to_add: [address],
      addresses_to_remove: [],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Alchemy update-webhook-addresses failed (${res.status}): ${body}`,
    );
  }
}

/**
 * Register the same EVM address with all three EVM-chain webhooks (ETH, Base,
 * BSC) — the merchant's xpub derives one address that can receive on any of
 * them. Fire-and-forget: errors are logged but don't block invoice creation,
 * since the cron watcher is still running as a safety net.
 */
export async function registerEvmAddressEverywhere(address: string): Promise<void> {
  await Promise.all(
    (["eth", "base", "bsc"] as const).map((c) =>
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
