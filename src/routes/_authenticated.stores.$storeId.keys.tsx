import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, KeyRound, Copy, Check, Trash2, Plus, Webhook, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api-keys.functions";
import { getWebhookConfig, setWebhookUrl, rotateWebhookSecret } from "@/lib/webhooks.functions";

export const Route = createFileRoute("/_authenticated/stores/$storeId/keys")({
  head: () => ({ meta: [{ title: "API keys · payHME" }] }),
  component: KeysPage,
});

function KeysPage() {
  const { storeId } = Route.useParams();
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);

  const { data: keys, isLoading, refetch } = useQuery({
    queryKey: ["api-keys", storeId],
    queryFn: () => list({ data: { storeId } }),
  });

  const [label, setLabel] = useState("Default key");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMut = useMutation({
    mutationFn: () => create({ data: { storeId, label: label.trim() || "Default key" } }),
    onSuccess: (res) => {
      setFreshKey(res.fullKey);
      setLabel("Default key");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (keyId: string) => revoke({ data: { keyId } }),
    onSuccess: () => {
      toast.success("Key revoked.");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <KeyRound className="h-4 w-4" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Use these to authenticate server-side calls to <code>/api/public/v1/*</code>. We store only a
        hash — the full secret is shown once at creation.
      </p>

      {/* Create */}
      <div className="mt-8 rounded-lg border border-border bg-card/60 p-5">
        <Label htmlFor="label" className="text-xs">
          Label
        </Label>
        <div className="mt-1 flex gap-2">
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Production server"
          />
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {createMut.isPending ? "Creating…" : "Create key"}
          </Button>
        </div>

        {freshKey && (
          <div className="mt-4 rounded-md border border-primary/40 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">
              Copy this now — it will not be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
              <code className="flex-1 break-all font-mono text-xs">{freshKey}</code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(freshKey);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFreshKey(null)}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              I've saved it — dismiss
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="mt-6 space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !keys || keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No keys yet. Create one above.
          </div>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate font-medium">{k.label}</div>
                  {k.revoked_at && (
                    <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-destructive">
                      revoked
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                  {k.prefix}…
                  {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleString()}` : " · never used"}
                </div>
              </div>
              {!k.revoked_at && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Revoke "${k.label}"? This cannot be undone.`)) {
                      revokeMut.mutate(k.id);
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <WebhookSection storeId={storeId} />
    </div>
  );
}

function WebhookSection({ storeId }: { storeId: string }) {
  const getCfg = useServerFn(getWebhookConfig);
  const setUrl = useServerFn(setWebhookUrl);
  const rotate = useServerFn(rotateWebhookSecret);

  const { data: cfg, refetch } = useQuery({
    queryKey: ["webhook-config", storeId],
    queryFn: () => getCfg({ data: { storeId } }),
  });

  const [url, setUrlVal] = useState("");
  const [freshSecret, setFreshSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (cfg?.webhook_url != null) setUrlVal(cfg.webhook_url);
  }, [cfg?.webhook_url]);

  const saveMut = useMutation({
    mutationFn: () => setUrl({ data: { storeId, url } }),
    onSuccess: () => { toast.success("Webhook URL saved."); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rotateMut = useMutation({
    mutationFn: () => rotate({ data: { storeId } }),
    onSuccess: (res) => { setFreshSecret(res.secret); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="mt-10 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Webhook className="h-4 w-4" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Webhook</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        We POST a signed JSON event to this URL when an invoice is paid or underpaid.
        Verify the <code className="font-mono">X-TXCPay-Signature</code> header using your
        webhook secret. See{" "}
        <Link to="/docs" className="text-primary underline">the docs</Link> for the exact
        signing format and a Node verification snippet.
      </p>

      <div className="mt-4 rounded-lg border border-border bg-card/60 p-5">
        <Label htmlFor="whurl" className="text-xs">Webhook URL</Label>
        <div className="mt-1 flex gap-2">
          <Input
            id="whurl"
            value={url}
            onChange={(e) => setUrlVal(e.target.value)}
            placeholder="https://your-store.example.com/api/payhme/webhook"
          />
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save"}
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium">Webhook signing secret</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {cfg?.has_secret
                ? "A secret is configured. Rotating it invalidates the old one."
                : "No secret yet — generate one to start receiving signed webhooks."}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!cfg?.has_secret || confirm("Rotate the webhook secret? Old signatures will stop verifying.")) {
                rotateMut.mutate();
              }
            }}
            disabled={rotateMut.isPending}
          >
            <RotateCw className="mr-2 h-3.5 w-3.5" />
            {cfg?.has_secret ? "Rotate" : "Generate"}
          </Button>
        </div>

        {freshSecret && (
          <div className="mt-4 rounded-md border border-primary/40 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">
              Copy this now — it will not be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
              <code className="flex-1 break-all font-mono text-xs">{freshSecret}</code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(freshSecret);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFreshSecret(null)}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              I've saved it — dismiss
            </button>
          </div>
        )}
      </div>
    </>
  );
}
