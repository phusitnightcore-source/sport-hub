import { notFound } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  ChevronLeft,
  ShieldCheck,
  FileText,
  DollarSign,
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicNav } from "@/components/ui/PublicNav";
import { TournamentRegistrationModal } from "./TournamentRegistrationModal";
import { TournamentBracketView } from "./TournamentBracketView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return {};
  const admin = createAdminClient();
  const { data: tournament } = await (admin as any)
    .from("tournaments")
    .select("name, sport")
    .eq("id", id)
    .single();

  if (!tournament) return {};
  return {
    title: `${tournament.name} | การแข่งขันกีฬา - SportHub`,
    description: `ข้อมูลและสายการแข่งขันรายการ ${tournament.name} บน SportHub`,
  };
}

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { tab = "bracket" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Fetch tournament, categories, registrations, teams, and matches safely
  const [
    { data: tournament },
    { data: categories },
    { data: registrations },
    { data: teams },
    { data: rawMatches },
  ] = await Promise.all([
    (admin as any)
      .from("tournaments")
      .select("*, tenants(name, address)")
      .eq("id", id)
      .single(),
    (admin as any)
      .from("tournament_categories")
      .select("id, name, max_teams")
      .eq("tournament_id", id),
    (admin as any)
      .from("tournament_registrations")
      .select("id, player_id, team_id, registered_at")
      .eq("tournament_id", id)
      .order("registered_at", { ascending: true }),
    (admin as any)
      .from("teams")
      .select("id, name, seed")
      .eq("tournament_id", id),
    (admin as any)
      .from("matches")
      .select("id, round, match_number, status, score_a, score_b, winner_id, team_a_id, team_b_id, court_id, scheduled_at, match_type, notes, tournament_event_groups(name)")
      .eq("tournament_id", id)
      .order("round", { ascending: true })
      .order("match_number", { ascending: true }),
  ]);

  if (!tournament) notFound();

  const allCategories = (categories ?? []) as any[];
  const allRegistrations = (registrations ?? []) as any[];
  const allTeams = (teams ?? []) as any[];
  const teamMap = new Map(allTeams.map((t: any) => [t.id, t]));

  // Connect team objects to matches
  const allMatches = ((rawMatches ?? []) as any[]).map((m: any) => ({
    ...m,
    group_name: m.tournament_event_groups?.name ?? null,
    team_a: m.team_a_id ? teamMap.get(m.team_a_id) ?? null : null,
    team_b: m.team_b_id ? teamMap.get(m.team_b_id) ?? null : null,
  }));

  // Connect team names to registrations
  const populatedRegistrations = allRegistrations.map((r: any) => ({
    ...r,
    team_name: r.team_id ? teamMap.get(r.team_id)?.name : "ทีมผู้เข้าแข่งขัน",
  }));

  const isUserRegistered = user
    ? allRegistrations.some((r: any) => r.player_id === user.id)
    : false;

  const isClosed = tournament.status !== "registration_open";

  return (
    <div className="min-h-screen pb-20">
      <PublicNav />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 space-y-8">
        {/* Back link */}
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1 text-body-sm font-semibold text-ink-soft hover:text-brand transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>กลับไปยังรายการแข่งขันทั้งหมด</span>
        </Link>

        {/* Hero Header Card */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
          {/* Banner image or gradient */}
          {tournament.banner_image_url ? (
            <div className="relative mb-6 h-48 sm:h-64 w-full overflow-hidden rounded-2xl">
              <img
                src={tournament.banner_image_url}
                alt={tournament.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="relative mb-6 flex h-40 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-brand/10 to-brand/5">
              <Trophy className="h-16 w-16 text-amber-500/60" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-brand-soft px-3 py-0.5 text-xs font-bold text-brand uppercase">
                  🏅 {tournament.sport}
                </span>
                <span className="rounded-lg bg-surface-raised border border-line px-2.5 py-0.5 text-xs font-bold text-ink">
                  รูปแบบ: {tournament.bracket_type.replace("_", " ")}
                </span>
                <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                  tournament.status === "registration_open"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : tournament.status === "in_progress"
                    ? "bg-brand/10 text-brand"
                    : "bg-surface-raised text-ink-soft"
                }`}>
                  {tournament.status === "registration_open"
                    ? "🟢 เปิดรับสมัคร"
                    : tournament.status === "in_progress"
                    ? "⚡ กำลังแข่งขัน"
                    : "🏁 จบแล้ว"}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-ink tracking-tight">
                {tournament.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-body-sm text-ink-soft pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 text-brand" />
                  {tournament.start_date} {tournament.end_date ? `— ${tournament.end_date}` : ""}
                </span>
                {tournament.tenants && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="h-4 w-4 text-brand" />
                    {tournament.tenants.name}
                  </span>
                )}
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-brand" />
                  สมัครแล้ว {populatedRegistrations.length} {tournament.max_teams ? `/ ${tournament.max_teams}` : ""} ทีม
                </span>
              </div>
            </div>

            {/* Registration Action */}
            <div className="shrink-0 flex items-center gap-3">
              <TournamentRegistrationModal
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                entryFee={Number(tournament.entry_fee)}
                categories={allCategories}
                isRegistered={isUserRegistered}
                isClosed={isClosed}
                requireVideoProof={tournament.require_video_proof}
                skillVerificationMode={tournament.skill_verification_mode}
              />
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-line/60 pt-6">
            <div className="rounded-2xl bg-surface-raised border border-line p-3.5">
              <span className="text-body-xs font-semibold text-ink-soft">ค่าสมัครแข่งขัน</span>
              <p className="mt-1 font-display text-lg font-bold text-brand">
                {Number(tournament.entry_fee) > 0 ? `฿${tournament.entry_fee} / ทีม` : "ฟรี"}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-raised border border-line p-3.5">
              <span className="text-body-xs font-semibold text-ink-soft">เงินรางวัล / ของรางวัล</span>
              <p className="mt-1 font-display text-lg font-bold text-amber-500 truncate">
                {tournament.prize_info || "ถ้วยรางวัล & เหรียญ"}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-raised border border-line p-3.5">
              <span className="text-body-xs font-semibold text-ink-soft">จำนวนทีมที่รับ</span>
              <p className="mt-1 font-display text-lg font-bold text-ink">
                {tournament.max_teams ? `${tournament.max_teams} ทีม` : "ไม่จำกัด"}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-raised border border-line p-3.5">
              <span className="text-body-xs font-semibold text-ink-soft">สายแข่งที่จัด</span>
              <p className="mt-1 font-display text-lg font-bold text-ink">
                {allMatches.length} แมตช์
              </p>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-line pb-2">
          {[
            { id: "bracket", label: "สายการแข่งขัน (Bracket)", icon: Trophy },
            { id: "rules", label: "รายละเอียด & กติกา", icon: FileText },
            { id: "teams", label: `ทีมที่เข้าร่วม (${populatedRegistrations.length})`, icon: Users },
          ].map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={`/tournaments/${id}?tab=${t.id}`}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all ${
                  active
                    ? "bg-brand text-white shadow-xs"
                    : "text-ink-soft hover:bg-surface-raised hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Tab 1: Bracket */}
        {tab === "bracket" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">
                ตารางสายการแข่งขัน (Tournament Bracket)
              </h2>
              <span className="text-xs font-semibold text-brand">อัปเดตผลสด Real-time</span>
            </div>

            <div className="card-floating rounded-3xl border border-line bg-surface p-6 shadow-xs">
              <TournamentBracketView matches={allMatches} />
            </div>
          </section>
        )}

        {/* Tab 2: Rules & Details */}
        {tab === "rules" && (
          <section className="card-floating rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-display text-lg font-bold text-ink mb-2">
                กติกาและระเบียบการแข่งขัน
              </h3>
              <p className="text-body-sm text-ink-soft whitespace-pre-line leading-relaxed">
                {tournament.rules || "กติกาการแข่งขันมาตรฐานสากล โปรดปฏิบัติตามคำสั่งของกรรมการและผู้จัดงานอย่างเคร่งครัด"}
              </p>
            </div>

            {tournament.description && (
              <div className="border-t border-line/60 pt-6">
                <h3 className="font-display text-lg font-bold text-ink mb-2">
                  ข้อมูลเพิ่มเติม
                </h3>
                <p className="text-body-sm text-ink-soft whitespace-pre-line leading-relaxed">
                  {tournament.description}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Registered Teams */}
        {tab === "teams" && (
          <section className="card-floating rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-4">
            <h3 className="font-display text-lg font-bold text-ink">
              รายชื่อทีมที่สมัครเข้าร่วม ({populatedRegistrations.length})
            </h3>

            {populatedRegistrations.length === 0 ? (
              <p className="py-8 text-center text-body-sm text-ink-soft">
                ยังไม่มีทีมที่สมัครเข้าแข่งขัน เป็นทีมแรกที่ลงทะเบียนเลย!
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {populatedRegistrations.map((reg: any, idx: number) => (
                  <div
                    key={reg.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-4 shadow-xs"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 font-mono text-xs font-bold text-brand">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-body font-bold text-ink truncate">
                        {reg.team_name}
                      </p>
                      <p className="text-[11px] text-ink-soft">
                        ลงทะเบียนเมื่อ: {new Date(reg.registered_at).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
