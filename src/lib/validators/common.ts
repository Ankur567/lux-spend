import { z } from "zod";
import { toPaise } from "@/lib/money";

/** ₹10 crore upper bound keeps values well inside safe integer range. */
export const MAX_PAISE = 10_00_00_000 * 100;

const amountInput = z.union([z.string(), z.number()]);

function parseAmount(v: string | number, ctx: z.RefinementCtx, allowZero: boolean): number {
  const raw = typeof v === "string" ? v.trim() : v;
  if (raw === "" || raw === undefined) {
    if (allowZero) return 0;
    ctx.addIssue({ code: "custom", message: "Enter an amount" });
    return z.NEVER;
  }
  let paise: number;
  try {
    paise = toPaise(raw);
  } catch {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
    return z.NEVER;
  }
  if (paise < 0 || (!allowZero && paise === 0)) {
    ctx.addIssue({ code: "custom", message: "Amount must be greater than zero" });
    return z.NEVER;
  }
  if (paise > MAX_PAISE) {
    ctx.addIssue({ code: "custom", message: "That amount is too large" });
    return z.NEVER;
  }
  return paise;
}

/** User-entered rupee amount (string or number) -> positive integer paise. */
export const money = amountInput.transform((v, ctx) => parseAmount(v, ctx, false));

/** Same as `money` but empty / 0 is allowed (e.g. "no budget"). */
export const moneyOrZero = amountInput.transform((v, ctx) => parseAmount(v, ctx, true));

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

/** Collapses whitespace and strips control characters. */
export const cleanText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max, `Keep it under ${max} characters`));

export const requiredText = (max: number, label = "This field") =>
  cleanText(max).pipe(z.string().min(1, `${label} is required`));

export const optionalText = (max: number) => cleanText(max).optional().default("");

export const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\/[^\s]+$/i.test(v), "Use a full link starting with https://");

/** yyyy-MM-dd from <input type="date">, or empty. */
export const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date");

export const requiredDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
