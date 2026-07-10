import "server-only";
import { apiError } from "@/lib/api";

// Rate limiter แบบ in-memory (sliding window ต่อ IP+bucket) — ชั้นกันพื้นฐาน
// ตาม §20/§28.2 RATE_LIMIT_EXCEEDED สำหรับ public API (จอง/แนบสลิป/ยกเลิก)
// หมายเหตุ: ต่อ instance — ถ้า scale หลาย instance ให้ย้ายไป Redis/Upstash
const hits = new Map<string, number[]>();

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  );
}

/** คืน NextResponse 429 ถ้าเกิน limit, คืน null ถ้าผ่าน */
export function rateLimit(
  request: Request,
  bucket: string,
  max: number,
  windowMs: number,
) {
  const key = `${bucket}:${clientIp(request)}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  const arr = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (arr.length >= max) {
    hits.set(key, arr);
    return apiError("RATE_LIMIT_EXCEEDED", "กรุณารอสักครู่", 429);
  }
  arr.push(now);
  hits.set(key, arr);
  // กัน map โตไม่จำกัด
  if (hits.size > 10_000) {
    for (const [k, v] of hits) {
      if (v.every((t) => t <= windowStart)) hits.delete(k);
    }
  }
  return null;
}
