"use client";

import { PartyPopper } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { purchaseWishlistItemAction } from "@/app/actions/wishlist";
import { useApp } from "@/components/app/app-context";
import { Field, MoneyInput, Segmented, TextArea, TextInput } from "@/components/forms/fields";
import { ChipPicker, MemberPicker } from "@/components/forms/pickers";
import { Button } from "@/components/ui/button";
import { haptic } from "@/hooks/use-action";
import { formatCurrency, paiseToInput } from "@/lib/money";
import { todayInput } from "@/lib/time";
import { purchaseSchema } from "@/lib/validators/wishlist";
import type { WishlistItemDTO } from "@/types/domain";
import { BottomSheet } from "./bottom-sheet";
import { SuccessBurst } from "./success-burst";

export function PurchaseSheet({ open, item }: { open: boolean; item: WishlistItemDTO }) {
  const app = useApp();
  const [price, setPrice] = useState(paiseToInput(item.estimatedPrice));
  const [paidBy, setPaidBy] = useState(app.me.id);
  const [method, setMethod] = useState(app.settings.paymentMethods[0] ?? "UPI");
  const [date, setDate] = useState(todayInput(app.settings.timezone));
  const [notes, setNotes] = useState("");
  const [cover, setCover] = useState<"FUND" | "OUTSIDE">("FUND");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { returned: number; paidOutside: number }>(null);
  const [error, setError] = useState<string | null>(null);


  const fmt = (v: number) => formatCurrency(v, { currency: app.currency });
  const parsed = purchaseSchema.shape.actualPrice.safeParse(price);
  const actual = parsed.success ? parsed.data : 0;
  const diff = item.allocated - actual;

  async function submit() {
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the price");
      return;
    }
    setSubmitting(true);
    const res = await purchaseWishlistItemAction({
      itemId: item.id,
      actualPrice: price,
      paidBy,
      paymentMethod: method,
      date,
      notes,
      coverDifference: cover,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    haptic([10, 50, 10, 50, 20]);
    setDone(res.data);
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => !o && app.closeSheet()}
      title={done ? "Enjoy it! 🎉" : "Mark as purchased"}
      description={done ? undefined : item.name}
      footer={
        done ? undefined : (
          <Button className="h-12 w-full rounded-2xl text-base" onClick={submit} disabled={submitting || !parsed.success}>
            <PartyPopper className="size-4" /> {submitting ? "Saving…" : "Confirm purchase"}
          </Button>
        )
      }
    >
      {done ? (
        <div className="pb-2">
          <SuccessBurst
            title={`${item.name} purchased`}
            subtitle={
              done.returned > 0
                ? `${fmt(done.returned)} returned to your available balance.`
                : done.paidOutside > 0
                  ? `${fmt(done.paidOutside)} recorded as paid outside the fund.`
                  : "Your history keeps it forever."
            }
          />
          <Button className="h-12 w-full rounded-2xl text-base" onClick={app.closeSheet}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <Field label="Purchase price" htmlFor="p-price" error={error ?? undefined} required>
            <MoneyInput id="p-price" big currency={app.currency} value={price} onChange={(e) => { setPrice(e.target.value); setError(null); }} />
          </Field>

          <dl className="surface divide-y divide-border/60 rounded-3xl text-sm">
            <div className="flex justify-between px-4 py-3">
              <dt className="text-muted-foreground">Estimated price</dt>
              <dd className="tabular">{fmt(item.estimatedPrice)}</dd>
            </div>
            <div className="flex justify-between px-4 py-3">
              <dt className="text-muted-foreground">Use allocated funds</dt>
              <dd className="tabular">{fmt(item.allocated)}</dd>
            </div>
            <div className="flex justify-between px-4 py-3 font-medium">
              <dt>Difference</dt>
              <dd className={diff >= 0 ? "tabular text-success" : "tabular text-warning"}>
                {diff >= 0 ? `+${fmt(diff)} returned to available balance` : `${fmt(-diff)} more needed`}
              </dd>
            </div>
          </dl>

          {diff < 0 ? (
            <Field label={`Where does the extra ${fmt(-diff)} come from?`}>
              <Segmented
                name="Cover difference"
                value={cover}
                onChange={setCover}
                options={[
                  { value: "FUND", label: "Unallocated fund" },
                  { value: "OUTSIDE", label: "Paid outside" },
                ]}
              />
            </Field>
          ) : null}

          {app.members.length > 1 ? (
            <Field label="Paid by">
              <MemberPicker members={app.members} value={paidBy} onChange={setPaidBy} label="Paid by" />
            </Field>
          ) : null}
          <Field label="Payment method">
            <ChipPicker options={app.settings.paymentMethods} value={method} onChange={setMethod} label="Payment method" />
          </Field>
          <Field label="Date" htmlFor="p-date">
            <TextInput id="p-date" type="date" value={date} max={todayInput(app.settings.timezone)} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="p-notes">
            <TextArea id="p-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="min-h-16" />
          </Field>
        </div>
      )}
    </BottomSheet>
  );
}
