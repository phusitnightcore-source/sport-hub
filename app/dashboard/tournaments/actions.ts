"use server";

import { revalidatePath } from "next/cache";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const createTournamentSchema = z.object({
  name: z.string().trim().min(3, "ชื่อการแข่งขันต้องมีอย่างน้อย 3 ตัวอักษร").max(100),
  sport: z.string().trim().min(1, "กรุณาเลือกชนิดกีฬา"),
  branch_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง").optional(),
  entry_fee: z.coerce.number().min(0).default(0),
  max_teams: z.coerce.number().min(2).max(128).default(16),
  bracket_type: z.enum(["single_elimination", "double_elimination", "round_robin", "group_knockout"]).default("single_elimination"),
  format: z.enum(["knockout", "round_robin", "group_knockout", "double_elimination"]).default("knockout"),
  skill_verification_mode: z.enum(["open", "skill_level", "rating"]).default("skill_level"),
  require_video_proof: z.coerce.boolean().default(false),
  has_third_place_match: z.coerce.boolean().default(true),
  registration_deadline: z.string().optional(),
  check_in_time: z.string().optional(),
  start_time: z.string().optional(),
  rules: z.string().trim().max(2000).optional(),
  prize_info: z.string().trim().max(1000).optional(),
  categories: z.string().optional(), // Comma separated e.g. "ชายเดี่ยว, ชายคู่, ผสม"
});

export async function createTournamentAction(formData: FormData) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์ดำเนินการ กรุณาเข้าสู่ระบบ" };

  const raw = {
    name: formData.get("name"),
    sport: formData.get("sport"),
    branch_id: formData.get("branch_id") || undefined,
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date") || undefined,
    entry_fee: formData.get("entry_fee") || 0,
    max_teams: formData.get("max_teams") || 16,
    bracket_type: formData.get("bracket_type") || "single_elimination",
    format: formData.get("format") || "knockout",
    skill_verification_mode: formData.get("skill_verification_mode") || "skill_level",
    require_video_proof: formData.get("require_video_proof") === "true",
    has_third_place_match: formData.get("has_third_place_match") !== "false",
    registration_deadline: formData.get("registration_deadline") || undefined,
    check_in_time: formData.get("check_in_time") || undefined,
    start_time: formData.get("start_time") || undefined,
    rules: formData.get("rules") || undefined,
    prize_info: formData.get("prize_info") || undefined,
    categories: formData.get("categories") || undefined,
  };

  const parsed = createTournamentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const admin = createAdminClient();
  const data = parsed.data;

  const { data: tournament, error } = await (admin as any)
    .from("tournaments")
    .insert({
      tenant_id: ctx.tenantId,
      organizer_id: ctx.userId,
      branch_id: data.branch_id || null,
      name: data.name,
      sport: data.sport,
      start_date: data.start_date,
      end_date: data.end_date || null,
      entry_fee: data.entry_fee,
      max_teams: data.max_teams,
      bracket_type: data.bracket_type,
      format: data.format,
      skill_verification_mode: data.skill_verification_mode,
      require_video_proof: data.require_video_proof,
      has_third_place_match: data.has_third_place_match,
      registration_deadline: data.registration_deadline ? new Date(data.registration_deadline).toISOString() : null,
      check_in_time: data.check_in_time || null,
      start_time: data.start_time || null,
      rules: data.rules || null,
      prize_info: data.prize_info || null,
      status: "registration_open",
    })
    .select("id")
    .single();

  if (error || !tournament) {
    console.error("Create tournament error:", error);
    return { success: false, error: "สร้างการแข่งขันไม่สำเร็จ กรุณาลองใหม่" };
  }

  // Insert categories if provided
  if (data.categories) {
    const cats = data.categories
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (cats.length > 0) {
      await (admin as any).from("tournament_categories").insert(
        cats.map((catName) => ({
          tournament_id: tournament.id,
          name: catName,
          max_teams: Math.floor(data.max_teams / cats.length) || data.max_teams,
        }))
      );
    }
  }

  revalidatePath("/dashboard/tournaments");
  revalidatePath("/tournaments");
  return { success: true, id: tournament.id };
}

