import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dispatchNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const formSchema = z.object({
  coach_profile_id:z.string().uuid(),
  service_id:z.string().uuid(),
  court_booking_code:z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/),
  player_note:z.string().trim().max(1000).optional(),
});

const redirectError = (request:NextRequest,coachId:string,serviceId:string,error:string) =>
  NextResponse.redirect(new URL(`/book/coach/${coachId}?service=${serviceId}&error=${error}`,request.url),303);

export async function POST(request:NextRequest) {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login",request.url),303);

  let parsed:z.infer<typeof formSchema>;
  try {
    const form=await request.formData();
    parsed=formSchema.parse({
      coach_profile_id:form.get("coach_profile_id"),
      service_id:form.get("service_id"),
      court_booking_code:form.get("court_booking_code"),
      player_note:form.get("player_note") || undefined,
    });
  } catch {
    return NextResponse.redirect(new URL("/coaches?error=invalid_booking_request",request.url),303);
  }

  const admin=createAdminClient();
  const [{data:service},{data:coach},{data:courtBooking}]=await Promise.all([
    admin.from("coach_services").select("id,coach_profile_id,is_active").eq("id",parsed.service_id).eq("coach_profile_id",parsed.coach_profile_id).maybeSingle(),
    admin.from("coach_profiles").select("id,profile_id,display_name,approval_status,is_visible").eq("id",parsed.coach_profile_id).maybeSingle(),
    admin.from("bookings").select("id,tenant_id,booking_code").eq("booking_code",parsed.court_booking_code).maybeSingle(),
  ]);
  if (!service?.is_active || !coach || coach.approval_status!=="approved" || !coach.is_visible || !courtBooking) {
    return redirectError(request,parsed.coach_profile_id,parsed.service_id,"unavailable");
  }

  const {data,error}=await admin.rpc("create_linked_coach_booking",{
    p_player_id:user.id,p_coach_id:parsed.coach_profile_id,p_service_id:parsed.service_id,
    p_court_booking_id:courtBooking.id,p_note:parsed.player_note ?? "",
  });
  if (error) {
    const code=error.message.includes("NOT_OWNED") ? "court_not_owned"
      : error.message.includes("TOO_SHORT") ? "court_too_short"
      : error.message.includes("SCHEDULE") ? "outside_schedule"
      : error.message.includes("CONFLICT") ? "slot_conflict"
      : "court_booking_unavailable";
    return redirectError(request,parsed.coach_profile_id,parsed.service_id,code);
  }

  const bookingId=typeof data==="object" && data && !Array.isArray(data) && typeof data.id==="string" ? data.id : null;
  await dispatchNotification({
    tenantId:courtBooking.tenant_id,recipientId:coach.profile_id,recipientType:"member",type:"booking",
    title:"มีคำขอสอนใหม่",body:`มีผู้เรียนส่งคำขอจองโค้ช ${coach.display_name} โดยผูกกับคอร์ท #${courtBooking.booking_code}`,
    referenceId:bookingId??undefined,referenceType:"coach_booking",
  });
  await logAudit({tenantId:courtBooking.tenant_id,actorId:user.id,actorRole:"member",action:"request_coach",
    module:"coach_booking",referenceId:bookingId??undefined,after:{court_booking_id:courtBooking.id,coach_profile_id:coach.id,service_id:service.id}});
  return NextResponse.redirect(new URL("/me/bookings?tab=coach&success=requested",request.url),303);
}
