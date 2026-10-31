import { stickerCreditEligible } from "./fast-enroll";

export async function claimStickerCredit(input: {
  invoiceId: string; txid: string; amount: number; invoiceAmount: number;
  blockTimeMs: number | null; createdAt: string;
  sendToMany?: boolean; splitRecipients?: Array<{ address: string | null; amount: number }>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: guard, error } = await supabaseAdmin.from("sticker_invoice_guards").select("excluded_txids").eq("invoice_id", input.invoiceId).maybeSingle();
  if (error) throw new Error("Could not verify sticker payment guard.");
  if (!guard) return true;
  const { data: prior, error: priorError } = await supabaseAdmin.from("sticker_credit_claims").select("invoice_id").eq("tx_hash", input.txid).maybeSingle();
  if (priorError) throw new Error("Could not verify payment claim.");
  if (prior) return prior.invoice_id === input.invoiceId;
  const amount = input.sendToMany && input.splitRecipients?.length
    ? input.splitRecipients.reduce((sum, r) => sum + r.amount, 0) : input.amount;
  if (!stickerCreditEligible({ txid: input.txid, excluded: guard.excluded_txids, amount, expected: input.invoiceAmount, blockTimeMs: input.blockTimeMs, createdAt: input.createdAt })) return false;
  const { error: insertError } = await supabaseAdmin.from("sticker_credit_claims").insert({ tx_hash: input.txid, invoice_id: input.invoiceId });
  if (!insertError) return true;
  if (insertError.code !== "23505") throw new Error("Could not claim payment.");
  const { data: winner } = await supabaseAdmin.from("sticker_credit_claims").select("invoice_id").eq("tx_hash", input.txid).single();
  return winner?.invoice_id === input.invoiceId;
}