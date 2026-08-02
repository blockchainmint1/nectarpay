import { createFileRoute } from "@tanstack/react-router";

/**
 * IPFS mirror of the latest signed POS APK.
 *   app.nectar-pay.com/pos-apk-ipfs → dedicated Pinata gateway (or public ipfs.io)
 */
export const APK_IPFS_CID =
  "bafybeifyk6nbm22moiyjzmu3jldngc3jqkrsayfcl72xfz5jzmbhzd77ui";
export const APK_IPFS_FILENAME = "nectar-pos-0.1.202608020933.apk";

export const Route = createFileRoute("/pos-apk-ipfs")({
  server: {
    handlers: {
      GET: async () => {
        const gw = (process.env.PINATA_GW || "ipfs.io").replace(/^https?:\/\//, "").replace(/\/$/, "");
        return new Response(null, {
          status: 302,
          headers: {
            Location: `https://${gw}/ipfs/${APK_IPFS_CID}?filename=${APK_IPFS_FILENAME}`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
