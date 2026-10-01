import "server-only";
import type { Types } from "mongoose";
import type { MemberContext } from "@/lib/auth/guard";
import { parseObjectId } from "@/lib/auth/guard";
import { withTransaction } from "@/lib/db/transaction";
import { AppError } from "@/lib/errors";
import { sortForAllocation } from "@/lib/finance/allocation-engine";
import { formatCurrency } from "@/lib/money";
import { dateInputToInstant } from "@/lib/time";
import { Transaction, WishlistItem, type IWishlistItem } from "@/models";
import { ACTIVE_STATUSES, type OwnerChoice, type OwnerType, type Priority, type WishlistItemDTO } from "@/types/domain";
import { logActivity } from "./activity-service";
import { writeAllocationBatch } from "./allocation-service";
import { afterLedgerChange } from "./effects";
import { getItemAllocations, getWalletSummary, insertTransactions, lockLedger, syncItemStatuses } from "./ledger";
import { toItemDTO } from "./mappers";
import { notify } from "./notification-service";
import { addCategory, getSettings, setOrderingMode } from "./settings-service";
import { listTransactions, restorePurchasedItem } from "./transaction-service";

export interface WishlistItemParams {
  name: string;
  description: string;
  estimatedPrice: number;
  priority: Priority;
  owner: OwnerChoice;
  category: string;
  targetDate: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  notes: string;
}

function resolveOwner(ctx: MemberContext, owner: OwnerChoice): { ownerType: OwnerType; ownerUserId: Types.ObjectId | null } {
  if (owner === "US") return { ownerType: "SHARED", ownerUserId: null };
  if (owner === "ME") return { ownerType: "INDIVIDUAL", ownerUserId: ctx.userOid };
  return { ownerType: "INDIVIDUAL", ownerUserId: ctx.partner ? parseObjectId(ctx.partner.id, "Member") : null };
}

/** The viewer-relative owner choice for an item (used to prefill forms). */
export function ownerChoiceFor(ctx: MemberContext, item: Pick<WishlistItemDTO, "ownerType" | "ownerUserId">): OwnerChoice {
  if (item.ownerType === "SHARED") return "US";
  return item.ownerUserId === ctx.userId ? "ME" : "PARTNER";
}

async function loadItem(ctx: MemberContext, id: string, session: import("mongoose").ClientSession | null = null) {
  const item = await WishlistItem.findOne({ _id: parseObjectId(id, "Wishlist item"), coupleSpaceId: ctx.spaceOid })
    .session(session)
    .lean<IWishlistItem>();
  if (!item) throw new AppError("NOT_FOUND", "Wishlist item not found.");
  return item;
}

function targetDateValue(value: string | null): Date | null {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listItems(ctx: MemberContext): Promise<WishlistItemDTO[]> {
  const [items, settings] = await Promise.all([
    WishlistItem.find({ coupleSpaceId: ctx.spaceOid }).lean<IWishlistItem[]>(),
    getSettings(ctx.spaceOid),
  ]);
  const allocations = await getItemAllocations(ctx.spaceOid);
  const dtos = items.map((i) => toItemDTO(i, allocations.get(i._id.toString()) ?? 0));
  const active = sortForAllocation(
    dtos.filter((d) => ACTIVE_STATUSES.includes(d.status)).map((dto) => ({ ...dto, price: dto.estimatedPrice, dto })),
    settings.orderingMode,
  ).map((e) => e.dto);
  const purchased = dtos
    .filter((d) => d.status === "PURCHASED")
    .sort((a, b) => (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? ""));
  const archived = dtos
    .filter((d) => d.status === "ARCHIVED")
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
  return [...active, ...purchased, ...archived];
}

export async function getItemDetail(ctx: MemberContext, id: string) {
  const item = await loadItem(ctx, id);
  const allocated = (await getItemAllocations(ctx.spaceOid, [item._id])).get(item._id.toString()) ?? 0;
  const history = await listTransactions(ctx, { wishlistItemId: item._id, limit: 200 });
  return { item: toItemDTO(item, allocated), history };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createItem(ctx: MemberContext, p: WishlistItemParams): Promise<string> {
  const owner = resolveOwner(ctx, p.owner);
  const last = await WishlistItem.findOne({ coupleSpaceId: ctx.spaceOid }).sort({ rank: -1 }).select("rank").lean();
  const item = await WishlistItem.create({
    coupleSpaceId: ctx.spaceOid,
    createdBy: ctx.userOid,
    ...owner,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    productUrl: p.productUrl,
    category: p.category,
    estimatedPrice: p.estimatedPrice,
    priority: p.priority,
    rank: (last?.rank ?? 0) + 1,
    targetDate: targetDateValue(p.targetDate),
    notes: p.notes,
    status: "WISHLIST",
  });
  await addCategory(ctx, p.category);
  await logActivity(ctx, "ITEM_ADDED", { itemName: p.name, price: p.estimatedPrice, priority: p.priority }, { wishlistItemId: item._id });
  return item._id.toString();
}

export async function updateItem(ctx: MemberContext, id: string, p: WishlistItemParams) {
  const owner = resolveOwner(ctx, p.owner);
  const currency = ctx.space.currency;

  const outcome = await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const item = await loadItem(ctx, id, session);
    const isActive = ACTIVE_STATUSES.includes(item.status);
    if (!isActive && p.estimatedPrice !== item.estimatedPrice) {
      throw new AppError("BAD_REQUEST", `The price of a ${item.status.toLowerCase()} item can't be changed.`);
    }

    let released = 0;
    if (isActive) {
      const allocated = (await getItemAllocations(ctx.spaceOid, [item._id], session)).get(item._id.toString()) ?? 0;
      if (allocated > p.estimatedPrice) {
        released = allocated - p.estimatedPrice;
        await writeAllocationBatch(ctx, "PRICE_CHANGE_RELEASE", [{ item, amount: released, direction: "DEALLOCATE" }], session);
      }
    }

    await WishlistItem.updateOne(
      { _id: item._id },
      {
        $set: {
          ...owner,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          productUrl: p.productUrl,
          category: p.category,
          estimatedPrice: p.estimatedPrice,
          priority: p.priority,
          targetDate: targetDateValue(p.targetDate),
          notes: p.notes,
        },
      },
      { session: session ?? undefined },
    );
    const newlyFunded = isActive ? await syncItemStatuses(ctx.spaceOid, [item._id], session) : [];

    if (item.priority !== p.priority) {
      await logActivity(ctx, "PRIORITY_CHANGED", { itemName: p.name, from: item.priority, to: p.priority }, { session, wishlistItemId: item._id });
    } else {
      await logActivity(ctx, "ITEM_UPDATED", { itemName: p.name }, { session, wishlistItemId: item._id });
    }
    return { released, newlyFunded };
  });

  await addCategory(ctx, p.category);
  await afterLedgerChange(ctx, { newlyFunded: outcome.newlyFunded });
  return {
    released: outcome.released,
    message: outcome.released > 0 ? `${formatCurrency(outcome.released, { currency })} returned to your unallocated balance.` : undefined,
  };
}

