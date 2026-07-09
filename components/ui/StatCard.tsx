import { cn } from "@/lib/utils";

type StatItem = {
  label: string;
  value: React.ReactNode;
  /** หน่วย/สัญลักษณ์เล็กติดกับตัวเลข เช่น "บาท", "%" */
  unit?: string;
};

type StatCardProps = {
  /** วางหลายตัวเลขในการ์ดเดียว แบ่งด้วย spacing ไม่ใช่เส้นคั่น (DESIGN_SYSTEM §4) */
  stats: StatItem[];
  className?: string;
};

// Floating Stat Card ตาม DESIGN_SYSTEM.md §4 — ใช้กับ Dashboard KPI ทั้งหมด
// ตัวเลขใหญ่ Prompt 700 + label เล็ก ink-soft ใต้ตัวเลข
export function StatCard({ stats, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "card-floating flex flex-wrap items-end gap-x-10 gap-y-6 p-6",
        className,
      )}
    >
      {stats.map((stat, i) => (
        <div key={i} className="flex flex-col gap-1">
          <p className="font-display text-display-md font-bold text-ink">
            {stat.value}
            {stat.unit && (
              <span className="ml-1 text-body font-medium text-ink-soft">
                {stat.unit}
              </span>
            )}
          </p>
          <p className="text-body-sm text-ink-soft">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
