
function StablecoinSuggestionDialog({
  open,
  onOpenChange,
  storeId,
  ethRow,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  ethRow: Row;
  onApplied: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function onAgree() {
    setBusy(true);
    try {
      const suggested = ["USDT", "USDC", "PYUSD"];
      const mergedStables = Array.from(new Set([...(ethRow.stables ?? []), ...suggested]));
      const payload = {
        store_id: storeId,
        chain: "eth" as const,
        network: "mainnet",
        xpub: ethRow.xpub,
        xpub_or_address: ethRow.xpub_or_address || ethRow.xpub || "",
        enabled: true,
        stables: mergedStables,
      };
      const { error } = await supabase
        .from("chain_configs")
        .upsert(payload, { onConflict: "store_id,chain" });
      if (error) throw error;
      toast.success("EVM stablecoins enabled — USDT, USDC, PYUSD.");
      onApplied();
      onOpenChange(false);
    } catch (e) {
      console.error("enable stables failed", e);
      toast.error(e instanceof Error ? e.message : "Could not enable stablecoins.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Enable stablecoins on EVM?
          </AlertDialogTitle>
          <AlertDialogDescription>
            We suggest turning on <span className="font-medium text-foreground">USDT</span>,{" "}
            <span className="font-medium text-foreground">USDC</span>, and{" "}
            <span className="font-medium text-foreground">PYUSD</span> on EVM for starters — the
            most-used dollar rails your customers already hold. You can change this anytime below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Not now</AlertDialogCancel>
          <AlertDialogAction onClick={onAgree} disabled={busy}>
            {busy ? "Enabling…" : "Agreed — enable"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
