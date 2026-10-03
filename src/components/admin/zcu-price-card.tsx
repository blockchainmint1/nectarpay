import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { getZcuPrice, setZcuPrice } from "@/lib/zcu-admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ZcuPriceCard() {
  const get = useServerFn(getZcuPrice);
  const set = useServerFn(setZcuPrice);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["zcu-price"], queryFn: () => get() });
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const rate = Number(val);
    if (!(rate > 0)) return toast.error("Enter a price above zero.");
    setSaving(true);
    try {
      await set({ data: { rate } });
      toast.success(`ZCU price set to $${rate}`);
      setVal("");
      qc.invalidateQueries({ queryKey: ["zcu-price"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end justify-between gap-4 py-4">
        <div>
          <div className="text-sm font-medium">ZCU price (USD per ZCU)</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Updates automatically from the wZCU Uniswap pool (30-min average). Set it by hand only if the feed breaks — the next update replaces it. Customers can't pay in ZCU without a
            price is set. Current:{" "}
            <strong className="text-foreground">{data?.rate != null ? `$${data.rate}` : "not set"}</strong>
            {data?.updatedAt && <> · updated {new Date(data.updatedAt).toLocaleString()}</>}
            {" · "}{data?.storesOn ?? 0} store(s) accepting ZCU
          </p>
        </div>
        <div className="flex gap-2">
          <Input className="w-32" inputMode="decimal" placeholder="e.g. 0.05" value={val} onChange={(e) => setVal(e.target.value)} />
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Set price"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
