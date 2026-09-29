import { createAdminClient } from "@/lib/supabase/admin";
import { PublicNav } from "@/components/ui/PublicNav";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Zap,
  Award,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { OrganizerBadges } from "@/components/ui/OrganizerBadge";
import type { OrganizerBadge as OrganizerBadgeData } from "@/lib/organizer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "การแข่งขัน & ทัวร์นาเมนต์ | SportHub",
  description: "ค้นหาและเข้าร่วมการแข่งขันกีฬาใกล้คุณ ตรวจสอบสายการแข่งขัน และคะแนนสะสม — SportHub",
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  registration_open: {
    label: "เปิดรับสมัคร",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  },
  registration_closed: {
    label: "ปิดรับสมัคร",
    tone: "bg-warning/10 text-warning border border-warning/20",
  },
  in_progress: {
    label: "กำลังแข่งขัน",
    tone: "bg-brand/10 text-brand border border-brand/20",
  },
  completed: {
    label: "จบแล้ว",
    tone: "bg-surface-raised text-ink-soft border border-line",
  },
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport: filterSport } = await searchParams;
  const admin = createAdminClient();

  let tournamentsQuery = admin
    .from("tournaments")
    .select(`
      id, organizer_id, name, sport, description, start_date, end_date, entry_fee, max_teams,
      bracket_type, status, banner_image_url, prize_info, tenants(name)
    `)
    .in("status", ["registration_open", "registration_closed", "in_progress", "completed"])
    .order("start_date", { ascending: false })
    .limit(50);

  if (filterSport && filterSport !== "all") {
    tournamentsQuery = tournamentsQuery.eq("sport", filterSport);
  }

  const { data } = await tournamentsQuery;
  const tournaments = data ?? [];
  const organizerIds = [...new Set(tournaments.map((t) => t.organizer_id))];
  const [{ data: organizers }, { data: badgeRows }] = organizerIds.length
    ? await Promise.all([
        admin.from("profiles").select("id,display_name,full_name").in("id", organizerIds),
        (admin as any).from("organizer_badges").select("profile_id,badge_type,label").in("profile_id", organizerIds),
      ])
    : [{ data: [] }, { data: [] }];
  const organizerMap = new Map((organizers ?? []).map((profile) => [profile.id, profile.display_name || profile.full_name || "ผู้จัดการแข่งขัน"]));
  const organizerBadgeMap = new Map<string, OrganizerBadgeData[]>();
  for (const badge of (badgeRows ?? []) as any[]) {
    const current = organizerBadgeMap.get(badge.profile_id) ?? [];
    current.push({ type: badge.badge_type, label: badge.label, validUntil: null });
    organizerBadgeMap.set(badge.profile_id, current);
  }

  const upcoming = tournaments.filter(
    (t) => t.status === "registration_open" || t.status === "registration_closed"
  );
  const ongoing = tournaments.filter((t) => t.status === "in_progress");
  const past = tournaments.filter((t) => t.status === "completed");

  return (
    <div className="min-h-screen pb-20">
      <PublicNav />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-amber-500/5 p-6 sm:p-10 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="rounded-full bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Championship & Leagues
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                การแข่งขัน & ทัวร์นาเมนต์
              </h1>
              <p className="mt-2 text-body text-ink-soft max-w-xl">
                พิสูจน์ฝีมือในการแข่งขันมาตรฐาน สมัครทีม ติดตามสายการแข่งขัน (Bracket) และสะสมคะแนน Elo Rating
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Link
                href="/me/organizer"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-body-sm font-bold text-white shadow-xs transition-all hover:bg-brand-dark"
              >
                <Trophy className="h-4 w-4" />
                <span>จัดการแข่งขัน</span>
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 rounded-2xl bg-surface-raised border border-line px-4 py-2.5 text-body-sm font-bold text-ink hover:border-brand hover:text-brand transition-all shadow-xs"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>ดู Leaderboard</span>
              </Link>
            </div>
          </div>

          {/* Sport Filter Chips */}
          <div className="relative mt-8 flex flex-wrap items-center gap-2 border-t border-line/60 pt-6">
            {[
              { key: "all", label: "ทั้งหมด", icon: "🏆" },
              { key: "badminton", label: "แบดมินตัน", icon: "🏸" },
              { key: "football", label: "ฟุตบอล", icon: "⚽" },
              { key: "tennis", label: "เทนนิส", icon: "🎾" },
              { key: "basketball", label: "บาสเกตบอล", icon: "🏀" },
            ].map((sport) => {
              const active = (!filterSport && sport.key === "all") || filterSport === sport.key;
              return (
                <Link
                  key={sport.key}
                  href={sport.key === "all" ? "/tournaments" : `/tournaments?sport=${sport.key}`}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-brand text-white shadow-xs"
                      : "bg-surface-raised border border-line text-ink-soft hover:text-ink"
                  }`}
                >
                  {sport.icon} {sport.label}
                </Link>
              );
            })}
          </div>
        </section>

        {tournaments.length === 0 ? (
          <div className="card-floating p-16 text-center rounded-3xl border border-line">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">
              ยังไม่มีการแข่งขันที่เปิดรับสมัครในขณะนี้
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-body-sm text-ink-soft">
              ติดตามข่าวสารและตารางการแข่งขันใหม่ๆ ได้ที่นี่ เร็วๆ นี้
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-body-sm font-bold text-white shadow-xs hover:bg-brand-dark transition-all"
              >
                <Zap className="h-4 w-4" />
                <span>ค้นหาสนามซ้อมก่อน</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {[
              { title: "กำลังแข่งขันสด (Live)", items: ongoing },
              { title: "เปิดรับสมัคร (Open for Registration)", items: upcoming },
              { title: "จบการแข่งขันแล้ว (Past)", items: past },
            ]
              .filter((s) => s.items.length > 0)
              .map((section) => (
                <section key={section.title} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold text-ink">
                      {section.title} ({section.items.length})
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {section.items.map((t: any) => {
                      const statusInfo = STATUS_LABELS[t.status] ?? {
                        label: t.status,
                        tone: "bg-surface-raised text-ink-soft",
                      };

                      return (
                        <Link
                          key={t.id}
                          href={`/tournaments/${t.id}`}
                          className="group card-floating flex flex-col justify-between overflow-hidden rounded-3xl border border-line p-0 transition-all hover:border-brand hover:shadow-lg"
                        >
                          {/* Banner */}
                          {t.banner_image_url ? (
                            <div className="relative h-44 w-full overflow-hidden">
                              <img
                                src={t.banner_image_url}
                                alt={t.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <span className="absolute bottom-3 left-4 rounded-lg bg-surface/90 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-bold text-ink">
                                🏅 {t.sport}
                              </span>
                            </div>
                          ) : (
                            <div className="flex h-36 items-center justify-center bg-gradient-to-br from-amber-500/15 to-brand/10">
                              <Trophy className="h-12 w-12 text-amber-500/50 group-hover:scale-110 transition-transform" />
                            </div>
                          )}

                          <div className="flex flex-col flex-1 p-5 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold ${statusInfo.tone}`}>
                                {statusInfo.label}
                              </span>
                              <span className="text-body-xs font-semibold text-ink-soft">
                                {t.bracket_type.replace("_", " ")}
                              </span>
                            </div>

                            <h3 className="font-display text-lg font-bold text-ink group-hover:text-brand transition-colors line-clamp-1">
                              {t.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-body-xs font-semibold text-ink-soft">
                              <span>จัดโดย {organizerMap.get(t.organizer_id) ?? t.tenants?.name ?? "ผู้จัดการแข่งขัน"}</span>
                              <OrganizerBadges badges={organizerBadgeMap.get(t.organizer_id) ?? []} />
                            </div>

                            {t.description && (
                              <p className="text-body-xs text-ink-soft line-clamp-2">
                                {t.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-body-xs text-ink-soft pt-1">
                              <span className="flex items-center gap-1 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-brand" />
                                {t.start_date}
                              </span>
                              {t.max_teams && (
                                <span className="flex items-center gap-1 font-medium">
                                  <Users className="h-3.5 w-3.5 text-brand" />
                                  สูงสุด {t.max_teams} ทีม
                                </span>
                              )}
                              {t.tenants?.name && (
                                <span className="flex items-center gap-1 font-medium truncate max-w-[160px]">
                                  <MapPin className="h-3.5 w-3.5 text-brand" />
                                  {t.tenants.name}
                                </span>
                              )}
                            </div>

                            <div className="mt-auto border-t border-line/60 pt-3 flex items-center justify-between">
                              <span className="font-display text-base font-bold text-brand">
                                {Number(t.entry_fee) > 0 ? `฿${t.entry_fee} / ทีม` : "สมัครฟรี"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-brand">
                                ดูสายแข่ง & สมัคร <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
