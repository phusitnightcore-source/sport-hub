import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarSearch,
  CalendarDays,
  Clock,
  QrCode,
  GraduationCap,
  Compass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { formatBahtFromDb } from "@/lib/money";
import { CoachBookingCancelButton } from "./CoachBookingCancelButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "การจองของฉัน | SportHub",
  description: "รวมรายการจองสนามกีฬาและเวลาเรียนโค้ชของคุณทั้งหมดไว้ในที่เดียว",
};

const STATUS_CFG: Record<string, { label: string; tone: string; desc: string }> = {
  confirmed: {
    label: "ยืนยันแล้ว",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    desc: "พร้อมเข้าใช้งานได้ทันที",
  },
  pending_payment: {
    label: "รอชำระเงิน",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    desc: "กรุณาแนบสลิปเพื่อยืนยัน",
  },
  awaiting_verification: {
    label: "รอตรวจสอบสลิป",
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    desc: "สนามกำลังตรวจสอบยอดเงิน",
  },
  rejected: {
    label: "ปฏิเสธ",
    tone: "bg-danger/10 text-danger border-danger/20",
    desc: "การจองถูกยกเลิกหรือไม่ผ่าน",
  },
  cancelled: {
    label: "ยกเลิกแล้ว",
    tone: "bg-surface-raised text-ink-soft border-line",
    desc: "รายการถูกยกเลิก",
  },
  accepted: {
    label: "โค้ชตอบรับแล้ว",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    desc: "โค้ชยืนยันการสอนแล้ว",
  },
  pending: {
    label: "รอโค้ชตอบรับ",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    desc: "ส่งคำขอไปยังโค้ชแล้ว",
  },
  requested: {
    label: "รอโค้ชตอบรับ",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    desc: "ผูกกับสนามแล้วและส่งคำขอถึงโค้ชแล้ว",
  },
  completed: {
    label: "เสร็จสิ้น",
    tone: "bg-surface-raised text-ink-soft border-line",
    desc: "การฝึกสอนเสร็จสมบูรณ์",
  },
};

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "courts" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/me/bookings");

  const admin = createAdminClient();

  // Fetch court bookings
  const { data: member } = await admin
    .from("members")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const filter = member
    ? `profile_id.eq.${user.id},member_id.eq.${member.id}`
    : `profile_id.eq.${user.id}`;

  const [{ data: courtBookings }, { data: coachBookings }] = await Promise.all([
    admin
      .from("bookings")
      .select("booking_code, booking_date, start_time, end_time, total_price, status, created_at, courts(name), tenants(name, address)")
      .or(filter)
      .order("booking_date", { ascending: false })
      .limit(100),
    admin
      .from("coach_bookings")
      .select("id, court_booking_id, booking_date, start_time, end_time, total_price, status, player_note, coach_profiles(display_name, sport), coach_services(name, duration_minutes), bookings!court_booking_id(booking_code,courts(name),branches(name),tenants(name))")
      .eq("player_profile_id", user.id)
      .order("booking_date", { ascending: false })
      .limit(50),
  ]);

  const allCourtBookings = courtBookings ?? [];
  const allCoachBookings = coachBookings ?? [];

  const upcomingCourts = allCourtBookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending_payment" || b.status === "awaiting_verification"
  ).length;

  const upcomingCoaches = allCoachBookings.filter(
    (c) => c.status === "requested" || c.status === "accepted" || c.status === "confirmed" || c.status === "in_progress"
  ).length;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            การจองของฉัน
          </h1>
          <p className="text-body-sm text-ink-soft mt-1">
            ตรวจสอบรายการจองสนามกีฬา และเวลานัดเรียนกับโค้ชทั้งหมด
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/discover">
            <Button className="rounded-xl font-bold bg-brand text-white shadow-xs text-body-xs">
              <Compass className="h-4 w-4" />
              <span>จองสนามใหม่</span>
            </Button>
          </Link>
          <Link href="/coaches">
            <Button variant="secondary" className="rounded-xl font-bold border-line text-body-xs">
              <GraduationCap className="h-4 w-4 text-brand" />
              <span>หาโค้ช</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <Link
          href="/me/bookings?tab=courts"
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all ${
            tab === "courts"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-soft hover:bg-surface-raised hover:text-ink"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>การจองสนาม ({allCourtBookings.length})</span>
          {upcomingCourts > 0 && (
            <span className="rounded-full bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 font-black">
              {upcomingCourts}
            </span>
          )}
        </Link>

        <Link
          href="/me/bookings?tab=coach"
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all ${
            tab === "coach"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-soft hover:bg-surface-raised hover:text-ink"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>การเรียนกับโค้ช ({allCoachBookings.length})</span>
          {upcomingCoaches > 0 && (
            <span className="rounded-full bg-purple-500 text-white text-[10px] px-1.5 py-0.2 font-black">
              {upcomingCoaches}
            </span>
          )}
        </Link>
      </div>

      {/* 1. Court Bookings Tab */}
      {tab === "courts" && (
        <section className="space-y-4">
          {allCourtBookings.length === 0 ? (
            <div className="card-floating p-16 text-center rounded-3xl border border-line">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
                <CalendarSearch className="h-8 w-8" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">ยังไม่มีประวัติการจองสนาม</h3>
              <p className="mx-auto mt-1 max-w-sm text-body-sm text-ink-soft">
                เลือกสนามที่คุณต้องการและจองช่วงเวลาว่างได้ง่ายๆ ภายในไม่กี่นาที
              </p>
              <div className="mt-6">
                <Link href="/discover">
                  <Button className="rounded-xl font-bold bg-brand text-white shadow-xs">
                    ค้นหาสนามกีฬาเลย
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {allCourtBookings.map((b) => {
                const statusInfo = STATUS_CFG[b.status] ?? {
                  label: b.status,
                  tone: "bg-surface-raised text-ink-soft border-line",
                  desc: "",
                };

                return (
                  <div
                    key={b.booking_code}
                    className="card-floating flex flex-col justify-between rounded-3xl border border-line p-5 shadow-xs transition-all hover:border-brand/40 gap-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-body-xs font-bold text-ink bg-surface-raised border border-line rounded-lg px-2.5 py-0.5">
                            #{b.booking_code}
                          </span>
                          <span className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold border ${statusInfo.tone}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-ink mt-2">
                          {b.tenants?.name ?? "สนามกีฬา"} · {b.courts?.name ?? "คอร์ทกีฬา"}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-body-xs text-ink-soft">
                          <span className="flex items-center gap-1 font-medium">
                            <CalendarDays className="h-3.5 w-3.5 text-brand" />
                            {b.booking_date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5 text-brand" />
                            {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-brand">
                            ฿{formatBahtFromDb(b.total_price)}
                          </span>
                        </div>
                      </div>

                      {/* QR Ticket Action */}
                      <Link href={`/booking/${b.booking_code}`}>
                        <Button className="rounded-xl font-bold bg-brand text-white shadow-xs w-full sm:w-auto text-body-xs flex items-center justify-center gap-1.5">
                          <QrCode className="h-4 w-4" />
                          <span>ดูตั๋วเช็คอิน</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 2. Coach Bookings Tab */}
      {tab === "coach" && (
        <section className="space-y-4">
          {allCoachBookings.length === 0 ? (
            <div className="card-floating p-16 text-center rounded-3xl border border-line">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">ยังไม่มีนัดเรียนกับโค้ช</h3>
              <p className="mx-auto mt-1 max-w-sm text-body-sm text-ink-soft">
                ยกระดับฝีมือของคุณโดยการจองเวลาเรียนกับโค้ชผู้เชี่ยวชาญบน SportHub
              </p>
              <div className="mt-6">
                <Link href="/coaches">
                  <Button className="rounded-xl font-bold bg-brand text-white shadow-xs">
                    ค้นหาโค้ชมืออาชีพ
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {allCoachBookings.map((c) => {
                const statusInfo = STATUS_CFG[c.status] ?? {
                  label: c.status,
                  tone: "bg-surface-raised text-ink-soft border-line",
                  desc: "",
                };

                return (
                  <div
                    key={c.id}
                    className="card-floating flex flex-col justify-between rounded-3xl border border-line p-5 shadow-xs transition-all hover:border-brand/40 gap-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-0.5 text-[11px] font-bold">
                            👨‍🏫 โค้ช {c.coach_profiles?.display_name ?? "ผู้ฝึกสอน"}
                          </span>
                          <span className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold border ${statusInfo.tone}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-ink mt-2">
                          {c.coach_services?.name ?? "คอร์สฝึกสอนกีฬา"} · {c.coach_profiles?.sport ?? "กีฬา"}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-body-xs text-ink-soft">
                          <span className="flex items-center gap-1 font-medium">
                            <CalendarDays className="h-3.5 w-3.5 text-brand" />
                            {c.booking_date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5 text-brand" />
                            {c.start_time.slice(0, 5)} - {c.end_time.slice(0, 5)}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-brand">
                            ฿{formatBahtFromDb(c.total_price)}
                          </span>
                        </div>
                        {c.bookings&&<p className="mt-2 text-body-xs text-ink-soft">สนามที่ผูก: #{c.bookings.booking_code} · {c.bookings.tenants?.name} / {c.bookings.branches?.name} / {c.bookings.courts?.name}</p>}
                        {["requested","accepted","confirmed"].includes(c.status)&&<CoachBookingCancelButton id={c.id}/>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
