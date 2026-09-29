"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const registerSchema = z.object({
  tournament_id: z.string().uuid(),
  team_name: z.string().trim().min(2, "ชื่อทีมต้องมีอย่างน้อย 2 ตัวอักษร").max(50),
  category_id: z.string().uuid().optional(),
  partner_name: z.string().trim().max(50).optional(),
  contact_phone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง").optional(),
});

export async function registerTournamentAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนลงทะเบียนแข่งขัน" };
  }

  const raw = {
    tournament_id: formData.get("tournament_id"),
    team_name: formData.get("team_name"),
    category_id: formData.get("category_id") || undefined,
    partner_name: formData.get("partner_name") || undefined,
    contact_phone: formData.get("contact_phone") || undefined,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const admin = createAdminClient();
  const data = parsed.data;

  // Verify tournament is open for registration
  const { data: tournament, error: tErr } = await (admin as any)
    .from("tournaments")
    .select("id, status, max_teams, entry_fee, registration_deadline, require_video_proof, skill_verification_mode")
    .eq("id", data.tournament_id)
    .single();

  if (tErr || !tournament) {
    return { success: false, error: "ไม่พบข้อมูลทัวร์นาเมนต์" };
  }

  if (tournament.status !== "registration_open") {
    return { success: false, error: "ทัวร์นาเมนต์นี้ไม่ได้อยู่ในช่วงเปิดรับสมัคร" };
  }

  if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
    return { success: false, error: "หมดเวลารับสมัครรายการนี้แล้ว" };
  }

  const { count: registrationCount } = await (admin as any)
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", data.tournament_id);
  if (tournament.max_teams && (registrationCount ?? 0) >= tournament.max_teams) {
    return { success: false, error: "รายการนี้เต็มแล้ว" };
  }

  const videoUrl = (formData.get("video_url") as string)?.trim() || null;
  const partnerVideoUrl = (formData.get("partner_video_url") as string)?.trim() || null;
  if (tournament.skill_verification_mode === "skill_level" && tournament.require_video_proof && !videoUrl) {
    return { success: false, error: "รายการนี้ต้องแนบลิงก์คลิปเพื่อตรวจระดับมือ" };
  }

  const slip = formData.get("payment_slip");
  const hasPaidEntry = Number(tournament.entry_fee) > 0;
  if (hasPaidEntry && (!(slip instanceof File) || slip.size === 0)) {
    return { success: false, error: "กรุณาแนบสลิปชำระค่าสมัคร" };
  }
  if (slip instanceof File && slip.size > 10 * 1024 * 1024) {
    return { success: false, error: "ไฟล์สลิปต้องมีขนาดไม่เกิน 10 MB" };
  }
  if (slip instanceof File && slip.size > 0 && !["image/jpeg", "image/png", "image/webp"].includes(slip.type)) {
    return { success: false, error: "รองรับสลิป JPG, PNG หรือ WebP เท่านั้น" };
  }

  let slipPath: string | null = null;
  if (slip instanceof File && slip.size > 0) {
    const extension = slip.type === "image/png" ? "png" : slip.type === "image/webp" ? "webp" : "jpg";
    slipPath = `tournament/${data.tournament_id}/${user.id}-${Date.now()}.${extension}`;
    const { error: uploadError } = await (admin as any).storage
      .from("slips")
      .upload(slipPath, Buffer.from(await slip.arrayBuffer()), { contentType: slip.type, upsert: false });
    if (uploadError) return { success: false, error: "อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่" };
  }

  // Check if player already registered in this tournament
  const { data: existingReg } = await admin
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", data.tournament_id)
    .eq("player_id", user.id)
    .maybeSingle();

  if (existingReg) {
    return { success: false, error: "คุณได้ลงทะเบียนแข่งขันในรายการนี้แล้ว" };
  }

  // 1. Create team with player1
  const { data: team, error: teamErr } = await (admin as any)
    .from("teams")
    .insert({
      tournament_id: data.tournament_id,
      category_id: data.category_id || null,
      name: data.team_name,
      player1_id: user.id,
    })
    .select("id")
    .single();

  if (teamErr || !team) {
    console.error("Create team error:", teamErr);
    return { success: false, error: "สร้างทีมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  // 2. Add captain to team_members
  await (admin as any).from("team_members").insert({
    team_id: team.id,
    profile_id: user.id,
    is_captain: true,
  });

  let partnerId: string | null = null;

  // 3. If partner name provided, link partner to team_members and teams.player2_id
  if (data.partner_name?.trim()) {
    const partnerName = data.partner_name.trim();
    const { data: existingPartner } = await (admin as any)
      .from("profiles")
      .select("id")
      .ilike("full_name", partnerName)
      .maybeSingle();

    partnerId = existingPartner?.id || null;
    // A partner can be named before they have a SportHub account.  Do not
    // fabricate a profile row, because profiles are tied to auth users.
    if (partnerId) {
      await (admin as any).from("team_members").insert({
        team_id: team.id,
        profile_id: partnerId,
        is_captain: false,
      });
      await (admin as any)
        .from("teams")
        .update({ player2_id: partnerId })
        .eq("id", team.id);
    }
  }

  // Determine verification status
  const requireVideo = (tournament as any).require_video_proof;
  const verificationMode = (tournament as any).skill_verification_mode;
  const initialVerification = (verificationMode === "skill_level" && requireVideo) ? "pending" : "auto_approved";

  // Fetch player MMR
  const { data: playerProfile } = await admin
    .from("profiles")
    .select("mmr")
    .eq("id", user.id)
    .maybeSingle();

  // 4. Create registration
  const { error: regErr } = await (admin as any)
    .from("tournament_registrations")
    .insert({
      tournament_id: data.tournament_id,
      category_id: data.category_id || null,
      team_id: team.id,
      player_id: user.id,
      payment_status: Number(tournament.entry_fee) === 0 ? "paid" : "pending",
      slip_image_url: slipPath,
      video_url: videoUrl,
      partner_video_url: partnerVideoUrl,
      partner_name: data.partner_name || null,
      partner_id: partnerId || null,
      rating_at_registration: playerProfile?.mmr || 1000,
      verification_status: initialVerification,
    });

  if (regErr) {
    console.error("Registration error:", regErr);
    // Registration can be rejected by the database when another person takes
    // the last place simultaneously; do not leave an orphan team behind.
    await (admin as any).from("teams").delete().eq("id", team.id);
    return { success: false, error: "ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath(`/tournaments/${data.tournament_id}`);
  revalidatePath("/tournaments");
  revalidatePath("/me");
  return {
    success: true,
    verificationStatus: initialVerification,
  };
}
