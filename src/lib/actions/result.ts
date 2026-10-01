import "server-only";
import { z } from "zod";
import { AppError, type AppErrorCode } from "@/lib/errors";

export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | {
      ok: false;
      error: string;
      code?: AppErrorCode | "INTERNAL";
      fieldErrors?: Record<string, string[]>;
      details?: Record<string, unknown>;
    };

/**
 * Wraps a server action body: converts known errors into user-safe results and
 * hides unexpected errors behind a generic message (logged server-side).
 * Next.js redirect/notFound errors are re-thrown so navigation still works.
 */
export async function runAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (err) {
    if (isNextControlFlow(err)) throw err;
    if (err instanceof AppError) {
      return { ok: false, error: err.message, code: err.code, details: err.details };
    }
    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "_";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      const first = err.issues[0];
      return {
        ok: false,
        code: "VALIDATION",
        error: first ? first.message : "Please check the form.",
        fieldErrors,
      };
    }
    console.error("[action] unexpected error", err);
    return { ok: false, code: "INTERNAL", error: "Something went wrong. Please try again." };
  }
}

function isNextControlFlow(err: unknown): boolean {
  const digest = (err as { digest?: unknown })?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND");
}
