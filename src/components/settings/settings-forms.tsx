"use client";

import { Copy, Monitor, Moon, Plus, RefreshCw, Share2, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { changePasswordAction } from "@/app/actions/auth";
import { regenerateInviteAction } from "@/app/actions/couple";
import {
  updateBudgetSettingsAction,
  updateCategoriesAction,
  updatePaymentMethodsAction,
  updateProfileAction,
  updateSpaceAction,
  updateThemeAction,
} from "@/app/actions/settings";
import { Field, MoneyInput, NativeSelect, Segmented, TextInput } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/user-avatar";
import { useAction } from "@/hooks/use-action";
import { useClientValue, useOrigin } from "@/hooks/use-client-value";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { OrderingMode } from "@/types/domain";

type FieldErrors = Record<string, string[] | undefined>;

const AVATAR_COLORS = ["#E58F9E", "#B48EAD", "#D4A373", "#7FB7A4", "#8FA6D8", "#E0A96D", "#C77D8E", "#6C9A8B"];

export function ProfileForm({ name: initialName, avatarColor, avatarUrl }: { name: string; avatarColor: string; avatarUrl: string | null }) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(avatarColor);
  const [url, setUrl] = useState(avatarUrl ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useAction(updateProfileAction);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await save.run({ name, avatarColor: color, avatarUrl: url });
    setErrors(res.ok ? {} : (res.fieldErrors ?? {}));
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex justify-center">
        <UserAvatar name={name || "?"} color={color} imageUrl={url || null} size="lg" />
      </div>
      <Field label="Name" htmlFor="p-name" error={errors.name?.[0]}>
        <TextInput id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="given-name" />
      </Field>
      <Field label="Avatar color">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar color">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn("size-11 rounded-full ring-offset-2 ring-offset-background", color === c && "ring-2 ring-foreground")}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </Field>
      <Field label="Photo link" htmlFor="p-url" error={errors.avatarUrl?.[0]} hint="Optional. A direct https:// link to an image.">
        <TextInput id="p-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
      </Field>
      <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={save.pending}>
        {save.pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const mounted = useClientValue(() => true, false);
  const save = useAction(updateThemeAction, { toastSuccess: false, toastError: false });

  return (
    <Segmented<"system" | "light" | "dark">
      name="Theme"
      value={mounted ? ((theme as "system" | "light" | "dark") ?? "system") : undefined}
      onChange={(t) => {
        setTheme(t);
        save.run({ theme: t });
      }}
      options={[
        { value: "system", label: "Auto", icon: <Monitor className="size-4" /> },
        { value: "light", label: "Light", icon: <Sun className="size-4" /> },
        { value: "dark", label: "Dark", icon: <Moon className="size-4" /> },
      ]}
    />
  );
}

export function SpaceForm({ name: initialName, currency: initialCurrency, hasTransactions }: { name: string; currency: string; hasTransactions: boolean }) {
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useAction(updateSpaceAction);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await save.run({ name, currency });
    setErrors(res.ok ? {} : (res.fieldErrors ?? {}));
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Space name" htmlFor="s-name" error={errors.name?.[0]}>
        <TextInput id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Field>
      <Field
        label="Currency"
        htmlFor="s-currency"
        error={errors.currency?.[0]}
        hint={hasTransactions ? "Amounts are not converted. Changing currency only changes how existing numbers are labelled." : undefined}
      >
        <NativeSelect id="s-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={save.pending}>
        {save.pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function InviteCard({ code: initialCode }: { code: string | null }) {
  const [code, setCode] = useState(initialCode);
  const origin = useOrigin();
  const regenerate = useAction(regenerateInviteAction);
  const link = code && origin ? `${origin}/invite/${code}` : "";

  if (!code) return null;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join our luxury fund", url: link });
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  }

  return (
    <div className="surface p-5">
      <p className="text-sm font-medium">Invite your partner</p>
      <p className="mt-1 text-sm text-muted-foreground">Share the link or code. It expires in 14 days and works once.</p>
      <p className="mt-4 text-center font-mono text-3xl font-semibold tracking-[0.25em]">{code}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11 rounded-2xl" onClick={() => navigator.clipboard.writeText(code).then(() => toast.success("Code copied"))}>
          <Copy className="size-4" /> Copy code
        </Button>
        <Button variant="outline" className="h-11 rounded-2xl" onClick={share} disabled={!link}>
          <Share2 className="size-4" /> Share link
        </Button>
      </div>
      <Button
        variant="ghost"
        className="mt-2 h-11 w-full rounded-2xl text-muted-foreground"
        disabled={regenerate.pending}
        onClick={async () => {
          const res = await regenerate.run();
          if (res.ok) setCode(res.data.code);
        }}
      >
        <RefreshCw className="size-4" /> New code (revokes the old one)
      </Button>
    </div>
  );
}

export function BudgetForm({
  currency,
  initial,
}: {
  currency: string;
  initial: { monthlyBudget: string; savingsTarget: string; expectedMonthlyContribution: string; strictBudget: boolean; orderingMode: OrderingMode };
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useAction(updateBudgetSettingsAction);
  const set = <K extends keyof typeof values>(k: K, v: (typeof values)[K]) => setValues((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await save.run(values);
    setErrors(res.ok ? {} : (res.fieldErrors ?? {}));
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Field label="Monthly luxury budget" htmlFor="b-budget" error={errors.monthlyBudget?.[0]} hint="Leave empty for no budget.">
        <MoneyInput id="b-budget" currency={currency} value={values.monthlyBudget} onChange={(e) => set("monthlyBudget", e.target.value)} />
      </Field>
      <label className="surface flex items-start justify-between gap-4 p-4">
        <span>
          <span className="block text-sm font-medium">Strict budget</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">Block quick expenses that would go over the monthly budget. Wishlist purchases are never blocked.</span>
        </span>
        <Switch checked={values.strictBudget} onCheckedChange={(v) => set("strictBudget", v)} aria-label="Strict budget" />
      </label>
      <Field label="Monthly savings goal" htmlFor="b-savings" error={errors.savingsTarget?.[0]}>
        <MoneyInput id="b-savings" currency={currency} value={values.savingsTarget} onChange={(e) => set("savingsTarget", e.target.value)} />
      </Field>
      <Field
        label="Expected monthly contribution"
        htmlFor="b-expected"
        error={errors.expectedMonthlyContribution?.[0]}
        hint="Used for funding forecasts. Leave empty to use your recent average."
      >
        <MoneyInput id="b-expected" currency={currency} value={values.expectedMonthlyContribution} onChange={(e) => set("expectedMonthlyContribution", e.target.value)} />
      </Field>
      <Field label="Funding order">
        <Segmented<OrderingMode>
          name="Funding order"
          value={values.orderingMode}
          onChange={(v) => set("orderingMode", v)}
          options={[
            { value: "SMART", label: "Smart" },
            { value: "MANUAL", label: "Manual" },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {values.orderingMode === "SMART"
            ? "Within each priority, wishes with earlier target dates are funded first, then your manual order."
            : "Within each priority, your manual order decides, then target dates."}
        </p>
      </Field>
      <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={save.pending}>
        {save.pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function LabelListEditor({ kind, initial }: { kind: "categories" | "paymentMethods"; initial: string[] }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const save = useAction(kind === "categories" ? updateCategoriesAction : updatePaymentMethodsAction);
  const noun = kind === "categories" ? "category" : "payment method";

  function add() {
    const v = draft.trim().slice(0, 40);
    if (!v) return;
    if (items.some((i) => i.toLowerCase() === v.toLowerCase())) {
      toast.error(`That ${noun} already exists.`);
      return;
    }
    setItems((s) => [...s, v]);
    setDraft("");
  }

  const dirty = JSON.stringify(items) !== JSON.stringify(initial);

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item} className="flex h-10 items-center gap-1 rounded-full bg-muted pl-4 pr-1 text-sm">
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => setItems((s) => s.filter((x) => x !== item))}
              disabled={items.length <= 1}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-background disabled:opacity-40"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <TextInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={`Add a ${noun}`}
          aria-label={`New ${noun}`}
          maxLength={40}
        />
        <Button type="button" variant="outline" className="h-12 rounded-2xl px-4" onClick={add} aria-label={`Add ${noun}`}>
          <Plus className="size-4" />
        </Button>
      </div>
      {dirty ? (
        <Button className="h-11 w-full rounded-2xl" disabled={save.pending} onClick={() => save.run({ [kind]: items })}>
          {save.pending ? "Saving…" : "Save changes"}
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">Removing a {noun} doesn&apos;t change past entries that use it.</p>
    </div>
  );
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useAction(changePasswordAction);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await save.run({ currentPassword, password, confirmPassword });
    if (res.ok) {
      setCurrent("");
      setPassword("");
      setConfirm("");
      setErrors({});
    } else setErrors(res.fieldErrors ?? {});
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Current password" htmlFor="cp-current" error={errors.currentPassword?.[0]}>
        <TextInput id="cp-current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="New password" htmlFor="cp-new" error={errors.password?.[0]} hint="At least 8 characters.">
        <TextInput id="cp-new" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Confirm new password" htmlFor="cp-confirm" error={errors.confirmPassword?.[0]}>
        <TextInput id="cp-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <p className="text-xs text-muted-foreground">Changing your password signs you out on all other devices.</p>
      <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={save.pending}>
        {save.pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
