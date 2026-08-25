import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";

// ตรวจการจองของผู้ใช้ทั่วไป (guest) — ยืนยันตัวตนด้วย เบอร์โทร + รหัสจอง 1 ใบ
// ก่อน แล้วจึงคืนรายการจองทั้งหมดของเบอร์นั้น (กัน brute-force ด้วย rate limit)
const bodySchema = z.object({
  phone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง"),
  code: z.string().trim().regex(/^[A-Za-z0-9]{8}$/, "รหัสจองไม่ถูกต้อง"),
});

export async function POST(request: Request) {
  const limited = await rateLimit(request, "track", 10, 60_000);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "ข้อมูลไม่ครบหรือไม่ถูกต้อง", 400);
  }
  const { phone } = parsed.data;
  const code = parsed.data.code.toUpperCase();

  const admin = createAdminClient();

  // 1) ยืนยัน: ต้องมีการจองที่ตรงทั้งรหัสและเบอร์ (พิสูจน์ว่าเป็นเจ้าของ)
  const { data: proof } = await admin
    .from("bookings")
    .select("id")
    .eq("booking_code", code)
    .eq("user_phone", phone)
    .maybeSingle();
  if (!proof) {
    return apiError("NOT_FOUND", "ไม่พบการจองที่ตรงกับเบอร์และรหัสนี้", 404);
  }

  // 2) คืนรายการจองทั้งหมดของเบอร์นี้
  const { data: rows } = await admin
    .from("bookings")
    .select(
      "booking_code, booking_date, start_time, end_time, total_price, status, courts(name), tenants(name)",
    )
    .eq("user_phone", phone)
    .order("booking_date", { ascending: false })
    .limit(50);

  const bookings = (rows ?? []).map((b) => ({
    code: b.booking_code,
    courtName: b.courts?.name ?? "—",
    tenantName: b.tenants?.name ?? "",
    date: b.booking_date,
    startTime: b.start_time,
    endTime: b.end_time,
    totalPrice: b.total_price,
    status: b.status,
  }));

  return apiOk({ bookings });
}
