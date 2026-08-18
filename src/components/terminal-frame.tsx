// A Senraise-style POS terminal bezel. Anything you drop inside renders
// on the "screen" — used by the public virtual terminal (/t/$slug) and the
// merchant preview so a shared link feels like a real card machine.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TerminalFrame({
  children,
  label,
  className,
  scroll = true,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  /** Set false when the screen hosts something that scrolls itself (iframe). */
  scroll?: boolean;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[360px]", className)}>
      <div className="relative rounded-[2.6rem] bg-gradient-to-b from-zinc-700 via-zinc-900 to-black p-[10px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/10">
        {/* speaker + camera row */}
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="h-1 w-10 rounded-full bg-white/15" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
        </div>

        {/* screen */}
        <div className="relative overflow-hidden rounded-[1.9rem] bg-background ring-1 ring-black/40">
          <div
            className={cn(
              "h-[min(620px,68dvh)]",
              scroll
                ? "overflow-y-auto overscroll-contain [scrollbar-width:thin]"
                : "overflow-hidden",
            )}
          >
            {children}
          </div>
        </div>


        {/* card slot + brand chin */}
        <div className="flex items-center justify-between px-5 pb-3 pt-3">
          <span className="h-1.5 w-16 rounded-full bg-white/10" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/40">
            {label ?? "Nectar.Pay"}
          </span>
          <span className="h-1.5 w-16 rounded-full bg-white/10" />
        </div>

        {/* NFC contactless hint */}
        <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-1 opacity-40">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}
