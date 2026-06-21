import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExportFormat = "invoices_csv" | "transactions_csv" | "quickbooks_csv" | "json";

export type ExportFilters = {
  format: ExportFormat;
  storeId?: string | null;
  status?: string | null;
  chain?: string | null;
  fromDate?: string | null; // ISO
  toDate?: string | null;   // ISO
};

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return lines.join("\n");
}

const CHAIN_LABEL: Record<string, string> = {
  btc: "Bitcoin",
  txc: "TEXITcoin",
  eth: "Ethereum",
  base: "Base",
  tron: "Tron",
  sol: "Solana",
};

export const runExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ExportFilters) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let query = supabase
      .from("invoices")
      .select(
        "id, store_id, chain, fiat_amount, fiat_currency, crypto_amount, rate, address, status, external_order_id, description, expires_at, created_at, updated_at, stores!inner(id, name, website), transactions(tx_hash, amount, confirmations, block_height, first_seen_at, confirmed_at)"
      )
      .order("created_at", { ascending: false });

    if (data.storeId) query = query.eq("store_id", data.storeId);
    if (data.status) query = query.eq("status", data.status as any);
    if (data.chain) query = query.eq("chain", data.chain as any);
    if (data.fromDate) query = query.gte("created_at", data.fromDate);
    if (data.toDate) query = query.lte("created_at", data.toDate);

    const { data: rows, error } = await query.limit(10000);
    if (error) throw new Error(error.message);

    const invoices = (rows ?? []) as any[];
    const filenameBase = `payhme-${data.format}-${new Date().toISOString().slice(0, 10)}`;

    if (data.format === "json") {
      return {
        filename: `${filenameBase}.json`,
        mime: "application/json",
        content: JSON.stringify({ exported_at: new Date().toISOString(), count: invoices.length, invoices }, null, 2),
      };
    }

    if (data.format === "invoices_csv") {
      const headers = [
        "invoice_id", "created_at", "status", "store_name", "store_website",
        "chain", "fiat_amount", "fiat_currency", "crypto_amount", "rate",
        "address", "external_order_id", "description", "expires_at",
        "tx_count", "first_tx_hash", "confirmed_at",
      ];
      const out = invoices.map((i) => {
        const tx = (i.transactions ?? [])[0];
        return [
          i.id, i.created_at, i.status, i.stores?.name ?? "", i.stores?.website ?? "",
          i.chain, i.fiat_amount, i.fiat_currency, i.crypto_amount, i.rate,
          i.address, i.external_order_id ?? "", i.description ?? "", i.expires_at,
          (i.transactions ?? []).length, tx?.tx_hash ?? "", tx?.confirmed_at ?? "",
        ];
      });
      return { filename: `${filenameBase}.csv`, mime: "text/csv", content: toCsv(headers, out) };
    }

    if (data.format === "transactions_csv") {
      const headers = [
        "tx_hash", "invoice_id", "store_name", "chain", "amount_crypto", "fiat_amount",
        "fiat_currency", "confirmations", "block_height", "first_seen_at", "confirmed_at",
        "address", "status",
      ];
      const out: unknown[][] = [];
      for (const i of invoices) {
        for (const t of i.transactions ?? []) {
          out.push([
            t.tx_hash, i.id, i.stores?.name ?? "", i.chain, t.amount,
            i.fiat_amount, i.fiat_currency, t.confirmations, t.block_height ?? "",
            t.first_seen_at, t.confirmed_at ?? "", i.address, i.status,
          ]);
        }
      }
      return { filename: `${filenameBase}.csv`, mime: "text/csv", content: toCsv(headers, out) };
    }

    // QuickBooks Online — Sales Receipt CSV (3-column import format)
    // Columns match QBO's Sales Receipt CSV import schema.
    const headers = [
      "SalesReceiptNo", "Customer", "SalesReceiptDate", "DueDate",
      "Terms", "Location", "Memo", "Item(Product/Service)",
      "ItemDescription", "ItemQuantity", "ItemRate", "ItemAmount",
      "ItemTaxCode", "ItemTaxAmount", "Currency",
    ];
    const out = invoices
      .filter((i) => i.status === "confirmed" || i.status === "overpaid")
      .map((i) => {
        const date = (i.created_at ?? "").slice(0, 10);
        const memo = `payHME invoice ${i.id} · ${CHAIN_LABEL[i.chain] ?? i.chain}`;
        const desc = i.description || `Crypto payment (${CHAIN_LABEL[i.chain] ?? i.chain})`;
        return [
          i.external_order_id || i.id.slice(0, 8),
          i.stores?.name || "Crypto Customer",
          date, date,
          "", "", memo,
          "Crypto Payment", desc,
          1, i.fiat_amount, i.fiat_amount,
          "Non", 0, i.fiat_currency,
        ];
      });
    return { filename: `${filenameBase}.csv`, mime: "text/csv", content: toCsv(headers, out) };
  });
