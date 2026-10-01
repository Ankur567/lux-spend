import "server-only";
import type { ClientSession, Types } from "mongoose";
import type { MemberContext } from "@/lib/auth/guard";
import { parseObjectId } from "@/lib/auth/guard";
import { withTransaction } from "@/lib/db/transaction";
import { AppError } from "@/lib/errors";
import { planShortfallRelease } from "@/lib/finance/allocation-engine";
import { formatCurrency } from "@/lib/money";
import { dateInputToInstant, monthKey } from "@/lib/time";
import { Transaction, WishlistItem, type ITransaction, type IWishlistItem } from "@/models";
import type { AllocationRunResult, TransactionDTO } from "@/types/domain";
import { logActivity } from "./activity-service";
import { autoAllocateInSession, toEngineItems, writeAllocationBatch } from "./allocation-service";
import { afterLedgerChange } from "./effects";
import { getActiveItemsWithAllocations, getWalletSummary, insertTransactions, lockLedger, syncItemStatuses } from "./ledger";
import { toTransactionDTO } from "./mappers";
import { notifyDeposit } from "./notification-service";
import { getBudgetForMonth, getSettings } from "./settings-service";
import { getMonthTotals } from "./wallet-service";

type Session = ClientSession | null;

function assertMember(ctx: MemberContext, userId: string) {
  const member = ctx.members.find((m) => m.id === userId);
  if (!member) throw new AppError("BAD_REQUEST", "Choose a member of your couple space.");
  return member;
}

// ---------------------------------------------------------------------------
// Contributions
// ---------------------------------------------------------------------------

export interface ContributionParams {
  amount: number;
  userId: string;
  date: string;
  paymentMethod: string;
  notes: string;
  allocation: "AUTO" | "KEEP" | "MANUAL";
  source?: "MANUAL" | "PROVIDER";
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ContributionResult {
  transaction: TransactionDTO;
  allocation: AllocationRunResult | null;
  duplicate: boolean;
}

export async function recordContribution(ctx: MemberContext, p: ContributionParams): Promise<ContributionResult> {
  const member = assertMember(ctx, p.userId);
  const settings = await getSettings(ctx.spaceOid);

  const outcome = await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);

    if (p.idempotencyKey) {
      const existing = await Transaction.findOne({ coupleSpaceId: ctx.spaceOid, idempotencyKey: p.idempotencyKey })
        .session(session)
        .lean<ITransaction>();
      if (existing) return { tx: existing, allocation: null, newlyFunded: [] as IWishlistItem[], duplicate: true };
    }

    const [tx] = await insertTransactions(
      [
        {
          coupleSpaceId: ctx.spaceOid,
          performedBy: ctx.userOid,
          userId: parseObjectId(member.id, "Member"),
          type: "CONTRIBUTION",
          direction: "IN",
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          title: `Added by ${member.name}`,
          notes: p.notes,
          occurredAt: dateInputToInstant(p.date, settings.timezone),
          idempotencyKey: p.idempotencyKey,
          source: p.source ?? "MANUAL",
          metadata: p.metadata ?? {},
        },
      ],
      session,
    );
    await logActivity(ctx, "CONTRIBUTION_ADDED", { amount: p.amount, contributorId: member.id, contributorName: member.name }, { session });

    let allocation: AllocationRunResult | null = null;
    let newlyFunded: IWishlistItem[] = [];
    if (p.allocation === "AUTO") {
      const res = await autoAllocateInSession(ctx, session, settings.orderingMode);
      allocation = res.result;
      newlyFunded = res.newlyFunded;
    }
    return { tx, allocation, newlyFunded, duplicate: false };
  });

  if (!outcome.duplicate) {
    await notifyDeposit(ctx, p.amount, member.isMe ? ctx.me.name : member.name);
    await afterLedgerChange(ctx, { newlyFunded: outcome.newlyFunded, checkProgress: true });
  }
  return { transaction: toTransactionDTO(outcome.tx), allocation: outcome.allocation, duplicate: outcome.duplicate };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export interface ExpenseParams {
  amount: number;
  title: string;
  category: string;
  userId: string;
  paymentMethod: string;
  date: string;
  notes: string;
  allowDeallocation: boolean;
}

