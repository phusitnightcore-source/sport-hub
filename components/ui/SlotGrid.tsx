"use client";

import { cn } from "@/lib/utils";
import { formatBaht } from "@/lib/money";
import type { Slot } from "@/lib/booking/slots";

type SlotGridProps = {
  slots: Slot[];
  /** เวลาเริ่มของ slot ที่ถูกเลือก (เช่น ["18:00","19:00"]) */
  selected?: string[];
  onToggle?: (start: string) => void;
  /** เปิด breathing pulse ที่ slot ว่างช่องแรก (ใช้เฉพาะวันนี้) */
  pulseFirstAvailable?: boolean;
  className?: string;
};

// Live Slot Grid — signature element ตาม DESIGN_SYSTEM.md §6 (พาเลต v2)
// ว่าง = brand-soft + label brand / จอง = success ทึบ / บล็อก = line + hatch
export function SlotGrid({
  slots,
  selected = [],
  onToggle,
  pulseFirstAvailable = false,
  className,
}: SlotGridProps) {
  const firstAvailable = slots.find((s) => s.status === "available")?.start;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4",
        className,
      )}
    >
      {slots.map((slot) => {
        const isSelected = selected.includes(slot.start);
        const selectable = slot.status === "available" && !!onToggle;
        const pulse =
          pulseFirstAvailable &&
          slot.status === "available" &&
          slot.start === firstAvailable &&
          !isSelected;

        return (
          <button
            key={slot.start}
            type="button"
            disabled={!selectable}
            onClick={() => onToggle?.(slot.start)}
            aria-pressed={isSelected}
            className={cn(
              "relative flex min-h-24 flex-col items-start justify-center gap-1 rounded-xl border px-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              "transition-all duration-fast",
              // ว่าง
              slot.status === "available" &&
                !isSelected &&
                "border-line bg-surface text-ink hover:border-brand hover:bg-brand-soft hover:shadow-sm",
              // ว่าง + ถูกเลือก → เน้นด้วย brand ทึบ
              isSelected && "border-brand bg-brand-soft text-ink ring-1 ring-brand shadow-sm",
              // ถูกจอง
              slot.status === "booked" &&
                "cursor-not-allowed border-line bg-line/30 text-ink/70",
              // ถูกบล็อก
              slot.status === "blocked" &&
                "slot-hatch cursor-not-allowed border-line bg-line/30 text-ink/70",
              // เลยเวลาแล้ว
              slot.status === "past" &&
                "cursor-not-allowed border-line bg-line/30 text-ink/60",
              pulse && "animate-slot-breathe",
            )}
          >
            <span className="font-mono text-mono-sm font-medium">
              {slot.start}–{slot.end}
            </span>
            <span className="text-body-sm">
              {slot.status === "booked"
                ? "ถูกจอง"
                : slot.status === "blocked"
                  ? "ปิดชั่วคราว"
                  : slot.status === "past"
                    ? "ผ่านไปแล้ว"
                    : `฿${formatBaht(slot.priceSatang)}`}
            </span>
            {isSelected && <span className="text-xs font-semibold text-brand">✓ เลือกแล้ว</span>}
            {slot.isPeak && slot.status === "available" && (
              <span
                className={cn(
                  "absolute right-1.5 top-1.5 rounded-full px-1.5 text-mono-sm font-semibold",
                  "bg-surface text-ink ring-1 ring-line",
                )}
              >
                Peak
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
