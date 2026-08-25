import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

export default function MyBookingsLoading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </main>
  );
}
