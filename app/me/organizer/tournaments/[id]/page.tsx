import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ChevronLeft, ExternalLink, Trophy } from "lucide-react";
import { requireTournamentOrganizer } from "@/lib/organizer";
import { createAdminClient } from "@/lib/supabase/admin";
import { TournamentAdminClient } from "@/app/dashboard/tournaments/[id]/TournamentAdminClient";

export const dynamic = "force-dynamic";

export default async function MyTournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const access = await requireTournamentOrganizer();
  if (!access) redirect("/me/organizer");
  const admin = createAdminClient();
  const [{ data: tournament }, { data: teams }, { data: matches }, { data: categories }, { data: registrations }] = await Promise.all([
    admin.from("tournaments").select("*").eq("id", id).eq("organizer_id", access.userId).maybeSingle(),
    admin.from("teams").select("id,name,seed").eq("tournament_id", id).order("created_at"),
    admin.from("matches").select("id,category_id,round,match_number,status,score_a,score_b,winner_id,team_a_id,team_b_id,court_id,match_type,notes").eq("tournament_id", id).order("round").order("match_number"),
    admin.from("tournament_categories").select("id,name").eq("tournament_id", id).order("created_at"),
    admin.from("tournament_registrations").select("id,player_id,team_id,payment_status,slip_image_url,payment_notes,verification_status,verification_notes,video_url,partner_name,rating_at_registration,checkin_status,checked_in_at,registered_at,profiles(display_name,full_name,avatar_url,skill_level,mmr)").eq("tournament_id", id).order("registered_at"),
  ]);
  if (!tournament) notFound();
  const teamList = teams ?? [];
  const teamMap = new Map(teamList.map((team) => [team.id, team]));
  const populatedMatches = (matches ?? []).map((match) => ({ ...match, team_a: match.team_a_id ? teamMap.get(match.team_a_id) ?? null : null, team_b: match.team_b_id ? teamMap.get(match.team_b_id) ?? null : null }));
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8"><div className="flex items-center justify-between"><Link href="/me/organizer/tournaments" className="inline-flex items-center gap-1 text-body-sm font-bold text-ink-soft"><ChevronLeft className="h-4 w-4" /> กลับรายการแข่งขัน</Link><Link href={`/tournaments/${id}`} target="_blank" className="inline-flex items-center gap-1 text-body-sm font-bold text-brand">หน้าสาธารณะ <ExternalLink className="h-4 w-4" /></Link></div><header className="card-floating rounded-3xl border border-line p-6"><h1 className="flex items-center gap-2 font-display text-3xl font-black text-ink"><Trophy className="h-7 w-7 text-amber-500" /> {tournament.name}</h1><p className="mt-1 text-body-sm text-ink-soft">{tournament.start_date} · {tournament.status}</p></header><TournamentAdminClient tournamentId={id} status={tournament.status} teams={teamList} matches={populatedMatches} courts={[]} categories={categories ?? []} registrations={registrations ?? []} requireVideoProof={tournament.require_video_proof} skillVerificationMode={tournament.skill_verification_mode} format={tournament.format} /></main>;
}
