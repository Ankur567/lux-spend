"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/money";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required ? <span className="text-rose"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "flex h-12 w-full rounded-2xl border border-input bg-card px-4 text-base outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50 aria-invalid:border-destructive";

export const TextInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputClass, "h-auto min-h-24 py-3", className)} {...props} />;
});

export const NativeSelect = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function NativeSelect({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(inputClass, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  );
});

export const MoneyInput = forwardRef<HTMLInputElement, ComponentProps<"input"> & { currency?: string; big?: boolean }>(
  function MoneyInput({ className, currency = "INR", big, ...props }, ref) {
    return (
      <div className="relative">
        <span
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground",
            big ? "text-2xl" : "text-base",
          )}
        >
          {currencySymbol(currency)}
        </span>
        <input
          ref={ref}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          className={cn(inputClass, big ? "h-16 pl-10 text-3xl font-semibold tabular" : "pl-9 tabular", className)}
          {...props}
        />
      </div>
    );
  },
);

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  name,
  className,
}: {
  value: T | undefined;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  name: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("grid gap-1 rounded-2xl bg-muted p-1", className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition-all",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
