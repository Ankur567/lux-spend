"use client";

import { Scale, Undo2 } from "lucide-react";
import { useState } from "react";
import { rebalanceAction, undoAllocationAction } from "@/app/actions/wallet";
import { useApp } from "@/components/app/app-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { memberName, timeAgo } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import type { AllocationBatchDTO } from "@/lib/services/allocation-service";
import { toast } from "sonner";

const MODE_LABEL: Record<string, string> = {
  AUTO: "Auto allocation",
  MANUAL: "Manual allocation",
  REBALANCE: "Rebalance",
  PURCHASE_RELEASE: "Released after purchase",
  ARCHIVE_RELEASE: "Released on archive",
  PRICE_CHANGE_RELEASE: "Released after price change",
  EXPENSE_COVER: "Used for an expense",
};

export function RebalanceButton({ disabled }: { disabled?: boolean }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const rebalance = useAction(rebalanceAction);

  async function confirm() {
    const res = await rebalance.run();
    setOpen(false);
    if (res.ok) app.openSheet({ kind: "allocation-result", result: res.data });
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-medium disabled:opacity-50"
      >
        <Scale className="size-4 text-violet" /> Rebalance
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Rebalance all goals?"
        description="All allocated money returns to the pool and is re-allocated from scratch by current priority, target date and order. Nothing is spent."
        confirmLabel="Rebalance"
        pending={rebalance.pending}
        onConfirm={confirm}
      />
    </>
  );
}

export function AllocationBatches({ batches }: { batches: AllocationBatchDTO[] }) {
  const app = useApp();
  const undo = useAction(undoAllocationAction, { toastSuccess: false });
  const [busy, setBusy] = useState<string | null>(null);

  if (batches.length === 0) {
    return <p className="surface px-4 py-8 text-center text-sm text-muted-foreground">No allocations yet.</p>;
  }

  async function onUndo(id: string) {
    setBusy(id);
    const res = await undo.run(id);
    setBusy(null);
    if (res.ok) toast.success(`${formatCurrency(res.data.released, { currency: app.currency })} returned to unallocated.`);
  }

  return (
    <ul className="surface divide-y divide-border/60">
      {batches.map((b) => {
        const total = b.totalAllocated || b.totalReleased;
        const names = b.lines.map((l) => l.itemName);
        return (
          <li key={b.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${b.undone ? "line-through opacity-60" : ""}`}>
                {MODE_LABEL[b.mode] ?? b.mode} · {formatCurrency(total, { currency: app.currency })}
              </p>
              <p suppressHydrationWarning className="truncate text-xs text-muted-foreground">
                {names.slice(0, 3).join(", ")}
                {names.length > 3 ? ` +${names.length - 3}` : ""} · {memberName(app.members, b.performedBy)} · {timeAgo(b.createdAt)}
                {b.undone ? " · undone" : ""}
              </p>
            </div>
            {b.canUndo ? (
              <button
                type="button"
                onClick={() => onUndo(b.id)}
                disabled={busy === b.id}
                className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-medium text-rose disabled:opacity-50"
              >
                <Undo2 className="size-4" /> Undo
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
