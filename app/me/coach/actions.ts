"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const coachProfileSchema = z.object({
  display_name: z.string().trim().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร").max(100),
  sport: z.string().trim().min(1, "กรุณาระบุชนิดกีฬา"),
  bio: z.string().trim().max(1000).optional(),
  years_experience: z.coerce.number().min(0).max(60).default(1),
  hourly_rate: z.coerce.number().min(0).default(500),
  phone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง").optional().or(z.literal("")),
  cover_image_url: z.string().url().optional().or(z.literal("")),
});

export async function updateCoachProfileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const raw = {
    display_name: formData.get("display_name"),
    sport: formData.get("sport"),
    bio: formData.get("bio") || undefined,
    years_experience: formData.get("years_experience") || 1,
    hourly_rate: formData.get("hourly_rate") || 500,
    phone: formData.get("phone") || undefined,
    cover_image_url: formData.get("cover_image_url") || undefined,
  };

  const parsed = coachProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const admin = createAdminClient();
  const data = parsed.data;

  // Check if profile exists
  const { data: existing } = await (admin as any)
    .from("coach_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    await (admin as any)
      .from("coach_profiles")
      .update({
        display_name: data.display_name,
        sport: data.sport,
        bio: data.bio || null,
        years_experience: data.years_experience,
        hourly_rate: data.hourly_rate,
        phone: data.phone || null,
        cover_image_url: data.cover_image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await (admin as any).from("coach_profiles").insert({
      profile_id: user.id,
      display_name: data.display_name,
      sport: data.sport,
      bio: data.bio || null,
      years_experience: data.years_experience,
      hourly_rate: data.hourly_rate,
      phone: data.phone || null,
      cover_image_url: data.cover_image_url || null,
      approval_status: "approved",
    });
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

  const admin = createAdminClient();

  const { data: coach } = await (admin as any)
    .from("coach_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!coach) return { success: false, error: "ไม่พบโปรไฟล์โค้ช" };

  // Delete existing schedules for this coach
  await (admin as any).from("coach_schedules").delete().eq("coach_profile_id", coach.id);

  // Insert new active schedules
  const toInsert = schedules
    .filter((s) => s.is_available)
    .map((s) => ({
      coach_profile_id: coach.id,
      day_of_week: s.day_of_week,
      start_time: s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time,
      end_time: s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time,
      is_available: true,
    }));

  if (toInsert.length > 0) {
    const { error } = await (admin as any).from("coach_schedules").insert(toInsert);
    if (error) {
      console.error("Save schedule error:", error);
      return { success: false, error: "บันทึกตารางเวลาไม่สำเร็จ" };
    }
  }

  revalidatePath("/me/coach/schedule");
  revalidatePath(`/coaches/${coach.id}`);
  return { success: true };
}
