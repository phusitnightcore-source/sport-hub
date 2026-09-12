import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Trophy,
  Calendar,
  Clock,
  ChevronRight,
  Shield,
  Play,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ห้องควบคุมกรรมการ (Umpire Console) | SportHub",
  description: "ระบบลงคะแนนสดข้างสนามสำหรับกรรมการผู้ตัดสินแบดมินตัน BWF",
};

export default async function UmpireDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Fetch matches assigned to this umpire or all live/scheduled matches if admin/staff
  const { data: profile } = await (admin as any)
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  const isStaff = profile?.role === "venue_admin" || profile?.role === "staff";

  let matchQuery = (admin as any)
    .from("matches")
    .select("id, tournament_id, round, court_no, scheduled_at, status, team_a_id, team_b_id, winner_id, tournaments(name)")
    .order("scheduled_at", { ascending: true });

  if (!isStaff) {
    matchQuery = matchQuery.eq("umpire_id", user.id);
  }

  const { data: matches } = await matchQuery;
  const allMatches = (matches ?? []) as any[];

  // Fetch team details
  const teamIds = Array.from(
    new Set(allMatches.flatMap((m) => [m.team_a_id, m.team_b_id]).filter(Boolean))
  );

  const { data: teams } = await (admin as any)
    .from("teams")
    .select("id, name")
    .in("id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"]);

  const teamMap = new Map<string, string>(
    (teams ?? []).map((t: any) => [t.id, t.name])
  );

  const activeMatches = allMatches.filter((m) => m.status !== "completed");
  const completedMatches = allMatches.filter((m) => m.status === "completed");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-8 min-h-screen">
      {/* Header */}
      <header className="card-floating rounded-3xl border border-line bg-surface p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-brand-soft text-brand px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              <span>UMPIRE CONSOLE</span>
            </span>
            <span className="text-xs font-bold text-ink-soft">BWF Standard</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-2">
            ตารางแมตช์ที่ต้องตัดสิน
          </h1>
          <p className="text-body-xs text-ink-soft mt-1">
            ยินดีต้อนรับคุณ {profile?.full_name || "กรรมการ"} — เลือกแมตช์เพื่อเปิดระบบนับคะแนนสดข้างสนาม
          </p>
        </div>

        <Link href="/dashboard/tournaments">
          <Button variant="secondary" className="rounded-2xl border-line text-xs font-bold">
            กลับแดชบอร์ดหลัก
          </Button>
        </Link>
      </header>

      {/* Active Matches Section */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
          <Play className="h-5 w-5 text-brand" />
          <span>แมตช์ที่รอการแข่งขัน / กำลังแข่ง ({activeMatches.length})</span>
        </h2>

        {activeMatches.length === 0 ? (
          <div className="card-floating rounded-3xl border border-line bg-surface p-8 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 opacity-80" />
            <h3 className="font-display text-base font-bold text-ink">ไม่มีแมตช์ค้างในขณะนี้</h3>
            <p className="text-body-xs text-ink-soft">
              คุณตัดสินครบทุกแมตช์ที่ได้รับมอบหมายแล้ว หรือยังไม่มีการมอบหมายแมตช์ใหม่
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeMatches.map((m) => {
              const teamAName = teamMap.get(m.team_a_id) || "รอผลคู่ก่อนหน้า";
              const teamBName = teamMap.get(m.team_b_id) || "รอผลคู่ก่อนหน้า";

              return (
                <div
                  key={m.id}
                  className="card-floating rounded-3xl border border-line bg-surface p-5 hover:border-brand transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-body-xs text-ink-soft">
                      <span className="rounded-lg bg-brand-soft px-2.5 py-0.5 font-bold text-brand">
                        {m.court_no ? `คอร์ท ${m.court_no}` : "ยังไม่ระบุคอร์ท"}
                      </span>
                      <span className="font-medium text-ink">
                        🏆 {m.tournaments?.name || "การแข่งขัน"}
                      </span>
                      <span>•</span>
                      <span>รอบที่ {m.round}</span>
                    </div>

                    <div className="font-display text-lg font-black text-ink flex items-center gap-3">
                      <span className="text-brand">{teamAName}</span>
                      <span className="text-xs text-ink-soft font-mono px-2 py-0.5 bg-surface-raised rounded-md">
                        VS
                      </span>
                      <span className="text-amber-500">{teamBName}</span>
                    </div>
                  </div>

                  <Link
                    href={`/umpire/match/${m.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3 font-display text-sm font-black text-white shadow-md hover:bg-brand-dark transition-all shrink-0"
                  >
                    <span>เข้าห้องนับแต้ม</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed Matches Section */}
      {completedMatches.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-line/60">
          <h2 className="font-display text-base font-bold text-ink-soft">
            แมตช์ที่ตัดสินเสร็จสิ้นแล้ว ({completedMatches.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completedMatches.map((m) => {
              const teamAName = teamMap.get(m.team_a_id) || "—";
              const teamBName = teamMap.get(m.team_b_id) || "—";
              const winnerName = teamMap.get(m.winner_id) || "—";

              return (
                <div
                  key={m.id}
                  className="card-floating rounded-2xl border border-line bg-surface p-4 text-xs space-y-1.5 opacity-80"
                >
                  <div className="flex justify-between font-bold text-ink-soft">
                    <span>{m.tournaments?.name}</span>
                    <span className="text-emerald-600 font-bold">✓ จบแล้ว</span>
                  </div>
                  <div className="font-bold text-ink">
                    {teamAName} vs {teamBName}
                  </div>
                  <div className="text-[11px] text-amber-500 font-medium">
                    🏆 ผู้ชนะ: {winnerName}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
