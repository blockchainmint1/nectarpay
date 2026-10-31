import { describe, expect, it } from "vitest";
import { buildWelcomeEmail, stickerUrl } from "./fast-welcome";

const base = { businessName: "Bob's <Diner>", contactName: "Bobby Smith", coinId: "dQdbix", email: "a@b.com", telegramLink: "https://t.me/TexitPayBot?start=abc" };

describe("fast merchant welcome email", () => {
  it("keeps the coin code's exact capitalization in the sticker link", () => {
    expect(stickerUrl("dQdbix")).toBe("https://app.nectar-pay.com/s/dQdbix");
    expect(buildWelcomeEmail(base).text).toContain("https://app.nectar-pay.com/s/dQdbix");
  });
  it("escapes the business name so it can't inject markup", () => {
    const { html } = buildWelcomeEmail(base);
    expect(html).not.toContain("<Diner>");
    expect(html).toContain("&lt;Diner&gt;");
  });
  it("omits the Telegram step when no link could be made", () => {
    expect(buildWelcomeEmail({ ...base, telegramLink: null }).html).not.toContain("t.me");
  });
});
