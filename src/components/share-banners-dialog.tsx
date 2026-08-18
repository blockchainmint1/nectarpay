// "Banner 1 / 2 / 3" promo art for a store share link — previewed in a
// dialog, downloadable as PNG, with a ready-to-paste HTML embed snippet.

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BANNERS,
  bannerDataUrl,
  downloadDataUrl,
  type BannerId,
} from "@/lib/share-banners";

export function ShareBannersDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  url,
  donation,
  slug,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle: string;
  url: string;
  donation: boolean;
  slug: string;
}) {
  const [active, setActive] = useState<BannerId>("email");
  const [images, setImages] = useState<Partial<Record<BannerId, string>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setImages({});
  }, [url, title, subtitle, donation]);

  useEffect(() => {
    if (!open || images[active]) return;
    let cancelled = false;
    setBusy(true);
    bannerDataUrl({ id: active, title, subtitle, url, donation })
      .then((d) => {
        if (!cancelled) setImages((prev) => ({ ...prev, [active]: d }));
      })
      .catch(() => toast.error("Could not render that banner."))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [open, active, images, title, subtitle, url, donation]);

  const spec = BANNERS.find((b) => b.id === active)!;
  const src = images[active];

  const embed = `<a href="${url}"><img src="YOUR-IMAGE-URL.png" alt="${donation ? "Donate" : "Pay"} with crypto — ${title}" width="${Math.min(spec.width, 600)}" style="max-width:100%;border:0;" /></a>`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share banners</DialogTitle>
          <DialogDescription>
            On-brand artwork with Buzzy and your live QR code. Download the PNG and drop it into
            emails, newsletters, social posts, or print it for the counter.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {BANNERS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setActive(b.id)}
              className={`h-9 rounded-md border px-3 text-sm ${
                active === b.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.name.split(" — ")[0]}
            </button>
          ))}
        </div>

        <div>
          <div className="text-sm font-medium">{spec.name}</div>
          <p className="text-xs text-muted-foreground">
            {spec.blurb} · {spec.size} px
          </p>
        </div>

        <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
          {src ? (
            <img
              src={src}
              alt={spec.name}
              className="max-h-[46vh] w-auto max-w-full rounded-md shadow-lg"
            />
          ) : (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Rendering…
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!src}
            onClick={() => src && downloadDataUrl(src, `nectarpay-${slug}-${active}.png`)}
          >
            <Download className="mr-1 h-4 w-4" /> Download PNG
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(embed);
                toast.success("Embed snippet copied");
              } catch {
                toast.error("Copy failed");
              }
            }}
          >
            Copy HTML embed
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Host the downloaded PNG anywhere (your site, your email tool&apos;s image library), then
          paste the snippet so the image links straight to your payment page.
        </p>
      </DialogContent>
    </Dialog>
  );
}
