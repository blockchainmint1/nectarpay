import { createHash, timingSafeEqual } from "crypto";

export function walletBrowserHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function walletBrowserCookieName(id: string): string {
  return `nectar_wallet_${id}`;
}

export function matchesWalletBrowser(request: Request, id: string, expected: string | null): boolean {
  if (!expected) return false;
  const name = walletBrowserCookieName(id);
  const value = request.headers.get("cookie")?.split(";").map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`))?.slice(name.length + 1);
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return false;
  const actual = Buffer.from(walletBrowserHash(value));
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}