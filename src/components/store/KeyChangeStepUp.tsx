import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cancelPendingChainKey, saveChainKey, type SaveChainKeyResult } from "@/lib/chain-keys.functions";
import { requestWalletLinkVerification } from "@/lib/wallet-link.functions";

type SaveInput = {
  storeId: string;
  chain: "txc" | "btc" | "eth" | "ltc" | "bch" | "doge" | "dash" | "tron" | "sol" | "lightning" | "zcu";
  value: string | null;
  enabled: boolean;
  stables: string[];
};

export function keyActivationTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

/**
 * Save a wallet key through the server, asking for the emailed 6-digit code
 * when required. Resolves null if the person backs out of the code prompt.
 */
export function useKeyChangeSave(storeId: string) {
  const saveFn = useServerFn(saveChainKey);
  const requestCode = useServerFn(requestWalletLinkVerification);
  const [prompt, setPrompt] = useState<{
    sentTo: string;
    input: SaveInput;
    resolve: (r: SaveChainKeyResult | null) => void;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  function announce(res: SaveChainKeyResult) {
    if (res.status === "scheduled") {
      toast.success(
        `New wallet key saved. For your safety it takes over ${keyActivationTime(res.activatesAt)} — sales keep paying your current wallet until then.`,
        { duration: 10_000 },
      );
    }
  }

  async function save(input: SaveInput): Promise<SaveChainKeyResult | null> {
    const res = await saveFn({ data: input });
    if (res.status !== "code_required") {
      announce(res);
      return res;
    }
    const sent = await requestCode({ data: { storeId } });
    setCode("");
    return new Promise((resolve) => setPrompt({ sentTo: sent.sent_to, input, resolve }));
  }

  async function confirm() {
    if (!prompt) return;
    setBusy(true);
    try {
      const res = await saveFn({ data: { ...prompt.input, verificationCode: code.replace(/\D/g, "") } });
      if (res.status === "code_required") throw new Error("Enter the 6-digit code from your email.");
      announce(res);
      prompt.resolve(res);
      setPrompt(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    prompt?.resolve(null);
    setPrompt(null);
  }

  const dialog = (
    <Dialog open={!!prompt} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Confirm this wallet change
          </DialogTitle>
          <DialogDescription>
            We emailed a 6-digit code to {prompt?.sentTo ?? "your email"}. Changing where payments go always needs it.
          </DialogDescription>
        </DialogHeader>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="text-center font-mono text-lg tracking-[0.4em]"
          aria-label="6-digit code from your email"
        />
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button onClick={confirm} disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { save, dialog };
}

/** Shown on a coin while a replacement key waits out its 4 hours. */
export function PendingKeyNotice({
  storeId,
  chain,
  activatesAt,
  pendingKey,
  onChanged,
}: {
  storeId: string;
  chain: SaveInput["chain"];
  activatesAt: string;
  pendingKey: string | null;
  onChanged: () => void;
}) {
  const cancel = useServerFn(cancelPendingChainKey);
  const [busy, setBusy] = useState(false);
  const short = pendingKey && pendingKey.length > 20 ? `${pendingKey.slice(0, 8)}…${pendingKey.slice(-6)}` : pendingKey;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
      <div className="flex min-w-0 items-start gap-2">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-medium">New wallet key waiting: takes over {keyActivationTime(activatesAt)}</p>
          <p className="text-muted-foreground">
            {short ? <code className="break-all">{short}</code> : null} Sales keep paying your current wallet until then. Didn't do this? Cancel it now.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await cancel({ data: { storeId, chain } });
            toast.success("Wallet change cancelled — your current wallet stays.");
            onChanged();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not cancel.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Cancel change
      </Button>
    </div>
  );
}
