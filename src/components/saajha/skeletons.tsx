import { Skeleton } from "@/components/ui/skeleton";

// Skeletons mirror the real layouts so nothing jumps when content arrives.

export function ResourceCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card" aria-hidden="true">
      <Skeleton className="h-36 rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex justify-between border-t border-line pt-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    </div>
  );
}

export function ResourceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading resources">
      {Array.from({ length: count }, (_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading resource">
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-col gap-4 sm:flex-row">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5 rounded-2xl border border-line bg-card p-4 shadow-card sm:p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
