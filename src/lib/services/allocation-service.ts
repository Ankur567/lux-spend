import "server-only";
import type { ClientSession, Types } from "mongoose";
import type { MemberContext } from "@/lib/auth/guard";
import { parseObjectId } from "@/lib/auth/guard";
import { withTransaction } from "@/lib/db/transaction";
import { AppError } from "@/lib/errors";
import { planAutoAllocation, remainingNeed, sortForAllocation, type EngineItem } from "@/lib/finance/allocation-engine";
import { formatCurrency } from "@/lib/money";
import { Allocation, WishlistItem, type IAllocation, type IWishlistItem } from "@/models";
import { ACTIVE_STATUSES, type AllocationMode, type AllocationRunResult, type OrderingMode, type Priority } from "@/types/domain";
import { logActivity } from "./activity-service";
import { afterLedgerChange } from "./effects";
import { getActiveItemsWithAllocations, getItemAllocations, getWalletSummary, insertTransactions, lockLedger, syncItemStatuses } from "./ledger";
import { getSettings } from "./settings-service";

type Session = ClientSession | null;
type Actor = Pick<MemberContext, "spaceOid" | "userOid">;

export interface AllocationMove {
  item: Pick<IWishlistItem, "_id" | "name">;
  amount: number;
  direction: "ALLOCATE" | "DEALLOCATE";
}

export type EngineItemWithDoc = EngineItem & { doc: IWishlistItem };

export function toEngineItems(rows: { item: IWishlistItem; allocated: number }[]): EngineItemWithDoc[] {
  return rows.map(({ item, allocated }) => ({
    id: item._id.toString(),
    name: item.name,
    priority: item.priority,
    targetDate: item.targetDate ?? null,
    rank: item.rank ?? 0,
    createdAt: item.createdAt,
    price: item.estimatedPrice,
    allocated,
    doc: item,
  }));
}

/**
 * Writes a batch of allocation moves: one Allocation record plus one immutable
 * ALLOCATION/DEALLOCATION ledger entry per move, then re-syncs item statuses.
 * Must be called inside withTransaction after lockLedger.
 */
export async function writeAllocationBatch(
  actor: Actor,
  mode: AllocationMode,
  moves: AllocationMove[],
  session: Session,
): Promise<{ batchId: Types.ObjectId | null; newlyFunded: IWishlistItem[] }> {
  const valid = moves.filter((m) => m.amount > 0);
  if (valid.length === 0) return { batchId: null, newlyFunded: [] };

  const [batch] = await Allocation.create(
    [
      {
        coupleSpaceId: actor.spaceOid,
        performedBy: actor.userOid,
        mode,
        lines: valid.map((m) => ({ wishlistItemId: m.item._id, itemName: m.item.name, amount: m.amount, direction: m.direction })),
        totalAllocated: valid.filter((m) => m.direction === "ALLOCATE").reduce((a, m) => a + m.amount, 0),
        totalReleased: valid.filter((m) => m.direction === "DEALLOCATE").reduce((a, m) => a + m.amount, 0),
      },
    ],
    { session },
  );

  const now = new Date();
  await insertTransactions(
    valid.map((m) => ({
      coupleSpaceId: actor.spaceOid,
      performedBy: actor.userOid,
      userId: null,
      type: m.direction === "ALLOCATE" ? "ALLOCATION" : "DEALLOCATION",
      direction: "INTERNAL",
      amount: m.amount,
      wishlistItemId: m.item._id,
      allocationBatchId: batch._id,
      title: m.direction === "ALLOCATE" ? `Allocated to ${m.item.name}` : `Released from ${m.item.name}`,
      occurredAt: now,
      source: mode === "AUTO" || mode === "MANUAL" || mode === "UNDO" || mode === "REBALANCE" ? "MANUAL" : "SYSTEM",
      metadata: { mode },
    })),
    session,
  );

  const itemIds = [...new Map(valid.map((m) => [m.item._id.toString(), m.item._id])).values()];
  const newlyFunded = await syncItemStatuses(actor.spaceOid, itemIds, session);
  for (const item of newlyFunded) {
    await logActivity(actor, "ITEM_FUNDED", { itemName: item.name }, { session, wishlistItemId: item._id, system: true });
  }
  return { batchId: batch._id, newlyFunded };
}

