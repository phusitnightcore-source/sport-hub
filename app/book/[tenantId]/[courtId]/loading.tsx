import { Skeleton } from "@/components/ui/Skeleton";

export default function CourtBookingLoading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Skeleton className="mb-6 h-4 w-32" />
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex flex-col gap-6">
        <div className="card-floating p-6">
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="card-floating flex flex-col gap-4 p-6">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
