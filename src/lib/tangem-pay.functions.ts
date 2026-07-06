// Public server functions the NectarPOS Android app calls during a
// Tangem tap-to-pay flow. Both endpoints are unauthenticated by design —
// the POS device does not carry a Supabase JWT. Security model:
//
//   - startTangemPayment can only act on invoices whose status is 'pending'.
//     It never returns owner_id or webhook secrets.
//   - submitTangemPayment requires the intentId returned above (single-use,
//     60s TTL) AND a signature that ecrecover-matches the card's address.
//     Signed raw tx is broadcast to Ethereum immediately.
//
// The heavy tx-building + signature recovery lives in tangem-pay.server.ts;
// this file stays a thin RPC layer.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAddress, type Address, type Hex } from "viem";

const StartInput = z.object({
  invoiceId: z.string().uuid(),
  cardPublicKey: z.string().regex(/^(0x)?[0-9a-fA-F]{128,130}$/),
  cardId: z.string().max(64).optional(),
});

const SubmitInput = z.object({
  intentId: z.string().uuid(),
  signatureHex: z.string().regex(/^(0x)?[0-9a-fA-F]{128}$/),
});

export const startTangemPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StartInput.parse(d))
  .handler(async ({ data }) => {
    const {
      buildUsdcTransferTx,
      ethAddressFromPublicKey,
      usdcToUnits,
      txToJson,
      USDC_MAINNET,
    } = await import("@/lib/tangem-pay.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cardAddress = ethAddressFromPublicKey(data.cardPublicKey);

    // 1) Load invoice + store payout address
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("id, store_id, status, fiat_amount, fiat_currency, crypto_amount, token_symbol, chain, expires_at")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (invErr) throw new Error(invErr.message);
    if (!inv) throw new Error("Invoice not found");
    if (inv.status !== "pending") throw new Error(`Invoice is ${inv.status}`);
    if (new Date(inv.expires_at).getTime() < Date.now()) throw new Error("Invoice expired");

    const { data: store, error: storeErr } = await supabaseAdmin
      .from("stores")
      .select("id, usdc_payout_address_eth")
      .eq("id", inv.store_id)
      .maybeSingle();
    if (storeErr) throw new Error(storeErr.message);
    if (!store?.usdc_payout_address_eth) {
      throw new Error("Merchant has not configured a USDC (Ethereum) payout address");
    }

    // 2) Determine USDC amount. Prefer crypto_amount when the invoice is
    // already denominated in USDC; otherwise assume 1 USDC = 1 USD.
    const isUsdcInvoice = (inv.token_symbol ?? "").toUpperCase() === "USDC";
    const usdcAmount = isUsdcInvoice && inv.crypto_amount
      ? Number(inv.crypto_amount)
      : Number(inv.fiat_amount); // 1 USDC ≈ 1 USD for tap-to-pay
    if (!(usdcAmount > 0)) throw new Error("Invalid amount");
    const amountUnits = usdcToUnits(usdcAmount);

    // 3) Build tx + digest, sanity-check balances
    const merchantAddress = getAddress(store.usdc_payout_address_eth) as Address;
    const built = await buildUsdcTransferTx({
      fromAddress: cardAddress,
      toAddress: merchantAddress,
      amountUnits,
    });

    if (built.usdcBalanceUnits < amountUnits) {
      throw new Error(
        `Card balance ${Number(built.usdcBalanceUnits) / 1e6} USDC is less than ${usdcAmount} USDC`,
      );
    }
    if (built.ethBalanceWei < built.estimatedGasCostWei) {
      throw new Error("Card doesn't have enough ETH to cover gas");
    }

    // 4) Persist intent
    const { data: intent, error: insErr } = await supabaseAdmin
      .from("tangem_pay_intents")
      .insert({
        invoice_id: inv.id,
        store_id: inv.store_id,
        card_id: data.cardId ?? null,
        card_public_key: data.cardPublicKey.startsWith("0x")
          ? data.cardPublicKey
          : `0x${data.cardPublicKey}`,
        card_address: cardAddress,
        chain_id: 1,
        usdc_contract: USDC_MAINNET,
        merchant_payout_address: merchantAddress,
        // numeric(78,0) — store as string to preserve full precision
        amount_usdc_units: amountUnits.toString() as unknown as number,
        onchain_nonce: built.onchainNonce,
        unsigned_tx_json: txToJson(built.unsigned) as unknown as never,
        tx_hash_to_sign: built.digest,
        status: "pending",
      })
      .select("id, expires_at")
      .single();
    if (insErr) throw new Error(insErr.message);

    return {
      intentId: intent.id as string,
      expiresAt: intent.expires_at as string,
      cardAddress,
      merchantAddress,
      amountUsdc: usdcAmount,
      // Card only needs this — everything else stays server-side.
      hashToSign: built.digest,
      gas: {
        estimatedCostEth: Number(built.estimatedGasCostWei) / 1e18,
        ethBalance: Number(built.ethBalanceWei) / 1e18,
      },
    };
  });

export const submitTangemPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const {
      recoverVAndAssemble,
      broadcastRawTx,
      txFromJson,
    } = await import("@/lib/tangem-pay.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load intent (single-use)
    const { data: intent, error: loadErr } = await supabaseAdmin
      .from("tangem_pay_intents")
      .select("*")
      .eq("id", data.intentId)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!intent) throw new Error("Intent not found");
    if (intent.status !== "pending") throw new Error(`Intent is ${intent.status}`);
    if (new Date(intent.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from("tangem_pay_intents")
        .update({ status: "expired" })
        .eq("id", intent.id);
      throw new Error("Intent expired — please tap again");
    }

    // Recover v, assemble, broadcast
    const unsigned = txFromJson(intent.unsigned_tx_json as Record<string, unknown>);
    let signedRawTx: Hex;
    try {
      const result = await recoverVAndAssemble(
        unsigned,
        intent.tx_hash_to_sign as Hex,
        data.signatureHex,
        intent.card_address as Address,
      );
      signedRawTx = result.signedRawTx;
    } catch (e) {
      await supabaseAdmin
        .from("tangem_pay_intents")
        .update({ status: "failed", error_message: (e as Error).message })
        .eq("id", intent.id);
      throw e;
    }

    await supabaseAdmin
      .from("tangem_pay_intents")
      .update({
        status: "signed",
        signature_hex: data.signatureHex.startsWith("0x") ? data.signatureHex : `0x${data.signatureHex}`,
        signed_raw_tx: signedRawTx,
      })
      .eq("id", intent.id);

    let broadcastHash: Hex;
    try {
      broadcastHash = await broadcastRawTx(signedRawTx);
    } catch (e) {
      await supabaseAdmin
        .from("tangem_pay_intents")
        .update({ status: "failed", error_message: (e as Error).message })
        .eq("id", intent.id);
      throw e;
    }

    await supabaseAdmin
      .from("tangem_pay_intents")
      .update({ status: "broadcast", broadcast_tx_hash: broadcastHash })
      .eq("id", intent.id);

    // Flag invoice as awaiting confirmation. Existing watcher promotes to
    // 'confirmed' once the tx has a receipt.
    await supabaseAdmin
      .from("invoices")
      .update({ status: "detected" })
      .eq("id", intent.invoice_id);

    return {
      ok: true as const,
      txHash: broadcastHash,
      etherscanUrl: `https://etherscan.io/tx/${broadcastHash}`,
    };
  });
