"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  courtId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  userName: z.string().trim().min(2).max(80),
  userPhone: z.string().regex(/^0[0-9]{8,9}$/),
});

// ลงชื่อรอคิว (Waitlist) เมื่อ slot ถูกจองเต็ม — public action
// เก็บ profile_id ถ้าผู้ใช้ล็อกอิน (ไว้ดึง LINE/email ตอนแจ้งเตือน)
export async function joinWaitlist(input: {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  userName: string;
  userPhone: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "ข้อมูลไม่ครบหรือไม่ถูกต้อง" };
  }
  const d = parsed.data;

  const admin = createAdminClient();
  const { data: court } = await admin
    .from("courts")
    .select("id, tenant_id, status")
    .eq("id", d.courtId)
    .maybeSingle();
  if (!court || court.status !== "open") {
    return { success: false, error: "ไม่พบสนามหรือปิดให้บริการ" };
  }

  // profile_id ถ้าล็อกอินอยู่
  let profileId: string | null = null;
  try {
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    profileId = user?.id ?? null;
  } catch {
    /* ไม่ล็อกอิน — ไม่เป็นไร */
  }

  // กันลงคิวซ้ำช่วงเดิมด้วยเบอร์เดิม (ที่ยังไม่ถูกแจ้ง)
  const { data: dup } = await admin
    .from("waitlists")
    .select("id")
    .eq("court_id", d.courtId)
    .eq("booking_date", d.date)
    .eq("start_time", d.startTime)
    .eq("user_phone", d.userPhone)
    .is("notified_at", null)
    .limit(1)
    .maybeSingle();
  if (dup) {
    return { success: false, error: "คุณลงคิวช่วงเวลานี้ไว้แล้ว" };
  }

  const { error } = await admin.from("waitlists").insert({
    tenant_id: court.tenant_id,
    court_id: d.courtId,
    booking_date: d.date,
    start_time: d.startTime,
    end_time: d.endTime,
    user_name: d.userName,
    user_phone: d.userPhone,
    profile_id: profileId,
  });
  if (error) {
    return { success: false, error: "ลงคิวไม่สำเร็จ กรุณาลองใหม่" };
  }

  return { success: true };
}
