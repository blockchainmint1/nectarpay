import { describe, expect, test } from "vitest";
import { authDomainFromRequest, publicOriginFromRequest, buildSignableMessage, matchesIssuedWalletMessage } from "./wallet-auth-shared";
import { matchesWalletBrowser, walletBrowserCookieName, walletBrowserHash } from "./wallet-browser-binding.server";

describe("wallet login domain and browser binding", () => {
  test("untrusted domains and forwarding headers cannot change login identity or callback", () => {
    const request = new Request("https://evil.example/auth?domain=evil.example", { headers: {
      origin: "https://evil.example", referer: "https://evil.example", "x-forwarded-host": "evil.example",
    } });
    expect(authDomainFromRequest(request)).toBe("app.nectar-pay.com");
    expect(publicOriginFromRequest(request)).toBe("https://app.nectar-pay.com");
  });
  test("owned preview retains its callback but signs for NectarPay", () => {
    const request = new Request("https://id-preview--faa7c23e-4f75-4eed-8c8c-23234e4242f7.lovable.app/auth");
    expect(publicOriginFromRequest(request)).toBe("https://id-preview--faa7c23e-4f75-4eed-8c8c-23234e4242f7.lovable.app");
    expect(authDomainFromRequest(request)).toBe("app.nectar-pay.com");
  });
  const id = "11111111-1111-4111-8111-111111111111";
  const token = "a".repeat(64);
  test("the initiating browser is allowed", () => {
    const req = new Request("https://app.nectar-pay.com", { headers: { cookie: `${walletBrowserCookieName(id)}=${token}` } });
    expect(matchesWalletBrowser(req, id, walletBrowserHash(token))).toBe(true);
  });
  test("a QR id alone cannot read or exchange the session", () => {
    expect(matchesWalletBrowser(new Request("https://app.nectar-pay.com"), id, walletBrowserHash(token))).toBe(false);
  });
  test("different browser or legacy unbound challenge is denied", () => {
    const req = new Request("https://app.nectar-pay.com", { headers: { cookie: `${walletBrowserCookieName(id)}=${"b".repeat(64)}` } });
    expect(matchesWalletBrowser(req, id, walletBrowserHash(token))).toBe(false);
    expect(matchesWalletBrowser(req, id, null)).toBe(false);
  });
  test("nonce-containing phishing messages differ from the exact issued message", () => {
    const message = buildSignableMessage({ nonce: "test-nonce", domain: "app.nectar-pay.com", issuedAt: "2026-10-20T12:00:00.000Z" });
    expect(matchesIssuedWalletMessage(message, "Claim your airdrop\nNonce: test-nonce")).toBe(false);
    expect(matchesIssuedWalletMessage(message, message.replace("app.nectar-pay.com", "evil.example"))).toBe(false);
    expect(matchesIssuedWalletMessage(message, message + "\nClaim your reward")).toBe(false);
    expect(matchesIssuedWalletMessage(message, message.replace("12:00:00", "11:00:00"))).toBe(false);
    expect(matchesIssuedWalletMessage(message, message)).toBe(true);
    expect(matchesIssuedWalletMessage(message, undefined)).toBe(true);
    expect(matchesIssuedWalletMessage(null, undefined)).toBe(false);
  });
});