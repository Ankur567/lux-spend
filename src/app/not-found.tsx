import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-7xl text-rose">404</p>
      <h1 className="mt-4 font-display text-3xl">Not found</h1>
      <p className="mt-2 max-w-xs text-muted-foreground">This page doesn&apos;t exist, or it belongs to a space you&apos;re not part of.</p>
      <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-2xl bg-primary px-6 font-medium text-primary-foreground">
        Go home
      </Link>
    </div>
  );
}
