import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicNav } from "@/components/ui/PublicNav";
import Link from "next/link";
import {
  Users,
  Clock,
  ChevronRight,
  Flame,
} from "lucide-react";
import { CreateGroupButton, CreatorGroupButton, JoinGroupButton } from "./GroupModals";
import { getOrganizerAccessForUser, type OrganizerBadge as OrganizerBadgeData } from "@/lib/organizer";
import { OrganizerBadges } from "@/components/ui/OrganizerBadge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ก๊วนกีฬา & จัดก๊วนเล่น | SportHub",
  description: "ค้นหาก๊วนกีฬา หาเพื่อนตีแบด เล่นฟุตบอล หรือสร้างก๊วนของตัวเองเพื่อแชร์ค่าสนาม",
};

const SPORT_TAGS: Record<string, { label: string; icon: string; tone: string }> = {
  badminton: { label: "แบดมินตัน", icon: "🏸", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  football: { label: "ฟุตบอล", icon: "⚽", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  tennis: { label: "เทนนิส", icon: "🎾", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  basketball: { label: "บาสเกตบอล", icon: "🏀", tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  tabletennis: { label: "ปิงปอง", icon: "🏓", tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport: filterSport } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const organizerAccess = user ? await getOrganizerAccessForUser(admin, user.id) : null;

  // Queries
  let groupsQuery = (admin as any)
    .from("groups")
    .select("id, creator_id, sport, title, description, play_date, start_time, end_time, max_players, current_players, skill_level, cost_per_person, status")
    .in("status", ["open", "full"])
    .gte("play_date", new Date().toISOString().split("T")[0])
    .order("play_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(50);

  if (filterSport && filterSport !== "all") {
    groupsQuery = groupsQuery.eq("sport", filterSport);
  }

  const [
    { data: gData },
    { data: sData },
    { data: myMemberships },
  ] = await Promise.all([
    groupsQuery,
    (admin as any)
      .from("group_sessions")
      .select("id, title, session_date, start_time, end_time, shuttlecock_brand, shuttlecock_price, entry_fee, status")
      .in("status", ["open", "in_progress"])
      .gte("session_date", new Date().toISOString().split("T")[0])
      .order("session_date")
      .limit(10),
    user
      ? (admin as any)
          .from("group_members")
          .select("group_id, is_creator")
          .eq("profile_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const groups = (gData ?? []) as any[];
  const facilitySessions = (sData ?? []) as any[];
  const myGroupIds = new Set((myMemberships ?? []).map((m: any) => m.group_id));
  const creatorIds = [...new Set(groups.map((group) => group.creator_id))];
  const [{ data: creators }, { data: creatorBadges }] = creatorIds.length
    ? await Promise.all([
        admin.from("profiles").select("id, display_name, full_name").in("id", creatorIds),
        (admin as any).from("organizer_badges").select("profile_id,badge_type,label").in("profile_id", creatorIds),
      ])
    : [{ data: [] }, { data: [] }];
  const creatorMap = new Map((creators ?? []).map((profile) => [profile.id, profile.display_name || profile.full_name || "ผู้จัดก๊วน"]));
  const badgeMap = new Map<string, OrganizerBadgeData[]>();
  for (const badge of (creatorBadges ?? []) as any[]) {
    const current = badgeMap.get(badge.profile_id) ?? [];
    current.push({ type: badge.badge_type, label: badge.label, validUntil: null });
    badgeMap.set(badge.profile_id, current);
  }

  return (
    <div className="min-h-screen pb-20">
      <PublicNav />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        {/* Header Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-brand/5 p-6 sm:p-10 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="rounded-full bg-brand-soft px-3 py-0.5 text-xs font-bold text-brand uppercase tracking-wider">
                  Community Matchmaking
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                ก๊วนกีฬา & จัดก๊วนเล่น
              </h1>
              <p className="mt-2 text-body text-ink-soft max-w-xl">
                ค้นหาก๊วนเล่นกีฬาในวันและเวลาที่คุณว่าง แชร์ค่าสนามกับเพื่อนใหม่ หรือสร้างก๊วนของตัวเองได้ทันที
              </p>
            </div>

            <div className="shrink-0">
              <CreateGroupButton canCreate={Boolean(organizerAccess?.canManageGroups)} isSignedIn={Boolean(user)} />
            </div>
          </div>

          {/* Sport Filter Chips */}
          <div className="relative mt-8 flex flex-wrap items-center gap-2 border-t border-line/60 pt-6">
            <Link
              href="/groups"
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                !filterSport || filterSport === "all"
                  ? "bg-brand text-white shadow-xs"
                  : "bg-surface-raised border border-line text-ink-soft hover:text-ink"
              }`}
            >
              🏅 ทั้งหมด
            </Link>
            {Object.entries(SPORT_TAGS).map(([key, item]) => (
              <Link
                key={key}
                href={`/groups?sport=${key}`}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  filterSport === key
                    ? "bg-brand text-white shadow-xs"
                    : "bg-surface-raised border border-line text-ink-soft hover:text-ink"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Official Facility Badminton Group Sessions */}
        {facilitySessions.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Flame className="h-4 w-4" />
                </div>
                <h2 className="font-display text-lg font-bold text-ink">
                  รอบก๊วนจัดโดยสนาม (กระดานคิวสด)
                </h2>
              </div>
              <span className="text-xs font-semibold text-brand">ระบบคิว & หารค่าลูก</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {facilitySessions.map((s: any) => {
                return (
                  <div
                    key={s.id}
                    className="card-floating flex flex-col justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand shadow-xs space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand uppercase">
                          🏸 ก๊วนสนามมาตรฐาน
                        </span>
                        <span className="font-mono text-xs font-bold text-ink-soft">
                          {s.session_date}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-ink mt-2">
                        {s.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-body-xs text-ink-soft">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                        </span>
                        <span>•</span>
                        <span>🏸 {s.shuttlecock_brand} (฿{s.shuttlecock_price}/ลูก)</span>
                        {s.entry_fee > 0 && <span>• 🎟️ ฿{s.entry_fee}</span>}
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
                        <Users className="h-3.5 w-3.5 text-brand" />
                        <span>กระดานคิวสด จัดแมตช์อัตโนมัติ</span>
                      </div>
                    </div>

                    <Link href={`/queue/${s.id}`}>
                      <button className="w-full rounded-xl py-2.5 font-bold bg-brand text-white text-body-xs shadow-xs hover:bg-brand-dark transition-colors flex items-center justify-center gap-1.5">
                        <span>ดูกระดานคิว & เข้าร่วม</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Community User Groups */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Users className="h-4 w-4" />
              </div>
              <h2 className="font-display text-lg font-bold text-ink">
                ก๊วนที่เปิดรับสมัครทั่วไป ({groups.length})
              </h2>
            </div>
            <span className="text-xs font-semibold text-ink-soft">อัปเดตแบบ Real-time</span>
          </div>

          {groups.length === 0 ? (
            <div className="card-floating p-16 text-center rounded-3xl border border-line">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">
                ยังไม่มีก๊วนที่เปิดรับสมัครในหมวดหมู่นี้
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-body-sm text-ink-soft">
                เป็นคนแรกที่เปิดก๊วนและชวนเพื่อนๆ มาร่วมสนุกไปด้วยกัน
              </p>
              <div className="mt-6">
                <CreateGroupButton canCreate={Boolean(organizerAccess?.canManageGroups)} isSignedIn={Boolean(user)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {groups.map((group) => {
                const sportTag = SPORT_TAGS[group.sport] ?? {
                  label: group.sport,
                  icon: "🏅",
                  tone: "bg-surface-raised text-ink",
                };

                const isJoined = user ? myGroupIds.has(group.id) : false;
                const isCreator = user ? group.creator_id === user.id : false;
                const isFull = group.current_players >= group.max_players;

                return (
                  <div
                    key={group.id}
                    className="card-floating flex flex-col justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand shadow-xs space-y-4"
                  >
                    <div>
                      {/* Top metadata tags */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${sportTag.tone}`}>
                          {sportTag.icon} {sportTag.label}
                        </span>
                        <span className="font-mono text-xs font-bold text-ink-soft">
                          📅 {group.play_date}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-display text-lg font-bold text-ink mt-2.5">
                        {group.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-body-xs font-semibold text-ink-soft">
                        <span>จัดโดย {creatorMap.get(group.creator_id) ?? "ผู้จัดก๊วน"}</span>
                        <OrganizerBadges badges={badgeMap.get(group.creator_id) ?? []} />
                      </div>

                      {group.description && (
                        <p className="text-body-xs text-ink-soft mt-2 line-clamp-2">
                          {group.description}
                        </p>
                      )}

                      {/* Time, Cost, Skill pills */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-body-xs font-medium">
                        <span className="flex items-center gap-1 rounded-md bg-surface-raised border border-line px-2 py-0.5 text-ink">
                          <Clock className="h-3 w-3 text-brand" />
                          {group.start_time.slice(0, 5)} - {group.end_time.slice(0, 5)}
                        </span>
                        <span className="rounded-md bg-surface-raised border border-line px-2 py-0.5 text-ink">
                          ระดับ: {group.skill_level || "ทั่วไป"}
                        </span>
                        <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          {Number(group.cost_per_person) > 0 ? `฿${group.cost_per_person}/คน` : "ฟรี"}
                        </span>
                      </div>

                      {/* Player Capacity Bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-body-xs font-semibold">
                          <span className="text-ink-soft">ผู้เล่นในก๊วน</span>
                          <span className="text-ink">
                            {group.current_players} / {group.max_players} คน
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised border border-line">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isFull ? "bg-amber-500" : "bg-brand"
                            }`}
                            style={{
                              width: `${Math.min(100, (group.current_players / group.max_players) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-line/60 flex items-center justify-end gap-3">
                      {isCreator ? (
                        <CreatorGroupButton groupId={group.id} />
                      ) : (
                        <JoinGroupButton
                          groupId={group.id}
                          isJoined={isJoined}
                          isFull={isFull}
                          isCreator={false}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
