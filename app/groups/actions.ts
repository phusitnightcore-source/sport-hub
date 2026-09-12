"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

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
  await admin.from("group_members").insert({
    group_id: newGroup.id,
    profile_id: user.id,
    is_creator: true,
  });

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

  const admin = createAdminClient();

  // Check if group exists and has capacity
  const { data: group, error: groupErr } = await admin
    .from("groups")
    .select("id, current_players, max_players, status")
    .eq("id", groupId)
    .single();

  if (groupErr || !group) {
    return { success: false, error: "ไม่พบก๊วนที่ระบุ" };
  }

  if (group.status !== "open" || group.current_players >= group.max_players) {
    return { success: false, error: "ก๊วนนี้เต็มแล้ว" };
  }

  // Check if already joined
  const { data: existing } = await admin
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "คุณเข้าร่วมก๊วนนี้อยู่แล้ว" };
  }

  // Insert membership
  const { error: joinErr } = await admin.from("group_members").insert({
    group_id: groupId,
    profile_id: user.id,
    is_creator: false,
  });

  if (joinErr) {
    console.error("Join group error:", joinErr);
    return { success: false, error: "เข้าร่วมก๊วนไม่สำเร็จ กรุณาลองใหม่" };
  }

  // Update count and status
  const nextCount = group.current_players + 1;
  await admin
    .from("groups")
    .update({
      current_players: nextCount,
      status: nextCount >= group.max_players ? "full" : "open",
    })
    .eq("id", groupId);

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

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("group_members")
    .select("id, is_creator")
    .eq("group_id", groupId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!member) {
    return { success: false, error: "คุณไม่ได้อยู่ในก๊วนนี้" };
  }

  if (member.is_creator) {
    return { success: false, error: "ผู้สร้างก๊วนไม่สามารถออกจากก๊วนได้" };
  }

  await admin.from("group_members").delete().eq("id", member.id);

  const { data: group } = await admin
    .from("groups")
    .select("current_players, max_players")
    .eq("id", groupId)
    .single();

  if (group) {
    const nextCount = Math.max(1, group.current_players - 1);
    await admin
      .from("groups")
      .update({
        current_players: nextCount,
        status: "open",
      })
      .eq("id", groupId);
  }

  revalidatePath("/groups");
  revalidatePath("/me");
  return { success: true };
}
