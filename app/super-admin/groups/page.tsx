import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { Users, MapPin, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import Link from "next/link";

export const metadata = {
  title: "จัดการก๊วนกีฬา | Super Admin",
};

export default async function SuperAdminGroupsPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();

  const { data: groups } = await admin
    .from("groups")
    .select(
      "id, title, sport, play_date, start_time, end_time, max_players, current_players, skill_level, cost_per_person, status, created_at, profiles(first_name, last_name, phone)"
    )
    .order("created_at", { ascending: false });

  const allGroups = groups ?? [];

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display-md font-bold text-ink">
          จัดการก๊วนกีฬา (Community Groups)
        </h1>
        <p className="text-body-sm text-ink-soft">
          ตรวจสอบและดูแลก๊วนกีฬาที่ผู้ใช้งานสร้างขึ้นบนแพลตฟอร์ม
        </p>
      </div>

      {allGroups.length === 0 ? (
        <div className="card-floating flex flex-col items-center gap-3 p-12 text-center border border-line">
          <Users className="h-10 w-10 text-ink-soft/40" />
          <h3 className="font-bold text-body-lg text-ink">ยังไม่มีก๊วนกีฬาในระบบ</h3>
          <p className="text-body-sm text-ink-soft">เมื่อผู้ใช้งานสร้างก๊วนเพื่อหาก๊วนเล่นกีฬา รายการจะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allGroups.map((g: any) => {
            const tone: "success" | "warning" | "danger" | "brand" =
              g.status === "open"
                ? "brand"
                : g.status === "full"
                ? "warning"
                : g.status === "completed"
                ? "success"
                : "danger";

            const label =
              g.status === "open"
                ? "เปิดรับสมาชิก"
                : g.status === "full"
                ? "คนเต็มแล้ว"
                : g.status === "completed"
                ? "จบก๊วนแล้ว"
                : "ยกเลิกแล้ว";

            return (
              <div
                key={g.id}
                className="card-floating flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand font-bold shadow-xs">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-body-lg font-bold text-ink">
                        {g.title}
                      </h3>
                      <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                        {g.sport}
                      </span>
                    </div>

                    <p className="text-body-sm text-ink-soft mt-1 flex flex-wrap items-center gap-3">
                      <span>ผู้สร้าง: {g.profiles?.first_name} {g.profiles?.last_name || ""}</span>
                      <span>• วันที่เล่น: {g.play_date} ({g.start_time.slice(0, 5)} - {g.end_time.slice(0, 5)})</span>
                      <span>• สมาชิก: {g.current_players} / {g.max_players} คน</span>
                      {g.cost_per_person && <span>• ฿{g.cost_per_person}/คน</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:justify-end border-t border-line/60 pt-3 sm:border-t-0 sm:pt-0">
                  <StatusPill tone={tone}>{label}</StatusPill>
                  <Link
                    href={`/groups/${g.id}`}
                    target="_blank"
                    className="rounded-xl border border-line bg-surface px-3 py-1.5 text-body-sm font-semibold text-ink-soft hover:text-brand hover:bg-brand-soft/40 transition-colors"
                  >
                    ดูหน้าก๊วน
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
