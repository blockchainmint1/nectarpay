import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const Query = z.object({
  q: z.string().max(60).optional(),
  code: z.string().regex(/^[A-Za-z0-9]{2,12}$/).optional(),
});

// Public, signed list of approved churches. Program address is never included.
export const Route = createFileRoute("/api/public/v1/egiving/causes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const parsed = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!parsed.success) {
          return Response.json({ error: { code: "invalid_query", message: "q ≤ 60 chars; code is 2–12 letters/digits" } }, { status: 400, headers: CORS });
        }
        const secret = process.env.EGIVING_LIST_SIGNING_KEY;
        if (!secret) return Response.json({ error: { code: "unavailable", message: "Signing not configured" } }, { status: 503, headers: CORS });
        try {
          const url = process.env.SUPABASE_URL!;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const sb = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
            global: {
              fetch: (input, init) => {
                const h = new Headers(init?.headers);
                if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
                h.set("apikey", key);
                return fetch(input, { ...init, headers: h });
              },
            },
          });
          const { data, error } = await sb.rpc("get_public_egiving_causes");
          if (error) throw new Error(error.message);
          const { filterCauses, buildSignedList, signerKey } = await import("@/lib/egiving-causes");
          const causes = filterCauses((data ?? []) as never, parsed.data);
          return Response.json(buildSignedList(causes, signerKey(secret)), {
            headers: { ...CORS, "Cache-Control": "public, max-age=60" },
          });
        } catch (e) {
          console.error("[egiving causes] failed", e);
          return Response.json({ error: { code: "unavailable", message: "Cause list temporarily unavailable" } }, { status: 503, headers: CORS });
        }
      },
    },
  },
});
