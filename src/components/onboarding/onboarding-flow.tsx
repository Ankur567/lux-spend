"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Copy, Gift, Heart, PiggyBank, Share2, Sparkles, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { logoutAction } from "@/app/actions/auth";
import { completeOnboardingAction, createSpaceAction, joinSpaceAction, saveOnboardingGoalsAction } from "@/app/actions/couple";
import { addContributionAction } from "@/app/actions/wallet";
import { createWishlistItemAction } from "@/app/actions/wishlist";
import { Field, MoneyInput, NativeSelect, Segmented, TextInput } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useOrigin } from "@/hooks/use-client-value";
import { formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";
import { todayInput } from "@/lib/time";
import { DEFAULT_CATEGORIES, type OwnerChoice, type Priority } from "@/types/domain";

const STEPS = ["welcome", "invite", "goals", "wish", "money", "done"] as const;
type Step = (typeof STEPS)[number];

export interface OnboardingProps {
  userName: string;
  userId: string;
  hasSpace: boolean;
  spaceName: string | null;
  partnerName: string | null;
  inviteCode: string | null;
  currency: string;
  initialStep: Step;
}

export function OnboardingFlow(props: OnboardingProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>(props.hasSpace && props.initialStep === "welcome" ? "invite" : props.initialStep);
  const finish = useAction(completeOnboardingAction, { toastSuccess: false });
  const index = STEPS.indexOf(step);

  const go = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };
  const next = () => go(STEPS[Math.min(index + 1, STEPS.length - 1)]);

  async function complete() {
    const res = await finish.run();
    if (res.ok) {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <div className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
      <header className="flex items-center justify-between py-4">
        <div className="flex gap-1.5" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={cn("h-1.5 rounded-full transition-all", i <= index ? "w-6 bg-rose" : "w-3 bg-muted")} />
          ))}
        </div>
        {props.hasSpace && step !== "done" ? (
          <button type="button" onClick={complete} disabled={finish.pending} className="min-h-11 px-2 text-sm text-muted-foreground">
            Skip setup
          </button>
        ) : !props.hasSpace ? (
          <form action={logoutAction}>
            <button type="submit" className="min-h-11 px-2 text-sm text-muted-foreground">
              Sign out
            </button>
          </form>
        ) : null}
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={step}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="flex flex-1 flex-col pb-8"
        >
          {step === "welcome" ? <WelcomeStep userName={props.userName} onDone={() => { router.refresh(); go("invite"); }} onJoined={complete} /> : null}
          {step === "invite" ? <InviteStep code={props.inviteCode} partnerName={props.partnerName} spaceName={props.spaceName} onNext={next} /> : null}
          {step === "goals" ? <GoalsStep currency={props.currency} onNext={next} /> : null}
          {step === "wish" ? <WishStep currency={props.currency} partnerName={props.partnerName} onNext={next} /> : null}
          {step === "money" ? <MoneyStep currency={props.currency} userId={props.userId} onNext={next} /> : null}
          {step === "done" ? (
            <StepShell icon={<Sparkles className="size-7" />} title="You're all set" text="Your fund is ready. Add money whenever you set some aside, and watch your wishes come true.">
              <Button className="mt-auto h-12 w-full rounded-2xl text-base" onClick={complete} disabled={finish.pending}>
                {finish.pending ? "Opening…" : "Go to dashboard"} <ArrowRight className="size-4" />
              </Button>
            </StepShell>
          ) : null}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

