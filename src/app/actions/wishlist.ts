"use server";

import { runAction, type ActionResult } from "@/lib/actions/result";
import { revalidateApp } from "@/lib/actions/revalidate";
import { requireMember } from "@/lib/auth/guard";
import { objectId } from "@/lib/validators/common";
import { priorityChangeSchema, purchaseSchema, reorderSchema, wishlistItemSchema } from "@/lib/validators/wishlist";
import {
  archiveItem,
  changePriority,
  createItem,
  deleteItem,
  purchaseItem,
  reorderItems,
  restoreItem,
  undoPurchase,
  updateItem,
} from "@/lib/services/wishlist-service";

export async function createWishlistItemAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const input = wishlistItemSchema.parse(raw);
    const id = await createItem(ctx, input);
    revalidateApp();
    return { id };
  }, "Added to your wishlist ✨");
}

export async function updateWishlistItemAction(
  id: unknown,
  raw: unknown,
): Promise<ActionResult<{ released: number; message?: string }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const itemId = objectId.parse(id);
    const input = wishlistItemSchema.parse(raw);
    const result = await updateItem(ctx, itemId, input);
    revalidateApp();
    return { released: result.released, message: result.message };
  }, "Saved");
}

export async function changePriorityAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const { itemId, priority } = priorityChangeSchema.parse(raw);
    await changePriority(ctx, itemId, priority);
    revalidateApp();
    return null;
  }, "Priority updated");
}

export async function reorderWishlistAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const { orderedIds } = reorderSchema.parse(raw);
    await reorderItems(ctx, orderedIds);
    revalidateApp();
    return null;
  }, "Order saved. Funding now follows your manual order within each priority.");
}

export async function archiveWishlistItemAction(id: unknown): Promise<ActionResult<{ message?: string }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const message = await archiveItem(ctx, objectId.parse(id));
    revalidateApp();
    return { message };
  }, "Archived");
}

export async function restoreWishlistItemAction(id: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    await restoreItem(ctx, objectId.parse(id));
    revalidateApp();
    return null;
  }, "Restored to your wishlist");
}

export async function deleteWishlistItemAction(id: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    await deleteItem(ctx, objectId.parse(id));
    revalidateApp();
    return null;
  }, "Deleted");
}

export async function purchaseWishlistItemAction(raw: unknown): Promise<ActionResult<{ returned: number; paidOutside: number }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const input = purchaseSchema.parse(raw);
    const result = await purchaseItem(ctx, input);
    revalidateApp();
    return result;
  });
}

export async function undoPurchaseAction(id: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    await undoPurchase(ctx, objectId.parse(id));
    revalidateApp();
    return null;
  }, "Purchase undone. The item is back on your wishlist.");
}
