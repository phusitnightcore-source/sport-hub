import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DollarSign, ChevronLeft } from "lucide-react";
import { formatBahtFromDb } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ประมาณการรายได้จากงานสอน | Coach Hub",
  description: "สรุปมูลค่างานสอนที่จบแล้ว โดยไม่ใช้แทนหลักฐานรับชำระหรือ payout",
};

export default async function CoachEarningsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: coach } = await admin
    .from("coach_profiles")
    .select("id, display_name")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!coach) redirect("/me/coach");

  // Fetch coach bookings
  const { data: bookings } = await admin
    .from("coach_bookings")
    .select("id, booking_date, start_time, end_time, total_price, status, created_at, player_profile_id, coach_services(name)")
    .eq("coach_profile_id", coach.id)
    .order("booking_date", { ascending: false });

  const allBookings = bookings ?? [];

  // Fetch player profiles for bookings
  const playerIds = [...new Set(allBookings.map((b) => b.player_profile_id))];
  const { data: players } = await admin
    .from("profiles")
    .select("id, display_name, full_name")
    .in("id", playerIds);

  const playerMap = new Map((players ?? []).map((p) => [p.id,p]));

  // Calculate earnings
  const completed = allBookings.filter((b) => b.status === "completed");
  const totalGross = completed.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  const platformFee = Math.round(totalGross * 0.1); // 10% platform fee
  const netEarnings = totalGross - platformFee;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 pb-20">
      <Link
        href="/me/coach"
        className="inline-flex items-center gap-1 text-body-sm font-semibold text-ink-soft hover:text-brand transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>กลับไปแดชบอร์ดโค้ช</span>
      </Link>

      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
          <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <span>ประมาณการรายได้จากงานสอน</span>
        </h1>
        <p className="text-body-sm text-ink-soft mt-1">
          นับเฉพาะงานที่กดจบแล้ว ยอดนี้ไม่ใช่หลักฐานรับเงินหรือสถานะ payout
        </p>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card-floating rounded-2xl border border-line p-5">
          <span className="text-body-xs font-semibold text-ink-soft">ค่าสอนที่จบแล้ว (Gross)</span>
          <p className="mt-1 font-display text-2xl font-black text-ink">
            ฿{new Intl.NumberFormat("th-TH").format(totalGross)}
          </p>
        </div>

        <div className="card-floating rounded-2xl border border-line p-5">
          <span className="text-body-xs font-semibold text-ink-soft">ประมาณการค่าบริการ (10%)</span>
          <p className="mt-1 font-display text-2xl font-black text-rose-500">
            -฿{new Intl.NumberFormat("th-TH").format(platformFee)}
          </p>
        </div>

        <div className="card-floating rounded-2xl border border-line p-5">
          <span className="text-body-xs font-semibold text-emerald-600 dark:text-emerald-400">
            รายได้สุทธิ (Net Payout)
          </span>
          <p className="mt-1 font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ฿{new Intl.NumberFormat("th-TH").format(netEarnings)}
          </p>
        </div>

        <div className="card-floating rounded-2xl border border-line p-5">
          <span className="text-body-xs font-semibold text-brand">ชั่วโมงที่สอนสำเร็จ</span>
          <p className="mt-1 font-display text-2xl font-black text-brand">
            {completed.length} <span className="text-xs font-normal text-ink-soft">ครั้ง</span>
          </p>
        </div>
      </div>

      <p className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-body-sm text-ink">ระบบค่าสอนยังแยกจากการชำระค่าคอร์ท กรุณาตรวจหลักฐานรับเงินกับผู้เรียนโดยตรงก่อนถือว่าได้รับเงินจริง</p>

      {/* Breakdown List */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink">
          ประวัติการสอน & รับเงิน ({allBookings.length})
        </h2>

        {allBookings.length === 0 ? (
          <div className="card-floating rounded-3xl border border-line p-12 text-center text-body-sm text-ink-soft">
            ยังไม่มีประวัติการจองเรียน เมื่อมีผู้เรียนจองและเรียนสำเร็จ รายการจะแสดงที่นี่
          </div>
        ) : (
          <div className="card-floating rounded-3xl border border-line overflow-hidden shadow-xs divide-y divide-line/60">
            {allBookings.map((b) => {
              const player = playerMap.get(b.player_profile_id);
              const playerName = player?.display_name || player?.full_name || "ผู้เรียน";
              const isPaid = b.status === "completed";

              return (
                <div
                  key={b.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-body-sm font-bold text-ink">
                        {playerName}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-body-xs text-ink-soft">
                      <span>{b.coach_services?.name || "คอร์สสอนกีฬา"}</span>
                      <span>•</span>
                      <span>📅 {b.booking_date}</span>
                      <span>•</span>
                      <span>⏰ {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="font-mono text-base font-extrabold text-brand">
                      ฿{formatBahtFromDb(b.total_price)}
                    </span>
                    <span className="block text-[10px] text-ink-soft">
                      {isPaid ? `ประมาณการสุทธิ: ฿${formatBahtFromDb(Math.round(Number(b.total_price) * 0.9))}` : "ยังไม่นับเป็นรายได้"}
                    </span>
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
