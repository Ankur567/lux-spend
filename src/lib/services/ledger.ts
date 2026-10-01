import "server-only";
import type { ClientSession, Types } from "mongoose";
import { computeItemAllocations, computeWalletTotals, fundingStatus, type ItemLedgerGroup, type LedgerGroup } from "@/lib/finance/ledger-math";
import { CoupleSpace, Transaction, WishlistItem, type ITransaction, type IWishlistItem } from "@/models";
import { ACTIVE_STATUSES, type WalletSummary } from "@/types/domain";

type Session = ClientSession | null;

/**
 * Serialises financial writes per couple space. Must be the first write in
 * every financial DB transaction: concurrent transactions touching the same
 * space conflict on this document and are retried one after another.
 */
export async function lockLedger(spaceOid: Types.ObjectId, session: Session): Promise<void> {
  await CoupleSpace.updateOne({ _id: spaceOid }, { $inc: { ledgerVersion: 1 } }, { session: session ?? undefined });
}

export async function getWalletSummary(spaceOid: Types.ObjectId, session: Session = null): Promise<WalletSummary> {
  const groups = await Transaction.aggregate<{ _id: { type: LedgerGroup["type"]; direction: LedgerGroup["direction"] }; total: number }>([
    { $match: { coupleSpaceId: spaceOid } },
    { $group: { _id: { type: "$type", direction: "$direction" }, total: { $sum: "$amount" } } },
  ]).session(session);
  return computeWalletTotals(groups.map((g) => ({ type: g._id.type, direction: g._id.direction, total: g.total })));
}

/** Net allocated paise per item (optionally limited to some items). */
export async function getItemAllocations(
  spaceOid: Types.ObjectId,
  itemIds: Types.ObjectId[] | null = null,
  session: Session = null,
): Promise<Map<string, number>> {
  const match: Record<string, unknown> = {
    coupleSpaceId: spaceOid,
    type: { $in: ["ALLOCATION", "DEALLOCATION"] },
    wishlistItemId: itemIds ? { $in: itemIds } : { $ne: null },
  };
  const groups = await Transaction.aggregate<{ _id: { item: Types.ObjectId; type: ItemLedgerGroup["type"] }; total: number }>([
    { $match: match },
    { $group: { _id: { item: "$wishlistItemId", type: "$type" }, total: { $sum: "$amount" } } },
  ]).session(session);
  return computeItemAllocations(groups.map((g) => ({ itemId: g._id.item.toString(), type: g._id.type, total: g.total })));
}

export async function getActiveItemsWithAllocations(spaceOid: Types.ObjectId, session: Session = null) {
  const items = await WishlistItem.find({ coupleSpaceId: spaceOid, status: { $in: ACTIVE_STATUSES } })
    .session(session)
    .lean<IWishlistItem[]>();
  const allocations = await getItemAllocations(spaceOid, items.map((i) => i._id), session);
  return items.map((item) => ({ item, allocated: allocations.get(item._id.toString()) ?? 0 }));
}

export type NewTransaction = Omit<Partial<ITransaction>, "_id" | "createdAt"> &
  Pick<ITransaction, "coupleSpaceId" | "performedBy" | "type" | "direction" | "amount" | "occurredAt">;

export async function insertTransactions(docs: NewTransaction[], session: Session): Promise<ITransaction[]> {
  if (docs.length === 0) return [];
  for (const d of docs) {
    if (!Number.isInteger(d.amount) || d.amount <= 0) {
      throw new Error(`Refusing to write non-positive or fractional amount: ${d.amount}`);
    }
  }
  const created = await Transaction.insertMany(docs, { session });
  return created.map((c) => c.toObject() as ITransaction);
}

/**
 * Re-derives cached funding status for active items from the ledger. Returns
 * ids of items that just became FUNDED (for celebrations / notifications).
 */
export async function syncItemStatuses(
  spaceOid: Types.ObjectId,
  itemIds: Types.ObjectId[],
  session: Session,
): Promise<IWishlistItem[]> {
  if (itemIds.length === 0) return [];
  const items = await WishlistItem.find({ _id: { $in: itemIds }, coupleSpaceId: spaceOid, status: { $in: ACTIVE_STATUSES } })
    .session(session)
    .lean<IWishlistItem[]>();
  const allocations = await getItemAllocations(spaceOid, items.map((i) => i._id), session);
  const newlyFunded: IWishlistItem[] = [];
  const ops = [];
  for (const item of items) {
    const allocated = allocations.get(item._id.toString()) ?? 0;
    const status = fundingStatus(allocated, item.estimatedPrice);
    if (status !== item.status) {
      ops.push({ updateOne: { filter: { _id: item._id }, update: { $set: { status } } } });
      if (status === "FUNDED") newlyFunded.push(item);
    }
  }
  if (ops.length) await WishlistItem.bulkWrite(ops, { session: session ?? undefined });
  return newlyFunded;
}
