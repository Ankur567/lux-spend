import { z } from "zod";
import { money, objectId, optionalText, requiredDate, requiredText } from "./common";

export const contributionSchema = z.object({
  amount: money,
  userId: objectId,
  date: requiredDate,
  paymentMethod: requiredText(40, "Payment method"),
  notes: optionalText(500),
  /** What to do with the new money right away. */
  allocation: z.enum(["AUTO", "KEEP", "MANUAL"]).default("KEEP"),
});

export const expenseSchema = z.object({
  amount: money,
  title: requiredText(100, "Title"),
  category: requiredText(40, "Category"),
  userId: objectId,
  paymentMethod: requiredText(40, "Payment method"),
  date: requiredDate,
  notes: optionalText(500),
  /** Explicit consent to pull money back from goals when unallocated funds are short. */
  allowDeallocation: z.boolean().default(false),
});

export const manualAllocationSchema = z.object({
  lines: z
    .array(z.object({ itemId: objectId, amount: money }))
    .min(1, "Choose at least one goal")
    .max(50),
});

export const releaseSchema = z.object({
  itemId: objectId,
  amount: money,
});

export const reverseTransactionSchema = z.object({
  transactionId: objectId,
  reason: optionalText(200),
});

export type ContributionInput = z.input<typeof contributionSchema>;
export type ExpenseInput = z.input<typeof expenseSchema>;
