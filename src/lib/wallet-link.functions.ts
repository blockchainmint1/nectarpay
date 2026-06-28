// Server fn for the merchant Chains page: mint a one-time wallet-link code
// that the Nectar wallet redeems via POST /api/public/v1/wallet-link to push
// its xpubs into this store's chain_configs.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const createWalletLinkCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        storeId: z.string().uuid(),
        allowNewWallet: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // RLS confirms ownership.
    const { data: store, error: sErr } = await context.supabase
      .from("stores")
      .select("id, name")
      .eq("id", data.storeId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!store) throw new Error("Store not found or not yours.");

    const token = base64url(randomBytes(24)); // ~32 chars
    const code_hash = createHash("sha256").update(token).digest("hex");
    const expires_at = new Date(Date.now() + 5 * 60_000).toISOString();

    const { error } = await context.supabase.from("wallet_link_codes").insert({
      store_id: data.storeId,
      code_hash,
      expires_at,
      created_by: context.userId,
      allow_new_wallet: data.allowNewWallet,
    });
    if (error) throw new Error(error.message);

    return {
      token,
      expires_at,
      store_id: store.id,
      store_name: store.name,
      allow_new_wallet: data.allowNewWallet,
    };
  });

