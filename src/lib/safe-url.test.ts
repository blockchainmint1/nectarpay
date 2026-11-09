import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, safeHttpUrl } from "./safe-url";

describe("shopper redirect links", () => {
  it("allows normal web links", () => {
    expect(safeHttpUrl("https://store.example.com/thanks")).toBe("https://store.example.com/thanks");
    expect(isSafeHttpUrl("http://shop.test/ok?x=1")).toBe(true);
  });

  it("refuses script and local-content links", () => {
    for (const bad of [
      "javascript:alert(1)",
      " JavaScript:window.__canary='x'",
      "java\tscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "blob:https://app.nectar-pay.com/x",
      "//evil.example.com",
      "",
      null,
    ]) {
      expect(safeHttpUrl(bad as string | null)).toBeNull();
    }
  });
});