export async function changePriority(ctx: MemberContext, id: string, priority: Priority) {
  const item = await loadItem(ctx, id);
  if (item.priority === priority) return;
  await WishlistItem.updateOne({ _id: item._id }, { $set: { priority } });
  await logActivity(ctx, "PRIORITY_CHANGED", { itemName: item.name, from: item.priority, to: priority }, { wishlistItemId: item._id });
}

/** Persists a manual order and switches funding order to manual-first. */
export async function reorderItems(ctx: MemberContext, orderedIds: string[]) {
  const ids = orderedIds.map((id) => parseObjectId(id, "Wishlist item"));
  const count = await WishlistItem.countDocuments({ _id: { $in: ids }, coupleSpaceId: ctx.spaceOid });
  if (count !== ids.length) throw new AppError("NOT_FOUND", "Some items could not be found.");
  await WishlistItem.bulkWrite(
    ids.map((_id, index) => ({ updateOne: { filter: { _id, coupleSpaceId: ctx.spaceOid }, update: { $set: { rank: index + 1 } } } })),
  );
  await setOrderingMode(ctx.spaceOid, "MANUAL");
}

export async function archiveItem(ctx: MemberContext, id: string) {
  const currency = ctx.space.currency;
  const released = await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const item = await loadItem(ctx, id, session);
    if (!ACTIVE_STATUSES.includes(item.status)) throw new AppError("BAD_REQUEST", "Only active wishlist items can be archived.");
    const allocated = (await getItemAllocations(ctx.spaceOid, [item._id], session)).get(item._id.toString()) ?? 0;
    if (allocated > 0) {
      await writeAllocationBatch(ctx, "ARCHIVE_RELEASE", [{ item, amount: allocated, direction: "DEALLOCATE" }], session);
    }
    await WishlistItem.updateOne({ _id: item._id }, { $set: { status: "ARCHIVED", archivedAt: new Date() } }, { session: session ?? undefined });
    await logActivity(ctx, "ITEM_ARCHIVED", { itemName: item.name, released: allocated }, { session, wishlistItemId: item._id });
    return allocated;
  });
  return released > 0 ? `${formatCurrency(released, { currency })} returned to your unallocated balance.` : undefined;
}

export async function restoreItem(ctx: MemberContext, id: string) {
  const item = await loadItem(ctx, id);
  if (item.status !== "ARCHIVED") throw new AppError("BAD_REQUEST", "Only archived items can be restored.");
  await WishlistItem.updateOne({ _id: item._id }, { $set: { status: "WISHLIST", archivedAt: null } });
  await logActivity(ctx, "ITEM_RESTORED", { itemName: item.name }, { wishlistItemId: item._id });
}

