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

/** วันที่ (UTC ISO date) อีก N วันข้างหน้า — helper สำหรับ server component (เลี่ยง Date.now ใน render) */
export function isoDatePlusDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** เวลาปัจจุบันตามเขตเวลาไทย รูปแบบ HH:MM */
export function bangkokNowTime(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
}
