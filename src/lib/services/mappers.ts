import "server-only";
import type { IActivity, IAppSettings, INotification, ITransaction, IWishlistItem } from "@/models";
import type { ActivityDTO, NotificationDTO, SettingsDTO, TransactionDTO, WishlistItemDTO } from "@/types/domain";

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);

export function toItemDTO(item: IWishlistItem, allocated: number): WishlistItemDTO {
  return {
    id: item._id.toString(),
    name: item.name,
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? null,
    productUrl: item.productUrl ?? null,
    category: item.category,
    estimatedPrice: item.estimatedPrice,
    actualPurchasePrice: item.actualPurchasePrice ?? null,
    priority: item.priority,
    rank: item.rank ?? 0,
    targetDate: iso(item.targetDate),
    status: item.status,
    notes: item.notes ?? "",
    ownerType: item.ownerType,
    ownerUserId: item.ownerUserId ? item.ownerUserId.toString() : null,
    createdBy: item.createdBy.toString(),
    createdAt: iso(item.createdAt)!,
    updatedAt: iso(item.updatedAt)!,
    purchasedAt: iso(item.purchasedAt),
    archivedAt: iso(item.archivedAt),
    allocated,
  };
}

export function toTransactionDTO(tx: ITransaction, opts: { itemName?: string | null; reversed?: boolean } = {}): TransactionDTO {
  return {
    id: tx._id.toString(),
    type: tx.type,
    direction: tx.direction,
    amount: tx.amount,
    userId: tx.userId ? tx.userId.toString() : null,
    performedBy: tx.performedBy.toString(),
    wishlistItemId: tx.wishlistItemId ? tx.wishlistItemId.toString() : null,
    wishlistItemName: opts.itemName ?? null,
    allocationBatchId: tx.allocationBatchId ? tx.allocationBatchId.toString() : null,
    paymentMethod: tx.paymentMethod ?? null,
    category: tx.category ?? null,
    title: tx.title ?? "",
    notes: tx.notes ?? "",
    occurredAt: iso(tx.occurredAt)!,
    createdAt: iso(tx.createdAt)!,
    reversalOf: tx.reversalOf ? tx.reversalOf.toString() : null,
    reversed: Boolean(opts.reversed),
    source: tx.source,
  };
}

export function toActivityDTO(a: IActivity): ActivityDTO {
  return {
    id: a._id.toString(),
    type: a.type,
    actorId: a.actorId ? a.actorId.toString() : null,
    data: a.data ?? {},
    wishlistItemId: a.wishlistItemId ? a.wishlistItemId.toString() : null,
    createdAt: iso(a.createdAt)!,
  };
}

export function toNotificationDTO(n: INotification): NotificationDTO {
  return {
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link ?? null,
    readAt: iso(n.readAt),
    createdAt: iso(n.createdAt)!,
  };
}

export function toSettingsDTO(s: IAppSettings, currency: string): SettingsDTO {
  return {
    currency,
    timezone: s.timezone,
    monthlyBudget: s.monthlyBudget,
    savingsTarget: s.savingsTarget,
    expectedMonthlyContribution: s.expectedMonthlyContribution,
    strictBudget: s.strictBudget,
    orderingMode: s.orderingMode,
    categories: s.categories,
    paymentMethods: s.paymentMethods,
  };
}
