import { TZDate } from "@date-fns/tz";
import { addMonths, format, subMonths } from "date-fns";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** yyyy-MM key of the month containing `date` in the given timezone. */
export function monthKey(date: Date, tz = DEFAULT_TIMEZONE): string {
  return format(new TZDate(date, tz), "yyyy-MM");
}

/** [start, end) instants of a yyyy-MM month in the given timezone. */
export function monthRange(key: string, tz = DEFAULT_TIMEZONE): { start: Date; end: Date } {
  const [y, m] = key.split("-").map(Number);
  const start = new TZDate(y, m - 1, 1, tz);
  const end = addMonths(start, 1);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

/** The last `count` month keys ending with the current month (oldest first). */
export function recentMonthKeys(count: number, now = new Date(), tz = DEFAULT_TIMEZONE): string[] {
  const current = new TZDate(now, tz);
  return Array.from({ length: count }, (_, i) => format(subMonths(current, count - 1 - i), "yyyy-MM"));
}

export function monthLabel(key: string, style: "short" | "long" = "short"): string {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, m - 1, 1), style === "short" ? "MMM" : "MMMM yyyy");
}

/**
 * Converts a yyyy-MM-dd date picked in the UI to an instant. Today's date maps
 * to "now" (keeps ordering natural); other days map to midday in the timezone
 * so they never drift across a date boundary.
 */
export function dateInputToInstant(value: string, tz = DEFAULT_TIMEZONE, now = new Date()): Date {
  if (format(new TZDate(now, tz), "yyyy-MM-dd") === value) return now;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, 12, 0, 0, tz).getTime());
}

export function todayInput(tz = DEFAULT_TIMEZONE, now = new Date()): string {
  return format(new TZDate(now, tz), "yyyy-MM-dd");
}

export function greetingFor(date = new Date(), tz = DEFAULT_TIMEZONE): string {
  const hour = new TZDate(date, tz).getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