/** Hard delete is only allowed when the item has no financial history. */
export async function deleteItem(ctx: MemberContext, id: string) {
  const item = await loadItem(ctx, id);
  const hasHistory = await Transaction.exists({ coupleSpaceId: ctx.spaceOid, wishlistItemId: item._id });
  if (hasHistory) {
    throw new AppError("CONFLICT", "This item has money history, so it can only be archived (history is kept).");
  }
  await WishlistItem.deleteOne({ _id: item._id, coupleSpaceId: ctx.spaceOid });
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

export interface PurchaseParams {
  itemId: string;
  actualPrice: number;
  paidBy: string;
  paymentMethod: string;
  date: string;
  notes: string;
  coverDifference: "FUND" | "OUTSIDE";
}

/**
 * Marks an item purchased:
 *   1. release its whole allocation back to unallocated (DEALLOCATION)
 *   2. record the actual price as an EXPENSE
 * Net effect: a cheaper purchase returns the difference to the unallocated
 * balance; a pricier one takes the difference from unallocated money (or is
 * recorded as paid outside the fund).
 */
export async function purchaseItem(ctx: MemberContext, p: PurchaseParams) {
  const payer = ctx.members.find((m) => m.id === p.paidBy);
  if (!payer) throw new AppError("BAD_REQUEST", "Choose who paid.");
  const currency = ctx.space.currency;
  const fmt = (v: number) => formatCurrency(v, { currency });

  const result = await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const settings = await getSettings(ctx.spaceOid, session);
    const item = await loadItem(ctx, p.itemId, session);
    if (!ACTIVE_STATUSES.includes(item.status)) throw new AppError("BAD_REQUEST", `${item.name} is already ${item.status.toLowerCase()}.`);

    const allocated = (await getItemAllocations(ctx.spaceOid, [item._id], session)).get(item._id.toString()) ?? 0;
    const summary = await getWalletSummary(ctx.spaceOid, session);
    const extra = Math.max(0, p.actualPrice - allocated);

    let expenseAmount = p.actualPrice;
    let paidOutside = 0;
    if (extra > 0) {
      if (p.coverDifference === "OUTSIDE") {
        expenseAmount = allocated;
        paidOutside = extra;
      } else if (extra > Math.max(0, summary.unallocated)) {
        throw new AppError(
          "INSUFFICIENT_FUNDS",
          `The extra ${fmt(extra)} is more than your unallocated balance (${fmt(Math.max(0, summary.unallocated))}). Mark the difference as paid outside the fund, or add money first.`,
          { extra, unallocated: summary.unallocated },
        );
      }
    }

    if (allocated > 0) {
      await writeAllocationBatch(ctx, "PURCHASE_RELEASE", [{ item, amount: allocated, direction: "DEALLOCATE" }], session);
    }
    if (expenseAmount > 0) {
      await insertTransactions(
        [
          {
            coupleSpaceId: ctx.spaceOid,
            performedBy: ctx.userOid,
            userId: parseObjectId(payer.id, "Member"),
            type: "EXPENSE",
            direction: "OUT",
            amount: expenseAmount,
            wishlistItemId: item._id,
            paymentMethod: p.paymentMethod,
            category: item.category,
            title: item.name,
            notes: p.notes,
            occurredAt: dateInputToInstant(p.date, settings.timezone),
            metadata: { kind: "PURCHASE", estimatedPrice: item.estimatedPrice, actualPrice: p.actualPrice, fromAllocation: allocated, paidOutside },
          },
        ],
        session,
      );
    }
    await WishlistItem.updateOne(
      { _id: item._id },
      { $set: { status: "PURCHASED", actualPurchasePrice: p.actualPrice, purchasedAt: new Date(), purchasedBy: payer.id } },
      { session: session ?? undefined },
    );
    await logActivity(ctx, "ITEM_PURCHASED", { itemName: item.name, price: p.actualPrice }, { session, wishlistItemId: item._id });
    return { item, allocated, returned: Math.max(0, allocated - p.actualPrice), paidOutside };
  });

  await notify(ctx, {
    type: "PURCHASE",
    title: `${ctx.me.name} marked ${result.item.name} as purchased 🛍️`,
    body: `Bought for ${fmt(p.actualPrice)}.`,
    link: `/wishlist/${result.item._id.toString()}`,
    recipients: "PARTNER",
  });
  await afterLedgerChange(ctx, { checkProgress: true });
  return { returned: result.returned, paidOutside: result.paidOutside };
}

export async function undoPurchase(ctx: MemberContext, id: string) {
  await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const item = await loadItem(ctx, id, session);
    if (item.status !== "PURCHASED") throw new AppError("BAD_REQUEST", "This item isn't marked as purchased.");
    await restorePurchasedItem(ctx, item, session);
    await logActivity(ctx, "TRANSACTION_REVERSED", { itemName: item.name, title: `Purchase of ${item.name}` }, { session, wishlistItemId: item._id });
  });
}