function StepShell({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 mt-6 flex size-14 items-center justify-center rounded-2xl bg-rose-soft text-rose">{icon}</div>
      <h1 className="font-display text-[2.6rem] leading-[1.05]">{title}</h1>
      <p className="mt-3 text-muted-foreground">{text}</p>
      <div className="mt-8 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function WelcomeStep({ userName, onDone, onJoined }: { userName: string; onDone: () => void; onJoined: () => void }) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(`${userName}'s Luxury Fund`);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const create = useAction(createSpaceAction);
  const join = useAction(joinSpaceAction);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (mode === "create") {
      const res = await create.run({ name });
      if (res.ok) onDone();
      else setError(res.fieldErrors?.name?.[0]);
    } else {
      const res = await join.run({ code });
      if (res.ok) onJoined();
      else setError(res.fieldErrors?.code?.[0]);
    }
  }

  return (
    <StepShell icon={<Heart className="size-7" />} title={`Hi ${userName}`} text="Let's set up a private space for the two of you. Create one, or join your partner's with their invite code.">
      <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
        <Segmented
          name="Create or join"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(undefined);
          }}
          options={[
            { value: "create", label: "Create a space" },
            { value: "join", label: "I have a code" },
          ]}
        />
        {mode === "create" ? (
          <Field label="Name your space" htmlFor="space-name" error={error}>
            <TextInput id="space-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
        ) : (
          <Field label="Invite code" htmlFor="invite-code" error={error}>
            <TextInput
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7M2QX9P"
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono tracking-[0.2em]"
              maxLength={12}
            />
          </Field>
        )}
        <Button type="submit" className="mt-auto h-12 w-full rounded-2xl text-base" disabled={create.pending || join.pending}>
          {mode === "create" ? (create.pending ? "Creating…" : "Create our space") : join.pending ? "Joining…" : "Join space"}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </StepShell>
  );
}

function InviteStep({ code, partnerName, spaceName, onNext }: { code: string | null; partnerName: string | null; spaceName: string | null; onNext: () => void }) {
  const origin = useOrigin();
  const link = code && origin ? `${origin}/invite/${code}` : "";

  async function share() {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: spaceName ?? "Our luxury fund", text: "Join our luxury fund 💞", url: link });
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  }

  if (partnerName || !code) {
    return (
      <StepShell icon={<Heart className="size-7" />} title={partnerName ? `${partnerName} is here` : "Invite your partner"} text={partnerName ? "Your space is complete: just the two of you." : "You can invite your partner any time from Settings."}>
        <Button className="mt-auto h-12 w-full rounded-2xl text-base" onClick={onNext}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </StepShell>
    );
  }

  return (
    <StepShell icon={<Heart className="size-7" />} title="Invite your partner" text="Share this link or code. Your space holds exactly two people: you and them.">
      <div className="surface p-5 text-center">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Invite code</p>
        <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.25em]">{code}</p>
        <p className="mt-2 text-xs text-muted-foreground">Expires in 14 days</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 rounded-2xl" onClick={() => navigator.clipboard.writeText(code).then(() => toast.success("Code copied"))}>
          <Copy className="size-4" /> Copy code
        </Button>
        <Button variant="outline" className="h-12 rounded-2xl" onClick={share}>
          <Share2 className="size-4" /> Share link
        </Button>
      </div>
      <Button className="mt-auto h-12 w-full rounded-2xl text-base" onClick={onNext}>
        Continue <ArrowRight className="size-4" />
      </Button>
    </StepShell>
  );
}

function GoalsStep({ currency, onNext }: { currency: string; onNext: () => void }) {
  const [savingsTarget, setSavings] = useState("");
  const [monthlyBudget, setBudget] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const save = useAction(saveOnboardingGoalsAction, { toastSuccess: false });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!savingsTarget && !monthlyBudget) return onNext();
    const res = await save.run({ savingsTarget: savingsTarget || undefined, monthlyBudget: monthlyBudget || undefined });
    if (res.ok) onNext();
    else setErrors(res.fieldErrors ?? {});
  }

  return (
    <StepShell icon={<PiggyBank className="size-7" />} title="Set a rhythm" text="How much would you like to set aside each month? Both are optional and can be changed later.">
      <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
        <Field label="Monthly savings goal" htmlFor="savings" error={errors.savingsTarget?.[0]} hint="Used for progress and funding forecasts.">
          <MoneyInput id="savings" currency={currency} value={savingsTarget} onChange={(e) => setSavings(e.target.value)} />
        </Field>
        <Field label="Monthly luxury budget" htmlFor="budget" error={errors.monthlyBudget?.[0]} hint="A soft cap on spending. You'll be warned at 80% and 100%.">
          <MoneyInput id="budget" currency={currency} value={monthlyBudget} onChange={(e) => setBudget(e.target.value)} />
        </Field>
        <Button type="submit" className="mt-auto h-12 w-full rounded-2xl text-base" disabled={save.pending}>
          {savingsTarget || monthlyBudget ? "Save & continue" : "Skip for now"} <ArrowRight className="size-4" />
        </Button>
      </form>
    </StepShell>
  );
}

