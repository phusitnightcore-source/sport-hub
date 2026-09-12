"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function syncMatchResultAction(
  matchId: string,
  winnerTeamId: string,
  finalScores: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const admin = createAdminClient();

  // 1. Fetch match
  const { data: match } = await (admin as any)
    .from("matches")
    .select("id, tournament_id, next_match_id, next_match_slot, team_a_id, team_b_id")
    .eq("id", matchId)
    .single();

  if (!match) return { success: false, error: "ไม่พบข้อมูลแมตช์" };

  // 2. Update match status, winner, scores
  const scoreParts = finalScores.split(",");
  await (admin as any)
    .from("matches")
    .update({
      winner_id: winnerTeamId,
      score_a: scoreParts[0]?.trim() || finalScores,
      score_b: scoreParts[1]?.trim() || null,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  // 3. Advance winner to next_match_id
  if (match.next_match_id) {
    if (match.next_match_slot === 2) {
      await (admin as any)
        .from("matches")
        .update({ team_b_id: winnerTeamId })
        .eq("id", match.next_match_id);
    } else {
      await (admin as any)
        .from("matches")
        .update({ team_a_id: winnerTeamId })
        .eq("id", match.next_match_id);
    }
  }

  // 4. Update player Elo rating stats
  const loserId = winnerTeamId === match.team_a_id ? match.team_b_id : match.team_a_id;
  if (winnerTeamId && loserId) {
    const [{ data: winMembers }, { data: loseMembers }] = await Promise.all([
      (admin as any).from("team_members").select("profile_id").eq("team_id", winnerTeamId),
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

  revalidatePath(`/umpire/match/${matchId}`);
  revalidatePath(`/display/${matchId}`);
  revalidatePath(`/dashboard/tournaments/${match.tournament_id}`);
  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath("/leaderboard");

  return { success: true };
}

export async function assignUmpireAction(matchId: string, umpireProfileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const admin = createAdminClient();
  await (admin as any)
    .from("matches")
    .update({ umpire_id: umpireProfileId || null })
    .eq("id", matchId);

  revalidatePath(`/umpire`);
  return { success: true };
}
