import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="pt-6 md:pt-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-28 rounded-full" />
      <Skeleton className="mt-2 h-9 w-56 rounded-xl" />
      <Skeleton className="mt-6 h-52 rounded-[28px]" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-36 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-8 h-3 w-24 rounded-full" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-26 rounded-3xl" />
        <Skeleton className="h-26 rounded-3xl" />
        <Skeleton className="h-26 rounded-3xl" />
      </div>
    </div>
  );
}