export async function recordExpense(ctx: MemberContext, p: ExpenseParams) {
  const member = assertMember(ctx, p.userId);
  const currency = ctx.space.currency;
  const fmt = (v: number) => formatCurrency(v, { currency });

  const result = await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const settings = await getSettings(ctx.spaceOid, session);
    const occurredAt = dateInputToInstant(p.date, settings.timezone);

    if (settings.strictBudget) {
      const key = monthKey(occurredAt, settings.timezone);
      const { budget } = await getBudgetForMonth(ctx.spaceOid, key, settings);
      if (budget > 0) {
        const month = await getMonthTotals(ctx.spaceOid, key, settings.timezone, session);
        if (month.spent + p.amount > budget) {
          throw new AppError(
            "BUDGET_EXCEEDED",
            `Strict budget is on: this would take ${key === monthKey(new Date(), settings.timezone) ? "this month" : "that month"} to ${fmt(month.spent + p.amount)} of your ${fmt(budget)} budget.`,
          );
        }
      }
    }

    const summary = await getWalletSummary(ctx.spaceOid, session);
    if (p.amount > summary.available) {
      throw new AppError(
        "INSUFFICIENT_FUNDS",
        `That's more than the whole fund (${fmt(Math.max(0, summary.available))}). Add money first or record a smaller amount.`,
      );
    }

    let released = 0;
    const unallocated = Math.max(0, summary.unallocated);
    if (p.amount > unallocated) {
      const shortfall = p.amount - unallocated;
      const items = toEngineItems(await getActiveItemsWithAllocations(ctx.spaceOid, session));
      const plan = planShortfallRelease(items, shortfall, settings.orderingMode);
      if (!p.allowDeallocation) {
        throw new AppError(
          "INSUFFICIENT_FUNDS",
          `Only ${fmt(unallocated)} is unallocated. ${fmt(shortfall)} would need to come out of your saved goals.`,
          { needsConfirmation: true, shortfall, unallocated, lines: plan.lines },
        );
      }
      const byId = new Map(items.map((i) => [i.id, i.doc]));
      await writeAllocationBatch(
        ctx,
        "EXPENSE_COVER",
        plan.lines.map((l) => ({ item: byId.get(l.itemId)!, amount: l.amount, direction: "DEALLOCATE" as const })),
        session,
      );
      released = plan.released;
    }

    const [tx] = await insertTransactions(
      [
        {
          coupleSpaceId: ctx.spaceOid,
          performedBy: ctx.userOid,
          userId: parseObjectId(member.id, "Member"),
          type: "EXPENSE",
          direction: "OUT",
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          category: p.category,
          title: p.title,
          notes: p.notes,
          occurredAt,
          metadata: { kind: "QUICK_EXPENSE", releasedFromGoals: released },
        },
      ],
      session,
    );
    await logActivity(ctx, "EXPENSE_RECORDED", { amount: p.amount, title: p.title, payerId: member.id, payerName: member.name }, { session });
    return { tx, released };
  });

  await afterLedgerChange(ctx, { checkBudget: true });
  return { transaction: toTransactionDTO(result.tx), releasedFromGoals: result.released };
}

// ---------------------------------------------------------------------------
// Reversals
// ---------------------------------------------------------------------------

/**
 * Restores a purchased item to the wishlist (with no allocation) and reverses
 * its purchase expense if one was recorded. Runs inside a locked transaction.
 */
export async function restorePurchasedItem(ctx: MemberContext, item: IWishlistItem, session: Session, reason = "") {
  const purchaseTx = await Transaction.findOne({
    coupleSpaceId: ctx.spaceOid,
    wishlistItemId: item._id,
    type: "EXPENSE",
    direction: "OUT",
    "metadata.kind": "PURCHASE",
  })
    .sort({ createdAt: -1 })
    .session(session)
    .lean<ITransaction>();

  if (purchaseTx) {
    const alreadyReversed = await Transaction.exists({ reversalOf: purchaseTx._id }).session(session);
    if (!alreadyReversed) await writeReversal(ctx, purchaseTx, reason || `Undo purchase of ${item.name}`, session);
  }
  await WishlistItem.updateOne(
    { _id: item._id },
    { $set: { status: "WISHLIST", purchasedAt: null, purchasedBy: null, actualPurchasePrice: null } },
    { session: session ?? undefined },
  );
  await syncItemStatuses(ctx.spaceOid, [item._id], session);
}

async function writeReversal(ctx: MemberContext, tx: ITransaction, reason: string, session: Session) {
  const [reversal] = await insertTransactions(
    [
      {
        coupleSpaceId: ctx.spaceOid,
        performedBy: ctx.userOid,
        userId: tx.userId ?? null,
        type: tx.type,
        direction: tx.direction === "IN" ? "OUT" : "IN",
        amount: tx.amount,
        wishlistItemId: tx.wishlistItemId ?? null,
        paymentMethod: tx.paymentMethod ?? null,
        category: tx.category ?? null,
        title: `Reversal: ${tx.title || tx.type.toLowerCase()}`.slice(0, 140),
        notes: reason,
        occurredAt: new Date(),
        reversalOf: tx._id,
        source: "MANUAL",
        metadata: { reason, originalOccurredAt: tx.occurredAt, originalKind: (tx.metadata as { kind?: string })?.kind ?? null },
      },
    ],
    session,
  );
  return reversal;
}

