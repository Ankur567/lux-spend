import type { Direction, TransactionType, WalletSummary, WishlistStatus } from "@/types/domain";

/** Aggregated ledger totals grouped by (type, direction). */
export interface LedgerGroup {
  type: TransactionType;
  direction: Direction;
  total: number;
}

/**
 * The one place wallet balances are derived. Every screen uses this, fed by a
 * single aggregation over the immutable ledger.
 *
 *   available   = contributions - expenses + refunds +/- adjustments
 *   allocated   = allocations - deallocations
 *   unallocated = available - allocated
 *
 * Reversal entries carry the opposite direction of the entry they reverse, so
 * they naturally cancel out here.
 */
export function computeWalletTotals(groups: LedgerGroup[]): WalletSummary {
  const sum = (type: TransactionType, direction: Direction) =>
    groups.filter((g) => g.type === type && g.direction === direction).reduce((acc, g) => acc + g.total, 0);

  const contributed = sum("CONTRIBUTION", "IN") - sum("CONTRIBUTION", "OUT");
  const spent = sum("EXPENSE", "OUT") - sum("EXPENSE", "IN");
  const refunded = sum("REFUND", "IN") - sum("REFUND", "OUT");
  const adjustments = sum("ADJUSTMENT", "IN") - sum("ADJUSTMENT", "OUT");
  const allocated = sum("ALLOCATION", "INTERNAL") - sum("DEALLOCATION", "INTERNAL");
  const available = contributed - spent + refunded + adjustments;

  return {
    contributed,
    spent,
    refunded,
    adjustments,
    available,
    allocated,
    unallocated: available - allocated,
  };
}

/** Signed effect of one entry on the fund total (allocations are neutral). */
export function fundDelta(type: TransactionType, direction: Direction, amount: number): number {
  if (direction === "INTERNAL" || type === "ALLOCATION" || type === "DEALLOCATION") return 0;
  return direction === "IN" ? amount : -amount;
}

export interface ItemLedgerGroup {
  itemId: string;
  type: TransactionType;
  total: number;
}

/** Net allocation per wishlist item. */
export function computeItemAllocations(groups: ItemLedgerGroup[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const g of groups) {
    if (g.type !== "ALLOCATION" && g.type !== "DEALLOCATION") continue;
    const delta = g.type === "ALLOCATION" ? g.total : -g.total;
    map.set(g.itemId, (map.get(g.itemId) ?? 0) + delta);
  }
  return map;
}

/** Funding status for an active item, derived from its allocation. */
export function fundingStatus(allocated: number, price: number): Extract<WishlistStatus, "WISHLIST" | "PARTIALLY_FUNDED" | "FUNDED"> {
  if (allocated <= 0) return "WISHLIST";
  if (allocated >= price) return "FUNDED";
  return "PARTIALLY_FUNDED";
}
