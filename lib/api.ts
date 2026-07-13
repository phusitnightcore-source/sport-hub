import { NextResponse } from "next/server";

// Response format มาตรฐานตาม SCOPE.md §28.1
// { success, data } | { success: false, error: { code, message, details } }

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
) {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status },
  );
}

/** วันที่วันนี้ตามเขตเวลาไทย รูปแบบ YYYY-MM-DD */
export function bangkokToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

/** วันที่วันนี้แบบยาวภาษาไทย เช่น "วันอาทิตย์ที่ 12 กรกฎาคม 2569" */
export function bangkokTodayLong(): string {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date());
}

/** วันที่ (UTC ISO date) อีก N วันข้างหน้า — helper สำหรับ server component (เลี่ยง Date.now ใน render) */
export function isoDatePlusDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** timestamp ISO ย้อนหลัง N วัน — helper สำหรับ server component (เลี่ยง Date.now ใน render) */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** รายการวันที่เขตเวลาไทย (YYYY-MM-DD) ย้อนหลัง N วันจนถึงวันนี้ (เรียงเก่า→ใหม่) */
export function bangkokLastDays(days: number): string[] {
  const now = Date.now();
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(
      new Date(now - i * 86_400_000).toLocaleDateString("en-CA", {
        timeZone: "Asia/Bangkok",
      }),
    );
  }
  return out;
}

/** เวลาปัจจุบันตามเขตเวลาไทย รูปแบบ HH:MM */
export function bangkokNowTime(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
}
