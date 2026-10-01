import { z } from "zod";
import { OWNER_CHOICES, PRIORITIES } from "@/types/domain";
import { money, objectId, optionalDate, optionalText, optionalUrl, requiredDate, requiredText } from "./common";

export const wishlistItemSchema = z.object({
  name: requiredText(120, "Item name"),
  description: optionalText(1000),
  estimatedPrice: money,
  priority: z.enum(PRIORITIES, { message: "Choose a priority" }),
  owner: z.enum(OWNER_CHOICES, { message: "Choose who it's for" }),
  category: requiredText(40, "Category"),
  targetDate: optionalDate,
  imageUrl: optionalUrl,
  productUrl: optionalUrl,
  notes: optionalText(2000),
});

export const purchaseSchema = z.object({
  itemId: objectId,
  actualPrice: money,
  paidBy: objectId,
  paymentMethod: requiredText(40, "Payment method"),
  date: requiredDate,
  notes: optionalText(500),
  /** When the price exceeds the saved amount: take the rest from the fund, or it was paid outside the fund. */
  coverDifference: z.enum(["FUND", "OUTSIDE"]).default("FUND"),
});

export const priorityChangeSchema = z.object({
  itemId: objectId,
  priority: z.enum(PRIORITIES),
});

export const reorderSchema = z.object({
  orderedIds: z.array(objectId).min(1).max(500),
});

export type WishlistItemInput = z.input<typeof wishlistItemSchema>;
export type PurchaseInput = z.input<typeof purchaseSchema>;