/** Auto-allocates the current unallocated balance. Call inside a locked transaction. */
export async function autoAllocateInSession(
  actor: Actor,
  session: Session,
  orderingMode?: OrderingMode,
): Promise<{ result: AllocationRunResult; newlyFunded: IWishlistItem[] }> {
  const mode = orderingMode ?? (await getSettings(actor.spaceOid, session)).orderingMode;
  const summary = await getWalletSummary(actor.spaceOid, session);
  const items = toEngineItems(await getActiveItemsWithAllocations(actor.spaceOid, session));
  const plan = planAutoAllocation(items, summary.unallocated, mode);
  const byId = new Map(items.map((i) => [i.id, i.doc]));

  const moves: AllocationMove[] = plan.lines
    .filter((l) => l.amount > 0)
    .map((l) => ({ item: byId.get(l.itemId)!, amount: l.amount, direction: "ALLOCATE" }));
  const { batchId, newlyFunded } = await writeAllocationBatch(actor, "AUTO", moves, session);

  if (batchId) {
    await logActivity(actor, "FUNDS_ALLOCATED", { amount: plan.allocatedTotal, count: moves.length, mode: "auto" }, { session });
  }
  return {
    result: { batchId: batchId?.toString() ?? null, allocatedTotal: plan.allocatedTotal, leftover: plan.leftover, lines: plan.lines },
    newlyFunded,
  };
}

export async function runAutoAllocation(ctx: MemberContext): Promise<AllocationRunResult> {
  const { result, newlyFunded } = await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    return autoAllocateInSession(ctx, session);
  });
  await afterLedgerChange(ctx, { newlyFunded, checkProgress: true });
  return result;
}

async function loadActiveItem(ctx: Actor, itemId: Types.ObjectId, session: Session): Promise<IWishlistItem> {
  const item = await WishlistItem.findOne({ _id: itemId, coupleSpaceId: ctx.spaceOid }).session(session).lean<IWishlistItem>();
  if (!item) throw new AppError("NOT_FOUND", "Wishlist item not found.");
  if (!ACTIVE_STATUSES.includes(item.status)) {
    throw new AppError("BAD_REQUEST", `${item.name} is ${item.status.toLowerCase()} and can't receive funds.`);
  }
  return item;
}

export async function allocateManually(ctx: MemberContext, lines: { itemId: string; amount: number }[]) {
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.itemId, (merged.get(l.itemId) ?? 0) + l.amount);
  const currency = ctx.space.currency;

  const { newlyFunded, total } = await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const summary = await getWalletSummary(ctx.spaceOid, session);
    const total = [...merged.values()].reduce((a, v) => a + v, 0);
    if (total > summary.unallocated) {
      throw new AppError(
        "INSUFFICIENT_FUNDS",
        `Only ${formatCurrency(Math.max(0, summary.unallocated), { currency })} is unallocated. Reduce the amounts or add money first.`,
      );
    }
    const ids = [...merged.keys()].map((id) => parseObjectId(id, "Wishlist item"));
    const allocations = await getItemAllocations(ctx.spaceOid, ids, session);
    const moves: AllocationMove[] = [];
    for (const id of ids) {
      const item = await loadActiveItem(ctx, id, session);
      const amount = merged.get(id.toString())!;
      const need = remainingNeed({ price: item.estimatedPrice, allocated: allocations.get(id.toString()) ?? 0 });
      if (amount > need) {
        throw new AppError(
          "BAD_REQUEST",
          need === 0
            ? `${item.name} is already fully funded.`
            : `${item.name} only needs ${formatCurrency(need, { currency })} more.`,
        );
      }
      moves.push({ item, amount, direction: "ALLOCATE" });
    }
    const { newlyFunded } = await writeAllocationBatch(ctx, "MANUAL", moves, session);
    await logActivity(
      ctx,
      "FUNDS_ALLOCATED",
      { amount: total, count: moves.length, mode: "manual", itemName: moves.length === 1 ? moves[0].item.name : null },
      { session, wishlistItemId: moves.length === 1 ? moves[0].item._id : null },
    );
    return { newlyFunded, total };
  });
  await afterLedgerChange(ctx, { newlyFunded, checkProgress: true });
  return { total };
}

export async function releaseFunds(ctx: MemberContext, itemId: string, amount: number) {
  const oid = parseObjectId(itemId, "Wishlist item");
  await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const item = await loadActiveItem(ctx, oid, session);
    const allocated = (await getItemAllocations(ctx.spaceOid, [oid], session)).get(itemId) ?? 0;
    if (amount > allocated) {
      throw new AppError("BAD_REQUEST", `Only ${formatCurrency(allocated, { currency: ctx.space.currency })} is saved for ${item.name}.`);
    }
    await writeAllocationBatch(ctx, "MANUAL", [{ item, amount, direction: "DEALLOCATE" }], session);
    await logActivity(ctx, "FUNDS_RELEASED", { amount, itemName: item.name }, { session, wishlistItemId: item._id });
  });
}

