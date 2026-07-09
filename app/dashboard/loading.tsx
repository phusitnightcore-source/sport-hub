import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 text-ink-soft">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
      <p className="font-display text-body font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
    </div>
  );
}
