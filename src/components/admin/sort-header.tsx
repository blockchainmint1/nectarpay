import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortState } from "@/lib/table-sort";

/**
 * Table heading that sorts the list when clicked. Shows a faint up/down chevron
 * when idle and a solid arrow on the column currently in play.
 */
export function SortHeader<K extends string>({
  label,
  sortKey,
  state,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  sortKey: K;
  state: SortState<K>;
  onSort: (key: K) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = state.key === sortKey;
  return (
    <th
      aria-sort={active ? (state.dir === "asc" ? "ascending" : "descending") : undefined}
      className={cn("px-3 py-2 font-medium", align === "right" && "text-right", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Sort by ${label}`}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-[0.2em] transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "w-full justify-end",
        )}
      >
        {label}
        {active ? (
          state.dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}
