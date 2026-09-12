import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Trophy,
  ChevronLeft,
  Calendar,
  Users,
  Award,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { TournamentAdminClient } from "./TournamentAdminClient";

export const dynamic = "force-dynamic";

export default async function DashboardTournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();

  // Fetch tournament, teams, matches, courts, and registrations safely
  const [
    { data: tournament },
    { data: teams },
    { data: matches },
    { data: courts },
    { data: registrations },
  ] = await Promise.all([
    (admin as any)
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId)
      .single(),
    (admin as any)
      .from("teams")
      .select("id, name, seed")
      .eq("tournament_id", id)
      .order("created_at", { ascending: true }),
    (admin as any)
      .from("matches")
      .select("id, round, match_number, status, score_a, score_b, winner_id, team_a_id, team_b_id, court_id, match_type, notes")
      .eq("tournament_id", id)
      .order("round", { ascending: true })
      .order("match_number", { ascending: true }),
    (admin as any)
      .from("courts")
      .select("id, name")
      .eq("tenant_id", ctx.tenantId)
      .order("name", { ascending: true }),
    (admin as any)
      .from("tournament_registrations")
      .select("id, player_id, team_id, verification_status, verification_notes, video_url, partner_name, rating_at_registration, checkin_status, checked_in_at, registered_at, profiles(display_name, full_name, avatar_url, skill_level, mmr)")
      .eq("tournament_id", id)
      .order("registered_at", { ascending: true }),
  ]);

  if (!tournament) notFound();

  const teamList = (teams ?? []) as any[];
  const teamMap = new Map(teamList.map((t: any) => [t.id, t]));

  // Connect team names to matches
  const populatedMatches = ((matches ?? []) as any[]).map((m: any) => ({
    ...m,
    team_a: m.team_a_id ? teamMap.get(m.team_a_id) ?? null : null,
    team_b: m.team_b_id ? teamMap.get(m.team_b_id) ?? null : null,
  }));

  return (
    <main className="flex flex-col gap-8 pb-20">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/tournaments"
          className="inline-flex items-center gap-1 text-body-sm font-semibold text-ink-soft hover:text-brand transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>กลับไปหน้ารายการแข่งขัน</span>
        </Link>

        <Link
          href={`/tournaments/${tournament.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-body-xs font-bold text-brand hover:underline"
        >
          <span>ดูหน้าสาธารณะ (Public View)</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Header Info Banner */}
      <header className="card-floating rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand uppercase">
                🏅 {tournament.sport}
              </span>
              <span className="font-mono text-xs font-bold text-ink-soft">
                {tournament.bracket_type.replace("_", " ")}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-black text-ink mt-2">
              {tournament.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-body-xs text-ink-soft">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5 text-brand" />
                {tournament.start_date} {tournament.end_date ? `— ${tournament.end_date}` : ""}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Users className="h-3.5 w-3.5 text-brand" />
                ทีมสมัคร {teamList.length} / {tournament.max_teams} ทีม
              </span>
              <span>•</span>
              <span className="font-bold text-brand">
                {Number(tournament.entry_fee) > 0 ? `ค่าสมัคร ฿${tournament.entry_fee}` : "สมัครฟรี"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Interactive Tournament Admin Engine */}
      <TournamentAdminClient
        tournamentId={tournament.id}
        status={tournament.status}
        teams={teamList}
        matches={populatedMatches}
        courts={(courts ?? []) as any[]}
        registrations={(registrations ?? []) as any[]}
        requireVideoProof={tournament.require_video_proof}
        skillVerificationMode={tournament.skill_verification_mode}
        format={tournament.format}
      />
    </main>
  );
}
