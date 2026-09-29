"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { getCurrentOrganizerAccess } from "@/lib/organizer";
import { calculateEloChange } from "@/lib/tournament/elo";
import type { MatchState } from "@/lib/scoring/types";

async function updateTournamentElo(
  admin: ReturnType<typeof createAdminClient>,
  matchId: string,
  tournamentId: string,
  winnerTeamId: string,
  loserTeamId: string,
) {
  const [{ data: winnerMembers }, { data: loserMembers }] = await Promise.all([
    (admin as any).from("team_members").select("profile_id").eq("team_id", winnerTeamId),
    (admin as any).from("team_members").select("profile_id").eq("team_id", loserTeamId),
  ]);
  const winnerIds = (winnerMembers ?? []).map((member: { profile_id: string }) => member.profile_id);
  const loserIds = (loserMembers ?? []).map((member: { profile_id: string }) => member.profile_id);
  const allIds = [...winnerIds, ...loserIds];
  if (!allIds.length) return;

  const { data: ratings } = await (admin as any)
    .from("elo_ratings")
    .select("id, profile_id, rating, wins, losses, games_played")
    .eq("sport", "badminton")
    .in("profile_id", allIds);
  type RatingRecord = { id: string; profile_id: string; rating: number; wins: number; losses: number; games_played: number };
  const ratingMap = new Map<string, RatingRecord>((ratings ?? []).map((rating: RatingRecord) => [rating.profile_id, rating]));
  const average = (ids: string[]) => ids.length ? Math.round(ids.reduce((sum, id) => sum + (ratingMap.get(id)?.rating ?? 1200), 0) / ids.length) : 1200;
  const winnerOpponentRating = average(loserIds);
  const loserOpponentRating = average(winnerIds);

  for (const [ids, result, opponentRating] of [[winnerIds, "win", winnerOpponentRating], [loserIds, "loss", loserOpponentRating]] as const) {
    for (const profileId of ids) {
      const current = ratingMap.get(profileId);
      const before = current?.rating ?? 1200;
      const change = calculateEloChange(before, opponentRating, result);
      const after = Math.max(100, before + change);
      const payload = {
        profile_id: profileId,
        sport: "badminton",
        rating: after,
        wins: (current?.wins ?? 0) + (result === "win" ? 1 : 0),
        losses: (current?.losses ?? 0) + (result === "loss" ? 1 : 0),
        games_played: (current?.games_played ?? 0) + 1,
        updated_at: new Date().toISOString(),
      };
      if (current) await (admin as any).from("elo_ratings").update(payload).eq("id", current.id);
      else await (admin as any).from("elo_ratings").insert(payload);
      await (admin as any).from("elo_history").insert({
        profile_id: profileId,
        sport: "badminton",
        match_id: matchId,
        tournament_id: tournamentId,
        rating_before: before,
        rating_after: after,
        rating_change: change,
        result,
      });
    }
  }
}

export async function saveLiveTournamentScoreAction(matchId: string, state: MatchState) {
  const [staffContext, organizerAccess] = await Promise.all([
    getStaffContext(),
    getCurrentOrganizerAccess(),
  ]);
  const actorId = organizerAccess?.userId ?? staffContext?.userId;
  if (!actorId) return { success: false, error: "ไม่มีสิทธิ์บันทึกคะแนน" };
  const admin = createAdminClient();
  const { data: match } = await (admin as any)
    .from("matches")
    .select("id, tournament_id, tournaments(tenant_id,organizer_id)")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return { success: false, error: "ไม่พบข้อมูลแมตช์" };
  const tournament = match.tournaments;
  const canScore =
    (organizerAccess?.canManageTournaments && tournament?.organizer_id === organizerAccess.userId) ||
    (staffContext && tournament?.tenant_id === staffContext.tenantId);
  if (!canScore) return { success: false, error: "ไม่มีสิทธิ์บันทึกคะแนนแมตช์นี้" };

  const now = new Date().toISOString();
  await (admin as any).from("matches").update({
    score_a: String(state.team1_score),
    score_b: String(state.team2_score),
    current_game_no: state.currentGameNo,
    current_server_id: state.server_player_id,
    current_serving_side: (state.serving_team === 1 ? state.team1_score : state.team2_score) % 2 === 0 ? "right" : "left",
    score_details: {
      games: state.completedGames,
      team_a_games_won: state.team1_games_won,
      team_b_games_won: state.team2_games_won,
      status: state.status,
    },
    status: "in_progress",
    started_at: now,
  }).eq("id", matchId);

  const currentGame = state.completedGames.find((game) => game.gameNo === state.currentGameNo);
  await (admin as any).from("tournament_games").upsert({
    match_id: matchId,
    game_no: state.currentGameNo,
    team1_score: state.team1_score,
    team2_score: state.team2_score,
    winner_id: currentGame ? (currentGame.winner === 1 ? state.team1.id : state.team2.id) : null,
    finished: Boolean(currentGame),
    status: currentGame ? "completed" : "in_progress",
    started_at: now,
    completed_at: currentGame ? now : null,
  }, { onConflict: "match_id,game_no" });

  revalidatePath(`/display/${matchId}`);
  revalidatePath(`/umpire/match/${matchId}`);
  return { success: true };
}

