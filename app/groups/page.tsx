import { createAdminClient } from "@/lib/supabase/admin";
import { PublicNav } from "@/components/ui/PublicNav";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Zap,
  UserPlus,
} from "lucide-react";

export const metadata = {
  title: "ก๊วน & หาคู่แข่ง | SportHub",
  description:
    "หาก๊วนเล่นกีฬา ร่วมกลุ่ม หรือสร้างก๊วนของตัวเองได้ที่ SportHub",
};

export default async function GroupsPage() {
  const admin = createAdminClient();

  let groups: {
    id: string;
    sport: string;
    title: string;
    description: string | null;
    play_date: string;
    start_time: string;
    end_time: string;
    max_players: number;
    current_players: number;
    skill_level: string | null;
    cost_per_person: number | null;
    status: string;
  }[] = [];

  let facilitySessions: any[] = [];

  try {
    const [{ data: gData }, { data: sData }] = await Promise.all([
      admin
        .from("groups")
        .select(
          "id, sport, title, description, play_date, start_time, end_time, max_players, current_players, skill_level, cost_per_person, status",
        )
        .in("status", ["open", "full"])
        .gte("play_date", new Date().toISOString().split("T")[0])
        .order("play_date")
        .limit(50),
      admin
        .from("group_sessions")
        .select("*, group_session_players(id)")
        .in("status", ["open", "in_progress"])
        .gte("session_date", new Date().toISOString().split("T")[0])
        .order("session_date")
        .limit(20),
    ]);
    groups = gData ?? [];
    facilitySessions = sData ?? [];
  } catch {
    // Table may not exist yet
  }

  const openGroups = groups.filter((g) => g.status === "open");
  const fullGroups = groups.filter((g) => g.status === "full");

  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand/20 to-brand/5">
            <Users className="h-8 w-8 text-brand" />
          </div>
          <h1 className="font-display text-display-lg font-bold text-ink">
            ก๊วนกีฬา & จัดก๊วนแบดมินตัน
          </h1>
          <p className="mt-2 text-body text-ink-soft">
            หาเพื่อนเล่นกีฬา เข้าร่วมก๊วนแบดมินตันประจำวัน หรือดูกระดานคิวสด Real-time
          </p>
        </header>

        {/* Official Facility Badminton Group Sessions */}
        {facilitySessions.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-body-lg font-bold text-ink flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>รอบก๊วนแบดมินตันที่เปิดรับสมัคร ({facilitySessions.length})</span>
              </h2>
              <span className="text-[12px] font-semibold text-brand">ระบบคิวสด & หารค่าลูก</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {facilitySessions.map((s: any) => {
                const playerCount = s.group_session_players?.length ?? 0;
                return (
                  <div
                    key={s.id}
                    className="card-floating flex flex-col justify-between rounded-3xl border border-line bg-surface p-5 transition-all hover:border-brand shadow-sm space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand uppercase">
                          🏸 ก๊วนแบดมินตัน
                        </span>
                        <span className="font-mono text-body-sm font-bold text-ink">
                          {s.session_date}
                        </span>
                      </div>

                      <h3 className="font-display text-body-lg font-bold text-ink mt-2">
                        {s.title}
                      </h3>

                      <p className="text-body-sm text-ink-soft mt-1 flex flex-wrap items-center gap-2">
                        <span>⏰ {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                        <span>•</span>
                        <span>🏸 {s.shuttlecock_brand} (฿{s.shuttlecock_price}/ลูก)</span>
                        {s.entry_fee > 0 && <span>• 🎟️ ฿{s.entry_fee}</span>}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-soft">
                        <Users className="h-3.5 w-3.5 text-brand" />
                        <span>ผู้เล่นเข้าร่วมแล้ว <strong className="text-ink font-mono">{playerCount}</strong> คน</span>
                      </div>
                    </div>

                    <Link href={`/queue/${s.id}`}>
                      <Button className="w-full rounded-2xl font-bold bg-brand text-white shadow-xs">
                        🏸 ดูกระดานคิว & กดเข้าร่วมก๊วน
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {groups.length === 0 ? (
          <div className="card-floating p-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
              <UserPlus className="h-10 w-10 text-brand" />
            </div>
            <h2 className="font-display text-body-lg font-semibold text-ink">
              เร็วๆ นี้!
            </h2>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-soft">
              ระบบก๊วนและหาคู่แข่งกำลังอยู่ระหว่างพัฒนา
              คุณจะสามารถสร้างก๊วน เชิญเพื่อน และหารค่าสนามได้ในเร็วๆ นี้
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-radius-sm bg-brand px-5 py-2.5 text-body-sm font-semibold text-white transition-all hover:bg-brand-dark"
              >
                <Zap className="h-4 w-4" />
                จองสนามเลย
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Open Groups */}
            {openGroups.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-4 font-display text-body-lg font-semibold text-ink">
                  ก๊วนที่เปิดรับ ({openGroups.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {openGroups.map((group) => (
                    <div
                      key={group.id}
                      className="card-floating flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-mono-sm text-brand">
                            {group.sport}
                          </span>
                          {group.skill_level && (
                            <span className="ml-2 rounded-full bg-surface px-2.5 py-1 text-mono-sm text-ink-soft ring-1 ring-inset ring-line">
                              {group.skill_level}
                            </span>
                          )}
                        </div>
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-mono-sm font-medium text-success">
                          เปิดรับ
                        </span>
                      </div>
                      <h3 className="font-display text-body font-semibold text-ink">
                        {group.title}
                      </h3>
                      {group.description && (
                        <p className="line-clamp-2 text-body-sm text-ink-soft">
                          {group.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-body-sm text-ink-soft">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(group.play_date).toLocaleDateString(
                            "th-TH",
                            { day: "numeric", month: "short" },
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {group.start_time.slice(0, 5)}–
                          {group.end_time.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {group.current_players}/{group.max_players} คน
                        </span>
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                        {group.cost_per_person !== null ? (
                          <span className="text-body-sm font-semibold text-ink">
                            ฿
                            {new Intl.NumberFormat("th-TH").format(
                              Number(group.cost_per_person),
                            )}
                            /คน
                          </span>
                        ) : (
                          <span className="text-body-sm text-ink-soft">
                            ฟรี
                          </span>
                        )}
                        <span className="text-body-sm font-medium text-brand">
                          ต้องการอีก{" "}
                          {group.max_players - group.current_players} คน
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Full Groups */}
            {fullGroups.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-body-lg font-semibold text-ink">
                  ก๊วนเต็มแล้ว ({fullGroups.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {fullGroups.map((group) => (
                    <div
                      key={group.id}
                      className="card-floating flex flex-col gap-3 p-5 opacity-70"
                    >
                      <div className="flex items-start justify-between">
                        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-mono-sm text-brand">
                          {group.sport}
                        </span>
                        <span className="rounded-full bg-ink-soft/10 px-2.5 py-1 text-mono-sm text-ink-soft">
                          เต็มแล้ว
                        </span>
                      </div>
                      <h3 className="font-display text-body font-semibold text-ink">
                        {group.title}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-body-sm text-ink-soft">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(group.play_date).toLocaleDateString(
                            "th-TH",
                            { day: "numeric", month: "short" },
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {group.max_players}/{group.max_players} คน
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
