"use client";

import { ArrowRight, Hand, QrCode, Sparkles, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { addContributionAction } from "@/app/actions/wallet";
import { useApp } from "@/components/app/app-context";
import { Field, MoneyInput, TextArea, TextInput } from "@/components/forms/fields";
import { ChipPicker, MemberPicker } from "@/components/forms/pickers";
import { Button } from "@/components/ui/button";
import { haptic } from "@/hooks/use-action";
import { formatCurrency } from "@/lib/money";
import { todayInput } from "@/lib/time";
import { contributionSchema } from "@/lib/validators/wallet";
import type { AllocationRunResult } from "@/types/domain";
import { AllocationResultView } from "./allocation-result";
import { BottomSheet } from "./bottom-sheet";
import { OnlinePayButton } from "./online-pay-button";
import { SuccessBurst } from "./success-burst";

type Step = "form" | "choose" | "done" | "result";

export function ContributionSheet({ open, prefill }: { open: boolean; prefill?: { amount?: string; paymentMethod?: string } }) {
  const app = useApp();
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState(prefill?.amount ?? "");
  const [userId, setUserId] = useState(app.me.id);
  const [date, setDate] = useState(todayInput(app.settings.timezone));
  const [method, setMethod] = useState(prefill?.paymentMethod ?? app.settings.paymentMethods[0] ?? "UPI");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AllocationRunResult | null>(null);


  const values = { amount, userId, date, paymentMethod: method, notes };
  const parsedAmount = contributionSchema.shape.amount.safeParse(amount);

  function validate(): boolean {
    const res = contributionSchema.safeParse({ ...values, allocation: "KEEP" });
    if (res.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of res.error.issues) next[String(issue.path[0])] ??= issue.message;
    setErrors(next);
    return false;
  }

  async function submit(allocation: "AUTO" | "KEEP" | "MANUAL") {
    setSubmitting(true);
    const res = await addContributionAction({ ...values, allocation });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors) setStep("form");
      return;
    }
    haptic([10, 40, 10]);
    if (allocation === "AUTO" && res.data.allocation) {
      setResult(res.data.allocation);
      setStep("result");
    } else if (allocation === "MANUAL") {
      app.openSheet({ kind: "allocation" });
    } else {
      setStep("done");
    }
  }

  const close = () => app.closeSheet();
  const fmtAmount = parsedAmount.success ? formatCurrency(parsedAmount.data, { currency: app.currency }) : "";
  const contributor = app.members.find((m) => m.id === userId);

  const title =
    step === "choose" ? "How should we use this money?" : step === "result" ? "Money allocated" : step === "done" ? "Added" : "Add money";

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={title}
      description={step === "form" ? "Record money you've set aside for your luxury fund." : step === "choose" ? `${fmtAmount} from ${contributor?.isMe ? "you" : contributor?.name}` : undefined}
      footer={
        step === "form" ? (
          <Button className="h-12 w-full rounded-2xl text-base" onClick={() => validate() && setStep("choose")}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : undefined
      }
    >
      {step === "form" ? (
        <div className="space-y-5">
          {app.upi || app.onlinePayments.enabled ? (
            <div className="flex gap-2">
              {app.upi ? (
                <Button variant="outline" className="h-11 flex-1 rounded-2xl" onClick={() => app.openSheet({ kind: "pay-to-fund" })}>
                  <QrCode className="size-4" /> Pay to fund via UPI
                </Button>
              ) : null}
              {app.onlinePayments.enabled ? <OnlinePayButton amount={amount} /> : null}
            </div>
          ) : null}
          <Field label="Amount" htmlFor="c-amount" error={errors.amount} required>
            <MoneyInput id="c-amount" big currency={app.currency} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus aria-invalid={!!errors.amount} />
          </Field>
          {app.members.length > 1 ? (
            <Field label="Who contributed" error={errors.userId}>
              <MemberPicker members={app.members} value={userId} onChange={setUserId} label="Who contributed" />
            </Field>
          ) : null}
          <Field label="Payment method" error={errors.paymentMethod}>
            <ChipPicker options={app.settings.paymentMethods} value={method} onChange={setMethod} label="Payment method" />
          </Field>
          <Field label="Date" htmlFor="c-date" error={errors.date}>
            <TextInput id="c-date" type="date" value={date} max={todayInput(app.settings.timezone)} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="c-notes" error={errors.notes}>
            <TextArea id="c-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="min-h-16" />
          </Field>
        </div>
      ) : step === "choose" ? (
        <div className="space-y-3 pb-2">
          <ChoiceCard
            icon={<Sparkles className="size-5" />}
            title="Auto allocate"
            text="Fund goals by priority: High first, then Medium, then Low."
            recommended
            disabled={submitting}
            onClick={() => submit("AUTO")}
          />
          <ChoiceCard
            icon={<Wallet className="size-5" />}
            title="Keep unallocated"
            text="Leave it in the fund for now. You can allocate later."
            disabled={submitting}
            onClick={() => submit("KEEP")}
          />
          <ChoiceCard
            icon={<Hand className="size-5" />}
            title="Choose manually"
            text="Decide exactly which goals get this money."
            disabled={submitting}
            onClick={() => submit("MANUAL")}
          />
          <Button variant="ghost" className="h-11 w-full rounded-2xl" onClick={() => setStep("form")} disabled={submitting}>
            Back
          </Button>
        </div>
      ) : step === "result" && result ? (
        <AllocationResultView result={result} currency={app.currency} onDone={close} />
      ) : (
        <div className="pb-2">
          <SuccessBurst title={`${fmtAmount} added`} subtitle="Your fund has been updated." />
          <Button className="h-12 w-full rounded-2xl text-base" onClick={close}>
            Done
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

function ChoiceCard({
  icon,
  title,
  text,
  onClick,
  recommended,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
  recommended?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="surface flex w-full items-start gap-4 rounded-3xl p-4 text-left transition-transform active:scale-[0.99] disabled:opacity-60"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-soft text-rose">{icon}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-semibold">
          {title}
          {recommended ? <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">Recommended</span> : null}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}
