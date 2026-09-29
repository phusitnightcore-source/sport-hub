import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

// โครงโหลดของ dashboard — ใช้ skeleton shimmer แทน spinner เดี่ยว (รู้สึกไวขึ้น)
export default function DashboardLoading() {
  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="card-floating flex flex-wrap gap-10 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-floating flex flex-col items-center gap-3 p-5">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </main>
  );
}
