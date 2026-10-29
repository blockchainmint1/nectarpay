import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { timeZoneOptions } from "@/lib/timezone";

const AUTO = "__auto__";

/** Timezone picker; `value` null means the automatic option. */
export function TimeZoneSelect({
  id,
  value,
  onChange,
  autoLabel,
}: {
  id?: string;
  value: string | null;
  onChange: (tz: string | null) => void;
  autoLabel: string;
}) {
  const zones = useMemo(() => timeZoneOptions(), []);
  return (
    <Select value={value ?? AUTO} onValueChange={(v) => onChange(v === AUTO ? null : v)}>
      <SelectTrigger id={id} className="w-full max-w-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={AUTO}>{autoLabel}</SelectItem>
        {zones.map((z) => (
          <SelectItem key={z} value={z}>
            {z === "UTC" ? "UTC (universal time)" : z.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
