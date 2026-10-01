import "server-only";
import type { Types } from "mongoose";
import type { MemberContext } from "@/lib/auth/guard";
import { InAppChannel } from "@/lib/integrations/notify/in-app-channel";
import type { NotificationChannel } from "@/lib/integrations/notify/types";
import { formatCurrency, percent } from "@/lib/money";
import { monthKey } from "@/lib/time";
import { Membership, Notification, WishlistItem, type INotification, type IWishlistItem } from "@/models";
import type { NotificationType } from "@/types/domain";
import { toNotificationDTO } from "./mappers";

const channels: NotificationChannel[] = [new InAppChannel()];

export type Recipients = "ALL" | "PARTNER" | "ME";

interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string | null;
  recipients?: Recipients;
  dedupeKey?: string;
}

/**
 * Fan-out to every enabled channel for every recipient. Delivery failures are
 * logged and swallowed: notifications must never break a financial action.
 */
export async function notify(ctx: Pick<MemberContext, "spaceOid" | "userOid">, input: NotifyInput): Promise<void> {
  try {
    const memberships = await Membership.find({ coupleSpaceId: ctx.spaceOid }).lean();
    const recipients = memberships
      .map((m) => m.userId)
      .filter((id) => {
        if (input.recipients === "PARTNER") return !id.equals(ctx.userOid);
        if (input.recipients === "ME") return id.equals(ctx.userOid);
        return true;
      });
    await Promise.all(
      recipients.flatMap((recipientId: Types.ObjectId) =>
        channels
          .filter((c) => c.isEnabled())
          .map((c) =>
            c
              .deliver({
                coupleSpaceId: ctx.spaceOid,
                recipientId,
                type: input.type,
                title: input.title,
                body: input.body ?? "",
                link: input.link ?? null,
                dedupeKey: input.dedupeKey ?? null,
              })
              .catch((err) => console.error(`[notify:${c.name}]`, err)),
          ),
      ),
    );
  } catch (err) {
    console.error("[notify] failed", err);
  }
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

export async function notifyDeposit(ctx: MemberContext, amount: number, contributorName: string) {
  await notify(ctx, {
    type: "DEPOSIT",
    title: `${formatCurrency(amount, { currency: ctx.space.currency })} was added to your shared fund`,
    body: `${contributorName} added money.`,
    link: "/wallet",
    recipients: "PARTNER",
  });
}

export async function notifyItemsFunded(ctx: MemberContext, items: Pick<IWishlistItem, "_id" | "name">[]) {
  for (const item of items) {
    await notify(ctx, {
      type: "ITEM_FUNDED",
      title: `${item.name} is fully funded 🎉`,
      body: "It's ready to buy whenever you are.",
      link: `/wishlist/${item._id.toString()}`,
    });
    await WishlistItem.updateOne({ _id: item._id }, { $set: { fundedNotifiedAt: new Date() } });
  }
}

/**
 * "You're ₹2,000 away from funding your next goal" and
 * "Your January target is 80% funded" style nudges.
 */
export async function notifyProgress(
  ctx: MemberContext,
  nextGoal: { item: IWishlistItem; allocated: number } | null,
  unallocated: number,
) {
  if (!nextGoal) return;
  const { item, allocated } = nextGoal;
  const remaining = Math.max(0, item.estimatedPrice - allocated - unallocated);
  const currency = ctx.space.currency;
  const nearThreshold = Math.min(5_000_00, Math.round(item.estimatedPrice * 0.15));
  if (remaining > 0 && remaining <= nearThreshold) {
    await notify(ctx, {
      type: "NEAR_GOAL",
      title: `You're ${formatCurrency(remaining, { currency })} away from funding ${item.name}`,
      body: "One more contribution should do it.",
      link: `/wishlist/${item._id.toString()}`,
      dedupeKey: `near:${item._id.toString()}:${remaining > nearThreshold / 2 ? "a" : "b"}`,
    });
  }
  const pct = percent(allocated, item.estimatedPrice);
  if (item.targetDate && pct >= 80 && pct < 100 && !item.progressNotifiedAt) {
    const month = new Date(item.targetDate).toLocaleString("en-IN", { month: "long" });
    await notify(ctx, {
      type: "TARGET_PROGRESS",
      title: `Your ${month} target is ${pct}% funded`,
      body: `${item.name} is getting close.`,
      link: `/wishlist/${item._id.toString()}`,
      dedupeKey: `target80:${item._id.toString()}`,
    });
    await WishlistItem.updateOne({ _id: item._id }, { $set: { progressNotifiedAt: new Date() } });
  }
}

export async function notifyBudget(ctx: MemberContext, spent: number, budget: number, timezone: string) {
  if (budget <= 0) return;
  const pct = percent(spent, budget);
  const key = monthKey(new Date(), timezone);
  const currency = ctx.space.currency;
  if (pct >= 100) {
    await notify(ctx, {
      type: "BUDGET_WARNING",
      title: "This month's luxury budget is used up",
      body: `${formatCurrency(spent, { currency })} spent of ${formatCurrency(budget, { currency })}.`,
      link: "/insights",
      dedupeKey: `budget100:${key}`,
    });
  } else if (pct >= 80) {
    await notify(ctx, {
      type: "BUDGET_WARNING",
      title: `You've used ${pct}% of this month's luxury budget`,
      body: `${formatCurrency(budget - spent, { currency })} left for the month.`,
      link: "/insights",
      dedupeKey: `budget80:${key}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listNotifications(ctx: MemberContext, limit = 50) {
  const rows = await Notification.find({ userId: ctx.userOid, coupleSpaceId: ctx.spaceOid })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<INotification[]>();
  return rows.map(toNotificationDTO);
}

export async function unreadCount(ctx: MemberContext) {
  return Notification.countDocuments({ userId: ctx.userOid, coupleSpaceId: ctx.spaceOid, readAt: null });
}

export async function markNotificationsRead(ctx: MemberContext, ids?: Types.ObjectId[]) {
  const filter: Record<string, unknown> = { userId: ctx.userOid, coupleSpaceId: ctx.spaceOid, readAt: null };
  if (ids?.length) filter._id = { $in: ids };
  await Notification.updateMany(filter, { $set: { readAt: new Date() } });
}
