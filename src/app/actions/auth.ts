"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/guard";
import { AppError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { changePassword, registerUser, requestPasswordReset, resetPassword } from "@/lib/services/auth-service";
import { joinWithCode } from "@/lib/services/couple-service";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validators/auth";

function safeCallbackUrl(url?: string): string {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return "/";
  return url;
}

export async function registerAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const input = registerSchema.parse(raw);
    await enforceRateLimit("register");
    const user = await registerUser(input);

    let redirectTo = "/onboarding";
    if (input.inviteCode) {
      try {
        await joinWithCode(user, input.inviteCode);
        redirectTo = "/";
      } catch {
        redirectTo = `/invite/${encodeURIComponent(input.inviteCode)}`;
      }
    }
    await signIn("credentials", { email: input.email, password: input.password, redirectTo });
    return null;
  });
}

export async function loginAction(raw: unknown): Promise<ActionResult> {
  try {
    const input = loginSchema.parse(raw);
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirectTo: safeCallbackUrl(input.callbackUrl),
    });
    return { ok: true, data: null };
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as AuthError & { code?: string }).code;
      if (code === "rate_limited") {
        return { ok: false, code: "RATE_LIMITED", error: "Too many attempts. Please wait a few minutes." };
      }
      return { ok: false, code: "UNAUTHORIZED", error: "Incorrect email or password." };
    }
    return runAction(async () => {
      throw err;
    });
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function forgotPasswordAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const { email } = forgotPasswordSchema.parse(raw);
    await enforceRateLimit("passwordReset", email);
    await requestPasswordReset(email);
    return null;
  }, "If an account exists for that email, a reset link is on its way.");
}

export async function resetPasswordAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const input = resetPasswordSchema.parse(raw);
    await enforceRateLimit("passwordReset", "reset");
    await resetPassword(input.token, input.password);
    return null;
  }, "Password updated. You can sign in now.");
}

export async function changePasswordAction(raw: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const input = changePasswordSchema.parse(raw);
    await enforceRateLimit("passwordReset", user._id.toString());
    await changePassword(user._id, input.currentPassword, input.password);
    // Re-issue a session for this device; other devices are signed out.
    try {
      await signIn("credentials", { email: user.email, password: input.password, redirect: false });
    } catch (err) {
      if (err instanceof AuthError) throw new AppError("UNAUTHORIZED", "Password changed. Please sign in again.");
      throw err;
    }
    return null;
  }, "Password changed.");
}
