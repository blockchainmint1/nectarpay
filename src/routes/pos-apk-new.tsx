// /pos-apk-new — test-build download page for the NectarPOS Android app.
// Not linked from navigation; Bobby opens it directly to sideload the
// latest APK onto a test terminal before a wider rollout.

import { createFileRoute } from "@tanstack/react-router";
import { Download, ShieldCheck, Smartphone } from "lucide-react";
import apkAsset from "@/assets/nectar-pos.apk.asset.json";

const APK_VERSION = "0.1.202610271433";
const APK_SIZE_MB = "18";
const APK_SHA256 = "036a0440bf890b9065f934237bd686a473d8365acfbeb71275584fc75080be84";

export const Route = createFileRoute("/pos-apk-new")({
  head: () => ({
    meta: [
      { title: "NectarPOS test build download — Nectar.Pay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApkDownloadPage,
});

function ApkDownloadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">NectarPOS — new test build</h1>
            <p className="text-sm text-muted-foreground">
              Version {APK_VERSION} &middot; {APK_SIZE_MB} MB &middot; built Oct 27, 2026
            </p>
          </div>
        </div>

        <a
          href="/pos-apk-new/download"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-5 w-5" />
          Download the app
        </a>

        <div className="rounded-lg border bg-card p-4 text-sm space-y-2">
          <p className="font-semibold">What changed in this build</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Card reader keeps listening after every tap — no more restarting the app</li>
            <li>Recovers automatically after a Tangem card tap</li>
            <li>Clear message if a tap wasn&apos;t read, instead of doing nothing</li>
          </ul>
        </div>

        <div className="rounded-lg border bg-card p-4 text-sm space-y-2">
          <p className="font-semibold">To install on the terminal</p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Open this page in the terminal&apos;s browser and tap Download.</li>
            <li>If Android asks, allow installing apps from that browser (Settings &rarr; Apps &rarr; Special access &rarr; Install unknown apps).</li>
            <li>Tap the downloaded file and confirm the install.</li>
          </ol>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            File checked before posting — SHA-256:{" "}
            <span className="font-mono break-all">{APK_SHA256}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
