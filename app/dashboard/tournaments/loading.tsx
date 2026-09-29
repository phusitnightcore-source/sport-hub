import { Skeleton } from "@/components/ui/Skeleton";

export default function TournamentsLoading() {
  return (
    <main className="flex flex-col gap-8 pb-16 animate-in fade-in duration-150">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      {/* Metrics Grid skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-floating rounded-2xl border border-line p-4 space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-8 w-12 rounded" />
          </div>
        ))}
      </div>

      {/* Tournaments Grid skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-floating rounded-3xl border border-line p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
              <div className="pt-3 border-t border-line/60 flex justify-between items-center">
                <Skeleton className="h-6 w-16 rounded" />
                <Skeleton className="h-8 w-36 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
