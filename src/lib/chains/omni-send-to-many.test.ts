import { expect, test } from "vitest";
import { decodeOmniScript, extractOmniIncoming } from "./omni.server";

const amt = (n: number) => BigInt(n).toString(16).padStart(16, "0");
// type 7, property 39 (0x27), 3 outputs -> vout 1,2,3
const body = "0000" + "0007" + "00000027" + "03" + "01" + amt(450_000_000) + "02" + amt(40_000_000) + "03" + amt(10_000_000);
const script = "6a" + (4 + body.length / 2).toString(16) + "6f6d6e69" + body;

test("decodes send-to-many outputs", () => {
  const p = decodeOmniScript(script)!;
  expect(p.type).toBe(7);
  expect(p.outputs?.map((o) => o.vout)).toEqual([1, 2, 3]);
});

test("credits only the slice addressed to the invoice", () => {
  const tx = {
    txid: "a".repeat(64),
    vin: [{ prevout: { scriptpubkey_address: "customer" } }],
    vout: [{ scriptpubkey: script }, { scriptpubkey_address: "merchant" }, { scriptpubkey_address: "church" }, { scriptpubkey_address: "program" }],
    status: { confirmed: false },
  } as never;
  const [c] = extractOmniIncoming([tx], "merchant", 39, 8, 100);
  expect(c.amount).toBe(4.5);
  expect(c.sendToMany).toBe(true);
});
