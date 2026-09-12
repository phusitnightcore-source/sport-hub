import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DisplayClient } from "./DisplayClient";

export const dynamic = "force-dynamic";

export default async function DisplayMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const admin = createAdminClient();

  const { data: match } = await (admin as any)
    .from("matches")
    .select("id, round, court_no, team_a_id, team_b_id, score_a, score_b, status, tournaments(name)")
    .eq("id", matchId)
    .single();

  if (!match) notFound();

  // Fetch team names
  const teamIds = [match.team_a_id, match.team_b_id].filter(Boolean);
  const { data: teams } = await (admin as any)
    .from("teams")
    .select("id, name")
    .in("id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"]);

  const teamMap = new Map<string, string>((teams ?? []).map((t: any) => [t.id, t.name]));

  return (
    <DisplayClient
      matchId={match.id}
      eventName={match.tournaments?.name || "การแข่งขันแบดมินตัน"}
      courtNo={match.court_no}
      teamAName={teamMap.get(match.team_a_id) || "ทีม 1"}
      teamBName={teamMap.get(match.team_b_id) || "ทีม 2"}
      initialScoreA={match.score_a}
      initialScoreB={match.score_b}
      status={match.status}
    />
  );
}
