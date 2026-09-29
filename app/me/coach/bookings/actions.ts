"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

async function coachActor() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  return user ?? null;
}

export async function respondCoachBooking(id:string,action:string,note:string) {
  const parsed=z.object({id:z.string().uuid(),action:z.enum(["accept","reject"]),note:z.string().trim().max(500)}).safeParse({id,action,note});
  if (!parsed.success) return {error:"ข้อมูลไม่ถูกต้อง"};
  const user=await coachActor();
  if (!user) return {error:"กรุณาเข้าสู่ระบบใหม่"};
  const admin=createAdminClient();
  const {data:booking}=await admin.from("coach_bookings").select("id,tenant_id,player_profile_id,status").eq("id",id).maybeSingle();
  if (!booking || booking.status!=="requested") return {error:"คำขอนี้ถูกจัดการไปแล้ว กรุณาอัปเดตหน้า"};
  const {error}=await admin.rpc("respond_coach_booking",{p_actor_id:user.id,p_booking_id:id,p_action:parsed.data.action,p_note:parsed.data.note});
  if (error) return {error:error.message.includes("COURT_BOOKING_CHANGED") ? "รายการสนามถูกเลื่อนหรือยกเลิกแล้ว จึงตอบรับไม่ได้" : "บันทึกไม่สำเร็จ กรุณาอัปเดตหน้าแล้วลองใหม่"};
  if (booking.tenant_id) {
    await dispatchNotification({tenantId:booking.tenant_id,recipientId:booking.player_profile_id,recipientType:"member",type:"booking",
      title:parsed.data.action==="accept" ? "โค้ชตอบรับแล้ว" : "โค้ชปฏิเสธคำขอ",body:parsed.data.action==="accept" ? "โค้ชตอบรับเวลาที่ผูกกับการจองสนามของคุณแล้ว" : `โค้ชไม่สะดวกรับคำขอนี้${parsed.data.note ? ` — ${parsed.data.note}`:""}`,
      referenceId:id,referenceType:"coach_booking"});
    await logAudit({tenantId:booking.tenant_id,actorId:user.id,actorRole:"member",action:`coach_${parsed.data.action}`,module:"coach_booking",referenceId:id,before:{status:"requested"},after:{status:parsed.data.action==="accept"?"accepted":"rejected",note:parsed.data.note}});
  }
  revalidatePath("/me/coach/bookings");revalidatePath("/me/bookings");revalidatePath("/dashboard/schedule");
  return {success:true};
}

export async function advanceCoachBooking(id:string,action:string) {
  const parsed=z.object({id:z.string().uuid(),action:z.enum(["start","complete"])}).safeParse({id,action});
  if (!parsed.success) return {error:"ข้อมูลไม่ถูกต้อง"};
  const user=await coachActor();if (!user) return {error:"กรุณาเข้าสู่ระบบใหม่"};
  const {error}=await createAdminClient().rpc("advance_coach_booking",{p_actor_id:user.id,p_booking_id:id,p_action:parsed.data.action});
  if (error) return {error:"เปลี่ยนสถานะไม่ได้ กรุณาตรวจวัน เวลา และสถานะล่าสุด"};
  revalidatePath("/me/coach/bookings");revalidatePath("/me/bookings");
  return {success:true};
}
