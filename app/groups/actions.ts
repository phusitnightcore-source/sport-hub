"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { getOrganizerAccessForUser } from "@/lib/organizer";

const createGroupSchema = z.object({
  title: z.string().trim().min(3, "ชื่อก๊วนต้องมีอย่างน้อย 3 ตัวอักษร").max(100),
  sport: z.string().trim().min(1, "กรุณาเลือกชนิดกีฬา"),
  description: z.string().trim().max(500).optional(),
  play_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "รูปแบบเวลาไม่ถูกต้อง"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "รูปแบบเวลาไม่ถูกต้อง"),
  max_players: z.coerce.number().min(2, "จำนวนผู้เล่นต้องอย่างน้อย 2 คน").max(100),
  skill_level: z.string().optional(),
  cost_per_person: z.coerce.number().min(0).optional(),
});

export async function createGroupAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนสร้างก๊วน" };
  }

  const raw = {
    title: formData.get("title"),
    sport: formData.get("sport"),
    description: formData.get("description") || undefined,
    play_date: formData.get("play_date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    max_players: formData.get("max_players"),
    skill_level: formData.get("skill_level") || undefined,
    cost_per_person: formData.get("cost_per_person") || 0,
  };

  const parsed = createGroupSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const admin = createAdminClient();
  const access = await getOrganizerAccessForUser(admin, user.id);
  if (!access?.canManageGroups) {
    return { success: false, error: "การสร้างก๊วนสำหรับเจ้าของสนามหรือสมาชิกแพ็กเกจผู้จัดก๊วนเท่านั้น" };
  }
  const data = parsed.data;

  // Insert group
  const { data: newGroup, error: groupErr } = await admin
    .from("groups")
    .insert({
      creator_id: user.id,
      title: data.title,
      sport: data.sport,
      description: data.description || null,
      play_date: data.play_date,
      start_time: data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time,
      end_time: data.end_time.length === 5 ? `${data.end_time}:00` : data.end_time,
      max_players: data.max_players,
      current_players: 1,
      skill_level: data.skill_level || "ทั่วไป",
      cost_per_person: data.cost_per_person || 0,
      status: "open",
    })
    .select("id")
    .single();

  if (groupErr || !newGroup) {
    console.error("Create group error:", groupErr);
    return { success: false, error: "สร้างก๊วนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  // Add creator to group_members
  const { error: creatorMemberError } = await admin.from("group_members").insert({
    group_id: newGroup.id,
    profile_id: user.id,
    is_creator: true,
  });
  if (creatorMemberError) {
    await admin.from("groups").delete().eq("id", newGroup.id).eq("creator_id", user.id);
    return { success: false, error: "เพิ่มผู้สร้างเข้าก๊วนไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/groups");
  revalidatePath("/me");
  return { success: true, groupId: newGroup.id };
}

export async function joinGroupAction(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนเข้าร่วมก๊วน" };
  }

  const id = z.string().uuid().safeParse(groupId);
  if (!id.success) return { success: false, error: "รหัสก๊วนไม่ถูกต้อง" };
  const admin = createAdminClient();
  const { error: joinErr } = await admin.rpc("join_community_group", {
    p_group_id: id.data,
    p_profile_id: user.id,
  });
  if (joinErr) {
    console.error("Join group error:", joinErr);
    const message = String(joinErr.message || "");
    if (message.includes("already joined")) return { success: false, error: "คุณเข้าร่วมก๊วนนี้อยู่แล้ว" };
    if (message.includes("full") || message.includes("not open")) return { success: false, error: "ก๊วนนี้ปิดรับสมาชิกหรือเต็มแล้ว" };
    return { success: false, error: "เข้าร่วมก๊วนไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/groups");
  revalidatePath("/me");
  return { success: true };
}

export async function leaveGroupAction(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบ" };
  }

  const id = z.string().uuid().safeParse(groupId);
  if (!id.success) return { success: false, error: "รหัสก๊วนไม่ถูกต้อง" };
  const admin = createAdminClient();
  const { error } = await admin.rpc("leave_community_group", {
    p_group_id: id.data,
    p_profile_id: user.id,
  });
  if (error) {
    console.error("Leave group error:", error);
    const message = String(error.message || "");
    if (message.includes("not a member")) return { success: false, error: "คุณไม่ได้อยู่ในก๊วนนี้" };
    if (message.includes("creator cannot leave")) return { success: false, error: "ผู้สร้างก๊วนไม่สามารถออกจากก๊วนได้" };
    return { success: false, error: "ออกจากก๊วนไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/groups");
  revalidatePath("/me");
  return { success: true };
}

export async function cancelGroupAction(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const id = z.string().uuid().safeParse(groupId);
  if (!id.success) return { success: false, error: "รหัสก๊วนไม่ถูกต้อง" };

  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id,creator_id,status")
    .eq("id", id.data)
    .maybeSingle();
  if (!group || group.creator_id !== user.id) {
    return { success: false, error: "คุณไม่มีสิทธิ์ปิดก๊วนนี้" };
  }
  if (!["open", "full"].includes(group.status)) {
    return { success: false, error: "ก๊วนนี้ปิดรับสมาชิกแล้ว" };
  }

  const { error } = await admin
    .from("groups")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("creator_id", user.id)
    .in("status", ["open", "full"]);
  if (error) return { success: false, error: "ปิดก๊วนไม่สำเร็จ กรุณาลองใหม่" };

  revalidatePath("/groups");
  revalidatePath("/me");
  return { success: true };
}
