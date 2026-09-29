"use server";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {dispatchNotification} from "@/lib/notify";

export async function cancelMyCoachBooking(id:string,reason:string) {
  const parsed=z.object({id:z.string().uuid(),reason:z.string().trim().min(2).max(500)}).safeParse({id,reason});
  if (!parsed.success) return {error:"กรุณาระบุเหตุผล 2–500 ตัวอักษร"};
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return {error:"กรุณาเข้าสู่ระบบใหม่"};
  const admin=createAdminClient();
  const {data:booking}=await admin.from("coach_bookings").select("tenant_id,coach_profiles(profile_id)").eq("id",id).eq("player_profile_id",user.id).maybeSingle();
  if(!booking)return {error:"ไม่พบรายการของคุณ"};
  const {error}=await admin.rpc("cancel_player_coach_booking",{p_actor_id:user.id,p_booking_id:id,p_reason:parsed.data.reason});
  if(error)return {error:"ยกเลิกไม่ได้ กรุณาตรวจสถานะและเวลาอีกครั้ง"};
  if(booking.tenant_id)await dispatchNotification({tenantId:booking.tenant_id,recipientId:booking.coach_profiles?.profile_id??null,recipientType:"member",type:"booking",title:"ผู้เรียนยกเลิกนัดโค้ช",body:parsed.data.reason,referenceId:id,referenceType:"coach_booking"});
  revalidatePath("/me/bookings");revalidatePath("/me/coach/bookings");revalidatePath("/dashboard/schedule");
  return {success:true};
}
