// Link a store to an HME Vault (offline signer) by scanning its watch-only
// pairing QR. Vault never goes online; we only receive account xpubs.
// Saving always requires the emailed 6-digit code (requestWalletLinkVerification).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseVaultPairing, type VaultStoreChain } from "@/lib/vault-link/pairing";

const Input = z.object({ storeId: z.string().uuid(), pairing: z.string().min(10).max(20_000) });

async function previewAddresses(keys: Partial<Record<VaultStoreChain, string>>) {
  const { vaultPreviewAddresses } = await import("@/lib/vault-link/preview.server");
  return vaultPreviewAddresses(keys);
}

async function assertOwnStore(supabase: { from: (t: "stores") => any }, storeId: string) {
  const { data: store, error } = await supabase.from("stores").select("id, name").eq("id", storeId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!store) throw new Error("Store not found or not yours.");
  return store as { id: string; name: string };
}

/** Read-only: validate a scanned pairing and show the first sale address per coin. */
export const previewVaultPairing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    await assertOwnStore(context.supabase, data.storeId);
    const parsed = parseVaultPairing(data.pairing);
    return { fp: parsed.fp, evmAddressOnly: parsed.evmAddressOnly, addresses: await previewAddresses(parsed.keys) };
  });

/** Save the Vault keys onto the store after the emailed code checks out. */
export const linkVaultPairing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    Input.extend({ verificationCode: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email.") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const store = await assertOwnStore(context.supabase, data.storeId);
    const parsed = parseVaultPairing(data.pairing);
    await previewAddresses(parsed.keys); // refuse keys we can't derive from

    const { consumeWalletLinkChallenge } = await import("@/lib/wallet-link-challenge.server");
    await consumeWalletLinkChallenge(context.userId, store.id, data.verificationCode);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const linked: VaultStoreChain[] = [];
    for (const [chain, xpub] of Object.entries(parsed.keys) as [VaultStoreChain, string][]) {
      const { data: existing } = await supabaseAdmin
        .from("chain_configs")
        .select("enabled, stables")
        .eq("store_id", store.id)
        .eq("chain", chain)
        .maybeSingle();
      const { error } = await supabaseAdmin.from("chain_configs").upsert(
        {
          store_id: store.id,
          chain,
          network: "mainnet",
          xpub,
          xpub_or_address: xpub,
          derivation_path: null,
          enabled: existing?.enabled ?? chain === "txc",
          stables: existing?.stables ?? (chain === "txc" ? ["TSD"] : []),
        },
        { onConflict: "store_id,chain" },
      );
      if (error) throw new Error(`Could not save ${chain.toUpperCase()}: ${error.message}`);
      linked.push(chain);
    }
    return { linked, evmAddressOnly: parsed.evmAddressOnly };
  });
