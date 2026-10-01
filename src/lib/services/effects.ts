import "server-only";
import type { MemberContext } from "@/lib/auth/guard";
import { sortForAllocation } from "@/lib/finance/allocation-engine";
import type { IWishlistItem } from "@/models";
import { getActiveItemsWithAllocations, getWalletSummary } from "./ledger";
import { notifyBudget, notifyItemsFunded, notifyProgress } from "./notification-service";
import { getSettings } from "./settings-service";
import { getBudgetStatus } from "./wallet-service";

/**
 * Side effects that run after a financial DB transaction has committed.
 * Failures here are logged and never surface as action errors.
 */
export async function afterLedgerChange(
  ctx: MemberContext,
  opts: { newlyFunded?: IWishlistItem[]; checkProgress?: boolean; checkBudget?: boolean },
): Promise<void> {
  try {
    if (opts.newlyFunded?.length) await notifyItemsFunded(ctx, opts.newlyFunded);
    const settings = await getSettings(ctx.spaceOid);

    if (opts.checkProgress) {
      const [summary, rows] = await Promise.all([getWalletSummary(ctx.spaceOid), getActiveItemsWithAllocations(ctx.spaceOid)]);
      const ordered = sortForAllocation(
        rows.map((r) => ({
          id: r.item._id.toString(),
          name: r.item.name,
          priority: r.item.priority,
          targetDate: r.item.targetDate ?? null,
          rank: r.item.rank,
          createdAt: r.item.createdAt,
          price: r.item.estimatedPrice,
          allocated: r.allocated,
          row: r,
        })),
        settings.orderingMode,
      );
      const next = ordered.find((i) => i.allocated < i.price);
      await notifyProgress(ctx, next ? next.row : null, summary.unallocated);
    }

    if (opts.checkBudget) {
      const status = await getBudgetStatus(ctx, settings);
      await notifyBudget(ctx, status.spent, status.budget, settings.timezone);
    }
  } catch (err) {
    console.error("[effects] post-commit side effects failed", err);
  }
}