export async function updateTournamentStatusAction(tournamentId: string, status: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("tournaments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tournamentId)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    console.error("Update status error:", error);
    return { success: false, error: "อัปเดตสถานะไม่สำเร็จ" };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath("/dashboard/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
  return { success: true };
}

export async function addTeamAction(tournamentId: string, teamName: string, categoryId?: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  if (!teamName || teamName.trim().length < 2) {
    return { success: false, error: "กรุณาระบุชื่อทีมอย่างน้อย 2 ตัวอักษร" };
  }

  const admin = createAdminClient();
  const { error } = await (admin as any).from("teams").insert({
    tournament_id: tournamentId,
    category_id: categoryId || null,
    name: teamName.trim(),
  });

  if (error) {
    console.error("Add team error:", error);
    return { success: false, error: "เพิ่มทีมไม่สำเร็จ" };
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function generateBracketAction(tournamentId: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();

  // 1. Fetch tournament & teams
  const [{ data: tournament }, { data: teams }] = await Promise.all([
    (admin as any).from("tournaments").select("id, status").eq("id", tournamentId).single(),
    (admin as any).from("teams").select("id, name, seed").eq("tournament_id", tournamentId),
  ]);

  if (!tournament) return { success: false, error: "ไม่พบข้อมูลทัวร์นาเมนต์" };
  const teamList = (teams ?? []) as any[];

  if (teamList.length < 2) {
    return { success: false, error: "ต้องมีทีมสมัครอย่างน้อย 2 ทีมจึงจะจัดสายแข่งได้" };
  }

  // Delete existing matches for this tournament
  await (admin as any).from("matches").delete().eq("tournament_id", tournamentId);

  // Shuffle teams or sort by seed
  const shuffled = [...teamList].sort(() => Math.random() - 0.5);

  // Determine power of 2 for bracket size (2, 4, 8, 16, 32, 64)
  let bracketSize = 2;
  while (bracketSize < shuffled.length) {
    bracketSize *= 2;
  }
  const totalRounds = Math.log2(bracketSize);

  // Build tree from final (round N) down to round 1
  // Final match (Round = totalRounds, match_number = 1)
  const roundMatchesMap: Record<number, any[]> = {};

  for (let r = totalRounds; r >= 1; r--) {
    const matchesInRound = Math.pow(2, totalRounds - r);
    roundMatchesMap[r] = [];

    for (let m = 1; m <= matchesInRound; m++) {
      const matchObj: any = {
        tournament_id: tournamentId,
        round: r,
        match_number: m,
        status: "scheduled",
        next_match_id: null,
      };
      roundMatchesMap[r].push(matchObj);
    }
  }

  // Assign next_match_id links
  for (let r = 1; r < totalRounds; r++) {
    const currentMatches = roundMatchesMap[r];
    const nextRoundMatches = roundMatchesMap[r + 1];

    for (let i = 0; i < currentMatches.length; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      currentMatches[i].next_match_index = nextMatchIndex;
    }
  }

  // Insert matches starting from Final down to Round 1 so we have IDs to link
  const insertedMap: Record<string, string> = {}; // key: `round-matchNumber`, value: matchId

  for (let r = totalRounds; r >= 1; r--) {
    for (let m = 1; m <= roundMatchesMap[r].length; m++) {
      const item = roundMatchesMap[r][m - 1];
      let nextMatchId: string | null = null;

      if (r < totalRounds) {
        const nextMatchNum = Math.floor((m - 1) / 2) + 1;
        nextMatchId = insertedMap[`${r + 1}-${nextMatchNum}`] || null;
      }

      // Assign teams for Round 1
      let teamAId: string | null = null;
      let teamBId: string | null = null;

      if (r === 1) {
        const teamAIndex = (m - 1) * 2;
        const teamBIndex = teamAIndex + 1;
        teamAId = shuffled[teamAIndex]?.id || null;
        teamBId = shuffled[teamBIndex]?.id || null;
      }

      const { data: createdMatch } = await (admin as any)
        .from("matches")
        .insert({
          tournament_id: tournamentId,
          round: r,
          match_number: m,
          status: "scheduled",
          team_a_id: teamAId,
          team_b_id: teamBId,
          next_match_id: nextMatchId,
        })
        .select("id")
        .single();

      if (createdMatch) {
        insertedMap[`${r}-${m}`] = createdMatch.id;
      }
    }
  }

  // Update tournament status to in_progress
  await (admin as any)
    .from("tournaments")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", tournamentId);

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath("/dashboard/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");

  return { success: true };
}

export async function updateMatchScoreAction(
  matchId: string,
  scoreA: string,
  scoreB: string,
  winnerId: string,
  courtId?: string
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();

  // 1. Fetch match
  const { data: match, error: mErr } = await (admin as any)
    .from("matches")
    .select("id, tournament_id, round, next_match_id, team_a_id, team_b_id")
    .eq("id", matchId)
    .single();

  if (mErr || !match) {
    return { success: false, error: "ไม่พบแมตช์" };
  }

  // 2. Update current match
  await (admin as any)
    .from("matches")
    .update({
      score_a: scoreA,
      score_b: scoreB,
      winner_id: winnerId,
      court_id: courtId || null,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  // 3. Advance winner to next match if exists
  if (match.next_match_id) {
    const { data: nextMatch } = await (admin as any)
      .from("matches")
      .select("id, team_a_id, team_b_id")
      .eq("id", match.next_match_id)
      .single();

    if (nextMatch) {
      if (!nextMatch.team_a_id) {
        await (admin as any)
          .from("matches")
          .update({ team_a_id: winnerId })
          .eq("id", match.next_match_id);
      } else if (!nextMatch.team_b_id && nextMatch.team_a_id !== winnerId) {
        await (admin as any)
          .from("matches")
          .update({ team_b_id: winnerId })
          .eq("id", match.next_match_id);
      }
    }
  }

  // 4. Update player Elo rating stats
  const loserId = winnerId === match.team_a_id ? match.team_b_id : match.team_a_id;
  if (winnerId && loserId) {
    // Fetch members of winner team & loser team
    const [{ data: winMembers }, { data: loseMembers }] = await Promise.all([
      (admin as any).from("team_members").select("profile_id").eq("team_id", winnerId),
      (admin as any).from("team_members").select("profile_id").eq("team_id", loserId),
    ]);

    for (const wm of winMembers ?? []) {
      const { data: elo } = await (admin as any)
        .from("elo_ratings")
        .select("id, rating, wins, games_played")
        .eq("profile_id", wm.profile_id)
        .maybeSingle();

      if (elo) {
        await (admin as any)
          .from("elo_ratings")
          .update({
            rating: elo.rating + 25,
            wins: elo.wins + 1,
            games_played: elo.games_played + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", elo.id);
      }
    }

    for (const lm of loseMembers ?? []) {
      const { data: elo } = await (admin as any)
        .from("elo_ratings")
        .select("id, rating, losses, games_played")
        .eq("profile_id", lm.profile_id)
        .maybeSingle();

      if (elo) {
        await (admin as any)
          .from("elo_ratings")
          .update({
            rating: Math.max(800, elo.rating - 15),
            losses: elo.losses + 1,
            games_played: elo.games_played + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", elo.id);
      }
    }
  }

  revalidatePath(`/dashboard/tournaments/${match.tournament_id}`);
  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function verifyRegistrationAction(
  registrationId: string,
  status: "approved" | "rejected",
  notes?: string
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: reg, error } = await (admin as any)
    .from("tournament_registrations")
    .update({
      verification_status: status,
      verification_notes: notes || null,
      verified_by: ctx.userId,
      verified_at: new Date().toISOString(),
    })
    .eq("id", registrationId)
    .select("tournament_id")
    .single();

  if (error || !reg) {
    return { success: false, error: "อัปเดตการตรวจสอบไม่สำเร็จ" };
  }

  revalidatePath(`/dashboard/tournaments/${reg.tournament_id}`);
  revalidatePath(`/tournaments/${reg.tournament_id}`);
  return { success: true };
}

export async function checkInAthleteAction(registrationId: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: current } = await (admin as any)
    .from("tournament_registrations")
    .select("id, tournament_id, checkin_status")
    .eq("id", registrationId)
    .single();

  if (!current) return { success: false, error: "ไม่พบข้อมูลการลงทะเบียน" };

  const nextStatus = current.checkin_status === "checked_in" ? "not_checked_in" : "checked_in";
  await (admin as any)
    .from("tournament_registrations")
    .update({
      checkin_status: nextStatus,
      checked_in_at: nextStatus === "checked_in" ? new Date().toISOString() : null,
    })
    .eq("id", registrationId);

  revalidatePath(`/dashboard/tournaments/${current.tournament_id}`);
  return { success: true, checkin_status: nextStatus };
}

export async function generateTournamentDrawAction(
  tournamentId: string,
  mode: "seeded" | "random" | "group"
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();

  const [{ data: tournament }, { data: teams }] = await Promise.all([
    (admin as any).from("tournaments").select("id, has_third_place_match, format").eq("id", tournamentId).single(),
    (admin as any).from("teams").select("id, name, seed").eq("tournament_id", tournamentId),
  ]);

  if (!tournament) return { success: false, error: "ไม่พบข้อมูลการแข่งขัน" };
  const teamList = (teams ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    seed: mode === "seeded" ? t.seed : undefined,
  }));

  if (teamList.length < 2) {
    return { success: false, error: "ต้องมีทีมสมัครอย่างน้อย 2 ทีมจึงจะจัดสายได้" };
  }

  // Import generator functions
  const { generateSingleElimination, generateRoundRobin } = await import("@/lib/bracket/generator");

  // Clear existing matches
  await (admin as any).from("matches").delete().eq("tournament_id", tournamentId);

  let generatedMatches: any[] = [];
  if (mode === "group") {
    generatedMatches = generateRoundRobin(teamList);
  } else {
    generatedMatches = generateSingleElimination(teamList, {
      hasThirdPlaceMatch: tournament.has_third_place_match,
    });
  }

  const roundMap = new Map<string, string>();

  for (let r = 1; r <= Math.max(...generatedMatches.map((m) => m.round)); r++) {
    const roundMatches = generatedMatches.filter((m) => m.round === r);

    for (const m of roundMatches) {
      const { data: inserted } = await (admin as any)
        .from("matches")
        .insert({
          tournament_id: tournamentId,
          round: m.round,
          match_number: m.bracket_pos + 1,
          team_a_id: m.team_a_id,
          team_b_id: m.team_b_id,
          status: m.status === "completed" ? "completed" : "scheduled",
          match_type: m.match_type || "knockout",
          notes: m.notes || null,
        })
        .select("id")
        .single();

      if (inserted) {
        roundMap.set(`${m.round}_${m.bracket_pos}`, inserted.id);
      }
    }
  }

  // Link next_match_id
  for (const m of generatedMatches) {
    if (m.next_match_round && typeof m.next_match_pos === "number") {
      const currentId = roundMap.get(`${m.round}_${m.bracket_pos}`);
      const nextId = roundMap.get(`${m.next_match_round}_${m.next_match_pos}`);
      if (currentId && nextId) {
        await (admin as any)
          .from("matches")
          .update({ next_match_id: nextId })
          .eq("id", currentId);
      }
    }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true, count: generatedMatches.length };
}
