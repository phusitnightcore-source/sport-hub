"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUsePosBranch } from "@/lib/pos/access";
import { validBookingDate } from "@/lib/booking/dates";

async function authorizedBooking(id: string, mutate: boolean) {
  const ctx = await getStaffContext();
  if (!ctx || !z.string().uuid().safeParse(id).success || !hasPermission(ctx,mutate ? "create_booking" : "view_bookings_own")) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("bookings").select("branch_id").eq("id",id).eq("tenant_id",ctx.tenantId).maybeSingle();
  if (!data || !await canUsePosBranch(ctx,data.branch_id)) return null;
  return {ctx,admin};
}

export async function updateAttendance(id: string, status: string, reason: string) {
  const parsed = z.object({status:z.enum(["checked_in","completed","no_show"]),reason:z.string().trim().min(2).max(500)}).safeParse({status,reason});
  if (!parsed.success) return {error:"กรุณาเลือกสถานะและระบุหมายเหตุ 2–500 ตัวอักษร"};
  const auth = await authorizedBooking(id,true);
  if (!auth) return {error:"ไม่มีสิทธิ์จัดการการจองในสาขานี้"};
  const {error} = await auth.admin.rpc("set_booking_attendance",{p_tenant_id:auth.ctx.tenantId,p_booking_id:id,p_actor_id:auth.ctx.userId,p_status:parsed.data.status,p_reason:parsed.data.reason});
  if (error) return {error:"บันทึกไม่ได้: ตรวจว่าการจองยืนยันแล้ว เช็กอินในวันจอง และบันทึกไม่มาตามนัดหลังหมดเวลาจอง หากยังไม่สำเร็จให้ตรวจ migration"};
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/schedule");
  return {success:true};
}

export async function bookingHistory(id:string) {
  const auth = await authorizedBooking(id,false);
  if (!auth) return {error:"ไม่มีสิทธิ์ดูการจองในสาขานี้"};
  const {data,error} = await auth.admin.rpc("booking_operation_history",{p_tenant_id:auth.ctx.tenantId,p_booking_id:id});
  if (error) return {error:"โหลดประวัติไม่สำเร็จ กรุณาลองใหม่"};
  return {data};
}

export async function rescheduleBooking(id:string,date:string,start:string,reason:string) {
  if (!validBookingDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || reason.trim().length<2 || reason.length>500) return {error:"กรุณาระบุวันที่ เวลา และเหตุผลให้ครบ"};
  const auth = await authorizedBooking(id,true);
  if (!auth) return {error:"ไม่มีสิทธิ์จัดการการจองในสาขานี้"};
  const {error}=await auth.admin.rpc("reschedule_booking",{p_tenant_id:auth.ctx.tenantId,p_booking_id:id,p_actor_id:auth.ctx.userId,p_date:date,p_start:start,p_reason:reason.trim()});
  if (error) return {error:error.message.includes("RESCHEDULE_PRICE_CHANGED") ? "ช่วงใหม่นี้ราคาไม่เท่าเดิม กรุณาสร้างการจองใหม่และจัดการคืนเงินรายการเดิม" : "เลื่อนไม่สำเร็จ: ตรวจช่วงว่าง เวลาเปิดสนาม และเงื่อนไขการเลื่อนของสนาม แล้วอัปเดตข้อมูลก่อนลองใหม่"};
  revalidatePath("/dashboard/bookings");revalidatePath("/dashboard/schedule");revalidatePath("/booking/[code]","page");
  return {success:true};
}
