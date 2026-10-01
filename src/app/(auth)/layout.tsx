import Link from "next/link";
import { APP_NAME } from "@/lib/public-config";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="pt-safe pb-safe relative flex min-h-dvh flex-col overflow-hidden px-5">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-rose/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-1/3 size-72 rounded-full bg-violet/15 blur-3xl" aria-hidden />
      <header className="relative mx-auto w-full max-w-sm pt-10">
        <Link href="/" className="font-display text-3xl">
          {APP_NAME}
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">Your private luxury fund, for two.</p>
      </header>
      <main className="relative mx-auto w-full max-w-sm flex-1 py-8">{children}</main>
    </div>
  );
}
