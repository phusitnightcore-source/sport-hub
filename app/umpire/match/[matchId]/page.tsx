import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UmpireScoringClient } from "./UmpireScoringClient";
import type { Team } from "@/lib/scoring/types";
import { getStaffContext } from "@/lib/auth";
import { getOrganizerAccessForUser } from "@/lib/organizer";

export const dynamic = "force-dynamic";

export default async function UmpireMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: match } = await (admin as any)
    .from("matches")
    .select("id, tournament_id, round, court_no, team_a_id, team_b_id, status, tournaments(name,tenant_id,organizer_id)")
    .eq("id", matchId)
    .single();

  if (!match) notFound();

  const [staffContext, organizerAccess] = await Promise.all([
    getStaffContext(),
    getOrganizerAccessForUser(admin, user.id),
  ]);
  const canScore =
    (organizerAccess?.canManageTournaments && match.tournaments?.organizer_id === user.id) ||
    (staffContext && match.tournaments?.tenant_id === staffContext.tenantId);
  if (!canScore) redirect(`/tournaments/${match.tournament_id}`);

  // Fetch teams and team members
  const teamIds = [match.team_a_id, match.team_b_id].filter(Boolean);
  const { data: teamsData } = await (admin as any)
    .from("teams")
    .select("id, name")
    .in("id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: membersData } = await (admin as any)
    .from("team_members")
    .select("team_id, profiles(id, full_name, display_name, avatar_url)")
    .in("team_id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"]);

  const teamsMap = new Map<string, any>((teamsData ?? []).map((t: any) => [t.id, t]));

  function buildTeam(teamId?: string | null, fallbackName = "ทีม"): Team {
    const raw = teamId ? teamsMap.get(teamId) : null;
    const members = (membersData ?? []).filter((m: any) => m.team_id === teamId);
    const p1 = members[0]?.profiles;
    const p2 = members[1]?.profiles;

    return {
      id: teamId || "unknown",
      name: raw?.name || fallbackName,
      player1: {
        id: p1?.id || "p1",
        name: p1?.display_name || p1?.full_name || `${raw?.name || fallbackName} (1)`,
        avatar_url: p1?.avatar_url || null,
      },
      player2: p2
        ? {
            id: p2.id,
            name: p2.display_name || p2.full_name,
            avatar_url: p2.avatar_url || null,
          }
        : {
            id: "p2",
            name: `${raw?.name || fallbackName} (2)`,
            avatar_url: null,
          },
    };
  }

  const team1 = buildTeam(match.team_a_id, "ทีม A");
  const team2 = buildTeam(match.team_b_id, "ทีม B");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 min-h-screen">
      <UmpireScoringClient
        matchId={match.id}
        eventName={match.tournaments?.name || "รายการแข่งขัน"}
        courtNo={match.court_no}
        team1={team1}
        team2={team2}
        eventType="MD"
      />
    </main>
  );
}
