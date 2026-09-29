"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ApplyCoachState = {
  success?: boolean;
  error?: string;
};

export async function submitCoachApplication(
  prevState: ApplyCoachState,
  formData: FormData
): Promise<ApplyCoachState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "กรุณาเข้าสู่ระบบก่อนสมัครเป็นโค้ช" };
  }

  const displayName = formData.get("displayName")?.toString().trim();
  const sport = formData.get("sport")?.toString().trim();
  const skillLevel = formData.get("skillLevel")?.toString().trim();
  const experienceYears = Number(formData.get("experienceYears")) || 1;
  const locationProvince = formData.get("locationProvince")?.toString().trim();
  const biography = formData.get("biography")?.toString().trim();
  const profileImageUrl = formData.get("profileImageUrl")?.toString().trim() || null;

  if (!displayName || !sport || !locationProvince || !biography) {
    return { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" };
  }

  const admin = createAdminClient();

  // Check if profile already exists
  const { data: existing } = await admin
    .from("coach_profiles")
    .select("id, approval_status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    // Update existing application
    const { error: updateErr } = await admin
      .from("coach_profiles")
      .update({
        display_name: displayName,
        sport,
        skill_level: skillLevel || null,
        experience_years: experienceYears,
        location_province: locationProvince,
        biography,
        profile_image_url: profileImageUrl,
        approval_status: "pending",
        is_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateErr) {
      return { error: "ไม่สามารถบันทึกข้อมูลได้: " + updateErr.message };
    }
  } else {
    // Insert new application
    const { error: insertErr } = await admin.from("coach_profiles").insert({
      profile_id: user.id,
      display_name: displayName,
      sport,
      skill_level: skillLevel || null,
      experience_years: experienceYears,
      location_province: locationProvince,
      biography,
      profile_image_url: profileImageUrl,
      approval_status: "pending",
      is_visible: false,
    });

    if (insertErr) {
      return { error: "ไม่สามารถส่งใบสมัครได้: " + insertErr.message };
    }

    // Add coach role to user_roles
    await admin.from("user_roles").upsert(
      {
        profile_id: user.id,
        role: "coach",
        is_active: true,
      },
      { onConflict: "profile_id,role" }
    );
  }

  revalidatePath("/me/coach");
  revalidatePath("/coaches");
  return { success: true };
}