export async function reverseTransaction(ctx: MemberContext, transactionId: string, reason: string) {
  const oid = parseObjectId(transactionId, "Transaction");
  const currency = ctx.space.currency;

  await withTransaction(async (session) => {
    await lockLedger(ctx.spaceOid, session);
    const tx = await Transaction.findOne({ _id: oid, coupleSpaceId: ctx.spaceOid }).session(session).lean<ITransaction>();
    if (!tx) throw new AppError("NOT_FOUND", "Transaction not found.");
    if (tx.reversalOf) throw new AppError("BAD_REQUEST", "This entry is already a correction and can't be reversed.");
    if (tx.direction === "INTERNAL") {
      throw new AppError("BAD_REQUEST", "Allocations are changed with Release funds or Undo allocation instead.");
    }
    if (await Transaction.exists({ reversalOf: tx._id }).session(session)) {
      throw new AppError("CONFLICT", "This entry has already been reversed.");
    }

    if (tx.direction === "IN") {
      const summary = await getWalletSummary(ctx.spaceOid, session);
      if (tx.amount > summary.unallocated) {
        throw new AppError(
          "INSUFFICIENT_FUNDS",
          `Reversing this would leave goals over-funded. Release ${formatCurrency(tx.amount - Math.max(0, summary.unallocated), { currency })} from goals first.`,
        );
      }
    }

    const isPurchase = tx.type === "EXPENSE" && (tx.metadata as { kind?: string })?.kind === "PURCHASE" && tx.wishlistItemId;
    if (isPurchase) {
      const item = await WishlistItem.findOne({ _id: tx.wishlistItemId, coupleSpaceId: ctx.spaceOid }).session(session).lean<IWishlistItem>();
      if (item && item.status === "PURCHASED") {
        await restorePurchasedItem(ctx, item, session, reason);
        await logActivity(ctx, "TRANSACTION_REVERSED", { amount: tx.amount, title: tx.title, itemName: item.name }, { session, wishlistItemId: item._id });
        return;
      }
    }

    await writeReversal(ctx, tx, reason, session);
    await logActivity(ctx, "TRANSACTION_REVERSED", { amount: tx.amount, title: tx.title || tx.type }, { session });
  });

  await afterLedgerChange(ctx, { checkProgress: true });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const TRANSACTION_FILTERS = ["all", "in", "out", "allocations", "mine", "partner"] as const;
export type TransactionFilter = (typeof TRANSACTION_FILTERS)[number];

export async function listTransactions(
  ctx: MemberContext,
  opts: { filter?: TransactionFilter; limit?: number; wishlistItemId?: Types.ObjectId } = {},
): Promise<TransactionDTO[]> {
  const query: Record<string, unknown> = { coupleSpaceId: ctx.spaceOid };
  switch (opts.filter) {
    case "in":
      query.direction = "IN";
      break;
    case "out":
      query.direction = "OUT";
      break;
    case "allocations":
      query.direction = "INTERNAL";
      break;
    case "mine":
      query.$or = [{ userId: ctx.userOid }, { userId: null, performedBy: ctx.userOid }];
      break;
    case "partner":
      if (!ctx.partner) return [];
      {
        const partnerOid = parseObjectId(ctx.partner.id, "Member");
        query.$or = [{ userId: partnerOid }, { userId: null, performedBy: partnerOid }];
      }
      break;
  }
  if (opts.wishlistItemId) query.wishlistItemId = opts.wishlistItemId;

  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const rows = await Transaction.find(query).sort({ occurredAt: -1, createdAt: -1 }).limit(limit).lean<ITransaction[]>();
  return hydrateTransactions(ctx, rows);
}

async function hydrateTransactions(ctx: MemberContext, rows: ITransaction[]): Promise<TransactionDTO[]> {
  const itemIds = [...new Set(rows.filter((r) => r.wishlistItemId).map((r) => r.wishlistItemId!.toString()))];
  const [items, reversals] = await Promise.all([
    itemIds.length
      ? WishlistItem.find({ _id: { $in: itemIds }, coupleSpaceId: ctx.spaceOid }).select("name").lean()
      : Promise.resolve([]),
    Transaction.find({ coupleSpaceId: ctx.spaceOid, reversalOf: { $in: rows.map((r) => r._id) } })
      .select("reversalOf")
      .lean(),
  ]);
  const names = new Map(items.map((i) => [i._id.toString(), i.name]));
  const reversed = new Set(reversals.map((r) => r.reversalOf!.toString()));
  return rows.map((r) =>
    toTransactionDTO(r, {
      itemName: r.wishlistItemId ? names.get(r.wishlistItemId.toString()) ?? null : null,
      reversed: reversed.has(r._id.toString()),
    }),
  );
}
