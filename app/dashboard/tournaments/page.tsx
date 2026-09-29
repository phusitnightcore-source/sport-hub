import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Trophy,
  Plus,
  Calendar,
  Users,
  Award,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "จัดการการแข่งขัน | แดชบอร์ดสนาม",
  description: "ระบบจัดการการแข่งขัน ทัวร์นาเมนต์ จัดสายแข่ง และบันทึกผลคะแนน",
};

const STATUS_MAP: Record<string, { label: string; tone: string }> = {
  draft: { label: "ฉบับร่าง", tone: "bg-surface-raised text-ink-soft border-line" },
  registration_open: {
    label: "เปิดรับสมัคร",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  registration_closed: {
    label: "ปิดรับสมัคร",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  in_progress: {
    label: "กำลังแข่งขัน",
    tone: "bg-brand-soft text-brand border-brand/20",
  },
  completed: {
    label: "จบการแข่งขัน",
    tone: "bg-surface-raised text-ink border-line",
  },
};

export default async function DashboardTournamentsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "venue_admin") redirect("/dashboard");

  const admin = createAdminClient();

  const { data: tournaments } = await (admin as any)
    .from("tournaments")
    .select("id, name, sport, start_date, end_date, entry_fee, max_teams, bracket_type, status, prize_info, created_at")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  const allTournaments = (tournaments ?? []) as any[];

  const openCount = allTournaments.filter((t) => t.status === "registration_open").length;
  const inProgCount = allTournaments.filter((t) => t.status === "in_progress").length;
  const completedCount = allTournaments.filter((t) => t.status === "completed").length;

  return (
    <main className="flex flex-col gap-8 pb-16">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
            <Trophy className="h-8 w-8 text-amber-500" />
            <span>จัดการการแข่งขัน (Tournaments)</span>
          </h1>
          <p className="text-body-sm text-ink-soft mt-1">
            สร้างทัวร์นาเมนต์ จัดสายการแข่งขัน (Bracket) และบันทึกผลคะแนนการแข่งขัน
          </p>
        </div>

        <Link
          href="/dashboard/tournaments/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-body-sm font-bold text-white shadow-xs hover:bg-brand-dark transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>สร้างการแข่งขันใหม่</span>
        </Link>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card-floating rounded-2xl border border-line p-4">
          <span className="text-body-xs font-semibold text-ink-soft">รายการทั้งหมด</span>
          <p className="mt-1 font-display text-2xl font-black text-ink">{allTournaments.length}</p>
        </div>
        <div className="card-floating rounded-2xl border border-line p-4">
          <span className="text-body-xs font-semibold text-emerald-600 dark:text-emerald-400">
            เปิดรับสมัคร
          </span>
          <p className="mt-1 font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {openCount}
          </p>
        </div>
        <div className="card-floating rounded-2xl border border-line p-4">
          <span className="text-body-xs font-semibold text-brand">กำลังแข่งขัน</span>
          <p className="mt-1 font-display text-2xl font-black text-brand">{inProgCount}</p>
        </div>
        <div className="card-floating rounded-2xl border border-line p-4">
          <span className="text-body-xs font-semibold text-ink-soft">จบการแข่งขันแล้ว</span>
          <p className="mt-1 font-display text-2xl font-black text-ink-soft">{completedCount}</p>
        </div>
      </div>

      {/* Tournament List */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink">
          รายการแข่งขันของสนาม ({allTournaments.length})
        </h2>

        {allTournaments.length === 0 ? (
          <div className="card-floating p-16 text-center rounded-3xl border border-line space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">ยังไม่มีรายการแข่งขัน</h3>
            <p className="text-body-sm text-ink-soft max-w-sm mx-auto">
              สร้างรายการแข่งขันเพื่อเปิดรับสมัครนักกีฬา จัดสายแข่ง และบันทึกคะแนน Elo ให้ผู้เล่น
            </p>
            <div className="pt-3">
              <Link
                href="/dashboard/tournaments/new"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-body-sm font-bold text-white shadow-xs hover:bg-brand-dark transition-all"
              >
                + สร้างการแข่งขันแรก
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {allTournaments.map((t) => {
              const statusCfg = STATUS_MAP[t.status] ?? {
                label: t.status,
                tone: "bg-surface-raised text-ink-soft border-line",
              };

              return (
                <div
                  key={t.id}
                  className="card-floating flex flex-col justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand shadow-xs space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand uppercase">
                        🏅 {t.sport}
                      </span>
                      <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold border ${statusCfg.tone}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-bold text-ink mt-3">
                      {t.name}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-body-xs text-ink-soft">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-brand" />
                        {t.start_date} {t.end_date ? `— ${t.end_date}` : ""}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        <Users className="h-3.5 w-3.5 text-brand" />
                        รับสูงสุด {t.max_teams} ทีม
                      </span>
                    </div>

                    {t.prize_info && (
                      <p className="mt-2 text-[12px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                        🏆 {t.prize_info}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-line/60 flex items-center justify-between">
                    <span className="font-display text-base font-bold text-brand">
                      {Number(t.entry_fee) > 0 ? `฿${t.entry_fee} / ทีม` : "ฟรี"}
                    </span>

                    <Link
                      href={`/dashboard/tournaments/${t.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-raised px-3.5 py-1.5 text-body-xs font-bold text-ink hover:text-brand hover:border-brand transition-all"
                    >
                      <span>จัดการสายแข่ง & คะแนน</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
