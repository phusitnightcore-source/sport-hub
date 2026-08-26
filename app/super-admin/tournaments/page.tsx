import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { Trophy, Calendar, Building2, Users } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import Link from "next/link";

export const metadata = {
  title: "จัดการการแข่งขัน | Super Admin",
};

export default async function SuperAdminTournamentsPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();

  const { data: tournaments } = await admin
    .from("tournaments")
    .select(
      "id, name, sport, start_date, end_date, entry_fee, max_teams, bracket_type, status, created_at, tenants(name)"
    )
    .order("created_at", { ascending: false });

  const allTournaments = tournaments ?? [];

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display-md font-bold text-ink">
          จัดการการแข่งขัน (Tournaments & Leagues)
        </h1>
        <p className="text-body-sm text-ink-soft">
          ภาพรวมและสถานะการแข่งขันทั้งหมดที่จัดขึ้นบนแพลตฟอร์ม SportHub
        </p>
      </div>

      {allTournaments.length === 0 ? (
        <div className="card-floating flex flex-col items-center gap-3 p-12 text-center border border-line">
          <Trophy className="h-10 w-10 text-ink-soft/40" />
          <h3 className="font-bold text-body-lg text-ink">ยังไม่มีรายการแข่งขันในระบบ</h3>
          <p className="text-body-sm text-ink-soft">เมื่อสนามหรือผู้จัดสร้างทัวร์นาเมนต์ รายการจะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allTournaments.map((t: any) => {
            const isReg = t.status === "registration_open";
            const isInProg = t.status === "in_progress";
            const isDone = t.status === "completed";

            const tone: "success" | "warning" | "danger" | "brand" = isDone
              ? "success"
              : isInProg
              ? "brand"
              : isReg
              ? "warning"
              : "brand";

            const label = isReg
              ? "เปิดรับสมัคร"
              : isInProg
              ? "กำลังแข่งขัน"
              : isDone
              ? "จบการแข่งขัน"
              : t.status;

            return (
              <div
                key={t.id}
                className="card-floating flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 font-bold shadow-xs">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-body-lg font-bold text-ink">
                        {t.name}
                      </h3>
                      <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                        {t.sport}
                      </span>
                    </div>

                    <p className="text-body-sm text-ink-soft mt-1 flex flex-wrap items-center gap-3">
                      <span>สนาม: {t.tenants?.name || "ไม่ระบุ"}</span>
                      <span>• เริ่ม: {t.start_date}</span>
                      <span>• รูปแบบ: {t.bracket_type}</span>
                      {t.entry_fee > 0 && <span>• ค่าสมัคร: ฿{t.entry_fee}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:justify-end border-t border-line/60 pt-3 sm:border-t-0 sm:pt-0">
                  <StatusPill tone={tone}>{label}</StatusPill>
                  <Link
                    href={`/tournaments/${t.id}`}
                    target="_blank"
                    className="rounded-xl border border-line bg-surface px-3 py-1.5 text-body-sm font-semibold text-ink-soft hover:text-brand hover:bg-brand-soft/40 transition-colors"
                  >
                    ดูรายละเอียด
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
