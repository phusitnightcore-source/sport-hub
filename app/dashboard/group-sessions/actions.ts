"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { calculateMMRChange, SKILL_LEVEL_MAP } from "@/lib/badminton/rank";

// 1. Create a new group session
export async function createGroupSession(formData: FormData) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const title = formData.get("title")?.toString().trim();
  const sessionDate = formData.get("sessionDate")?.toString();
  const startTime = formData.get("startTime")?.toString();
  const endTime = formData.get("endTime")?.toString();
  const shuttlecockBrand = formData.get("shuttlecockBrand")?.toString().trim() || "RSL Classic";
  const shuttlecockPrice = Number(formData.get("shuttlecockPrice")) || 35;
  const entryFee = Number(formData.get("entryFee")) || 0;
  const courtNamesStr = formData.get("courtNames")?.toString().trim() || "คอร์ท 1, คอร์ท 2";
  const branchId = formData.get("branchId")?.toString() || null;

  if (!title || !sessionDate || !startTime || !endTime) {
    return { success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  const courtNames = courtNamesStr.split(",").map((c) => c.trim()).filter(Boolean);

  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("group_sessions")
    .insert({
      tenant_id: ctx.tenantId,
      branch_id: branchId,
      title,
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      shuttlecock_brand: shuttlecockBrand,
      shuttlecock_price: shuttlecockPrice,
      entry_fee: entryFee,
      court_names: courtNames,
      status: "open",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "create",
    module: "group_sessions",
    referenceId: session.id,
    after: session,
  });

  revalidatePath("/dashboard/group-sessions");
  return { success: true, sessionId: session.id };
}

// 2. Add player to session
export async function addPlayerToSession(
  sessionId: string,
  playerName: string,
  playerPhone?: string,
  skillLevel: string = "N"
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  const initialMMR = SKILL_LEVEL_MAP[skillLevel] ?? 1000;

  const { error } = await admin.from("group_session_players").insert({
    session_id: sessionId,
    player_name: playerName.trim(),
    player_phone: playerPhone?.trim() || null,
    skill_level: skillLevel,
    mmr: initialMMR,
    is_guest: true,
    is_checked_in: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/group-sessions/${sessionId}`);
  return { success: true };
}

// 3. Create a match
export async function createSessionMatch(
  sessionId: string,
  courtName: string,
  teamAPlayerIds: string[],
  teamBPlayerIds: string[]
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();

  // Get current match count
  const { count } = await admin
    .from("group_session_matches")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const matchNumber = (count ?? 0) + 1;

  // Insert match
  const { data: match, error: mErr } = await admin
    .from("group_session_matches")
    .insert({
      session_id: sessionId,
      court_name: courtName,
      match_number: matchNumber,
      status: "playing",
      started_at: new Date().toISOString(),
      shuttlecock_count: 1,
    })
    .select()
    .single();

  if (mErr || !match) return { success: false, error: mErr?.message || "สร้างแมตช์ไม่สำเร็จ" };

  // Insert match players
  const playerInserts = [
    ...teamAPlayerIds.map((pid) => ({
      match_id: match.id,
      session_player_id: pid,
      team: "A" as const,
    })),
    ...teamBPlayerIds.map((pid) => ({
      match_id: match.id,
      session_player_id: pid,
      team: "B" as const,
    })),
  ];

  const { error: pErr } = await admin
    .from("group_session_match_players")
    .insert(playerInserts);

  if (pErr) return { success: false, error: pErr.message };

  revalidatePath(`/dashboard/group-sessions/${sessionId}`);
  return { success: true, matchId: match.id };
}

// 4. Update shuttlecock count for a match
export async function updateMatchShuttlecock(matchId: string, delta: number) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("group_session_matches")
    .select("id, shuttlecock_count, session_id")
    .eq("id", matchId)
    .single();

  if (!match) return { success: false, error: "ไม่พบแมตช์" };

  const newCount = Math.max(1, match.shuttlecock_count + delta);
  await admin
    .from("group_session_matches")
    .update({ shuttlecock_count: newCount })
    .eq("id", matchId);

  revalidatePath(`/dashboard/group-sessions/${match.session_id}`);
  return { success: true, count: newCount };
}

// 5. Submit match result and finish
export async function finishSessionMatch(
  matchId: string,
  teamAScore: number,
  teamBScore: number
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("group_session_matches")
    .select("id, session_id")
    .eq("id", matchId)
    .single();

  if (!match) return { success: false, error: "ไม่พบแมตช์" };

  // Fetch match players
  const { data: matchPlayers } = await admin
    .from("group_session_match_players")
    .select("session_player_id, team, group_session_players(id, mmr, games_played)")
    .eq("match_id", matchId);

  // Update match
  await admin
    .from("group_session_matches")
    .update({
      status: "finished",
      team_a_score: teamAScore,
      team_b_score: teamBScore,
      completed_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  // Increment games_played for each participant
  if (matchPlayers) {
    for (const mp of matchPlayers) {
      const p = (mp as any).group_session_players;
      if (p) {
        await admin
          .from("group_session_players")
          .update({ games_played: (p.games_played ?? 0) + 1 })
          .eq("id", p.id);
      }
    }
  }

  revalidatePath(`/dashboard/group-sessions/${match.session_id}`);
  return { success: true };
}

// 6. Update player payment status
export async function updatePlayerPayment(
  playerId: string,
  sessionId: string,
  paymentStatus: "pending" | "paid",
  paymentMethod?: "cash" | "transfer"
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  await admin
    .from("group_session_players")
    .update({
      payment_status: paymentStatus,
      payment_method: paymentMethod || null,
    })
    .eq("id", playerId);

  revalidatePath(`/dashboard/group-sessions/${sessionId}`);
  revalidatePath(`/queue-master/${sessionId}`);
  revalidatePath(`/queue/${sessionId}`);
  return { success: true };
}

// 7. Player self-join group session (for registered users)
export async function joinGroupSession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนเข้าร่วมก๊วน" };

  const admin = createAdminClient();

  // Check if session exists and is open
  const { data: session } = await admin
    .from("group_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.status === "completed" || session.status === "cancelled") {
    return { success: false, error: "รอบก๊วนนี้ปิดรับสมัครแล้ว" };
  }

  // Check if already joined
  const { data: existing } = await admin
    .from("group_session_players")
    .select("id")
    .eq("session_id", sessionId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "คุณได้ลงทะเบียนเข้าร่วมก๊วนนี้แล้ว" };
  }

  // Fetch profile
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  const playerName = profile?.full_name || profile?.email?.split("@")[0] || "ผู้เล่น";
  const playerPhone = profile?.phone || null;

  const { error } = await admin.from("group_session_players").insert({
    session_id: sessionId,
    profile_id: user.id,
    player_name: playerName,
    player_phone: playerPhone,
    skill_level: "N",
    mmr: 1000,
    is_guest: false,
    is_checked_in: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/queue/${sessionId}`);
  revalidatePath(`/queue-master/${sessionId}`);
  revalidatePath(`/dashboard/group-sessions/${sessionId}`);
  revalidatePath(`/groups`);
  return { success: true };
}

// 8. Player leave group session
export async function leaveGroupSession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const admin = createAdminClient();

  const { data: player } = await admin
    .from("group_session_players")
    .select("id, games_played")
    .eq("session_id", sessionId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!player) return { success: false, error: "ไม่พบข้อมูลการเข้าร่วม" };
  if (player.games_played > 0) {
    return { success: false, error: "คุณได้ลงเล่นไปแล้ว ไม่สามารถยกเลิกได้ กรุณาติดต่อผู้จัดก๊วน" };
  }

  await admin.from("group_session_players").delete().eq("id", player.id);

  revalidatePath(`/queue/${sessionId}`);
  revalidatePath(`/queue-master/${sessionId}`);
  revalidatePath(`/dashboard/group-sessions/${sessionId}`);
  revalidatePath(`/groups`);
  return { success: true };
}

// 9. Search existing system profiles (for Staff)
export async function searchSystemProfiles(query: string) {
  const ctx = await getStaffContext();
  if (!ctx) return [];

  const admin = createAdminClient();
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, role")
    .or(`full_name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%`)
    .limit(10);

  return data ?? [];
}

// 10. Add existing profile to session (for Staff)
export async function addExistingProfileToSession(
  sessionId: string,
  profileId: string,
  skillLevel: string = "N"
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();

  // Check if already in session
  const { data: existing } = await admin
    .from("group_session_players")
    .select("id")
    .eq("session_id", sessionId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing) return { success: false, error: "ผู้เล่นนี้อยู่ในก๊วนแล้ว" };

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", profileId)
    .single();

  if (!profile) return { success: false, error: "ไม่พบข้อมูลผู้ใช้งาน" };

  const playerName = profile.full_name || profile.email?.split("@")[0] || "สมาชิก";
  const initialMMR = SKILL_LEVEL_MAP[skillLevel] ?? 1000;

  const { error } = await admin.from("group_session_players").insert({
    session_id: sessionId,
    profile_id: profileId,
    player_name: playerName,
    player_phone: profile.phone || null,
    skill_level: skillLevel,
    mmr: initialMMR,
    is_guest: false,
    is_checked_in: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/group-sessions/${sessionId}`);
  revalidatePath(`/queue-master/${sessionId}`);
  return { success: true };
}

// 11. Toggle check-in status
export async function togglePlayerCheckin(
  playerId: string,
  sessionId: string,
  isCheckedIn: boolean
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  await admin
    .from("group_session_players")
    .update({ is_checked_in: isCheckedIn })
    .eq("id", playerId);

  revalidatePath(`/dashboard/group-sessions/${sessionId}`);
  revalidatePath(`/queue-master/${sessionId}`);
  return { success: true };
}

// 12. Remove player from session (for Staff)
export async function removePlayerFromSession(playerId: string, sessionId: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  await admin.from("group_session_players").delete().eq("id", playerId);

  revalidatePath(`/dashboard/group-sessions/${sessionId}`);
  revalidatePath(`/queue-master/${sessionId}`);
  return { success: true };
}
