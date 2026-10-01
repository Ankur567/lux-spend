"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl">Something went wrong</h1>
      <p className="mt-3 max-w-xs text-muted-foreground">
        Nothing was changed. Your fund and history are safe. Please try again.
        {error.digest ? <span className="mt-2 block font-mono text-xs">Ref: {error.digest}</span> : null}
      </p>
      <div className="mt-8 flex gap-2">
        <button type="button" onClick={reset} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-5 font-medium text-primary-foreground">
          <RotateCcw className="size-4" /> Try again
        </button>
        <Link href="/" className="inline-flex h-12 items-center rounded-2xl border border-border px-5 font-medium">
          Home
        </Link>
      </div>
    </div>
  );
}
