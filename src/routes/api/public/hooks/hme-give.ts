import { createFileRoute } from "@tanstack/react-router";

// HME Give pushes its signed church list here (or an empty ping to make us
// re-fetch). No secret needed: a list is applied only if HME Give's pinned
// signer signed it, and only if it is newer than the one we already have.
export const Route = createFileRoute("/api/public/hooks/hme-give")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const text = await request.text();
        if (text.length > 1_000_000) return Response.json({ ok: false, error: "too large" }, { status: 413 });
        let body: unknown = null;
        try { body = text ? JSON.parse(text) : null; } catch { return Response.json({ ok: false, error: "invalid JSON" }, { status: 400 }); }
        const { applySignedRegistry, syncHmeGive } = await import("@/lib/hme-give-registry.server");
        const hasList = !!body && typeof (body as { signed_payload?: unknown }).signed_payload === "string";
        const r = hasList ? await applySignedRegistry(body) : await syncHmeGive(20);
        return Response.json(r, { status: r.ok ? 200 : 400 });
      },
    },
  },
});
