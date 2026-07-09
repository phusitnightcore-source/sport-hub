import { cn } from "@/lib/utils";

type StatusPillProps = {
  tone: "success" | "danger" | "warning" | "brand";
  children: React.ReactNode;
  className?: string;
};

// Status Pill ตาม DESIGN_SYSTEM.md §4 — พื้นสีอ่อน 10-12% + ตัวหนังสือสีเข้มโทนเดียวกัน
// สี base อยู่ใน globals.css (.pill-*) — ห้าม inline สีเพิ่มที่นี่
const toneClasses: Record<StatusPillProps["tone"], string> = {
  success: "pill-success",
  danger: "pill-danger",
  warning: "pill-warning",
  brand: "pill-brand",
};

export function StatusPill({ tone, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-body-sm font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
