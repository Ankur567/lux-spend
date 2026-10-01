"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { allocateManuallyAction, autoAllocateAction, getAllocationContextAction } from "@/app/actions/wallet";
import { useApp } from "@/components/app/app-context";
import { MoneyInput } from "@/components/forms/fields";
import { PriorityBadge } from "@/components/priority-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { haptic } from "@/hooks/use-action";
import { formatCurrency, paiseToInput, toPaise } from "@/lib/money";
import type { AllocationContextItem } from "@/lib/services/allocation-service";
import type { AllocationRunResult } from "@/types/domain";
import { AllocationResultView } from "./allocation-result";
import { BottomSheet } from "./bottom-sheet";

function parse(v: string): number {
  if (!v.trim()) return 0;
  try {
    return Math.max(0, toPaise(v));
  } catch {
    return 0;
  }
}

export function AllocationSheet({ open, focusItemId, initialResult }: { open: boolean; focusItemId?: string; initialResult?: AllocationRunResult }) {
  const app = useApp();
  const [loading, setLoading] = useState(!initialResult);
  const [unallocated, setUnallocated] = useState(0);
  const [items, setItems] = useState<AllocationContextItem[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AllocationRunResult | null>(initialResult ?? null);
  const fmt = (v: number) => formatCurrency(v, { currency: app.currency });

  useEffect(() => {
    if (!open || initialResult) return;
    let cancelled = false;
    getAllocationContextAction().then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) return toast.error(res.error);
      setUnallocated(res.data.unallocated);
      const list = res.data.items.filter((i) => i.remaining > 0);
      const focused = focusItemId ? list.find((i) => i.id === focusItemId) : undefined;
      setItems(focused ? [focused, ...list.filter((i) => i.id !== focusItemId)] : list);
      if (focused) {
        setAmounts({ [focused.id]: paiseToInput(Math.min(focused.remaining, Math.max(0, res.data.unallocated))) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, focusItemId, initialResult]);

  const total = useMemo(() => Object.values(amounts).reduce((a, v) => a + parse(v), 0), [amounts]);
  const over = total > unallocated;
  const invalidItem = items.find((i) => parse(amounts[i.id] ?? "") > i.remaining);

  async function auto() {
    setSubmitting(true);
    const res = await autoAllocateAction();
    setSubmitting(false);
    if (!res.ok) return toast.error(res.error);
    haptic([10, 40, 10]);
    setResult(res.data);
  }

  async function manual() {
    const lines = Object.entries(amounts)
      .map(([itemId, v]) => ({ itemId, amount: paiseToInput(parse(v)) }))
      .filter((l) => l.amount !== "");
    if (lines.length === 0) return toast.error("Enter an amount for at least one goal.");
    setSubmitting(true);
    const res = await allocateManuallyAction({ lines });
    setSubmitting(false);
    if (!res.ok) return toast.error(res.error);
    haptic(12);
    toast.success(`${fmt(res.data.total)} allocated`);
    app.closeSheet();
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => !o && app.closeSheet()}
      title={result ? "Money allocated" : "Allocate money"}
      description={result ? undefined : "Move unallocated money into your goals."}
      footer={
        result || loading || items.length === 0 ? undefined : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Allocating</span>
              <span className={over ? "font-semibold text-destructive tabular" : "font-semibold tabular"}>
                {fmt(total)} / {fmt(Math.max(0, unallocated))}
              </span>
            </div>
            <Button className="h-12 w-full rounded-2xl text-base" onClick={manual} disabled={submitting || over || !!invalidItem || total === 0}>
              {submitting ? "Saving…" : "Allocate"}
            </Button>
          </div>
        )
      }
    >
      {result ? (
        <AllocationResultView result={result} currency={app.currency} onDone={app.closeSheet} />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-3xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl bg-ink p-5 text-ink-foreground">
            <p className="text-xs uppercase tracking-[0.14em] opacity-70">Unallocated</p>
            <p className="mt-1 font-display text-4xl tabular">{fmt(Math.max(0, unallocated))}</p>
          </div>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Every active goal is fully funded. 🎉</p>
          ) : (
            <>
              <Button variant="outline" className="h-12 w-full rounded-2xl" onClick={auto} disabled={submitting || unallocated <= 0}>
                <Sparkles className="size-4 text-rose" /> Auto allocate by priority
              </Button>
              <p className="text-center text-xs text-muted-foreground">or choose amounts</p>
              <ul className="space-y-2">
                {items.map((item) => {
                  const value = amounts[item.id] ?? "";
                  const tooMuch = parse(value) > item.remaining;
                  return (
                    <li key={item.id} className="surface rounded-2xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            needs {fmt(item.remaining)} · {fmt(item.allocated)} saved
                          </p>
                        </div>
                        <PriorityBadge priority={item.priority} />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <div className="flex-1">
                          <MoneyInput
                            currency={app.currency}
                            value={value}
                            aria-label={`Amount for ${item.name}`}
                            aria-invalid={tooMuch}
                            onChange={(e) => setAmounts((a) => ({ ...a, [item.id]: e.target.value }))}
                            className="h-11"
                          />
                        </div>
                        <Button
                          variant="secondary"
                          className="h-11 rounded-2xl px-4"
                          onClick={() => {
                            const others = total - parse(value);
                            const fill = Math.max(0, Math.min(item.remaining, unallocated - others));
                            setAmounts((a) => ({ ...a, [item.id]: paiseToInput(fill) }));
                          }}
                        >
                          Fill
                        </Button>
                      </div>
                      {tooMuch ? <p className="mt-1 text-xs text-destructive">Only {fmt(item.remaining)} needed.</p> : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
