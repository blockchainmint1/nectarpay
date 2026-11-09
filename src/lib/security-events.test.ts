import { describe, expect, it } from "vitest";
import { describeSecurityEvent, ownerShouldHear } from "./security-events";

const at = "2026-11-09T19:00:00Z";

describe("risky-change alerts", () => {
  it("covers every monitored change", () => {
    for (const kind of ["webhook_changed", "admin_granted", "store_admin_added", "api_key_created", "terminal_paired", "code_lockout"]) {
      const { subject, lines } = describeSecurityEvent({ kind, detail: {}, created_at: at }, { storeName: "Kira Gray" });
      expect(subject.length).toBeGreaterThan(5);
      expect(lines.length).toBeGreaterThan(0);
    }
  });

  it("never puts the webhook secret in the alert", () => {
    const { lines } = describeSecurityEvent(
      { kind: "webhook_changed", detail: { old_url: "https://a.test/h", new_url: "https://evil.test/h", secret_changed: true, secret: "whsec_TOPSECRET" }, created_at: at },
      { storeName: "Kira Gray", actorEmail: "x@y.com" },
    );
    expect(lines.join("\n")).not.toContain("TOPSECRET");
    expect(lines.join("\n")).toContain("https://evil.test/h");
  });

  it("store owners hear about their store, but new platform admins go only to admins", () => {
    expect(ownerShouldHear("api_key_created")).toBe(true);
    expect(ownerShouldHear("webhook_changed")).toBe(true);
    expect(ownerShouldHear("admin_granted")).toBe(false);
  });
});
