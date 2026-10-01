"use client";

import { CheckCircle2, CircleDashed, PlusCircle, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { undoAllocationAction } from "@/app/actions/wallet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/money";
import type { AllocationRunResult } from "@/types/domain";

export function AllocationResultView({
  result,
  currency,
  onDone,
}: {
  result: AllocationRunResult;
  currency: string;
  onDone: () => void;
}) {
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);
  const fmt = (v: number) => formatCurrency(v, { currency });

  async function undo() {
    if (!result.batchId) return;
    setUndoing(true);
    const res = await undoAllocationAction(result.batchId);
    setUndoing(false);
    if (res.ok) {
      setUndone(true);
      toast.success(`Undone. ${fmt(res.data.released)} is unallocated again.`);
    } else toast.error(res.error);
  }

  if (result.allocatedTotal === 0) {
    return (
      <div className="space-y-4 py-2">
        <p className="text-sm text-muted-foreground">
          {result.lines.length === 0
            ? "All active goals are already funded, so the money stays unallocated."
            : "There was no unallocated money to distribute."}
        </p>
        <Button className="h-12 w-full rounded-2xl text-base" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-ink p-5 text-ink-foreground">
        <p className="text-xs uppercase tracking-[0.14em] opacity-70">{undone ? "Allocation undone" : "Allocated"}</p>
        <p className="mt-1 font-display text-4xl tabular">{fmt(result.allocatedTotal)}</p>
        {result.leftover > 0 ? <p className="mt-1 text-sm opacity-70">{fmt(result.leftover)} stays unallocated</p> : null}
      </div>
      <ul className="space-y-2" aria-label="Allocation results">
        {result.lines.map((l) => (
          <li key={l.itemId} className="surface flex items-center gap-3 rounded-2xl px-4 py-3">
            {l.outcome === "FUNDED" ? (
              <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
            ) : l.outcome === "PARTIAL" ? (
              <PlusCircle className="size-5 shrink-0 text-violet" aria-hidden />
            ) : (
              <CircleDashed className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{l.name}</span>
            <span className="text-right text-sm">
              {l.outcome === "FUNDED" ? (
                <span className="font-medium text-success">✓ Funded</span>
              ) : l.outcome === "PARTIAL" ? (
                <span className="tabular">{fmt(l.amount)} added</span>
              ) : (
                <span className="text-muted-foreground">Waiting</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 rounded-2xl" onClick={undo} disabled={undoing || undone || !result.batchId}>
          <Undo2 className="size-4" /> {undone ? "Undone" : undoing ? "Undoing…" : "Undo"}
        </Button>
        <Button className="h-12 rounded-2xl" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
