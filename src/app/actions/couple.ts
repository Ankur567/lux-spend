"use server";

import { runAction, type ActionResult } from "@/lib/actions/result";
import { revalidateApp } from "@/lib/actions/revalidate";
import { requireMember, requireUser } from "@/lib/auth/guard";
import { enforceRateLimit } from "@/lib/rate-limit";
import { completeOnboarding, createSpace, joinWithCode, regenerateInvite } from "@/lib/services/couple-service";
import { updateGoals } from "@/lib/services/settings-service";
import { createSpaceSchema, joinSpaceSchema } from "@/lib/validators/couple";
import { onboardingGoalsSchema } from "@/lib/validators/settings";

export async function createSpaceAction(raw: unknown): Promise<ActionResult<{ spaceId: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    const { name } = createSpaceSchema.parse(raw);
    const spaceId = await createSpace(user, name);
    revalidateApp();
    return { spaceId };
  });
}

export async function joinSpaceAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const { code } = joinSpaceSchema.parse(raw);
    await enforceRateLimit("inviteJoin", user._id.toString());
    await joinWithCode(user, code);
    revalidateApp();
    return null;
  }, "Welcome to your couple space!");
}

export async function regenerateInviteAction(): Promise<ActionResult<{ code: string | null }>> {
  return runAction(async () => {
    const ctx = await requireMember();
    const invite = await regenerateInvite(ctx);
    revalidateApp();
    return { code: invite?.code ?? null };
  }, "New invite code created.");
}

export async function saveOnboardingGoalsAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireMember();
    const input = onboardingGoalsSchema.parse(raw);
    await updateGoals(ctx, input);
    revalidateApp();
    return null;
  });
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await completeOnboarding(user._id);
    revalidateApp();
    return null;
  });
}
