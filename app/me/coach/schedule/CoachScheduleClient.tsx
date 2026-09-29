"use client";

import { useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { saveCoachScheduleAction } from "../actions";

const DAYS = [
  { id: 0, label: "วันอาทิตย์ (Sunday)", color: "text-rose-500" },
  { id: 1, label: "วันจันทร์ (Monday)", color: "text-amber-500" },
  { id: 2, label: "วันอังคาร (Tuesday)", color: "text-pink-500" },
  { id: 3, label: "วันพุธ (Wednesday)", color: "text-emerald-500" },
  { id: 4, label: "วันพฤหัสบดี (Thursday)", color: "text-orange-500" },
  { id: 5, label: "วันศุกร์ (Friday)", color: "text-blue-500" },
  { id: 6, label: "วันเสาร์ (Saturday)", color: "text-purple-500" },
];

interface ScheduleItem {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export function CoachScheduleClient({
  initialSchedules,
}: {
  initialSchedules: ScheduleItem[];
}) {
  const [schedules, setSchedules] = useState<Record<number, ScheduleItem>>(() => {
    const map: Record<number, ScheduleItem> = {};
    for (let i = 0; i < 7; i++) {
      const found = initialSchedules.find((s) => s.day_of_week === i);
      map[i] = found
        ? {
            ...found,
            start_time: found.start_time.slice(0, 5),
            end_time: found.end_time.slice(0, 5),
            is_available: true,
          }
        : {
            day_of_week: i,
            start_time: "17:00",
            end_time: "21:00",
            is_available: i === 0 || i === 6, // default weekend available
          };
    }
    return map;
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: number) {
    setSchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_available: !prev[day].is_available,
      },
    }));
    setSaved(false);
  }

  function updateTime(day: number, field: "start_time" | "end_time", value: string) {
    setSchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);

    const list = Object.values(schedules);
    const res = await saveCoachScheduleAction(list);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "เกิดข้อผิดพลาดในการบันทึก");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger/10 p-3.5 text-danger flex items-center gap-2 text-body-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-body-sm">
          <Check className="h-4 w-4 shrink-0" />
          <span>บันทึกตารางเวลาว่างสำเร็จแล้ว</span>
        </div>
      )}

      <div className="divide-y divide-line/60 rounded-3xl border border-line bg-surface overflow-hidden shadow-xs">
        {DAYS.map((day) => {
          const item = schedules[day.id];
          const isAvail = item?.is_available;

          return (
            <div
              key={day.id}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                isAvail ? "bg-surface" : "bg-surface-raised/40 opacity-70"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`day-${day.id}`}
                  checked={isAvail}
                  onChange={() => toggleDay(day.id)}
                  className="h-5 w-5 rounded-md text-brand border-line focus:ring-brand cursor-pointer"
                />
                <label
                  htmlFor={`day-${day.id}`}
                  className={`font-display text-sm font-bold cursor-pointer ${
                    isAvail ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  <span className={day.color}>●</span> {day.label}
                </label>
              </div>

              {isAvail ? (
                <div className="flex items-center gap-2 text-body-xs font-semibold pl-8 sm:pl-0">
                  <span className="text-ink-soft">ตั้งแต่</span>
                  <input
                    type="time"
                    value={item.start_time}
                    onChange={(e) => updateTime(day.id, "start_time", e.target.value)}
                    className="rounded-xl border border-line bg-surface-raised px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
                  />
                  <span className="text-ink-soft">ถึง</span>
                  <input
                    type="time"
                    value={item.end_time}
                    onChange={(e) => updateTime(day.id, "end_time", e.target.value)}
                    className="rounded-xl border border-line bg-surface-raised px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              ) : (
                <span className="text-body-xs text-ink-soft italic pl-8 sm:pl-0">
                  (ไม่สะดวกรับสอนในวันนี้)
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="rounded-xl font-bold bg-brand text-white shadow-xs px-6 py-2.5 flex items-center gap-2 hover:bg-brand-dark"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>กำลังบันทึก...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>บันทึกตารางเวลาว่าง</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
