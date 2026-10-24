import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { marketingConsentText } from "./customers";

export async function recordCustomerConsent(storeId: string, invoiceId: string, email: string, optedIn: boolean, source: "pos" | "checkout") {
  // Leaving the box unchecked never grants consent or revokes an earlier signup.
  if (!optedIn) return;
  const { data: store, error: storeError } = await supabaseAdmin.from("stores").select("name").eq("id", storeId).single();
  if (storeError) throw new Error("Could not save signup preference.");
  const { error } = await supabaseAdmin.from("customer_marketing_consents").upsert({ store_id: storeId, invoice_id: invoiceId, email, source, consent_text: marketingConsentText(store.name), consented_at: new Date().toISOString(), revoked_at: null }, { onConflict: "store_id,email" });
  if (error) throw new Error("Could not save signup preference.");
}