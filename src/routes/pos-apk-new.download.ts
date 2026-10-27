// /pos-apk-new/download — streams the NectarPOS test APK from CDN storage.
// Sets the proper Android package content type and attachment filename so
// the terminal's browser saves it as an installable .apk.

import { createFileRoute } from "@tanstack/react-router";
import apkAsset from "@/assets/nectar-pos.apk.asset.json";

const APK_FILENAME = "nectar-pos-0.1.202610271433.apk";

export const Route = createFileRoute("/pos-apk-new/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const upstream = await fetch(new URL(apkAsset.url, origin), {
          redirect: "follow",
          signal: AbortSignal.timeout(60_000),
        });
        if (!upstream.ok || !upstream.body) {
          return new Response("Download unavailable, try again", { status: 502 });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename="${APK_FILENAME}"`,
            "Content-Length": String(apkAsset.size),
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
