import "server-only";
import type { ClientSession, Types } from "mongoose";
import type { MemberContext } from "@/lib/auth/guard";
import { monthKey } from "@/lib/time";
import { AppSettings, CoupleSpace, MonthlyBudget, type IAppSettings } from "@/models";
import type { OrderingMode } from "@/types/domain";
import { logActivity } from "./activity-service";
import { toSettingsDTO } from "./mappers";

export async function getSettings(spaceOid: Types.ObjectId, session: ClientSession | null = null): Promise<IAppSettings> {
  const existing = await AppSettings.findOne({ coupleSpaceId: spaceOid }).session(session).lean<IAppSettings>();
  if (existing) return existing;
  const created = await AppSettings.findOneAndUpdate(
    { coupleSpaceId: spaceOid },
    { $setOnInsert: { coupleSpaceId: spaceOid } },
    { upsert: true, returnDocument: "after", session, setDefaultsOnInsert: true },
  ).lean<IAppSettings>();
  return created!;
}

export async function getSettingsDTO(ctx: MemberContext) {
  const settings = await getSettings(ctx.spaceOid);
  return toSettingsDTO(settings, ctx.space.currency);
}

/** Budget for a month: the month's snapshot if one exists, else the default. */
export async function getBudgetForMonth(spaceOid: Types.ObjectId, key: string, settings: IAppSettings) {
  const snapshot = await MonthlyBudget.findOne({ coupleSpaceId: spaceOid, month: key }).lean();
  return {
    budget: snapshot?.amount ?? settings.monthlyBudget,
    savingsTarget: snapshot?.savingsTarget ?? settings.savingsTarget,
  };
}

export async function updateBudgetSettings(
  ctx: MemberContext,
  input: { monthlyBudget: number; savingsTarget: number; expectedMonthlyContribution: number; strictBudget: boolean; orderingMode: OrderingMode },
) {
  const settings = await getSettings(ctx.spaceOid);
  await AppSettings.updateOne({ coupleSpaceId: ctx.spaceOid }, { $set: input });
  const key = monthKey(new Date(), settings.timezone);
  await MonthlyBudget.updateOne(
    { coupleSpaceId: ctx.spaceOid, month: key },
    { $set: { amount: input.monthlyBudget, savingsTarget: input.savingsTarget } },
    { upsert: true },
  );
  await logActivity(ctx, "SETTINGS_UPDATED", { what: "budget & savings" });
}

export async function updateGoals(ctx: MemberContext, input: { monthlyBudget?: number; savingsTarget?: number }) {
  const settings = await getSettings(ctx.spaceOid);
  const set: Record<string, number> = {};
  if (input.monthlyBudget !== undefined) set.monthlyBudget = input.monthlyBudget;
  if (input.savingsTarget !== undefined) {
    set.savingsTarget = input.savingsTarget;
    if (!settings.expectedMonthlyContribution) set.expectedMonthlyContribution = input.savingsTarget;
  }
  if (Object.keys(set).length === 0) return;
  await AppSettings.updateOne({ coupleSpaceId: ctx.spaceOid }, { $set: set });
  const key = monthKey(new Date(), settings.timezone);
  await MonthlyBudget.updateOne(
    { coupleSpaceId: ctx.spaceOid, month: key },
    {
      $set: {
        amount: input.monthlyBudget ?? settings.monthlyBudget,
        savingsTarget: input.savingsTarget ?? settings.savingsTarget,
      },
    },
    { upsert: true },
  );
}

export async function updateCategories(ctx: MemberContext, categories: string[]) {
  await getSettings(ctx.spaceOid);
  await AppSettings.updateOne({ coupleSpaceId: ctx.spaceOid }, { $set: { categories } });
}

export async function addCategory(ctx: MemberContext, category: string) {
  const settings = await getSettings(ctx.spaceOid);
  if (settings.categories.some((c) => c.toLowerCase() === category.toLowerCase())) return;
  await AppSettings.updateOne({ coupleSpaceId: ctx.spaceOid }, { $push: { categories: category } });
}

export async function updatePaymentMethods(ctx: MemberContext, paymentMethods: string[]) {
  await getSettings(ctx.spaceOid);
  await AppSettings.updateOne({ coupleSpaceId: ctx.spaceOid }, { $set: { paymentMethods } });
}

export async function setOrderingMode(spaceOid: Types.ObjectId, orderingMode: OrderingMode, session: ClientSession | null = null) {
  await AppSettings.updateOne({ coupleSpaceId: spaceOid }, { $set: { orderingMode } }, { session: session ?? undefined });
}

export async function updateSpace(ctx: MemberContext, input: { name: string; currency: string }) {
  await CoupleSpace.updateOne({ _id: ctx.spaceOid }, { $set: input });
  await logActivity(ctx, "SETTINGS_UPDATED", { what: "couple space" });
}
