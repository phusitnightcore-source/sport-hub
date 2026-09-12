"use server";

import { revalidatePath } from "next/cache";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import type { GeneratedMatch } from "@/lib/bracket/generator";

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

async function canManageTournament(admin: ReturnType<typeof createAdminClient>, tournamentId: string, tenantId: string) {
  const { data } = await (admin as any)
    .from("tournaments")
    .select("id")
    .eq("id", tournamentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return Boolean(data);
}

function inferBadmintonEventType(name: string): "MS" | "WS" | "MD" | "WD" | "XD" {
  const value = name.toLowerCase();
  if (value.includes("หญิงเดี่ยว") || value.includes("women's singles") || value.includes("ws")) return "WS";
  if (value.includes("ชายคู่") || value.includes("men's doubles") || value.includes("md")) return "MD";
  if (value.includes("หญิงคู่") || value.includes("women's doubles") || value.includes("wd")) return "WD";
  if (value.includes("คู่ผสม") || value.includes("mixed") || value.includes("xd")) return "XD";
  return "MS";
}

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
      const { data: categories } = await (admin as any).from("tournament_categories").insert(
        cats.map((catName) => ({
          tournament_id: tournament.id,
          name: catName,
          max_teams: Math.floor(data.max_teams / cats.length) || data.max_teams,
        }))
      ).select("id, name");

      if (categories?.length) {
        await (admin as any).from("tournament_events").insert(
          categories.map((category: { id: string; name: string }) => ({
            tournament_id: tournament.id,
            category_id: category.id,
            name: category.name,
            event_type: inferBadmintonEventType(category.name),
            format: data.format === "round_robin" ? "round_robin" : data.format === "group_knockout" ? "group_knockout" : "single_elim",
          }))
        );
      }
    }
  }

  revalidatePath("/dashboard/tournaments");
  revalidatePath("/tournaments");
  return { success: true, id: tournament.id };
}

