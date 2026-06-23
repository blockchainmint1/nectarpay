// POST /api/public/v1/terminals/pair
// Exchanges a one-shot pairing code for terminal credentials.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const Body = z.object({ code: z.string().min(4).max(16) });

export const Route = createFileRoute("/api/public/v1/terminals/pair")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parse = Body.safeParse(raw);
          if (!parse.success) return json({ error: "Bad request body." }, 400);

          const code = parse.data.code.trim().toUpperCase();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: codeRow } = await supabaseAdmin
            .from("terminal_pairing_codes")
            .select("id, store_id, label, expires_at, consumed_at")
            .eq("code", code)
            .maybeSingle();
          if (!codeRow) return json({ error: "Unknown pairing code." }, 404);
          if (codeRow.consumed_at) return json({ error: "Pairing code already used." }, 410);
          if (new Date(codeRow.expires_at).getTime() < Date.now()) {
            return json({ error: "Pairing code expired." }, 410);
          }

          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("id, name")
            .eq("id", codeRow.store_id)
            .maybeSingle();
          if (!store) return json({ error: "Store not found." }, 404);

          const { generateHmacSecretHex } = await import("@/lib/terminals.server");
          const secret = generateHmacSecretHex(32);

          // Insert terminal first.
          const { data: terminal, error: tErr } = await supabaseAdmin
            .from("terminals")
            .insert({
              store_id: codeRow.store_id,
              label: codeRow.label,
              hmac_secret_hash: secret, // see comment in terminals.server.ts re: storage
              last_seen_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (tErr || !terminal) return json({ error: tErr?.message ?? "Insert failed." }, 500);

          // Mark code consumed.
          await supabaseAdmin
            .from("terminal_pairing_codes")
            .update({ consumed_at: new Date().toISOString(), consumed_terminal_id: terminal.id })
            .eq("id", codeRow.id);

          const origin = new URL(request.url).origin;
          return json({
            terminal_id: terminal.id,
            hmac_secret: secret,
            store_id: store.id,
            store_name: store.name,
            api_base: origin,
          }, 201);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
