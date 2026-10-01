import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import { formatCurrency } from "./money";
import { DEFAULT_TIMEZONE } from "./time";
import type { ActivityDTO, MemberDTO, Priority, WishlistItemDTO } from "@/types/domain";

export const PRIORITY_LABEL: Record<Priority, string> = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

export function memberName(members: MemberDTO[], id: string | null | undefined, opts: { you?: boolean } = { you: true }): string {
  if (!id) return "Someone";
  const m = members.find((x) => x.id === id);
  if (!m) return "Partner";
  return m.isMe && opts.you ? "You" : m.name;
}

/** "Mine" / "Partner" name / "Ours", relative to the viewer. */
export function ownerLabel(item: Pick<WishlistItemDTO, "ownerType" | "ownerUserId">, members: MemberDTO[]): string {
  if (item.ownerType === "SHARED") return "Ours";
  const me = members.find((m) => m.isMe);
  if (item.ownerUserId && me && item.ownerUserId === me.id) return "Mine";
  const partner = members.find((m) => !m.isMe);
  return partner ? partner.name : "Partner";
}

export function ownerKind(item: Pick<WishlistItemDTO, "ownerType" | "ownerUserId">, meId: string): "MINE" | "PARTNER" | "OURS" {
  if (item.ownerType === "SHARED") return "OURS";
  return item.ownerUserId === meId ? "MINE" : "PARTNER";
}

export function formatTargetDate(iso: string | null, style: "short" | "long" = "short", tz = DEFAULT_TIMEZONE): string {
  if (!iso) return "No date";
  const d = new TZDate(iso, tz);
  return format(d, style === "short" ? "MMM yyyy" : "d MMMM yyyy");
}

/** Day heading in the space timezone, so server and client render the same text. */
export function dayGroupLabel(iso: string, tz = DEFAULT_TIMEZONE): string {
  const d = new TZDate(iso, tz);
  const now = TZDate.tz(tz);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  const diff = differenceInCalendarDays(now, d);
  if (diff < 7) return format(d, "EEEE");
  return format(d, d.getFullYear() === now.getFullYear() ? "d MMMM" : "d MMMM yyyy");
}

export function formatDateTime(iso: string, pattern: string, tz = DEFAULT_TIMEZONE): string {
  return format(new TZDate(iso, tz), pattern);
}

export function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Date.now() - d.getTime() < 60_000) return "just now";
  return `${formatDistanceToNowStrict(d)} ago`;
}

export function daysUntilLabel(days: number | null): string {
  if (days === null) return "—";
  if (days <= 0) return "Now";
  if (days === 1) return "1 day";
  if (days < 60) return `${days} days`;
  const months = Math.round(days / 30.44);
  if (months < 24) return `${months} months`;
  return `${(days / 365).toFixed(1)} years`;
}

export function activityText(a: ActivityDTO, members: MemberDTO[], currency: string): string {
  const actor = a.actorId ? memberName(members, a.actorId) : "";
  const amt = (v: unknown) => formatCurrency(Number(v ?? 0), { currency });
  const d = a.data;
  switch (a.type) {
    case "SPACE_CREATED":
      return `${actor} created ${d.name ?? "your couple space"}`;
    case "PARTNER_JOINED":
      return `${actor} joined the space 💞`;
    case "CONTRIBUTION_ADDED": {
      const contributor = memberName(members, d.contributorId as string);
      return contributor === actor ? `${actor} added ${amt(d.amount)}` : `${actor} recorded ${amt(d.amount)} from ${contributor}`;
    }
    case "EXPENSE_RECORDED":
      return `${actor} spent ${amt(d.amount)} on ${d.title}`;
    case "ITEM_ADDED":
      return `${actor} added “${d.itemName}”`;
    case "ITEM_UPDATED":
      return `${actor} updated ${d.itemName}`;
    case "PRIORITY_CHANGED":
      return `${actor} changed ${d.itemName} priority to ${PRIORITY_LABEL[d.to as Priority] ?? d.to}`;
    case "ITEM_FUNDED":
      return `${d.itemName} reached 100% 🎉`;
    case "ITEM_PURCHASED":
      return `${actor} purchased ${d.itemName}`;
    case "ITEM_ARCHIVED":
      return `${actor} archived ${d.itemName}`;
    case "ITEM_RESTORED":
      return `${actor} restored ${d.itemName}`;
    case "FUNDS_ALLOCATED":
      if (d.mode === "auto") return `${actor} auto-allocated ${amt(d.amount)} across ${d.count} goal${Number(d.count) === 1 ? "" : "s"}`;
      return d.itemName ? `${actor} put ${amt(d.amount)} toward ${d.itemName}` : `${actor} allocated ${amt(d.amount)}`;
    case "FUNDS_RELEASED":
      return `${actor} moved ${amt(d.amount)} out of ${d.itemName}`;
    case "ALLOCATION_UNDONE":
      return `${actor} undid an allocation (${amt(d.amount)})`;
    case "TRANSACTION_REVERSED":
      return `${actor} reversed ${d.itemName ? `the purchase of ${d.itemName}` : d.title}`;
    case "SETTINGS_UPDATED":
      return `${actor} updated ${d.what ?? "settings"}`;
    default:
      return "Activity";
  }
}
