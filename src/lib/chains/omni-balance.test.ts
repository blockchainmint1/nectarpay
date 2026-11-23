import { describe, expect, it } from "vitest";

import type { EsploraTx } from "./btc-like.server";
import { omniBalanceFromTxs } from "./omni.server";
import { balancePages, firstBalanceIndex } from "../balance-pages";

const ME = "TmeAddress";
const PAYER = "TpayerAddress";

/** Omni simple send (type 0) of `amount` TSD (property 39, 8 decimals). */
function omniScript(amount: number, propertyId = 39): string {
  const amt = BigInt(Math.round(amount * 1e8)).toString(16).padStart(16, "0");
  const prop = propertyId.toString(16).padStart(8, "0");
  return `6a14` + `6f6d6e69` + `0000` + `0000` + prop + amt;
}

function tx(id: string, from: { addr: string; value: number }[], to: string, amount: number, prop = 39): EsploraTx {
  return {
    txid: id,
    vin: from.map((f) => ({ prevout: { scriptpubkey_address: f.addr, value: f.value } })),
    vout: [
      { scriptpubkey: omniScript(amount, prop), value: 0 },
      { scriptpubkey_address: to, value: 10000 },
    ],
    status: { confirmed: true, block_height: 1 },
  };
}

describe("TSD wallet balance", () => {
  it("counts a $400 TSD payment received at a sale address", () => {
    const txs = [tx("a", [{ addr: PAYER, value: 50000 }], ME, 400)];
    expect(omniBalanceFromTxs(txs, ME, 39, 8)).toBe(400);
  });

  it("subtracts TSD the merchant later sent out of that address", () => {
    const txs = [
      tx("a", [{ addr: PAYER, value: 50000 }], ME, 400),
      tx("b", [{ addr: ME, value: 10000 }, { addr: PAYER, value: 5000 }], PAYER, 150),
    ];
    expect(omniBalanceFromTxs(txs, ME, 39, 8)).toBe(250);
  });

  it("ignores tokens other than TSD", () => {
    const txs = [tx("a", [{ addr: PAYER, value: 50000 }], ME, 400, 7)];
    expect(omniBalanceFromTxs(txs, ME, 39, 8)).toBe(0);
  });
});

describe("addresses counted in the wallet balance", () => {
  it("covers every sale address from #1 to #56, not just the first 20", () => {
    const pages = balancePages({ derived: true, firstIndex: 1, lastIndex: 56 });
    const covered = pages.flatMap((p) => Array.from({ length: p.count }, (_, i) => p.start + i));
    expect(covered[0]).toBe(1);
    expect(covered[covered.length - 1]).toBe(56);
    expect(covered).toHaveLength(56);
  });

  it("includes address #0 for single-address Ethereum stores", () => {
    expect(balancePages({ derived: true, firstIndex: 0, lastIndex: 0 })).toEqual([{ start: 0, count: 1 }]);
  });

  it("counts address #0 when an older sale was paid there (mineTXC)", () => {
    expect(firstBalanceIndex({ isEvm: true, evmSingle: false, lowestSaleIndex: 0 })).toBe(0);
    expect(firstBalanceIndex({ isEvm: false, evmSingle: false, lowestSaleIndex: 0 })).toBe(0);
  });

  it("starts at #1 when no sale ever used #0", () => {
    expect(firstBalanceIndex({ isEvm: true, evmSingle: false, lowestSaleIndex: 1 })).toBe(1);
    expect(firstBalanceIndex({ isEvm: false, evmSingle: false, lowestSaleIndex: null })).toBe(1);
  });
});
