import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError, bangkokToday, bangkokNowTime } from "@/lib/api";
import { toMinutes } from "@/lib/booking/slots";
import { dispatchNotification } from "@/lib/notify";
import { notifyWaitlistForFreedSlot } from "@/lib/waitlist";
import { captureException } from "@/lib/logger";

// Cron: (1) ยกเลิกการจอง pending_payment ที่หมดเวลา slot lock 30 นาที (§9.3)
//        (2) เตือนก่อนถึงเวลาจอง ~1 ชม. (§14.1) ผ่าน dispatcher (LINE→email→in-app)
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
    .select("id, tenant_id, court_id, booking_date, start_time, end_time, courts(name)");
  if (error) {
    captureException("cron.bookings.cancel", error);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด", 500);
  }

  // slot ที่เพิ่งว่าง → แจ้งคนใน waitlist (best-effort, ไม่กระทบผลลัพธ์ cron)
  let waitlistNotified = 0;
  for (const b of cancelled ?? []) {
    waitlistNotified += await notifyWaitlistForFreedSlot(admin, {
      tenantId: b.tenant_id,
      courtId: b.court_id,
      bookingDate: b.booking_date,
      startTime: b.start_time,
      endTime: b.end_time,
      courtName: b.courts?.name ?? null,
    });
  }

  // (2) เตือนก่อนถึงเวลาจอง ~1 ชม. — เฉพาะการจองของสมาชิก (มีช่องทางติดต่อ)
  let reminded = 0;
  try {
    const today = bangkokToday();
    const nowMin = toMinutes(bangkokNowTime());
    const { data: soon } = await admin
      .from("bookings")
      .select("id, tenant_id, member_id, start_time, end_time, courts(name)")
      .eq("status", "confirmed")
      .eq("booking_date", today)
      .not("member_id", "is", null);

    for (const b of soon ?? []) {
      const startMin = toMinutes(b.start_time);
      // อยู่ในช่วง ~50–70 นาทีข้างหน้า (cron ทุก 5 นาที ครอบคลุมพอดี)
      if (startMin - nowMin < 50 || startMin - nowMin > 70) continue;

      // กันเตือนซ้ำ
      const { data: dup } = await admin
        .from("notifications")
        .select("id")
        .eq("reference_id", b.id)
        .eq("type", "booking")
        .eq("title", "ใกล้ถึงเวลาจอง")
        .limit(1)
        .maybeSingle();
      if (dup) continue;

      const { data: member } = await admin
        .from("members")
        .select("id, line_user_id, email")
        .eq("id", b.member_id!)
        .maybeSingle();

      await dispatchNotification({
        tenantId: b.tenant_id,
        recipientId: member?.id ?? null,
        recipientType: "member",
        type: "booking",
        title: "ใกล้ถึงเวลาจอง",
        body: `การจอง ${b.courts?.name ?? "สนาม"} เวลา ${b.start_time.slice(0, 5)} น. อีกประมาณ 1 ชั่วโมง`,
        referenceId: b.id,
        referenceType: "booking",
        lineUserId: member?.line_user_id ?? null,
        email: member?.email ?? null,
      });
      reminded += 1;
    }
  } catch (e) {
    captureException("cron.bookings.remind", e);
  }

  return apiOk({ cancelled: (cancelled ?? []).length, reminded, waitlistNotified });
}
