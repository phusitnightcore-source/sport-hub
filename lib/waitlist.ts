import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { dispatchNotification } from "@/lib/notify";
import { captureException } from "@/lib/logger";

type Admin = ReturnType<typeof createAdminClient>;

type FreedSlot = {
  tenantId: string;
  courtId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM[:SS]
  endTime: string; // HH:MM[:SS]
  courtName?: string | null;
};

// เมื่อ slot ว่างลง (จองถูกยกเลิก/ปฏิเสธ) → แจ้งคนใน waitlist ที่คิวตรงช่วงนั้น
// เงื่อนไข overlap: start < freed.end AND end > freed.start (คอร์ต+วันเดียวกัน, ยังไม่เคยแจ้ง)
// ตั้ง notified_at กันแจ้งซ้ำ. ไม่ throw — best-effort (เรียกใน cron/route หลัง mutate)
export async function notifyWaitlistForFreedSlot(
  admin: Admin,
  slot: FreedSlot,
): Promise<number> {
  try {
    const { data: entries } = await admin
      .from("waitlists")
      .select("id, user_name, user_phone, profile_id, start_time, end_time")
      .eq("court_id", slot.courtId)
      .eq("booking_date", slot.bookingDate)
      .is("notified_at", null)
      .lt("start_time", slot.endTime)
      .gt("end_time", slot.startTime);

    if (!entries || entries.length === 0) return 0;

    const courtName = slot.courtName ?? "สนาม";
    let notified = 0;

    for (const w of entries) {
      // ช่องทางติดต่อ: ถ้าผูก profile → ดึง LINE/email มาส่งจริง
      let lineUserId: string | null = null;
      let email: string | null = null;
      if (w.profile_id) {
        const { data: p } = await admin
          .from("profiles")
          .select("line_user_id, email")
          .eq("id", w.profile_id)
          .maybeSingle();
        lineUserId = p?.line_user_id ?? null;
        email = p?.email ?? null;
      }

      await dispatchNotification({
        tenantId: slot.tenantId,
        recipientId: w.profile_id,
        recipientType: "member",
        type: "booking",
        title: "ช่วงเวลาที่รอว่างแล้ว",
        body: `${courtName} วันที่ ${slot.bookingDate} เวลา ${slot.startTime.slice(0, 5)} น. ว่างแล้ว — รีบจองก่อนถูกจองอีกครั้ง`,
        referenceType: "waitlist",
        lineUserId,
        email,
      });

      await admin
        .from("waitlists")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", w.id);
      notified += 1;
    }

    return notified;
  } catch (e) {
    captureException("waitlist.notify", e);
    return 0;
  }
}
