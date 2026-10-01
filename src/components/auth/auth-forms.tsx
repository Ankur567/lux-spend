"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/actions/auth";
import { Field, TextInput } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";

type Errors = Record<string, string | undefined>;

function firstErrors(fieldErrors?: Record<string, string[]>): Errors {
  const out: Errors = {};
  for (const [k, v] of Object.entries(fieldErrors ?? {})) out[k] = v[0];
  return out;
}

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextInput
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        className="pr-12"
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ callbackUrl, notice }: { callbackUrl?: string; notice?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { run, pending } = useAction(loginAction, { toastError: false });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const res = await run({ email, password, callbackUrl });
    if (res && !res.ok) {
      setErrors(firstErrors(res.fieldErrors));
      setFormError(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <h1 className="font-display text-4xl">Welcome back</h1>
      {notice ? <p className="rounded-2xl bg-success-soft p-3 text-sm">{notice}</p> : null}
      {formError ? (
        <p className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
      <Field label="Email" htmlFor="email" error={errors.email}>
        <TextInput id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password}>
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" invalid={!!errors.password} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="min-h-11 py-2 text-sm text-muted-foreground underline-offset-2 hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ inviteCode, inviterName }: { inviteCode?: string; inviterName?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { run, pending } = useAction(registerAction, { toastError: false });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const res = await run({ name, email, password, inviteCode });
    if (res && !res.ok) {
      setErrors(firstErrors(res.fieldErrors));
      setFormError(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <h1 className="font-display text-4xl">{inviteCode ? "Join your partner" : "Create your account"}</h1>
        {inviterName ? <p className="mt-1 text-sm text-muted-foreground">{inviterName} invited you to their luxury fund.</p> : null}
      </div>
      {formError ? (
        <p className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
      <Field label="Your name" htmlFor="name" error={errors.name}>
        <TextInput id="name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email}>
        <TextInput id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters.">
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" invalid={!!errors.password} />
      </Field>
      <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={pending}>
        {pending ? "Creating account…" : inviteCode ? "Create account & join" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={inviteCode ? `/login?callbackUrl=${encodeURIComponent(`/invite/${inviteCode}`)}` : "/login"} className="font-medium text-foreground underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { run, pending } = useAction(forgotPasswordAction, { toastSuccess: false });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await run({ email });
    if (res.ok) setSent(true);
    else setError(firstErrors(res.fieldErrors).email);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl">Check your email</h1>
        <p className="text-sm text-muted-foreground">If an account exists for {email}, we&apos;ve sent a link to reset your password. It expires in 1 hour.</p>
        {!emailConfigured ? (
          <p className="rounded-2xl bg-warning-soft p-3 text-sm">
            Email delivery isn&apos;t configured on this server yet. In development, the reset link is printed in the server log.
          </p>
        ) : null}
        <Link href="/login" className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-border font-medium">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <h1 className="font-display text-4xl">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
      </div>
      <Field label="Email" htmlFor="email" error={error}>
        <TextInput id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </Field>
      <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <Link href="/login" className="block text-center text-sm text-muted-foreground">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const { run, pending } = useAction(resetPasswordAction);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await run({ token, password, confirmPassword });
    if (res.ok) setDone(true);
    else setErrors(firstErrors(res.fieldErrors));
  }

  if (done) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl">Password updated</h1>
        <p className="text-sm text-muted-foreground">You&apos;ve been signed out everywhere. Sign in with your new password.</p>
        <Link href="/login" className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-medium text-primary-foreground">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <h1 className="font-display text-4xl">Choose a new password</h1>
      <Field label="New password" htmlFor="password" error={errors.password} hint="At least 8 characters.">
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" invalid={!!errors.password} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={errors.confirmPassword}>
        <PasswordInput id="confirm" value={confirmPassword} onChange={setConfirm} autoComplete="new-password" invalid={!!errors.confirmPassword} />
      </Field>
      <Button type="submit" className="h-12 w-full rounded-2xl text-base" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
