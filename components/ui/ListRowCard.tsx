import { cn } from "@/lib/utils";

type ListRowCardProps = {
  /** avatar วงกลม หรือไอคอนวงกลมพื้น brand-soft ถ้าไม่มีรูป */
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** คอลัมน์ข้อมูลเพิ่ม (แผนก/สาขา/แพ็กเกจ) — วางกลางแถว */
  children?: React.ReactNode;
  /** ปุ่ม action / status pill / เมนู 3 จุด — ชิดขวาสุด */
  trailing?: React.ReactNode;
  className?: string;
};

// List Row Card ตาม DESIGN_SYSTEM.md §4 — pattern หลักของรายชื่อสมาชิก/Staff/รายการจอง
// โครงซ้าย→ขวา: avatar → ชื่อ+บรรทัดรอง → คอลัมน์เพิ่ม → action ขวาสุด
export function ListRowCard({
  leading,
  title,
  subtitle,
  children,
  trailing,
  className,
}: ListRowCardProps) {
  return (
    <article
      className={cn(
        "card-floating flex items-center gap-4 px-6 py-4",
        "transition-all duration-fast hover:-translate-y-px hover:shadow-lg",
        className,
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-ink">{title}</p>
        {subtitle && (
          <p className="truncate text-body-sm text-ink-soft">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="hidden items-center gap-6 sm:flex">{children}</div>
      )}
      {trailing && (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      )}
    </article>
  );
}

// ไอคอนวงกลมพื้น brand-soft สำหรับ leading ตอนไม่มีรูป avatar
export function LeadingIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand [&_svg]:h-5 [&_svg]:w-5">
      {children}
    </span>
  );
}
