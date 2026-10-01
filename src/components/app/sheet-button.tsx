"use client";

import type { ReactNode } from "react";
import { useApp, type SheetState } from "@/components/app/app-context";
import { cn } from "@/lib/utils";

/** A button that opens one of the global bottom sheets; usable from server components. */
export function SheetButton({
  sheet,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  sheet: SheetState;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const { openSheet } = useApp();
  return (
    <button type="button" aria-label={ariaLabel} onClick={() => openSheet(sheet)} className={cn("transition-transform active:scale-[0.98]", className)}>
      {children}
    </button>
  );
}