/** Reverses an AUTO or MANUAL allocation batch through new DEALLOCATION entries. */
export async function undoAllocationBatch(ctx: MemberContext, batchId: string) {
  const oid = parseObjectId(batchId, "Allocation");
  return withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const batch = await Allocation.findOne({ _id: oid, coupleSpaceId: ctx.spaceOid }).session(session);
    if (!batch) throw new AppError("NOT_FOUND", "Allocation not found.");
    if (batch.undoneAt) throw new AppError("CONFLICT", "This allocation was already undone.");
    if (batch.mode !== "AUTO" && batch.mode !== "MANUAL") {
      throw new AppError("BAD_REQUEST", "Only manual or automatic allocations can be undone.");
    }
    const allocateLines = batch.lines.filter((l) => l.direction === "ALLOCATE");
    const ids = allocateLines.map((l) => l.wishlistItemId);
    const allocations = await getItemAllocations(ctx.spaceOid, ids, session);
    const items = await WishlistItem.find({ _id: { $in: ids }, status: { $in: ACTIVE_STATUSES } }).session(session).lean<IWishlistItem[]>();

    const moves: AllocationMove[] = [];
    for (const line of allocateLines) {
      const item = items.find((i) => i._id.equals(line.wishlistItemId));
      if (!item) continue; // purchased/archived since: its money was already released
      const current = allocations.get(item._id.toString()) ?? 0;
      const amount = Math.min(line.amount, current);
      if (amount > 0) moves.push({ item, amount, direction: "DEALLOCATE" });
    }
    const { batchId: undoBatchId } = await writeAllocationBatch(ctx, "UNDO", moves, session);
    batch.undoneAt = new Date();
    batch.undoneBy = ctx.userOid;
    batch.undoBatchId = undoBatchId;
    await batch.save({ session });
    const released = moves.reduce((a, m) => a + m.amount, 0);
    await logActivity(ctx, "ALLOCATION_UNDONE", { amount: released }, { session });
    return { released };
  });
}

/** Releases every active allocation and re-runs auto-allocation in priority order. */
export async function rebalance(ctx: MemberContext) {
  const { result, newlyFunded } = await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const items = await getActiveItemsWithAllocations(ctx.spaceOid, session);
    const releases: AllocationMove[] = items
      .filter((r) => r.allocated > 0)
      .map((r) => ({ item: r.item, amount: r.allocated, direction: "DEALLOCATE" }));
    await writeAllocationBatch(ctx, "REBALANCE", releases, session);
    return autoAllocateInSession(ctx, session);
  });
  await afterLedgerChange(ctx, { newlyFunded, checkProgress: true });
  return result;
}

export interface AllocationContextItem {
  id: string;
  name: string;
  priority: Priority;
  price: number;
  allocated: number;
  remaining: number;
  targetDate: string | null;
}

export async function getAllocationContext(ctx: MemberContext) {
  const settings = await getSettings(ctx.spaceOid);
  const summary = await getWalletSummary(ctx.spaceOid);
  const items = sortForAllocation(toEngineItems(await getActiveItemsWithAllocations(ctx.spaceOid)), settings.orderingMode);
  return {
    unallocated: summary.unallocated,
    items: items.map<AllocationContextItem>((i) => ({
      id: i.id,
      name: i.name,
      priority: i.priority,
      price: i.price,
      allocated: i.allocated,
      remaining: remainingNeed(i),
      targetDate: i.targetDate ? new Date(i.targetDate).toISOString() : null,
    })),
  };
}

export interface AllocationBatchDTO {
  id: string;
  mode: AllocationMode;
  performedBy: string;
  totalAllocated: number;
  totalReleased: number;
  lines: { itemId: string; itemName: string; amount: number; direction: "ALLOCATE" | "DEALLOCATE" }[];
  undone: boolean;
  canUndo: boolean;
  createdAt: string;
}

export async function listRecentBatches(ctx: MemberContext, limit = 10): Promise<AllocationBatchDTO[]> {
  const rows = await Allocation.find({ coupleSpaceId: ctx.spaceOid, mode: { $ne: "UNDO" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<IAllocation[]>();
  return rows.map((b) => ({
    id: b._id.toString(),
    mode: b.mode,
    performedBy: b.performedBy.toString(),
    totalAllocated: b.totalAllocated,
    totalReleased: b.totalReleased,
    lines: b.lines.map((l) => ({ itemId: l.wishlistItemId.toString(), itemName: l.itemName, amount: l.amount, direction: l.direction })),
    undone: Boolean(b.undoneAt),
    canUndo: !b.undoneAt && (b.mode === "AUTO" || b.mode === "MANUAL") && b.totalAllocated > 0,
    createdAt: new Date(b.createdAt).toISOString(),
  }));
}
