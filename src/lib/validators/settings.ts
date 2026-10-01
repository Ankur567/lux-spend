import { z } from "zod";
import { ORDERING_MODES } from "@/types/domain";
import { cleanText, moneyOrZero, optionalUrl, requiredText } from "./common";

export const budgetSettingsSchema = z.object({
  monthlyBudget: moneyOrZero,
  savingsTarget: moneyOrZero,
  expectedMonthlyContribution: moneyOrZero,
  strictBudget: z.boolean().default(false),
  orderingMode: z.enum(ORDERING_MODES).default("SMART"),
});

const labelList = (label: string) =>
  z
    .array(requiredText(40, label))
    .min(1, `Keep at least one ${label.toLowerCase()}`)
    .max(40)
    .transform((list) => Array.from(new Map(list.map((v) => [v.toLowerCase(), v])).values()));

export const categoriesSchema = z.object({ categories: labelList("Category") });
export const paymentMethodsSchema = z.object({ paymentMethods: labelList("Payment method") });

export const profileSchema = z.object({
  name: requiredText(60, "Name"),
  avatarColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Invalid color"),
  avatarUrl: optionalUrl,
});

export const themeSchema = z.object({ theme: z.enum(["system", "light", "dark"]) });

export const onboardingGoalsSchema = z.object({
  monthlyBudget: moneyOrZero.optional(),
  savingsTarget: moneyOrZero.optional(),
});

export const customLabel = cleanText(40);
