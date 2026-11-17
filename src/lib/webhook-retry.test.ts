import { describe, expect, it } from "vitest";
import { WEBHOOK_MAX_ATTEMPTS, isDeliveredStatus, sortWebhookRows, webhookRetryDelayMs } from "./webhook-retry";

describe("store callback retries", () => {
  it("retries a failed first send after 1 minute", () => {
    expect(webhookRetryDelayMs(1)).toBe(60_000);
  });
  it("backs off to a day before the last try", () => {
    expect(webhookRetryDelayMs(7)).toBe(24 * 60 * 60_000);
  });
  it("stops after 8 attempts", () => {
    expect(WEBHOOK_MAX_ATTEMPTS).toBe(8);
    expect(webhookRetryDelayMs(8)).toBeNull();
  });
  it("only counts 2xx answers as delivered", () => {
    expect(isDeliveredStatus(200)).toBe(true);
    expect(isDeliveredStatus(301)).toBe(false);
    expect(isDeliveredStatus(500)).toBe(false);
    expect(isDeliveredStatus(null)).toBe(false);
  });
  it("sends invoice.paid before invoice.confirmed for the same sale", () => {
    const at = "2026-11-17T18:05:00.000Z";
    const sorted = sortWebhookRows([
      { created_at: at, event_type: "invoice.confirmed" },
      { created_at: at, event_type: "invoice.paid" },
    ]);
    expect(sorted.map((r) => r.event_type)).toEqual(["invoice.paid", "invoice.confirmed"]);
  });
});
