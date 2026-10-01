"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { recordExpenseAction } from "@/app/actions/wallet";
import { useApp } from "@/components/app/app-context";
import { Field, MoneyInput, NativeSelect, TextArea, TextInput } from "@/components/forms/fields";
import { ChipPicker, MemberPicker } from "@/components/forms/pickers";
import { Button } from "@/components/ui/button";
import { haptic } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/money";
import { todayInput } from "@/lib/time";
import { expenseSchema } from "@/lib/validators/wallet";
import { BottomSheet } from "./bottom-sheet";
import { SuccessBurst } from "./success-burst";

const CUSTOM = "__custom__";

interface Confirmation {
  message: string;
  shortfall: number;
  lines: { itemId: string; name: string; amount: number }[];
}

export function ExpenseSheet({ open }: { open: boolean }) {
  const app = useApp();
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(app.settings.categories.includes("Dining") ? "Dining" : app.settings.categories[0] ?? "Other");
  const [customCategory, setCustomCategory] = useState("");
  const [userId, setUserId] = useState(app.me.id);
  const [method, setMethod] = useState(app.settings.paymentMethods[0] ?? "UPI");
  const [date, setDate] = useState(todayInput(app.settings.timezone));
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);


  const finalCategory = category === CUSTOM ? customCategory : category;
  const values = { amount, title, category: finalCategory, userId, paymentMethod: method, date, notes };

  async function submit(allowDeallocation: boolean) {
    const parsed = expenseSchema.safeParse({ ...values, allowDeallocation });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const res = await recordExpenseAction({ ...values, allowDeallocation });
    setSubmitting(false);
    if (!res.ok) {
      const details = res.details as { needsConfirmation?: boolean; shortfall?: number; lines?: Confirmation["lines"] } | undefined;
      if (res.code === "INSUFFICIENT_FUNDS" && details?.needsConfirmation) {
        setConfirm({ message: res.error, shortfall: details.shortfall ?? 0, lines: details.lines ?? [] });
        return;
      }
      toast.error(res.error);
      return;
    }
    haptic(12);
    if (res.data.releasedFromGoals > 0) {
      toast.info(`${formatCurrency(res.data.releasedFromGoals, { currency: app.currency })} was taken back from goals.`);
    }
    setDone(true);
  }

  const fmt = (v: number) => formatCurrency(v, { currency: app.currency });

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => !o && app.closeSheet()}
      title={done ? "Recorded" : "Record expense"}
      description={done ? undefined : "A luxury spend that isn't on the wishlist."}
      footer={
        done ? undefined : confirm ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12 rounded-2xl" onClick={() => setConfirm(null)} disabled={submitting}>
              Go back
            </Button>
            <Button className="h-12 rounded-2xl bg-warning text-white hover:bg-warning/90" onClick={() => submit(true)} disabled={submitting}>
              {submitting ? "Saving…" : "Use goal money"}
            </Button>
          </div>
        ) : (
          <Button className="h-12 w-full rounded-2xl text-base" onClick={() => submit(false)} disabled={submitting}>
            {submitting ? "Saving…" : "Record expense"}
          </Button>
        )
      }
    >
      {done ? (
        <div className="pb-2">
          <SuccessBurst title="Expense recorded" subtitle={`${title} · ${fmt(expenseSchema.shape.amount.safeParse(amount).data ?? 0)}`} />
          <Button className="h-12 w-full rounded-2xl text-base" onClick={app.closeSheet}>
            Done
          </Button>
        </div>
      ) : confirm ? (
        <div className="space-y-4" role="alert">
          <div className="flex gap-3 rounded-3xl bg-warning-soft p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <div>
              <p className="font-semibold">Not enough unallocated money</p>
              <p className="mt-1 text-sm text-foreground/80">{confirm.message}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">If you continue, this money comes back from your lowest-priority goals first:</p>
          <ul className="space-y-2">
            {confirm.lines.map((l) => (
              <li key={l.itemId} className="surface flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
                <span className="font-medium">{l.name}</span>
                <span className="tabular text-warning">−{fmt(l.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-5">
          <Field label="Amount" htmlFor="e-amount" error={errors.amount} required>
            <MoneyInput id="e-amount" big currency={app.currency} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus aria-invalid={!!errors.amount} />
          </Field>
          <Field label="Title" htmlFor="e-title" error={errors.title} required>
            <TextInput id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Anniversary dinner" maxLength={100} />
          </Field>
          <Field label="Category" htmlFor="e-category" error={errors.category}>
            <NativeSelect id="e-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {app.settings.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={CUSTOM}>+ Custom category…</option>
            </NativeSelect>
            {category === CUSTOM ? (
              <TextInput className="mt-2" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Category name" maxLength={40} />
            ) : null}
          </Field>
          {app.members.length > 1 ? (
            <Field label="Paid by">
              <MemberPicker members={app.members} value={userId} onChange={setUserId} label="Paid by" />
            </Field>
          ) : null}
          <Field label="Payment method">
            <ChipPicker options={app.settings.paymentMethods} value={method} onChange={setMethod} label="Payment method" />
          </Field>
          <Field label="Date" htmlFor="e-date" error={errors.date}>
            <TextInput id="e-date" type="date" value={date} max={todayInput(app.settings.timezone)} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="e-notes">
            <TextArea id="e-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="min-h-16" />
          </Field>
        </div>
      )}
    </BottomSheet>
  );
}
