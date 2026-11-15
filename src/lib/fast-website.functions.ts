import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { fastWebsiteUrl, WEBSITE_LOOKUP_LIMITS, websiteLookupAllowed } from "./fast-website";
import { clientIpFromHeaders } from "./fast-enroll";

const BUSY = { ok: false as const, message: "Website lookup is busy right now. You can still enter the details yourself." };

export const lookupFastWebsite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ website: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const url = fastWebsiteUrl(data.website);
    const key = process.env["FIRECRAWL_API_KEY"];
    const gatewayKey = process.env["LOVABLE_API_KEY"];
    if (!key || !gatewayKey) return { ok: false as const, message: "Website lookup isn't available right now. You can still enter the details." };

    // Public page, paid scraping: cap each visitor and the whole site.
    const ip = clientIpFromHeaders((name) => getRequestHeader(name) ?? null) ?? "unknown";
    try {
      const { bumpPublicRate } = await import("./public-rate.server");
      const [mine, everyone] = await Promise.all([
        bumpPublicRate("fast_website_ip", ip, WEBSITE_LOOKUP_LIMITS.perVisitorWindowSec),
        bumpPublicRate("fast_website_all", "all", WEBSITE_LOOKUP_LIMITS.siteWindowSec),
      ]);
      if (!websiteLookupAllowed(mine, everyone)) return BUSY;
    } catch (err) {
      console.error("website lookup throttle failed", err);
      return BUSY;
    }

    const { readFastWebsite } = await import("./fast-website.server");
    return readFastWebsite(url, key, gatewayKey);
  });
