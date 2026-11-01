import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fastWebsiteUrl } from "./fast-website";

export const lookupFastWebsite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ website: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const url = fastWebsiteUrl(data.website);
    const key = process.env["FIRECRAWL_API_KEY"];
    const gatewayKey = process.env["LOVABLE_API_KEY"];
    if (!key || !gatewayKey) return { ok: false as const, message: "Website lookup isn't available right now. You can still enter the details." };
    const { readFastWebsite } = await import("./fast-website.server");
    return readFastWebsite(url, key, gatewayKey);
  });