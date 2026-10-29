import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { deviceTimeZone } from "@/lib/timezone";
import { MY_TZ_KEY, useMyTimeZone } from "@/lib/use-timezone";
import { TimeZoneSelect } from "@/components/timezone-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AccountTimeZone() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { pref } = useMyTimeZone();
  const [value, setValue] = useState<string | null>(pref);
  const [busy, setBusy] = useState(false);
  const [device, setDevice] = useState("your device");
  useEffect(() => setValue(pref), [pref]);
  useEffect(() => setDevice(deviceTimeZone().replace(/_/g, " ")), []);

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ timezone: value }).eq("user_id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: MY_TZ_KEY });
      toast.success("Timezone saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save timezone");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-border bg-card/50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Show times in</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        How dates and times appear to you. Pick UTC if you prefer universal time. When a report is
        for one store with its own timezone set, that store's business day is used instead.
      </p>
      <div className="mt-4 space-y-2">
        <Label htmlFor="acct-tz">Timezone</Label>
        <TimeZoneSelect id="acct-tz" value={value} onChange={setValue} autoLabel={`Automatic (${device})`} />
      </div>
      <Button className="mt-4" onClick={save} disabled={busy || value === pref}>
        {busy ? "Saving…" : "Save timezone"}
      </Button>
    </section>
  );
}
