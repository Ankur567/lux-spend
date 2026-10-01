import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { requiredText } from "./common";

export const createSpaceSchema = z.object({
  name: requiredText(60, "Space name"),
});

export const joinSpaceSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,12}$/, "Enter the invite code your partner shared"),
});

export const updateSpaceSchema = z.object({
  name: requiredText(60, "Space name"),
  currency: z.enum(SUPPORTED_CURRENCIES),
});
