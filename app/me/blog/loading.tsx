import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

export default function MeBlogLoading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonRow />
        <SkeletonRow />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-floating flex flex-col gap-3 p-0">
            <Skeleton className="aspect-[16/9] w-full rounded-b-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
