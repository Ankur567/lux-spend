"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

type Result<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]>; details?: Record<string, unknown> };

/**
 * Runs a server action with pending state and toast feedback. Returns the
 * result so callers can branch on structured errors (e.g. confirmations).
 */
export function useAction<A extends unknown[], T>(action: (...args: A) => Promise<Result<T>>, opts: { toastSuccess?: boolean; toastError?: boolean } = {}) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);

  const run = useCallback(
    (...args: A) =>
      new Promise<Result<T>>((resolve) => {
        setRunning(true);
        startTransition(async () => {
          try {
            const res = await action(...args);
            // A server action that redirects resolves without a result.
            if (!res) return resolve(res);
            if (res.ok && res.message && opts.toastSuccess !== false) toast.success(res.message);
            if (!res.ok && opts.toastError !== false) toast.error(res.error);
            resolve(res);
          } catch (err) {
            // Redirects thrown by server actions propagate here as navigation.
            if ((err as { digest?: string })?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
            toast.error("Network problem. Please check your connection and try again.");
            resolve({ ok: false, error: "Network error" });
          } finally {
            setRunning(false);
          }
        });
      }),
    [action, opts.toastError, opts.toastSuccess],
  );

  return { run, pending: pending || running };
}

export function haptic(pattern: number | number[] = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }
}
