// /setup — merchant self-service setup hub.
// First tile: POS Terminal APK download with QR code.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Smartphone, Download, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { qrToDataURL } from "@/lib/qr";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

const FALLBACK_APK_URL =
  "https://txc.mypinata.cloud/ipfs/bafybeif2wk2yybdyaqh7654devwzyhhdhd6v2ddhjemcrgpdwmgcmm6rue";
const FALLBACK_APK_VERSION = "0.1.202607080352";
const GITHUB_RELEASES_API =
  "https://api.github.com/repos/blockchainmint1/nectarpay/releases/latest";

type ApkRelease = { url: string; version: string };

async function fetchLatestApkRelease(): Promise<ApkRelease> {
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const data = (await res.json()) as {
      tag_name?: string;
      name?: string;
      body?: string;
      assets?: { name: string; browser_download_url: string }[];
    };
    const version = data.tag_name || data.name || FALLBACK_APK_VERSION;
    const apkAsset = data.assets?.find((a) => a.name.toLowerCase().endsWith(".apk"));
    if (apkAsset) return { url: apkAsset.browser_download_url, version };
    const urlMatch = data.body?.match(/https?:\/\/\S+/);
    if (urlMatch) return { url: urlMatch[0].replace(/[),.]+$/, ""), version };
    return { url: FALLBACK_APK_URL, version };
  } catch {
    return { url: FALLBACK_APK_URL, version: FALLBACK_APK_VERSION };
  }
}

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Setup — NectarPay" },
      {
        name: "description",
        content:
          "Download the NectarPay POS APK and set up your Senraise terminal in minutes.",
      },
      { property: "og:title", content: "Setup — NectarPay" },
      {
        property: "og:description",
        content: "Scan a QR code from your Senraise terminal to install NectarPay POS.",
      },
    ],
  }),
  component: SetupPage,
});

function useLatestApkRelease() {
  const [release, setRelease] = useState<ApkRelease>({
    url: FALLBACK_APK_URL,
    version: FALLBACK_APK_VERSION,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const latest = await fetchLatestApkRelease();
      if (!cancelled) setRelease(latest);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return release;
}

function SetupPage() {
  const [apkOpen, setApkOpen] = useState(false);
  const release = useLatestApkRelease();

  return (
    <>
      <MarketingNav />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Setup</h1>
          <p className="mt-2 text-muted-foreground">
            Everything you need to get your terminal and store live.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setApkOpen(true)}
            className="text-left"
          >
            <Card className="group h-full p-6 transition hover:border-primary hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Smartphone className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold">POS Terminal Setup</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Install NectarPay POS on your Senraise terminal. Tap to see a QR
                code you can scan directly from the terminal.
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Get the APK <Download className="h-4 w-4" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Latest version: <span className="font-mono font-medium">{release.version}</span>
              </p>
            </Card>
          </button>
        </div>
      </div>

      <ApkQrDialog open={apkOpen} onOpenChange={setApkOpen} release={release} />
      <MarketingFooter />
    </>
  );
}

function ApkQrDialog({
  open,
  onOpenChange,
  release,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  release: ApkRelease;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDataUrl(null);
    (async () => {
      try {
        const url = await qrToDataURL(release.url, {
          width: 512,
          margin: 1,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, release.url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>NectarPay POS — APK</DialogTitle>
          <DialogDescription>
            Scan this QR code from your Senraise terminal's browser or camera to
            download the latest NectarPay POS installer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-xl border bg-white p-4">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="APK download QR code"
                width={256}
                height={256}
                className="h-64 w-64"
              />
            ) : (
              <div className="h-64 w-64 animate-pulse rounded bg-muted" />
            )}
          </div>

          <p className="text-center text-sm font-medium text-muted-foreground">
            Version ID: <span className="font-mono">{release.version}</span>
          </p>

          <div className="w-full break-all rounded-md bg-muted p-3 text-center font-mono text-xs">
            {release.url}
          </div>

          <Button asChild className="w-full">
            <a href={release.url} target="_blank" rel="noreferrer">
              Open link <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>


          <p className="text-center text-xs text-muted-foreground">
            After download, tap the APK and allow installation from this source.
            You'll only need to do this once per terminal.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
