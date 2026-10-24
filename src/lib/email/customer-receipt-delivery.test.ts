import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn(), from: vi.fn(), render: vi.fn().mockResolvedValue("Receipt") }));
vi.mock("./ses.server", () => ({ sendSesEmail: mocks.send }));
vi.mock("@react-email/render", () => ({ render: mocks.render }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
import { sendCustomerReceipt } from "./customer-receipt.server";

function query(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "single", "insert", "update"]) chain[method] = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result));
  return chain;
}

const invoice = { id: "sale-1", status: "confirmed", customer_email: "buyer@example.com", buyer_email: null, fiat_amount: 123.25, fiat_currency: "USD", chain: "txc", token_symbol: "TSD", description: "subtotal:10000 tax:825 tip:1500", external_order_id: "order-1", stores: { name: "Test merchant" } };

describe("receipt delivery", () => {
  beforeEach(() => { mocks.from.mockReset(); mocks.send.mockReset(); });
  it("reads a paid sale, claims it, sends to the saved customer, and records acceptance", async () => {
    mocks.from.mockReturnValueOnce(query({ data: invoice, error: null })).mockReturnValueOnce(query({ error: null })).mockReturnValueOnce(query({ error: null }));
    mocks.send.mockResolvedValue({ messageId: "accepted-1" });
    expect(await sendCustomerReceipt("sale-1")).toEqual({ sent: true });
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: "buyer@example.com" }));
  });
  it("does not send the same accepted receipt again", async () => {
    mocks.from.mockReturnValueOnce(query({ data: invoice, error: null })).mockReturnValueOnce(query({ error: { code: "23505" } })).mockReturnValueOnce(query({ data: { status: "sent" } }));
    expect(await sendCustomerReceipt("sale-1")).toEqual({ sent: true });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("returns a failure instead of pretending a rejected email was sent", async () => {
    mocks.from.mockReturnValueOnce(query({ data: invoice, error: null })).mockReturnValueOnce(query({ error: null })).mockReturnValueOnce(query({ error: null }));
    mocks.send.mockRejectedValue(new Error("SES rejection"));
    expect(await sendCustomerReceipt("sale-1")).toEqual({ sent: false, error: "The receipt could not be sent. Please try again." });
  });
});