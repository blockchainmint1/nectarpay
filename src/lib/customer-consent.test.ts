import { beforeEach, expect, it, vi } from "vitest";
const { upsert, single, from } = vi.hoisted(() => ({ upsert: vi.fn(), single: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from } }));
import { recordCustomerConsent } from "./customer-consent.server";
beforeEach(() => {
  vi.clearAllMocks();
  from.mockImplementation((name: string) => name === "stores" ? { select: () => ({ eq: () => ({ single }) }) } : { upsert });
  single.mockResolvedValue({ data: { name: "Bobby's Store" }, error: null });
  upsert.mockResolvedValue({ error: null });
});
it("never writes consent when the optional box is unchecked", async () => {
  await recordCustomerConsent("store-a", "sale-a", "buyer@example.com", false, "pos");
  expect(from).not.toHaveBeenCalled();
});
it("records affirmative consent with the exact store, email, sale, source, wording and time", async () => {
  await recordCustomerConsent("store-a", "sale-a", "buyer@example.com", true, "pos");
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ store_id: "store-a", invoice_id: "sale-a", email: "buyer@example.com", source: "pos", consent_text: "Send me updates and special deals from Bobby's Store.", consented_at: expect.any(String), revoked_at: null }), { onConflict: "store_id,email" });
});
it("records checkout opt-in separately from transactional receipt delivery", async () => {
  await recordCustomerConsent("store-b", "sale-b", "buyer@example.com", true, "checkout");
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ store_id: "store-b", source: "checkout" }), expect.anything());
});
it("surfaces consent storage failure rather than pretending signup succeeded", async () => {
  upsert.mockResolvedValue({ error: { message: "denied" } });
  await expect(recordCustomerConsent("store-a", "sale-a", "buyer@example.com", true, "pos")).rejects.toThrow("Could not save signup preference.");
});