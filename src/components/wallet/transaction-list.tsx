"use client";

import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, RotateCcw, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { reverseTransactionAction } from "@/app/actions/wallet";
import { useApp } from "@/components/app/app-context";
import { Field, TextInput } from "@/components/forms/fields";
import { BottomSheet } from "@/components/sheets/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { dayGroupLabel, formatDateTime, memberName } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/types/domain";

function describe(tx: TransactionDTO, members: ReturnType<typeof useApp>["members"]) {
  const who = memberName(members, tx.userId ?? tx.performedBy);
  const correction = tx.reversalOf ? "Correction · " : "";
  switch (tx.type) {
    case "CONTRIBUTION":
      return { title: `${correction}${who === "You" ? "You" : who} added money`, icon: ArrowDownLeft, tint: "bg-success-soft text-success" };
    case "EXPENSE":
      return {
        title: `${correction}${tx.title || "Expense"}`,
        icon: tx.wishlistItemId ? ShoppingBag : ArrowUpRight,
        tint: "bg-violet-soft text-violet",
      };
    case "ALLOCATION":
      return { title: `${correction}Allocated to ${tx.wishlistItemName ?? "goal"}`, icon: ArrowRightLeft, tint: "bg-gold-soft text-gold" };
    case "DEALLOCATION":
      return { title: `${correction}Returned from ${tx.wishlistItemName ?? "goal"}`, icon: ArrowRightLeft, tint: "bg-muted text-muted-foreground" };
    case "REFUND":
      return { title: `${correction}${tx.title || "Refund"}`, icon: ArrowDownLeft, tint: "bg-success-soft text-success" };
    default:
      return { title: `${correction}${tx.title || "Adjustment"}`, icon: RotateCcw, tint: "bg-warning-soft text-warning" };
  }
}

export function TransactionList({ transactions, emptyText = "No transactions yet." }: { transactions: TransactionDTO[]; emptyText?: string }) {
  const app = useApp();
  const [selected, setSelected] = useState<TransactionDTO | null>(null);
  const [reason, setReason] = useState("");
  const reverse = useAction(reverseTransactionAction);

  const groups = useMemo(() => {
    const out: { label: string; items: TransactionDTO[] }[] = [];
    for (const tx of transactions) {
      const label = dayGroupLabel(tx.occurredAt, app.settings.timezone);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(tx);
      else out.push({ label, items: [tx] });
    }
    return out;
  }, [transactions, app.settings.timezone]);

  if (transactions.length === 0) {
    return <p className="surface px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  const canReverse = (tx: TransactionDTO) => tx.direction !== "INTERNAL" && !tx.reversalOf && !tx.reversed;

  async function submitReverse() {
    if (!selected) return;
    const res = await reverse.run({ transactionId: selected.id, reason });
    if (res.ok) setSelected(null);
  }

  return (
    <>
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.label}>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{g.label}</h3>
            <ul className="surface divide-y divide-border/60">
              {g.items.map((tx) => {
                const d = describe(tx, app.members);
                const Icon = d.icon;
                const sign = tx.direction === "IN" ? "+" : tx.direction === "OUT" ? "−" : "";
                return (
                  <li key={tx.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setReason("");
                        setSelected(tx);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", d.tint)}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-medium", tx.reversed && "line-through opacity-60")}>{d.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[tx.category, tx.paymentMethod, tx.source === "PROVIDER" ? "Verified online" : null, tx.reversed ? "Reversed" : null]
                            .filter(Boolean)
                            .join(" · ") || formatDateTime(tx.occurredAt, "p", app.settings.timezone)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "tabular shrink-0 text-sm font-semibold",
                          tx.direction === "IN" && "text-success",
                          tx.direction === "INTERNAL" && "text-muted-foreground",
                          tx.reversed && "line-through opacity-60",
                        )}
                      >
                        {sign}
                        {formatCurrency(tx.amount, { currency: app.currency })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <BottomSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? describe(selected, app.members).title : ""}
        description={selected ? formatDateTime(selected.occurredAt, "d MMMM yyyy, p", app.settings.timezone) : undefined}
        footer={
          selected && canReverse(selected) ? (
            <Button variant="destructive" className="h-12 w-full rounded-2xl text-base" onClick={submitReverse} disabled={reverse.pending}>
              <RotateCcw className="size-4" /> {reverse.pending ? "Reversing…" : "Reverse this entry"}
            </Button>
          ) : undefined
        }
      >
        {selected ? (
          <div className="space-y-4">
            <dl className="surface divide-y divide-border/60 text-sm">
              <Row label="Amount" value={formatCurrency(selected.amount, { currency: app.currency })} />
              <Row label="Type" value={selected.type.charAt(0) + selected.type.slice(1).toLowerCase()} />
              {selected.userId ? <Row label={selected.type === "CONTRIBUTION" ? "Contributed by" : "Paid by"} value={memberName(app.members, selected.userId)} /> : null}
              <Row label="Recorded by" value={memberName(app.members, selected.performedBy)} />
              {selected.wishlistItemName ? <Row label="Wish" value={selected.wishlistItemName} /> : null}
              {selected.category ? <Row label="Category" value={selected.category} /> : null}
              {selected.paymentMethod ? <Row label="Method" value={selected.paymentMethod} /> : null}
              <Row label="Source" value={selected.source === "PROVIDER" ? "Verified payment" : selected.source === "SYSTEM" ? "Automatic" : "Manual entry"} />
              {selected.notes ? <Row label="Notes" value={selected.notes} /> : null}
            </dl>
            {selected.reversed ? <p className="text-sm text-muted-foreground">This entry was reversed by a correcting entry. Both stay in your history.</p> : null}
            {canReverse(selected) ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Entries are never deleted. Reversing adds an equal and opposite correction so balances stay accurate and history stays complete.
                </p>
                <Field label="Reason (optional)" htmlFor="reverse-reason">
                  <TextInput id="reverse-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. Entered twice" />
                </Field>
              </>
            ) : selected.direction === "INTERNAL" ? (
              <p className="text-sm text-muted-foreground">Allocations are changed from the wish itself (return money) or by undoing an allocation in the wallet.</p>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
