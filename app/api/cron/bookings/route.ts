import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";

// Cron: ยกเลิกการจอง pending_payment ที่หมดเวลา slot lock 30 นาที (§9.3)
// เรียกโดย Vercel Cron ทุก 5 นาที — กันด้วย CRON_SECRET
export async function GET(request: Request) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);
  }

  const admin = createAdminClient();
  const { data: cancelled, error } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: "หมดเวลาชำระเงิน 30 นาที (ยกเลิกอัตโนมัติ)",
    })
    .eq("status", "pending_payment")
    .lt("slot_locked_until", new Date().toISOString())
    .select("id");
  if (error) {
    console.error("cron bookings failed:", error);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด", 500);
  }

  return apiOk({ cancelled: (cancelled ?? []).length });
}
