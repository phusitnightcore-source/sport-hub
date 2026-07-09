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
              "relative flex flex-col items-start gap-0.5 rounded-sm px-3 py-2.5 text-left",
              "transition-all duration-fast",
              // ว่าง
              slot.status === "available" &&
                !isSelected &&
                "bg-brand-soft text-brand hover:shadow-sm",
              // ว่าง + ถูกเลือก → เน้นด้วย brand ทึบ
              isSelected && "bg-brand text-white shadow-sm",
              // ถูกจอง
              slot.status === "booked" &&
                "cursor-not-allowed bg-success text-white",
              // ถูกบล็อก
              slot.status === "blocked" &&
                "slot-hatch cursor-not-allowed bg-line text-ink-soft",
              // เลยเวลาแล้ว
              slot.status === "past" &&
                "cursor-not-allowed bg-line/60 text-ink-soft/60",
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
            {slot.isPeak && slot.status === "available" && (
              <span
                className={cn(
                  "absolute right-1.5 top-1.5 rounded-full px-1.5 text-mono-sm font-semibold",
                  isSelected ? "bg-white/20 text-white" : "pill-danger",
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
