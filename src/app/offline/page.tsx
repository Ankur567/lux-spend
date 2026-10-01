import { WifiOff } from "lucide-react";
import { APP_NAME } from "@/lib/public-config";

export const metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-2xl">{APP_NAME}</p>
      <div className="mt-8 flex size-16 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-7 text-muted-foreground" />
      </div>
      <h1 className="mt-6 font-display text-4xl">You&apos;re offline</h1>
      <p className="mt-3 text-muted-foreground">Your fund needs a connection so balances are always accurate. Reconnect and try again.</p>
      {/* A full page load is intended here: client navigation can't work offline. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 font-medium text-primary-foreground">
        Try again
      </a>
    </div>
  );
}
