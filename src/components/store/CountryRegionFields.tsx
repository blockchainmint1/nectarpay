import { useMemo } from "react";
import { allCountries } from "country-region-data";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Most merchants are in the US; keep it first, then alphabetical.
const COUNTRIES = [...allCountries].sort((a, b) =>
  a[1] === "US" ? -1 : b[1] === "US" ? 1 : a[0].localeCompare(b[0]),
);

/** Country is saved by full name; state/region by its short code (e.g. "TX") when one exists. */
export function CountryRegionFields({
  country,
  region,
  onCountry,
  onRegion,
}: {
  country: string;
  region: string;
  onCountry: (c: string) => void;
  onRegion: (r: string) => void;
}) {
  const match = useMemo(() => {
    const c = country.trim().toLowerCase();
    if (!c) return undefined;
    return COUNTRIES.find(
      (x) => x[0].toLowerCase() === c || x[1].toLowerCase() === c || (c === "usa" && x[1] === "US"),
    );
  }, [country]);
  const regions = match?.[2] ?? [];
  const regionValue =
    regions.find((r) => (r[1] || r[0]).toLowerCase() === region.toLowerCase() || r[0].toLowerCase() === region.toLowerCase())?.[1] ||
    regions.find((r) => r[0].toLowerCase() === region.toLowerCase())?.[0] ||
    "";

  return (
    <>
      <div>
        <Label>Country</Label>
        <Select value={match?.[0] ?? ""} onValueChange={onCountry}>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {COUNTRIES.map((c) => (
              <SelectItem key={c[1]} value={c[0]}>{c[0]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>State</Label>
        {regions.length > 0 ? (
          <Select value={regionValue} onValueChange={onRegion}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {regions.map((r) => (
                <SelectItem key={r[1] || r[0]} value={r[1] || r[0]}>{r[0]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input value={region} onChange={(e) => onRegion(e.target.value)} placeholder={match ? "Region" : "Pick a country first"} disabled={!match && !region} />
        )}
      </div>
    </>
  );
}
