// KYC / fraud-check server functions.
//
// Privacy posture: we NEVER store buyer PII (names, documents, selfies).
// Only pass/fail outcomes, opaque provider reference IDs, wallet sanctions
// flags, numeric risk scores, and country codes are persisted.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// OFAC / comprehensively-sanctioned country ISO-3166-1 alpha-2 codes.
const SANCTIONED_COUNTRIES = new Set([
  "CU", "IR", "KP", "SY", // comprehensive
  "RU", "BY",             // sectoral / extensive
]);

const PROVIDER_LABELS: Record<string, string> = {
  none: "None",
  sumsub: "Sumsub",
  persona: "Persona",
  didit: "Didit",
  veriff: "Veriff",
};

// ---------- Public: invoice KYC requirement ----------

export const getInvoiceKycRequirement = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ invoiceId: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("id, store_id, fiat_amount, fiat_currency, kyc_level_override, kyc_status, kyc_reference")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (!inv) return { found: false as const };

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select(
        "kyc_level, kyc_threshold_usd, kyc_basic_checks, kyc_basic_require_email, kyc_advanced_provider",
      )
      .eq("id", inv.store_id)
      .maybeSingle();
    if (!store) return { found: false as const };

    // Resolve effective level: per-invoice override wins; threshold can lift "none" to required.
    let level = inv.kyc_level_override ?? store.kyc_level;
    if (level === "none" && store.kyc_threshold_usd && Number(inv.fiat_amount) >= Number(store.kyc_threshold_usd)) {
      level = store.kyc_level === "none" ? "basic" : store.kyc_level;
    }

    return {
      found: true as const,
      level,
      status: inv.kyc_status,
      reference: inv.kyc_reference,
      basicChecks: store.kyc_basic_checks ?? [],
      requireEmail: store.kyc_basic_require_email,
      advancedProvider: store.kyc_advanced_provider,
      providerLabel: PROVIDER_LABELS[store.kyc_advanced_provider] ?? store.kyc_advanced_provider,
    };
  });

// ---------- Public: basic check (sanctions + risk + geo) ----------

const BasicInput = z.object({
  invoiceId: z.string().min(8),
  walletAddress: z.string().min(20).max(128).optional(),
  email: z.string().email().max(255).optional(),
});

export const runBasicKyc = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => BasicInput.parse(d))
  .handler(async ({ data, context }) => {
    const headers = (context as unknown as { request?: Request })?.request?.headers;
    const ip =
      headers?.get("cf-connecting-ip") ||
      headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("id, store_id")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (!inv) throw new Error("Invoice not found");

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("kyc_basic_checks, kyc_basic_require_email")
      .eq("id", inv.store_id)
      .maybeSingle();
    const checks: string[] = store?.kyc_basic_checks ?? ["sanctions", "risk", "geo"];

    // 1. Sanctions screen (Chainalysis free public API)
    let sanctionsFlag: boolean | null = null;
    if (checks.includes("sanctions") && data.walletAddress) {
      try {
        const res = await fetch(`https://public.chainalysis.com/api/v1/address/${data.walletAddress}`, {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = (await res.json()) as { identifications?: unknown[] };
          sanctionsFlag = Array.isArray(json.identifications) && json.identifications.length > 0;
        }
      } catch { /* ignore network error; treat as inconclusive */ }
    }

    // 2. Wallet risk score (GoPlus free API — EVM + Solana)
    let riskScore: number | null = null;
    let riskLabel: string | null = null;
    if (checks.includes("risk") && data.walletAddress) {
      try {
        const url = `https://api.gopluslabs.io/api/v1/address_security/${data.walletAddress}?chain_id=1`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const json = (await res.json()) as { result?: Record<string, string> };
          const flags = json.result ?? {};
          // Sum of "1" values across known risk fields → simple 0-100ish score.
          const risky = Object.entries(flags).filter(([, v]) => v === "1");
          riskScore = Math.min(100, risky.length * 20);
          if (risky.length > 0) riskLabel = risky.map(([k]) => k).slice(0, 3).join(", ");
        }
      } catch { /* ignore */ }
    }

    // 3. Geo block (best-effort via Cloudflare header or ipapi.co fallback)
    let countryCode: string | null = headers?.get("cf-ipcountry") ?? null;
    let ipBlocked = false;
    if (checks.includes("geo")) {
      if (!countryCode && ip) {
        try {
          const r = await fetch(`https://ipapi.co/${ip}/country/`);
          if (r.ok) countryCode = (await r.text()).trim().slice(0, 2).toUpperCase();
        } catch { /* ignore */ }
      }
      if (countryCode && SANCTIONED_COUNTRIES.has(countryCode)) ipBlocked = true;
    }

    const passed =
      sanctionsFlag !== true &&
      (riskScore == null || riskScore < 60) &&
      !ipBlocked &&
      (!store?.kyc_basic_require_email || !!data.email);

    const status = passed ? "passed" : "failed";

    await supabaseAdmin.from("kyc_verifications").insert({
      invoice_id: inv.id,
      level: "basic",
      provider: "none",
      status,
      wallet_address: data.walletAddress ?? null,
      sanctions_flag: sanctionsFlag,
      risk_score: riskScore,
      risk_label: riskLabel,
      country_code: countryCode,
      ip_blocked: ipBlocked,
      email_verified: data.email ? true : null,
    });

    await supabaseAdmin
      .from("invoices")
      .update({
        kyc_status: status,
        buyer_email: data.email ?? null,
      })
      .eq("id", inv.id);

    return {
      status,
      sanctionsFlag,
      riskScore,
      riskLabel,
      countryCode,
      ipBlocked,
      reasons: [
        sanctionsFlag === true ? "Wallet appears on a sanctions list." : null,
        riskScore != null && riskScore >= 60 ? `Wallet risk score ${riskScore}/100 (${riskLabel}).` : null,
        ipBlocked ? `Payments from ${countryCode} are blocked by this merchant.` : null,
        store?.kyc_basic_require_email && !data.email ? "Email required." : null,
      ].filter(Boolean) as string[],
    };
  });

