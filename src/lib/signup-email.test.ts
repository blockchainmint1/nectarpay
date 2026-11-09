import { describe, expect, it } from "vitest";
import { domainBlocked, friendlySignupError, testAccountFlag, BLOCKED_SIGNUP_MESSAGE } from "./signup-email";

const BLOCKED = ["example.com", "fldubai.com", "mailinator.com"];

describe("sign-up email screening", () => {
  it("blocks throwaway inboxes and their subdomains", () => {
    expect(domainBlocked("nrpw35837a@fldubai.com", BLOCKED)).toBe(true);
    expect(domainBlocked("x@eu.mailinator.com", BLOCKED)).toBe(true);
    expect(domainBlocked("marci.martinez@gmail.com", BLOCKED)).toBe(false);
  });

  it("never blocks wallet logins", () => {
    expect(domainBlocked("tabc@wallet.payhme.local", ["wallet.payhme.local", "payhme.local"])).toBe(false);
  });

  it("does not treat a lookalike domain as blocked", () => {
    expect(domainBlocked("a@notexample.com", BLOCKED)).toBe(false);
  });

  it("shows a plain message when the backend refuses the sign-up", () => {
    expect(friendlySignupError("Database error saving new user")).toBe(BLOCKED_SIGNUP_MESSAGE);
    expect(friendlySignupError("Email rate limit exceeded")).toBe("Email rate limit exceeded");
  });
});

describe("admin test-account flag", () => {
  it("flags the robot accounts seen in Admin", () => {
    expect(testAccountFlag("nrp23419b1794244376@example.com", BLOCKED)).toBe("Test address");
    expect(testAccountFlag("i53978.1794114997@fldubai.com", BLOCKED)).toBe("Throwaway inbox");
    expect(testAccountFlag("qa.nectar.z1794106094@gmail.com")).toBe("Test-style name");
    expect(testAccountFlag("bob1794244376@gmail.com")).toBe("Robot-made name");
  });

  it("leaves real people and wallet logins alone", () => {
    expect(testAccountFlag("marci.martinez@gmail.com", BLOCKED)).toBeNull();
    expect(testAccountFlag("billcookceo@gmail.com", BLOCKED)).toBeNull();
    expect(testAccountFlag("tgxx1794244376@wallet.payhme.local", BLOCKED)).toBeNull();
  });
});