function WishStep({ currency, partnerName, onNext }: { currency: string; partnerName: string | null; onNext: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [priority, setPriority] = useState<Priority>("HIGH");
  const [owner, setOwner] = useState<OwnerChoice>("US");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const create = useAction(createWishlistItemAction);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await create.run({ name, estimatedPrice: price, priority, owner, category });
    if (res.ok) onNext();
    else setErrors(res.fieldErrors ?? {});
  }

  return (
    <StepShell icon={<Gift className="size-7" />} title="Your first wish" text="What's something you'd love? A watch, a trip, a special dinner…">
      <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
        <Field label="What is it?" htmlFor="wish-name" error={errors.name?.[0]}>
          <TextInput id="wish-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend in Goa" maxLength={120} />
        </Field>
        <Field label="Estimated price" htmlFor="wish-price" error={errors.estimatedPrice?.[0]}>
          <MoneyInput id="wish-price" currency={currency} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Priority">
          <Segmented
            name="Priority"
            value={priority}
            onChange={setPriority}
            options={[
              { value: "HIGH", label: "High" },
              { value: "MEDIUM", label: "Medium" },
              { value: "LOW", label: "Low" },
            ]}
          />
        </Field>
        <Field label="For">
          <Segmented
            name="Owner"
            value={owner}
            onChange={setOwner}
            options={[
              { value: "ME", label: "Me" },
              { value: "PARTNER", label: partnerName ?? "Partner" },
              { value: "US", label: "Us" },
            ]}
          />
        </Field>
        <Field label="Category" htmlFor="wish-category">
          <NativeSelect id="wish-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <div className="mt-auto space-y-2">
          <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={create.pending}>
            {create.pending ? "Adding…" : "Add wish"} <ArrowRight className="size-4" />
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full rounded-2xl" onClick={onNext}>
            I&apos;ll do this later
          </Button>
        </div>
      </form>
    </StepShell>
  );
}

function MoneyStep({ currency, userId, onNext }: { currency: string; userId: string; onNext: () => void }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<string | null>(null);
  const add = useAction(addContributionAction, { toastSuccess: false });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await add.run({ amount, userId, date: todayInput(), paymentMethod: "UPI", allocation: "AUTO" });
    if (!res.ok) return setError(res.fieldErrors?.amount?.[0] ?? res.error);
    const alloc = res.data.allocation;
    setResult(
      alloc && alloc.allocatedTotal > 0
        ? `${formatCurrency(alloc.allocatedTotal, { currency })} went straight to your wishes.`
        : "Saved in your fund, ready for your first wish.",
    );
  }

  if (result) {
    return (
      <StepShell icon={<Check className="size-7" />} title="Money added" text={result}>
        <Button className="mt-auto h-12 w-full rounded-2xl text-base" onClick={onNext}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </StepShell>
    );
  }

  return (
    <StepShell icon={<Wallet className="size-7" />} title="Start the fund" text="Record money you've already set aside. It's a virtual wallet: your money stays in your own bank account.">
      <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
        <Field label="Amount" htmlFor="first-amount" error={error}>
          <MoneyInput id="first-amount" big currency={currency} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <p className="text-sm text-muted-foreground">It&apos;ll be auto-allocated to your wishes by priority. You can undo that later.</p>
        <div className="mt-auto space-y-2">
          <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={add.pending}>
            {add.pending ? "Adding…" : "Add money"} <ArrowRight className="size-4" />
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full rounded-2xl" onClick={onNext}>
            Skip
          </Button>
        </div>
      </form>
    </StepShell>
  );
}
