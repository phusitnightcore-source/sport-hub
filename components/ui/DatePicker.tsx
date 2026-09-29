"use client";

import { useState, useRef, useEffect, useId } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const TH_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const TH_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function toYMD(d: Date): string {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD (local tz)
}
function parseYMD(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return { y: +m[1], m: +m[2] - 1, d: +m[3] };
}
function formatTH(s: string): string {
  const p = parseYMD(s);
  if (!p) return "";
  return `${p.d} ${TH_MONTHS_SHORT[p.m]} ${p.y + 543}`;
}

interface DatePickerProps {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  /** วันต่ำสุดที่เลือกได้ (YYYY-MM-DD) */
  min?: string;
  /** วันสูงสุดที่เลือกได้ (YYYY-MM-DD) */
  max?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

// ปฏิทินเลือกวันแบบ popover — แสดงเดือน/ปีไทย (พ.ศ.), มี hidden input สำหรับ submit ฟอร์ม
export function DatePicker({
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  label,
  min,
  max,
  required,
  placeholder = "เลือกวันที่",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue ?? "");
  const [today] = useState(() => toYMD(new Date()));
  const ref = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const value = controlledValue !== undefined ? controlledValue : internal;

  // เดือนที่กำลังแสดง — เริ่มจากค่าที่เลือก หรือวันนี้
  const [view, setView] = useState(() => {
    const base = parseYMD(value || today)!;
    return { year: base.y, month: base.m };
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function select(day: number) {
    const ymd = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setInternal(ymd);
    onChange?.(ymd);
    setOpen(false);
  }
  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      const year = v.year + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      return { year, month };
    });
  }

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span id={labelId} className="text-body-sm font-medium text-ink">
          {label}
        </span>
      )}
      <div className="relative w-full" ref={ref}>
        <input type="hidden" name={name} value={value} required={required} />

        <button
          type="button"
          aria-labelledby={label ? labelId : undefined}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm bg-surface px-4 py-2.5 text-left",
            "text-body text-ink shadow-sm outline-none transition-all duration-fast",
            "ring-1 ring-inset ring-line hover:ring-brand/40",
            open && "ring-2 ring-brand shadow-md",
          )}
          onClick={() => setOpen(!open)}
        >
          <Calendar aria-hidden className="h-[18px] w-[18px] shrink-0 text-ink-soft" />
          <span className={cn("flex-1 truncate", !value && "text-ink-soft")}>
            {value ? formatTH(value) : placeholder}
          </span>
        </button>

        {open && (
          <div className="animate-dropdown-in absolute z-50 mt-2 w-72 rounded-md bg-surface p-3 shadow-lg ring-1 ring-line">
            {/* Header เดือน/ปี */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="เดือนก่อนหน้า"
                onClick={() => shiftMonth(-1)}
                className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-display text-body font-semibold text-ink">
                {TH_MONTHS[view.month]} {view.year + 543}
              </span>
              <button
                type="button"
                aria-label="เดือนถัดไป"
                onClick={() => shiftMonth(1)}
                className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* หัวคอลัมน์วัน */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {TH_WEEKDAYS.map((w) => (
                <span key={w} className="py-1 text-center text-[11px] font-medium text-ink-soft">
                  {w}
                </span>
              ))}
            </div>

            {/* ช่องวัน */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <span key={`e${i}`} />;
                const ymd = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = ymd === value;
                const isToday = ymd === today;
                const disabled = (min ? ymd < min : false) || (max ? ymd > max : false);
                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={disabled}
                    onClick={() => select(day)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-sm text-body-sm transition-colors duration-fast",
                      disabled && "cursor-not-allowed text-ink-soft/40",
                      !disabled && !isSelected && "text-ink hover:bg-brand-soft",
                      isSelected && "bg-brand font-semibold text-white shadow-sm",
                      !isSelected && isToday && "ring-1 ring-inset ring-brand text-brand font-medium",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
