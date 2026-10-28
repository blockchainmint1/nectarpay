import { VALID_CHAIN_SET } from "@/lib/chains/networks";
import type { CheckoutPaymentOption } from "./checkout.functions";
const VALID_CHAINS = VALID_CHAIN_SET;
const VALID_STABLES = new Set(["USDC", "USDT", "PYUSD", "DAI", "TSD"]);

export async function readPublicInvoice(data: { id: string }) {
    // Synthetic demo invoice — powers the live SDK demo on /docs without DB seeding.
    if (data.id === "demo") {
      return {
        found: true as const,
        invoice: {
          id: "demo",
          chain: "btc" as string | null,
          tokenSymbol: null as string | null,
          fiatAmount: 1,
          fiatCurrency: "USD",
          cryptoAmount: 0.00001 as number | null,
          rate: 100000 as number | null,
          address: "bc1qexampledemoaddressxxxxxxxxxxxxxxxxxxx" as string | null,
          status: "pending" as const,
          description: "payHME live demo — no payment will be processed",
          redirectUrl: null,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        store: { name: "payHME demo", website: "https://pay.honest.money" },
        transactions: [] as Array<{ hash: string; amount: number | null; confirmations: number; confirmedAt: string | null; firstSeenAt: string | null }>,
        availableOptions: [] as CheckoutPaymentOption[],
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: initialInv, error } = await supabaseAdmin
      .from("invoices")
      .select(
        "id, chain, token_symbol, fiat_amount, fiat_currency, crypto_amount, rate, address, status, description, redirect_url, expires_at, created_at, store_id, payment_program, discount_usd, discount_pct",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!initialInv) return { found: false as const };

    let inv = initialInv;
    const { isBtcLikeChain } = await import("@/lib/chains/networks");
    if (
      inv.address &&
      isBtcLikeChain(inv.chain) &&
      !["confirmed", "overpaid", "expired", "cancelled", "failed"].includes(inv.status)
    ) {
      const { scanBtcLikeInvoiceNow } = await import("@/lib/watcher.functions");
      const changed = await scanBtcLikeInvoiceNow(inv.id).catch((e) => {
        console.error("instant invoice scan failed", e);
        return false;
      });
      if (changed) {
        const { data: freshInv } = await supabaseAdmin
          .from("invoices")
          .select(
            "id, chain, token_symbol, fiat_amount, fiat_currency, crypto_amount, rate, address, status, description, redirect_url, expires_at, created_at, store_id, payment_program, discount_usd, discount_pct",
          )
          .eq("id", data.id)
          .maybeSingle();
        if (freshInv) inv = freshInv;
      }
    }

    // Track "opened?" for merchant-issued payment requests (best effort).
    const viewedAt = new Date().toISOString();
    void supabaseAdmin
      .from("invoices")
      .update({ last_viewed_at: viewedAt })
      .eq("id", inv.id)
      .then(undefined, () => undefined);
    void supabaseAdmin
      .from("invoices")
      .update({ first_viewed_at: viewedAt })
      .eq("id", inv.id)
      .is("first_viewed_at", null)
      .then(undefined, () => undefined);




    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("name, website")
      .eq("id", inv.store_id)
      .maybeSingle();

    const { data: txs } = await supabaseAdmin
      .from("transactions")
      .select("tx_hash, amount, confirmations, confirmed_at, first_seen_at")
      .eq("invoice_id", inv.id)
      .order("first_seen_at", { ascending: false });

    // Build the full list of payment options: every enabled chain's native
    // asset + every stable the merchant has opted into per chain. For stables
    // enabled on the shared EVM xpub (chain="eth"), we list every EVM network
    // where the watcher will detect that token, since they all share the same
    // derived address — e.g. "USDC on Ethereum, Base or BSC".
    const { SUPPORTED_STABLES_BY_CHAIN, evmChainsForStable, EVM_CHAIN_LABEL, getOmniToken, pinPreferredOptions } = await import(
      "@/lib/chains/networks"
    );
    const NATIVE_LABEL: Record<string, string> = {
      btc: "Bitcoin",
      txc: "TEXITcoin",
      eth: "Ethereum",
      base: "Base",
      bsc: "BNB Smart Chain",
      tron: "Tron",
      sol: "Solana",
      doge: "Dogecoin",
      ltc: "Litecoin",
      bch: "Bitcoin Cash",
      dash: "Dash",
      isk: "Iskander",
      zcu: "ZCU",
      lightning: "Bitcoin Lightning",
    };
    const { data: cfgs } = await supabaseAdmin
      .from("chain_configs")
      .select("chain, stables")
      .eq("store_id", inv.store_id)
      .eq("enabled", true);

    function joinNetworks(names: string[]): string {
      if (names.length <= 1) return names.join("");
      if (names.length === 2) return `${names[0]} or ${names[1]}`;
      return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
    }

    // Per-chain native opt-in: for chains where the merchant can choose to
    // disable the native asset and only accept stablecoins, we only surface
    // the native option when the matching symbol is present in `stables`.
    const NATIVE_OPT_IN: Record<string, string> = { txc: "TXC", eth: "ETH", tron: "TRX", sol: "SOL" };

    const availableOptions: CheckoutPaymentOption[] = [];
    for (const cfg of cfgs ?? []) {
      const chain = cfg.chain as string;
      const enabled = ((cfg.stables ?? []) as string[]).map((s) => s.toUpperCase());
      const nativeOptIn = NATIVE_OPT_IN[chain];
      const includeNative = !nativeOptIn || enabled.includes(nativeOptIn);
      if (includeNative) {
        availableOptions.push({
          chain,
          tokenSymbol: null,
          key: chain,
          label: NATIVE_LABEL[chain] ?? chain.toUpperCase(),
        });
      }
      const allow = (SUPPORTED_STABLES_BY_CHAIN as Record<string, readonly string[] | undefined>)[chain] ?? [];
      for (const sym of allow) {
        if (sym === nativeOptIn) continue; // native handled above
        if (!enabled.includes(sym)) continue;
        let label: string;
        const omni = getOmniToken(chain, sym);
        if (omni) {
          label = omni.label;
        } else if (chain === "eth") {
          const nets = evmChainsForStable(sym).map((k) => EVM_CHAIN_LABEL[k]);
          label = `${sym} on ${joinNetworks(nets)}`;
        } else {
          label = `${sym} on ${NATIVE_LABEL[chain] ?? chain.toUpperCase()}`;
        }
        availableOptions.push({
          chain,
          tokenSymbol: sym,
          key: `${chain}:${sym}`,
          label,
        });
      }
    }


    return {
      found: true as const,
      invoice: {
        id: inv.id,
        chain: inv.chain as string | null,
        tokenSymbol: (inv.token_symbol ?? null) as string | null,
        fiatAmount: Number(inv.fiat_amount),
        fiatCurrency: inv.fiat_currency,
        cryptoAmount: inv.crypto_amount == null ? null : Number(inv.crypto_amount),
        rate: inv.rate == null ? null : Number(inv.rate),
        address: inv.address as string | null,
        status: inv.status,
        description: inv.description,
        redirectUrl: inv.redirect_url,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
      },
      store: store ? { name: store.name, website: store.website } : null,
      transactions: (txs ?? []).map((t) => ({
        hash: t.tx_hash,
        amount: t.amount == null ? null : Number(t.amount),
        confirmations: t.confirmations ?? 0,
        confirmedAt: t.confirmed_at,
        firstSeenAt: t.first_seen_at,
      })),
      availableOptions: pinPreferredOptions(availableOptions),
    };
}

export async function selectPublicInvoiceChain(data: { id: string; option: string }) {
    const [chainRaw, tokenRaw] = data.option.split(":");
    const chain = chainRaw.toLowerCase();
    const tokenSymbol = tokenRaw ? tokenRaw.toUpperCase() : null;
    if (!VALID_CHAINS.has(chain)) throw new Error("Unsupported chain.");
    if (tokenSymbol && !VALID_STABLES.has(tokenSymbol)) throw new Error("Unsupported token.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deriveInvoiceAddress } = await import("@/lib/invoice-derive.server");

    const { data: inv, error } = await supabaseAdmin
      .from("invoices")
      .select("id, store_id, chain, token_symbol, status, fiat_amount, expires_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Invoice not found.");
    if (inv.status !== "pending") throw new Error("Invoice is no longer pending.");
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      throw new Error("Invoice has expired.");
    }

    // Allow switching networks/tokens before any on-chain payment has been seen.
    if (inv.chain) {
      const { count } = await supabaseAdmin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", inv.id);
      if ((count ?? 0) > 0) {
        throw new Error("A payment has already been detected — option can't be changed.");
      }
      if (inv.chain === chain && (inv.token_symbol ?? null) === tokenSymbol) {
        return { ok: true as const };
      }
    }

    const derived = await deriveInvoiceAddress(
      inv.store_id,
      chain as never,
      Number(inv.fiat_amount),
      tokenSymbol,
      inv.id,
    );

    const { error: updErr } = await supabaseAdmin
      .from("invoices")
      .update({
        chain: chain as never,
        token_symbol: tokenSymbol,
        address: derived.address,
        crypto_amount: derived.cryptoAmount,
        rate: derived.rate,
        derivation_index: derived.index,
        address_index: derived.index,
      })
      .eq("id", inv.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true as const };
}
