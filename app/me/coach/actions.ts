"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const coachProfileSchema = z.object({
  display_name: z.string().trim().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร").max(100),
  sport: z.string().trim().min(1, "กรุณาระบุชนิดกีฬา"),
  biography: z.string().trim().max(1000).optional(),
  experience_years: z.coerce.number().int().min(0).max(60).default(1),
  cover_image_url: z.string().url().optional().or(z.literal("")),
});

export async function updateCoachProfileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const raw = {
    display_name: formData.get("display_name"),
    sport: formData.get("sport"),
    biography: formData.get("biography") || undefined,
    experience_years: formData.get("experience_years") || 1,
    cover_image_url: formData.get("cover_image_url") || undefined,
  };

  const parsed = coachProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const admin = createAdminClient();
  const data = parsed.data;

  // Check if profile exists
  const { data: existing } = await admin
    .from("coach_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    const {error}=await admin
      .from("coach_profiles")
      .update({
        display_name: data.display_name,
        sport: data.sport,
        biography: data.biography || null,
        experience_years: data.experience_years,
        cover_image_url: data.cover_image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if(error)return {success:false,error:"บันทึกโปรไฟล์ไม่สำเร็จ"};
  } else {
    const {error}=await admin.from("coach_profiles").insert({
      profile_id: user.id,
      display_name: data.display_name,
      sport: data.sport,
      biography: data.biography || null,
      experience_years: data.experience_years,
      cover_image_url: data.cover_image_url || null,
      approval_status: "pending",
      is_visible: false,
    });
    if(error)return {success:false,error:"สร้างโปรไฟล์ไม่สำเร็จ"};
  }

  revalidatePath("/me/coach");
  revalidatePath("/coaches");
  return { success: true };
}

export async function saveCoachScheduleAction(
  schedules: { day_of_week: number; start_time: string; end_time: string; is_available: boolean }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const parsed=z.array(z.object({day_of_week:z.number().int().min(0).max(6),start_time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),end_time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),is_available:z.boolean()})).max(28).safeParse(schedules);
  if(!parsed.success)return{success:false,error:"รูปแบบตารางเวลาไม่ถูกต้อง"};
  const toInsert = parsed.data
    .filter((s) => s.is_available)
    .map((s) => ({
      day_of_week: s.day_of_week,
      start_time: s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time,
      end_time: s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time,
    }));
  const{error}=await createAdminClient().rpc("replace_coach_schedule",{p_actor_id:user.id,p_schedules:toInsert});
  if(error)return{success:false,error:error.message.includes("CONFLICTS_BOOKING")?"ตารางใหม่ไม่ครอบคลุมนัดที่กำลังทำงานอยู่ กรุณาจัดการนัดก่อน":"บันทึกตารางเวลาไม่สำเร็จ"};

  revalidatePath("/me/coach/schedule");
  revalidatePath("/coaches/[id]","page");
  return { success: true };
}