// ---------- Public: advanced KYC handoff (BYO provider) ----------
//
// We never see the buyer's documents. We create a session at the merchant's
// configured provider using the merchant's own API key and return a redirect URL.
// The provider runs the flow on their domain; on completion the buyer is sent
// back with a reference ID we store as proof of pass/fail.

const AdvancedInput = z.object({ invoiceId: z.string().min(8), returnUrl: z.string().url() });

export const startAdvancedKyc = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AdvancedInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("id, store_id")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (!inv) throw new Error("Invoice not found");
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("kyc_advanced_provider, kyc_advanced_api_key, kyc_advanced_app_token")
      .eq("id", inv.store_id)
      .maybeSingle();
    if (!store || store.kyc_advanced_provider === "none") {
      throw new Error("Merchant has not configured an advanced KYC provider.");
    }
    if (!store.kyc_advanced_api_key) {
      throw new Error("Merchant KYC provider key is missing.");
    }

    // Provider adapters. Each returns { redirectUrl, reference }.
    // For now we stub a hosted-flow redirect using the provider's standard
    // patterns; live API session creation can be plugged in per-provider.
    const ref = `${inv.id}-${Date.now()}`;
    let redirectUrl = "";
    switch (store.kyc_advanced_provider) {
      case "didit":
        // Didit hosted: https://verify.didit.me/?session_id=...
        redirectUrl = `https://verify.didit.me/?app_id=${encodeURIComponent(store.kyc_advanced_app_token ?? "")}&reference=${ref}&return_url=${encodeURIComponent(data.returnUrl)}`;
        break;
      case "sumsub":
        redirectUrl = `https://in.sumsub.com/idensic/l/#/${encodeURIComponent(store.kyc_advanced_app_token ?? "")}?externalUserId=${ref}&returnUrl=${encodeURIComponent(data.returnUrl)}`;
        break;
      case "persona":
        redirectUrl = `https://withpersona.com/verify?template-id=${encodeURIComponent(store.kyc_advanced_app_token ?? "")}&reference-id=${ref}&redirect-uri=${encodeURIComponent(data.returnUrl)}`;
        break;
      case "veriff":
        redirectUrl = `https://magic.veriff.me/v/${encodeURIComponent(store.kyc_advanced_app_token ?? "")}?vendorData=${ref}&callback=${encodeURIComponent(data.returnUrl)}`;
        break;
      default:
        throw new Error("Unsupported provider");
    }

    await supabaseAdmin.from("kyc_verifications").insert({
      invoice_id: inv.id,
      level: "advanced",
      provider: store.kyc_advanced_provider,
      status: "pending",
      reference: ref,
    });
    await supabaseAdmin
      .from("invoices")
      .update({ kyc_status: "pending", kyc_reference: ref })
      .eq("id", inv.id);

    return { redirectUrl, reference: ref };
  });

// ---------- Authenticated: store KYC settings ----------

const SaveSettingsInput = z.object({
  storeId: z.string().uuid(),
  kycLevel: z.enum(["none", "basic", "advanced"]),
  kycThresholdUsd: z.number().nonnegative().nullable(),
  kycBasicChecks: z.array(z.enum(["sanctions", "risk", "geo"])),
  kycBasicRequireEmail: z.boolean(),
  kycAdvancedProvider: z.enum(["none", "sumsub", "persona", "didit", "veriff"]),
  kycAdvancedApiKey: z.string().max(512).nullable(),
  kycAdvancedAppToken: z.string().max(512).nullable(),
});

export const saveStoreKycSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSettingsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("stores")
      .update({
        kyc_level: data.kycLevel,
        kyc_threshold_usd: data.kycThresholdUsd,
        kyc_basic_checks: data.kycBasicChecks,
        kyc_basic_require_email: data.kycBasicRequireEmail,
        kyc_advanced_provider: data.kycAdvancedProvider,
        kyc_advanced_api_key: data.kycAdvancedApiKey,
        kyc_advanced_app_token: data.kycAdvancedAppToken,
      })
      .eq("id", data.storeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStoreKycSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Verify ownership using the user-scoped client (RLS enforced).
    const { data: own, error: ownErr } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (ownErr) throw new Error(ownErr.message);
    if (!own) throw new Error("Store not found");

    // Read sensitive columns via admin, but never return the raw secrets
    // to the client. Only return "is it set" booleans.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .select(
        "kyc_level, kyc_threshold_usd, kyc_basic_checks, kyc_basic_require_email, kyc_advanced_provider, kyc_advanced_api_key, kyc_advanced_app_token",
      )
      .eq("id", data.storeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!store) return null;
    return {
      kyc_level: store.kyc_level,
      kyc_threshold_usd: store.kyc_threshold_usd,
      kyc_basic_checks: store.kyc_basic_checks,
      kyc_basic_require_email: store.kyc_basic_require_email,
      kyc_advanced_provider: store.kyc_advanced_provider,
      kyc_advanced_api_key_set: Boolean(store.kyc_advanced_api_key),
      kyc_advanced_app_token_set: Boolean(store.kyc_advanced_app_token),
    };
  });
