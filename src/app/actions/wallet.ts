"use server";

import { runAction, type ActionResult } from "@/lib/actions/result";
import { revalidateApp } from "@/lib/actions/revalidate";
import { requireMember } from "@/lib/auth/guard";
import {
  allocateManually,
  getAllocationContext,
  rebalance,
  releaseFunds,
  runAutoAllocation,
  undoAllocationBatch,
  type AllocationContextItem,
} from "@/lib/services/allocation-service";
import { recordContribution, recordExpense, reverseTransaction, type ContributionResult } from "@/lib/services/transaction-service";
import { contributionSchema, expenseSchema, manualAllocationSchema, releaseSchema, reverseTransactionSchema } from "@/lib/validators/wallet";
import { objectId } from "@/lib/validators/common";
import type { AllocationRunResult } from "@/types/domain";

export async function addContributionAction(raw: unknown): Promise<ActionResult<ContributionResult>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const input = contributionSchema.parse(raw);
    const result = await recordContribution(ctx, input);
    revalidateApp();
    return result;
  });
}

export async function recordExpenseAction(raw: unknown): Promise<ActionResult<{ releasedFromGoals: number }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const input = expenseSchema.parse(raw);
    const result = await recordExpense(ctx, input);
    revalidateApp();
    return { releasedFromGoals: result.releasedFromGoals };
  });
}

export async function autoAllocateAction(): Promise<ActionResult<AllocationRunResult>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const result = await runAutoAllocation(ctx);
    revalidateApp();
    return result;
  });
}

export async function allocateManuallyAction(raw: unknown): Promise<ActionResult<{ total: number }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const { lines } = manualAllocationSchema.parse(raw);
    const result = await allocateManually(ctx, lines);
    revalidateApp();
    return result;
  });
}

export async function releaseFundsAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const { itemId, amount } = releaseSchema.parse(raw);
    await releaseFunds(ctx, itemId, amount);
    revalidateApp();
    return null;
  }, "Funds returned to your unallocated balance.");
}

export async function undoAllocationAction(batchId: unknown): Promise<ActionResult<{ released: number }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const id = objectId.parse(batchId);
    const result = await undoAllocationBatch(ctx, id);
    revalidateApp();
    return result;
  });
}

export async function rebalanceAction(): Promise<ActionResult<AllocationRunResult>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const result = await rebalance(ctx);
    revalidateApp();
    return result;
  });
}

export async function getAllocationContextAction(): Promise<ActionResult<{ unallocated: number; items: AllocationContextItem[] }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    return getAllocationContext(ctx);
  });
}

export async function reverseTransactionAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const { transactionId, reason } = reverseTransactionSchema.parse(raw);
    await reverseTransaction(ctx, transactionId, reason);
    revalidateApp();
    return null;
  }, "Entry reversed. The original stays in history.");
}