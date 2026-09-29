import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CalendarSearch,
  Compass,
  Users,
  Trophy,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Flame,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  QrCode,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import RankBadge from "@/components/badminton/RankBadge";
import { UnfreezeButton } from "./UnfreezeButton";
import { PrivacyPanel } from "./PrivacyPanel";
import { MemberCard } from "./card/MemberCard";
import { getOrganizerAccessForUser } from "@/lib/organizer";
import { OrganizerBadges } from "@/components/ui/OrganizerBadge";
import { createMemberQrToken } from "@/lib/membership/qr";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "พื้นที่ของฉัน | SportHub Player Hub",
  description: "แดชบอร์ดศูนย์รวมกิจกรรมนักกีฬา จัดการการจอง ก๊วน และสถิติของคุณ",
};

export default async function MemberPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/me");

  const admin = createAdminClient();

  // Fetch comprehensive player context
  const [
    { data: profile },
    { data: member },
    { data: userRoles },
    { data: upcomingBookings },
    { data: groupMemberships },
    { data: coachBookings },
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    admin
      .from("members")
      .select("*, packages(name, type, sessions_limit), tenants(name)")
      .eq("profile_id", user.id)
      .maybeSingle(),
    admin
      .from("user_roles")
      .select("role")
      .eq("profile_id", user.id)
      .eq("is_active", true),
    admin
      .from("bookings")
      .select("booking_code, booking_date, start_time, end_time, status, courts(name), tenants(name)")
      .eq("profile_id", user.id)
      .in("status", ["confirmed", "pending_payment", "awaiting_verification"])
      .gte("booking_date", new Date().toISOString().split("T")[0])
      .order("booking_date", { ascending: true })
      .limit(3),
    admin
      .from("group_members")
      .select("group_id")
      .eq("profile_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(3),
    admin
      .from("coach_bookings")
      .select("id, booking_date, start_time, end_time, status, coach_profiles(display_name, sport)")
      .eq("player_profile_id", user.id)
      .in("status", ["requested", "accepted", "confirmed"])
      .gte("booking_date", new Date().toISOString().split("T")[0])
      .order("booking_date", { ascending: true })
      .limit(3),
  ]);

  const roles = (userRoles?.map((r) => r.role) ?? []) as string[];
  const isCoach = roles.includes("coach");
  const organizerAccess = await getOrganizerAccessForUser(admin, user.id);

  const displayName = profile?.display_name || profile?.full_name || user.email?.split("@")[0] || "นักกีฬา";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";
  const mmr = profile?.mmr || 1000;
  const skillLevel = profile?.skill_level || "มือทั่วไป";

  // Total count stats
  const { count: totalBookingsCount } = await admin
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  const { count: totalGroupsCount } = await admin
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  const nextBooking = upcomingBookings?.[0];
  const nextCoachSession = coachBookings?.[0];
  const initialMemberQr = member ? createMemberQrToken(member.id) : null;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10 pb-24 md:pb-12">
      {/* 1. Hero Player Profile Card */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-brand/5 p-6 sm:p-8 shadow-sm">
        {/* Glow orb */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar with status indicator */}
            <div className="relative">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark font-display text-3xl font-black text-white shadow-md ring-4 ring-brand/20">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
              <span
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-surface text-white"
                title="Active Player"
              >
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl sm:text-3xl font-black text-ink">
                  {displayName}
                </h1>
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand uppercase tracking-wider">
                  Player
                </span>
                {isCoach && (
                  <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold text-purple-600 dark:text-purple-400">
                    Coach
                  </span>
                )}
                <OrganizerBadges badges={organizerAccess?.badges ?? []} showLabels />
              </div>

              <p className="mt-1 text-body-sm text-ink-soft truncate">
                {profile?.email}
              </p>

              {/* Rank & Skill Badge */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <RankBadge mmr={mmr} size="md" />
                <span className="rounded-lg border border-line bg-surface-raised px-2.5 py-1 text-xs font-bold text-ink">
                  ระดับ: {skillLevel}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-brand">
                  <Flame className="h-3.5 w-3.5 text-orange-500 animate-bounce" />
                  <span>MMR {mmr}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions in Hero */}
          <div className="flex flex-wrap items-center gap-2.5 sm:flex-col sm:items-end">
            <Link href="/discover" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto rounded-xl bg-brand text-white font-bold shadow-xs hover:bg-brand-dark">
                <Compass className="h-4 w-4" />
                <span>จองสนามด่วน</span>
              </Button>
            </Link>
            <Link href="/groups" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto rounded-xl font-bold border-line">
                <Users className="h-4 w-4 text-brand" />
                <span>หาก๊วนเล่น</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Player Metric Counters */}
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-line/60 pt-6">
          <div className="rounded-2xl border border-line/60 bg-surface-raised/70 p-3.5 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-ink-soft flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-brand" /> การจองทั้งหมด
            </span>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {totalBookingsCount ?? 0} <span className="text-xs font-normal text-ink-soft">ครั้ง</span>
            </p>
          </div>

          <div className="rounded-2xl border border-line/60 bg-surface-raised/70 p-3.5 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-ink-soft flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-indigo-500" /> ก๊วนที่เข้าร่วม
            </span>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {totalGroupsCount ?? 0} <span className="text-xs font-normal text-ink-soft">ก๊วน</span>
            </p>
          </div>

          <div className="rounded-2xl border border-line/60 bg-surface-raised/70 p-3.5 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-ink-soft flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> คะแนนอันดับ
            </span>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {mmr} <span className="text-xs font-normal text-ink-soft">Pts</span>
            </p>
          </div>

          <div className="rounded-2xl border border-line/60 bg-surface-raised/70 p-3.5 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-ink-soft flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> สถานะบัญชี
            </span>
            <p className="mt-1 font-display text-sm font-bold text-emerald-600 dark:text-emerald-400">
              ยืนยันแล้ว
            </p>
          </div>
        </div>
      </section>

      {/* 2. Upcoming Activity Banner (If any upcoming reservation) */}
      {nextBooking && (
        <section className="rounded-2xl border border-brand/30 bg-brand/5 p-5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-xs">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand uppercase tracking-wider">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  การจองที่กำลังจะถึง
                </span>
                <h3 className="font-display text-base font-bold text-ink mt-0.5">
                  {nextBooking.tenants?.name ?? "สนามกีฬา"} · {nextBooking.courts?.name}
                </h3>
                <p className="text-body-sm text-ink-soft mt-0.5 flex flex-wrap items-center gap-2">
                  <span>📅 {nextBooking.booking_date}</span>
                  <span>•</span>
                  <span>⏰ {nextBooking.start_time.slice(0, 5)} - {nextBooking.end_time.slice(0, 5)}</span>
                  <span>•</span>
                  <span className="font-mono font-bold text-ink">#{nextBooking.booking_code}</span>
                </p>
              </div>
            </div>

            <Link href={`/booking/${nextBooking.booking_code}`}>
              <Button className="rounded-xl font-bold bg-brand text-white shadow-xs w-full sm:w-auto">
                <QrCode className="h-4 w-4" />
                <span>แสดงตั๋ว QR เช็คอิน</span>
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* 3. Core Action Launchers (6 Service Pillars) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand" />
            <span>บริการสำหรับนักกีฬา</span>
          </h2>
          <span className="text-xs font-semibold text-ink-soft">ระบบนิเวศครบวงจร</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Discover Venues */}
          <Link
            href="/discover"
            className="group card-floating flex flex-col justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand hover:shadow-md"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <Compass className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink group-hover:text-brand transition-colors">
                ค้นหา & จองสนาม
              </h3>
              <p className="mt-1 text-body-sm text-ink-soft">
                ค้นหาสนามแบด ฟุตบอล เทนนิส ใกล้ฉัน พร้อมเช็คตารางว่างแบบ Real-time
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand">
              จองสนามเลย <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          {/* Card 2: Community Groups */}
          <Link
            href="/groups"
            className="group card-floating flex flex-col justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand hover:shadow-md"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink group-hover:text-brand transition-colors">
                ก๊วนกีฬา & จัดก๊วน
              </h3>
              <p className="mt-1 text-body-sm text-ink-soft">
                หาเพื่อนตีแบด เล่นกีฬา หรือสร้างก๊วนของตัวเองเพื่อหารค่าสนาม
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand">
              ดูก๊วนทั้งหมด <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          {/* Card 3: Tournaments */}
          <Link
            href="/tournaments"
            className="group card-floating flex flex-col justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand hover:shadow-md"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink group-hover:text-brand transition-colors">
                การแข่งขัน & ทัวร์นาเมนต์
              </h3>
              <p className="mt-1 text-body-sm text-ink-soft">
                สมัครแข่งขันทัวร์นาเมนต์ ดูสายแข่ง (Bracket) และลุ้นรับรางวัล
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand">
              ดูตารางแข่ง <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          {/* Card 4: Coaches */}
          <Link
            href="/coaches"
            className="group card-floating flex flex-col justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand hover:shadow-md"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink group-hover:text-brand transition-colors">
                หาโค้ช & ติวเข้มฝีมือ
              </h3>
              <p className="mt-1 text-body-sm text-ink-soft">
                เรียนกับโค้ชมืออาชีพที่มีใบรับรอง กำหนดเวลาเรียนแบบ 1-on-1 หรือกลุ่ม
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand">
              ค้นหาโค้ช <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          {/* Card 5: Leaderboard */}
          <Link
            href="/leaderboard"
            className="group card-floating flex flex-col justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand hover:shadow-md"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink group-hover:text-brand transition-colors">
                อันดับ Leaderboard
              </h3>
              <p className="mt-1 text-body-sm text-ink-soft">
                ตรวจเช็คอันดับ Elo Rating และ MMR ของคุณเทียบกับผู้เล่นทั่วประเทศ
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand">
              ดูอันดับทั้งหมด <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          {/* Card 6: My Bookings & History */}
          <Link
            href="/me/bookings"
            className="group card-floating flex flex-col justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand hover:shadow-md"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                <CalendarSearch className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink group-hover:text-brand transition-colors">
                ประวัติการจองของฉัน
              </h3>
              <p className="mt-1 text-body-sm text-ink-soft">
                ดูสลิปการโอน ยืนยันการจองย้อนหลัง ตรวจสอบสถานะ และขอใบเสร็จ
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand">
              ดูประวัติการจอง <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      {/* 4. Facility Membership Card (If applicable) */}
      {member && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-ink">
            บัตรสมาชิกฟิตเนส / สนาม
          </h2>
          <MemberCard
            member={member}
            tenantName={member.tenants?.name || "SportHub"}
            initialQr={initialMemberQr!}
          />
          <div className="grid grid-cols-2 gap-4">
            <Link href="/me/renew">
              <Button variant="primary" className="w-full rounded-2xl font-bold">
                ต่ออายุแพ็กเกจ
              </Button>
            </Link>
            {member.status === "frozen" ? (
              <UnfreezeButton />
            ) : member.status === "active" ? (
              <Link href="/me/freeze">
                <Button variant="secondary" className="w-full rounded-2xl font-bold">
                  ระงับชั่วคราว (Freeze)
                </Button>
              </Link>
            ) : null}
          </div>
        </section>
      )}

      {/* 5. Role Upgrade Banner */}
      <section className="rounded-3xl border border-line bg-surface-raised p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              ต้องการต่อยอดทักษะกีฬาของคุณ?
            </h3>
            <p className="text-body-sm text-ink-soft mt-1 max-w-xl">
              คุณสามารถใช้บัญชีนี้ยื่นขออัปเกรดเป็น <strong>โค้ชผู้สอน (Coach)</strong> หรือลงทะเบียน <strong>สนามกีฬา (Facility Owner)</strong> เพื่อเปิดรับจองออนไลน์ได้ทันที
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {!isCoach && (
            <Link href="/me/coach/apply" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto rounded-xl font-bold">
                สมัครเป็นโค้ช
              </Button>
            </Link>
          )}
          <Link href="/signup" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto rounded-xl font-bold bg-brand text-white">
              เปิดรับจองสนาม
            </Button>
          </Link>
        </div>
      </section>

      {/* 6. Privacy & PDPA */}
      <PrivacyPanel optOut={Boolean(member?.broadcast_opt_out)} />
    </main>
  );
}
