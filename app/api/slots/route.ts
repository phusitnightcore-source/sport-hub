import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError, bangkokToday, bangkokNowTime } from "@/lib/api";
import { validBookingDate } from "@/lib/booking/dates";
import { buildSlots } from "@/lib/booking/slots";

const querySchema = z.object({
  courtId: z.string().uuid(),
  date: z.string().refine(validBookingDate, "วันที่ไม่ถูกต้อง"),
});

// ตาราง slot สาธารณะ — ใช้ service role อย่างจงใจเพราะ guest อ่านตาราง bookings
// ตรงๆ ไม่ได้ (RLS) ส่งออกเฉพาะช่วงเวลาว่าง/ไม่ว่าง ไม่มีข้อมูลส่วนบุคคล
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    courtId: url.searchParams.get("courtId"),
    date: url.searchParams.get("date"),
  });
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "พารามิเตอร์ไม่ถูกต้อง", 400, {
      issues: parsed.error.issues,
    });
  }
  const { courtId, date } = parsed.data;

  const admin = createAdminClient();
  const { data: court } = await admin
    .from("courts")
    .select("id, tenant_id, open_time, close_time, price_standard, price_peak, status, advance_booking_days, branches(status), tenants(status)")
    .eq("id", courtId)
    .single();
  if (!court || court.status !== "open" || court.branches?.status !== "active" || !["active","trial","free"].includes(court.tenants?.status ?? "")) {
    return apiError("NOT_FOUND", "ไม่พบสนามหรือสนามปิดให้บริการ", 404);
  }

  const results =
    await Promise.all([
      admin
        .from("court_peak_windows")
        .select("day_of_week, start_time, end_time")
        .eq("court_id", courtId),
      admin
        .from("bookings")
        .select("start_time, end_time")
        .eq("court_id", courtId)
        .eq("booking_date", date)
        .in("status", [
          "pending_payment",
          "awaiting_verification",
          "confirmed",
          "awaiting_refund",
        ]),
      admin
        .from("block_schedules")
        .select("start_time, end_time")
        .eq("court_id", courtId)
        .eq("block_date", date),
    ]);

  if (results.some(result => result.error)) return apiError("INTERNAL_ERROR", "โหลดเวลาว่างไม่สำเร็จ กรุณาลองใหม่", 503);
  const [{ data: peaks }, { data: bookings }, { data: blocks }] = results;
  const slots = buildSlots({
    court,
    peakWindows: peaks ?? [],
    bookings: bookings ?? [],
    blocks: blocks ?? [],
    date,
    today: bangkokToday(),
    nowTime: bangkokNowTime(),
  });

  return apiOk({ date, slots });
}
