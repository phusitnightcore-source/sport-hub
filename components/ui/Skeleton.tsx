import { cn } from "@/lib/utils";

// โครงโหลด (shimmer) — ใช้แทนพื้นที่ที่กำลังดึงข้อมูล ตาม Motion Guide (§5)
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

// การ์ดโครงมาตรฐาน (เลียนแบบ card-floating ระหว่างโหลด)
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("card-floating flex flex-col gap-3 p-6", className)}>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

// แถวโครง (เลียนแบบ ListRowCard/BookingRow)
export function SkeletonRow() {
  return (
    <div className="card-floating flex items-center gap-4 p-4">
      <Skeleton className="h-11 w-11 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}