export async function updateTournamentStatusAction(tournamentId: string, status: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const allowedStatuses = ["registration_open", "registration_closed", "in_progress", "completed"];
  if (!allowedStatuses.includes(status)) return { success: false, error: "สถานะการแข่งขันไม่ถูกต้อง" };

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
  if (!await canManageTournament(admin, tournamentId, ctx.tenantId)) {
    return { success: false, error: "ไม่มีสิทธิ์เพิ่มทีมในรายการนี้" };
  }
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
    (admin as any).from("tournaments").select("id, status").eq("id", tournamentId).eq("tenant_id", ctx.tenantId).single(),
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
    .select("id, tournament_id, round, status, team_a_id, team_b_id")
    .eq("id", matchId)
    .single();

  if (mErr || !match) {
    return { success: false, error: "ไม่พบแมตช์" };
  }

  const { data: tournament } = await (admin as any)
    .from("tournaments")
    .select("id")
    .eq("id", match.tournament_id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!tournament) return { success: false, error: "ไม่มีสิทธิ์บันทึกผลแมตช์นี้" };
  if (!match.team_a_id || !match.team_b_id) {
    return { success: false, error: "รอให้ทั้งสองทีมเข้าคู่ก่อนจึงจะบันทึกผลได้" };
  }
  if (match.status === "completed") {
    return { success: false, error: "แมตช์นี้บันทึกผลแล้ว ใช้หน้ากรรมการเมื่อต้องการแก้ไข" };
  }
  if (![match.team_a_id, match.team_b_id].includes(winnerId)) {
    return { success: false, error: "ผู้ชนะต้องเป็นหนึ่งในสองทีมของแมตช์นี้" };
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

  // The database trigger advances winners (and semifinal losers) using the
  // explicit bracket slot. This avoids overwriting the wrong side of a match.

  // 3. Update player Elo rating stats
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
  const { data: existing } = await (admin as any)
    .from("tournament_registrations")
    .select("tournament_id")
    .eq("id", registrationId)
    .maybeSingle();
  if (!existing || !await canManageTournament(admin, existing.tournament_id, ctx.tenantId)) {
    return { success: false, error: "ไม่มีสิทธิ์ตรวจสอบผู้สมัครรายนี้" };
  }

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

export async function verifyTournamentPaymentAction(
  registrationId: string,
  approved: boolean,
  notes?: string
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: registration } = await (admin as any)
    .from("tournament_registrations")
    .select("tournament_id, slip_image_url")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration || !await canManageTournament(admin, registration.tournament_id, ctx.tenantId)) {
    return { success: false, error: "ไม่มีสิทธิ์ตรวจสอบการชำระเงินนี้" };
  }
  if (approved && !registration.slip_image_url) {
    return { success: false, error: "ไม่พบสลิปค่าสมัคร" };
  }

  const { error } = await (admin as any)
    .from("tournament_registrations")
    .update({
      payment_status: approved ? "paid" : "pending",
      payment_notes: notes?.trim() || null,
      payment_verified_by: ctx.userId,
      payment_verified_at: new Date().toISOString(),
    })
    .eq("id", registrationId);
  if (error) return { success: false, error: "อัปเดตสถานะชำระเงินไม่สำเร็จ" };

  revalidatePath(`/dashboard/tournaments/${registration.tournament_id}`);
  revalidatePath(`/tournaments/${registration.tournament_id}`);
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
  if (!await canManageTournament(admin, current.tournament_id, ctx.tenantId)) {
    return { success: false, error: "ไม่มีสิทธิ์เช็กอินผู้สมัครรายนี้" };
  }

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

  const [{ data: tournament }, { data: teams }, { data: categories }, { data: events }, { data: existingMatches }] = await Promise.all([
    (admin as any)
      .from("tournaments")
      .select("id, has_third_place_match, format, status")
      .eq("id", tournamentId)
      .eq("tenant_id", ctx.tenantId)
      .single(),
    (admin as any).from("teams").select("id, name, seed, category_id").eq("tournament_id", tournamentId),
    (admin as any).from("tournament_categories").select("id, name").eq("tournament_id", tournamentId),
    (admin as any).from("tournament_events").select("id, category_id").eq("tournament_id", tournamentId),
    (admin as any).from("matches").select("id, status").eq("tournament_id", tournamentId),
  ]);

  if (!tournament) return { success: false, error: "ไม่พบข้อมูลการแข่งขัน" };
  if ((existingMatches ?? []).some((match: any) => match.status === "completed")) {
    return { success: false, error: "มีผลการแข่งขันแล้ว จึงไม่สามารถสร้างสายทับได้" };
  }
  if (tournament.status === "completed") {
    return { success: false, error: "รายการนี้จบการแข่งขันแล้ว" };
  }
  const teamRecords = (teams ?? []) as { id: string; name: string; seed: number | null; category_id: string | null }[];
  if (teamRecords.length < 2) {
    return { success: false, error: "ต้องมีทีมสมัครอย่างน้อย 2 ทีมจึงจะจัดสายได้" };
  }

  // Import generator functions
  const { generateSingleElimination, generateRoundRobin, generateDoubleElimination } = await import("@/lib/bracket/generator");

  const eventByCategory = new Map((events ?? []).map((event: { id: string; category_id: string | null }) => [event.category_id, event.id]));
  const categoriesToDraw = (categories?.length
    ? categories.map((category: { id: string; name: string }) => ({ id: category.id, name: category.name }))
    : [{ id: null, name: "ประเภททั่วไป" }]
  ).map((category: { id: string | null; name: string }) => ({
    ...category,
    teams: teamRecords.filter((team) => team.category_id === category.id),
  })).filter((category: { teams: unknown[] }) => category.teams.length >= 2);

  if (!categoriesToDraw.length) {
    return { success: false, error: "แต่ละประเภทต้องมีอย่างน้อย 2 ทีมจึงจะจัดสายได้" };
  }

  const drawSets: { id: string | null; name: string; eventId: string | null; teams: typeof teamRecords; matches: GeneratedMatch[] }[] = categoriesToDraw.map((category: { id: string | null; name: string; teams: typeof teamRecords }) => {
    const teamList = category.teams.map((team) => ({
      id: team.id,
      name: team.name,
      seed: mode === "seeded" ? team.seed : undefined,
    }));
    const matches = mode === "group" || tournament.format === "round_robin"
      ? generateRoundRobin(teamList)
      : tournament.format === "double_elimination"
      ? generateDoubleElimination(teamList)
      : generateSingleElimination(teamList, { hasThirdPlaceMatch: tournament.has_third_place_match });
    return { ...category, eventId: eventByCategory.get(category.id) ?? null, matches };
  });
  const generatedMatches = drawSets.flatMap((drawSet) => drawSet.matches);

  if (generatedMatches.length === 0) {
    return { success: false, error: "ไม่สามารถสร้างสายแข่งขันจากรายชื่อปัจจุบันได้" };
  }

  // A redraw is allowed only before any result is recorded.
  const { error: clearError } = await (admin as any).from("matches").delete().eq("tournament_id", tournamentId);
  if (clearError) return { success: false, error: "ล้างสายเดิมไม่สำเร็จ กรุณาลองใหม่" };

  if (tournament.format === "group_knockout" && mode === "group") {
    for (const drawSet of drawSets) {
      if (!drawSet.eventId) {
        return { success: false, error: `ไม่พบ Event ของ ${drawSet.name}; กรุณาบันทึกรายการใหม่อีกครั้ง` };
      }
      await (admin as any).from("tournament_event_groups").delete().eq("event_id", drawSet.eventId);
      const groupCount = drawSet.teams.length >= 16 ? 4 : 2;
      const { data: groups, error: groupError } = await (admin as any)
        .from("tournament_event_groups")
        .insert(Array.from({ length: groupCount }, (_, index) => ({ event_id: drawSet.eventId, name: `กลุ่ม ${String.fromCharCode(65 + index)}`, sort_order: index })))
        .select("id, name");
      if (groupError || !groups?.length) return { success: false, error: "สร้างกลุ่มแข่งขันไม่สำเร็จ" };

      const orderedTeams = [...drawSet.teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
      const groupTeams = groups.map((group: { id: string; name: string }) => ({ ...group, teams: [] as typeof orderedTeams }));
      orderedTeams.forEach((team, index) => groupTeams[index % groupTeams.length].teams.push(team));
      drawSet.matches = [];
      for (const group of groupTeams) {
        await (admin as any).from("teams").update({ event_id: drawSet.eventId, group_id: group.id }).in("id", group.teams.map((team: { id: string }) => team.id));
        drawSet.matches.push(...generateRoundRobin(group.teams.map((team: { id: string; name: string; seed: number | null }) => ({ id: team.id, name: team.name, seed: team.seed })), group.id));
      }
    }
  }

  const roundMap = new Map<string, string>();

  for (const drawSet of drawSets) {
    for (const m of drawSet.matches) {
      const { data: inserted } = await (admin as any)
        .from("matches")
        .insert({
          tournament_id: tournamentId,
          category_id: drawSet.id,
          event_id: drawSet.eventId,
          round: m.round,
          match_number: m.bracket_pos + 1,
          team_a_id: m.team_a_id,
          team_b_id: m.team_b_id,
          status: m.status === "completed" ? "completed" : "scheduled",
          winner_id: m.status === "completed" ? (m.team_a_id || m.team_b_id) : null,
          stage: m.stage || "knockout",
          match_type: m.match_type || "knockout",
          group_id: m.group_id || null,
          notes: m.notes || null,
        })
        .select("id")
        .single();

      if (inserted) {
        roundMap.set(`${drawSet.id ?? "general"}_${m.round}_${m.bracket_pos}`, inserted.id);
      }
    }
  }

  // Persist every route, including its exact destination slot and the losers
  // of semifinals going to the bronze match.
  for (const drawSet of drawSets) {
    for (const m of drawSet.matches) {
      const key = drawSet.id ?? "general";
      if (m.next_match_round && typeof m.next_match_pos === "number") {
      const currentId = roundMap.get(`${key}_${m.round}_${m.bracket_pos}`);
      const nextId = roundMap.get(`${key}_${m.next_match_round}_${m.next_match_pos}`);
      if (currentId && nextId) {
        await (admin as any)
          .from("matches")
          .update({ next_match_id: nextId, next_match_slot: m.next_match_slot || 1 })
          .eq("id", currentId);
      }
      }

      if (m.loser_next_match_round && typeof m.loser_next_match_pos === "number") {
      const currentId = roundMap.get(`${key}_${m.round}_${m.bracket_pos}`);
      const loserNextId = roundMap.get(`${key}_${m.loser_next_match_round}_${m.loser_next_match_pos}`);
      if (currentId && loserNextId) {
        await (admin as any)
          .from("matches")
          .update({
            loser_next_match_id: loserNextId,
            loser_next_match_slot: m.loser_next_match_slot || 1,
          })
          .eq("id", currentId);
      }
      }
    }
  }

  await (admin as any)
    .from("tournaments")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", tournamentId)
    .eq("tenant_id", ctx.tenantId);

  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true, count: drawSets.reduce((total, drawSet) => total + drawSet.matches.length, 0) };
}