export async function syncMatchResultAction(
  matchId: string,
  winnerTeamId: string,
  finalScores: string
) {
  const [staffContext, organizerAccess] = await Promise.all([
    getStaffContext(),
    getCurrentOrganizerAccess(),
  ]);
  const actorId = organizerAccess?.userId ?? staffContext?.userId;
  if (!actorId) return { success: false, error: "ไม่มีสิทธิ์บันทึกผล" };

  const admin = createAdminClient();

  // 1. Fetch match
  const { data: match } = await (admin as any)
    .from("matches")
    .select("id, tournament_id, team_a_id, team_b_id, tournaments(tenant_id,organizer_id)")
    .eq("id", matchId)
    .single();

  if (!match) return { success: false, error: "ไม่พบข้อมูลแมตช์" };

  const tournament = match.tournaments;
  const canScore =
    (organizerAccess?.canManageTournaments && tournament?.organizer_id === organizerAccess.userId) ||
    (staffContext && tournament?.tenant_id === staffContext.tenantId);
  if (!canScore) return { success: false, error: "ไม่มีสิทธิ์บันทึกผลแมตช์นี้" };
  if (![match.team_a_id, match.team_b_id].includes(winnerTeamId)) {
    return { success: false, error: "ผู้ชนะต้องเป็นหนึ่งในสองทีมของแมตช์นี้" };
  }

  // 2. Update match status, winner, scores
  const scoreParts = finalScores.split(",");
  const completedGames = scoreParts.map((score, index) => {
    const [teamA, teamB] = score.trim().split("-").map(Number);
    return Number.isFinite(teamA) && Number.isFinite(teamB)
      ? { gameNo: index + 1, team1_score: teamA, team2_score: teamB, winner: teamA > teamB ? 1 : 2 }
      : null;
  }).filter(Boolean);
  await (admin as any)
    .from("matches")
    .update({
      winner_id: winnerTeamId,
      score_a: scoreParts[0]?.trim() || finalScores,
      score_b: scoreParts[1]?.trim() || null,
      score_details: { games: completedGames, final_summary: finalScores },
      status: "completed",
      completed_at: new Date().toISOString(),
      result_recorded_by: actorId,
      result_recorded_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  // The bracket trigger advances this result to the predetermined slot.

  // 3. Update player Elo rating and history using the SOW formula.
  const loserId = winnerTeamId === match.team_a_id ? match.team_b_id : match.team_a_id;
  if (winnerTeamId && loserId) {
    await updateTournamentElo(admin, matchId, match.tournament_id, winnerTeamId, loserId);
  }

  revalidatePath(`/umpire/match/${matchId}`);
  revalidatePath(`/display/${matchId}`);
  revalidatePath(`/dashboard/tournaments/${match.tournament_id}`);
  revalidatePath(`/me/organizer/tournaments/${match.tournament_id}`);
  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath("/leaderboard");

  return { success: true };
}

export async function assignUmpireAction(matchId: string, umpireProfileId: string) {
  const [staffContext, organizerAccess] = await Promise.all([
    getStaffContext(),
    getCurrentOrganizerAccess(),
  ]);
  if (!staffContext && !organizerAccess?.canManageTournaments) {
    return { success: false, error: "ไม่มีสิทธิ์มอบหมายกรรมการ" };
  }

  const admin = createAdminClient();
  const { data: match } = await (admin as any)
    .from("matches")
    .select("tournament_id, tournaments(tenant_id,organizer_id)")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return { success: false, error: "ไม่พบข้อมูลแมตช์" };

  const tournament = match.tournaments;
  const canAssign =
    (organizerAccess?.canManageTournaments && tournament?.organizer_id === organizerAccess.userId) ||
    (staffContext && tournament?.tenant_id === staffContext.tenantId);
  if (!canAssign) return { success: false, error: "ไม่มีสิทธิ์มอบหมายแมตช์นี้" };

  const { error } = await (admin as any)
    .from("matches")
    .update({ umpire_id: umpireProfileId || null })
    .eq("id", matchId);
  if (error) return { success: false, error: "มอบหมายกรรมการไม่สำเร็จ" };

  revalidatePath(`/umpire`);
  return { success: true };
}
