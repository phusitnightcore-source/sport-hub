import "server-only";
import { apiError } from "@/lib/api";

// Rate limiter สำหรับ public API (§20/§28.2 RATE_LIMIT_EXCEEDED)
// - ถ้าตั้ง Upstash Redis (UPSTASH_REDIS_REST_URL/TOKEN) → นับข้าม instance ได้จริง (fixed window)
//   ผ่าน REST API (ไม่ต้องลง dependency) — เหมาะกับ Vercel serverless หลาย instance
// - ถ้าไม่ตั้ง → fallback in-memory ต่อ instance (ชั้นกันพื้นฐาน เหมือนเดิม)

const hits = new Map<string, number[]>();

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// fixed-window counter บน Upstash — คืน true = ผ่าน, false = เกิน limit
// fail-open: ถ้า Redis ล่ม/ตอบผิด อย่าบล็อกผู้ใช้ (คืน true)
async function redisAllow(key: string, max: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const windowIdx = Math.floor(Date.now() / windowMs);
  const k = `rl:${key}:${windowIdx}`;
  try {
    const res = await fetch(`${url}/incr/${encodeURIComponent(k)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return true;
    const { result } = (await res.json()) as { result: number };
    if (result === 1) {
      // ตั้ง TTL ครั้งแรกของหน้าต่าง (ปล่อยให้ล้มเงียบได้)
      void fetch(`${url}/expire/${encodeURIComponent(k)}/${Math.ceil(windowMs / 1000)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => {});
    }
    return result <= max;
  } catch {
    return true;
  }
}

function memoryAllow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const arr = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) {
      if (v.every((t) => t <= windowStart)) hits.delete(k);
    }
  }
  return true;
}

/** คืน NextResponse 429 ถ้าเกิน limit, คืน null ถ้าผ่าน — เป็น async (รองรับ Redis) */
export async function rateLimit(
  request: Request,
  bucket: string,
  max: number,
  windowMs: number,
) {
  const key = `${bucket}:${clientIp(request)}`;
  const allowed = redisConfigured()
    ? await redisAllow(key, max, windowMs)
    : memoryAllow(key, max, windowMs);
  return allowed ? null : apiError("RATE_LIMIT_EXCEEDED", "กรุณารอสักครู่", 429);
}
