/**
 * Money is stored as integer minor units (paise for INR). Never use floats for
 * persisted amounts; convert at the edges with toPaise / fromPaise.
 */

export const DEFAULT_CURRENCY = "INR";

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  AED: "en-AE",
  SGD: "en-SG",
};

export function localeFor(currency: string = DEFAULT_CURRENCY): string {
  return LOCALE_BY_CURRENCY[currency] ?? "en-IN";
}

export function currencySymbol(currency: string = DEFAULT_CURRENCY): string {
  const parts = new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

/**
 * Converts a major-unit amount (e.g. rupees, possibly a user-entered string
 * like "1,299.99") to integer paise. Throws for invalid or non-finite input.
 */
export function toPaise(amount: number | string): number {
  const value =
    typeof amount === "string" ? Number(amount.replace(/[,\s₹]/g, "")) : amount;
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid amount: ${String(amount)}`);
  }
  // Round via string to avoid 1.005 * 100 = 100.49999 style float errors.
  const [whole, frac = ""] = Math.abs(value).toFixed(4).split(".");
  const paise = Number(whole) * 100 + Math.round(Number(`0.${frac}`) * 100);
  return value < 0 ? -paise : paise;
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

export interface FormatCurrencyOptions {
  currency?: string;
  /** Show a leading + for positive values. */
  signed?: boolean;
  /** Force decimals; by default decimals appear only when non-zero. */
  decimals?: boolean;
  /** Compact notation, e.g. ₹1.2L */
  compact?: boolean;
}

export function formatCurrency(paise: number, opts: FormatCurrencyOptions = {}): string {
  const currency = opts.currency ?? DEFAULT_CURRENCY;
  const hasFraction = paise % 100 !== 0;
  const showDecimals = opts.decimals ?? hasFraction;
  const formatter = new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    notation: opts.compact ? "compact" : "standard",
    minimumFractionDigits: opts.compact ? 0 : showDecimals ? 2 : 0,
    maximumFractionDigits: opts.compact ? 1 : showDecimals ? 2 : 0,
  });
  const formatted = formatter.format(Math.abs(paise) / 100);
  if (paise < 0) return `−${formatted}`;
  if (opts.signed && paise > 0) return `+${formatted}`;
  return formatted;
}

/** Formats paise as a plain editable number string, e.g. 129999 -> "1299.99". */
export function paiseToInput(paise: number): string {
  if (!paise) return "";
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return part > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}
