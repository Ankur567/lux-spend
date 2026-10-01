"use server";

import { runAction, type ActionResult } from "@/lib/actions/result";
import { revalidateApp } from "@/lib/actions/revalidate";
import { requireMember, requireUser } from "@/lib/auth/guard";
import { User } from "@/models";
import { markNotificationsRead } from "@/lib/services/notification-service";
import { updateBudgetSettings, updateCategories, updatePaymentMethods, updateSpace } from "@/lib/services/settings-service";
import { parseObjectId } from "@/lib/auth/guard";
import { updateSpaceSchema } from "@/lib/validators/couple";
import { budgetSettingsSchema, categoriesSchema, paymentMethodsSchema, profileSchema, themeSchema } from "@/lib/validators/settings";
import { z } from "zod";

export async function updateProfileAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const input = profileSchema.parse(raw);
    await User.updateOne({ _id: user._id }, { $set: input });
    revalidateApp();
    return null;
  }, "Profile updated");
}

export async function updateThemeAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const { theme } = themeSchema.parse(raw);
    await User.updateOne({ _id: user._id }, { $set: { "preferences.theme": theme } });
    return null;
  });
}

export async function updateSpaceAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const input = updateSpaceSchema.parse(raw);
    await updateSpace(ctx, input);
    revalidateApp();
    return null;
  }, "Couple space updated");
}

export async function updateBudgetSettingsAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const input = budgetSettingsSchema.parse(raw);
    await updateBudgetSettings(ctx, input);
    revalidateApp();
    return null;
  }, "Budget & goals saved");
}

export async function updateCategoriesAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const { categories } = categoriesSchema.parse(raw);
    await updateCategories(ctx, categories);
    revalidateApp();
    return null;
  }, "Categories saved");
}

export async function updatePaymentMethodsAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const { paymentMethods } = paymentMethodsSchema.parse(raw);
    await updatePaymentMethods(ctx, paymentMethods);
    revalidateApp();
    return null;
  }, "Payment methods saved");
}

export async function markNotificationsReadAction(ids?: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const list = z.array(z.string()).max(200).optional().parse(ids);
    await markNotificationsRead(ctx, list?.map((id) => parseObjectId(id, "Notification")));
    revalidateApp();
    return null;
  });
}