export async function generateGroupKnockoutStageAction(tournamentId: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };
  const admin = createAdminClient();
  const { data: tournament } = await (admin as any)
    .from("tournaments")
    .select("id, has_third_place_match, format")
    .eq("id", tournamentId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!tournament || tournament.format !== "group_knockout") {
    return { success: false, error: "รายการนี้ไม่ได้ใช้รูปแบบรอบกลุ่ม + น็อกเอาต์" };
  }

  const [{ data: events }, { data: groups }, { data: teams }, { data: groupMatches }, { data: existingKnockout }] = await Promise.all([
    (admin as any).from("tournament_events").select("id, category_id").eq("tournament_id", tournamentId),
    (admin as any).from("tournament_event_groups").select("id, event_id, name").in("event_id", (await (admin as any).from("tournament_events").select("id").eq("tournament_id", tournamentId)).data?.map((event: { id: string }) => event.id) ?? ["00000000-0000-0000-0000-000000000000"]),
    (admin as any).from("teams").select("id, name, group_id").eq("tournament_id", tournamentId),
    (admin as any).from("matches").select("id, event_id, group_id, team_a_id, team_b_id, winner_id, score_a, score_b, status").eq("tournament_id", tournamentId).eq("match_type", "group"),
    (admin as any).from("matches").select("id").eq("tournament_id", tournamentId).eq("match_type", "knockout"),
  ]);
  if ((existingKnockout ?? []).length) return { success: false, error: "มีรอบน็อกเอาต์แล้ว" };
  if (!(groups ?? []).length) return { success: false, error: "ยังไม่ได้สร้างรอบแบ่งกลุ่ม" };
  if ((groupMatches ?? []).some((match: { status: string }) => match.status !== "completed")) {
    return { success: false, error: "ต้องบันทึกผลรอบแบ่งกลุ่มให้ครบก่อน" };
  }

  const { calculateRoundRobinStandings, generateGroupKnockoutCrossBracket } = await import("@/lib/bracket/generator");
  let createdCount = 0;
  for (const event of events ?? []) {
    const eventGroups = (groups ?? []).filter((group: { event_id: string }) => group.event_id === event.id);
    if (eventGroups.length < 2) continue;
    const qualifiers = eventGroups.map((group: { id: string; name: string }) => {
      const groupTeams = (teams ?? []).filter((team: { group_id: string | null }) => team.group_id === group.id);
      const completed = (groupMatches ?? []).filter((match: { group_id: string | null }) => match.group_id === group.id).map((match: { team_a_id: string; team_b_id: string; winner_id: string; score_a: string | null; score_b: string | null }) => ({
        ...match,
        score_a_games: Number(match.score_a) || 0,
        score_b_games: Number(match.score_b) || 0,
      }));
      const standings = calculateRoundRobinStandings(groupTeams.map((team: { id: string; name: string }) => ({ id: team.id, name: team.name })), completed);
      return { groupName: group.name, firstTeamId: standings[0]?.teamId, secondTeamId: standings[1]?.teamId };
    }).filter((qualifier: { firstTeamId?: string; secondTeamId?: string }) => qualifier.firstTeamId && qualifier.secondTeamId);
    if (qualifiers.length < 2) continue;
    const bracket = generateGroupKnockoutCrossBracket(qualifiers as { groupName: string; firstTeamId: string; secondTeamId: string }[], tournament.has_third_place_match);
    const idMap = new Map<string, string>();
    for (const match of bracket) {
      const { data: inserted } = await (admin as any).from("matches").insert({
        tournament_id: tournamentId,
        category_id: event.category_id,
        event_id: event.id,
        round: match.round,
        match_number: match.bracket_pos + 1,
        team_a_id: match.team_a_id,
        team_b_id: match.team_b_id,
        status: "scheduled",
        stage: "knockout",
        match_type: match.match_type ?? "knockout",
        notes: match.notes ?? null,
      }).select("id").single();
      if (inserted) idMap.set(`${match.round}_${match.bracket_pos}`, inserted.id);
    }
    for (const match of bracket) {
      const id = idMap.get(`${match.round}_${match.bracket_pos}`);
      const next = match.next_match_round ? idMap.get(`${match.next_match_round}_${match.next_match_pos}`) : null;
      const loserNext = match.loser_next_match_round ? idMap.get(`${match.loser_next_match_round}_${match.loser_next_match_pos}`) : null;
      if (id) await (admin as any).from("matches").update({
        next_match_id: next,
        next_match_slot: match.next_match_slot ?? null,
        loser_next_match_id: loserNext,
        loser_next_match_slot: match.loser_next_match_slot ?? null,
      }).eq("id", id);
    }
    createdCount += bracket.length;
  }
  if (!createdCount) return { success: false, error: "ไม่สามารถหาทีมผ่านเข้ารอบจากคะแนนกลุ่มได้" };
  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true, count: createdCount };
}
