import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  Plus,
  ArrowRight,
  Users,
  Calendar,
  Clock,
  ExternalLink,
  Tv,
  Trophy,
  Swords,
  Layers,
  Wallet,
  UserCheck,
  Award,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/badminton/supabase/server";
import { bangkokToday } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Event, EventPlayer, Match } from "@/types/badminton";

export const metadata = {
  title: "ระบบก๊วนแบดมินตัน | SportHub",
  description: "ศูนย์ควบคุมและบริหารจัดการก๊วนแบดมินตัน",
};

export default async function GroupSessionsHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = bangkokToday();

  // Fetch Badminton Group events, players, matches
  const [{ data: eventsData }, { data: playersData }, { data: matchesData }] =
    await Promise.all([
      supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("event_players")
        .select("id, event_id, is_checked_in, payment_status"),
      supabase
        .from("matches")
        .select("id, event_id, status"),
    ]);

  const rawEvents = (eventsData ?? []) as Event[];
  const allPlayers = (playersData ?? []) as {
    id: string;
    event_id: string;
    is_checked_in: boolean;
    payment_status: string;
  }[];
  const allMatches = (matchesData ?? []) as {
    id: string;
    event_id: string;
    status: string;
  }[];

  // Active / Open event
  const activeEvent = rawEvents.find((e) => e.status === "open") || rawEvents[0] || null;

  const activePlayers = activeEvent
    ? allPlayers.filter((p) => p.event_id === activeEvent.id)
    : [];
  const activeMatches = activeEvent
    ? allMatches.filter((m) => m.event_id === activeEvent.id)
    : [];

  const checkedInCount = activePlayers.filter((p) => p.is_checked_in).length;
  const paidCount = activePlayers.filter((p) => p.payment_status === "paid").length;
  const playingMatchesCount = activeMatches.filter((m) => m.status === "playing").length;
  const finishedMatchesCount = activeMatches.filter((m) => m.status === "finished").length;

  return (
    <div className="space-y-8 animate-in">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              𝗦𝗽𝗼𝗿𝘁𝗛𝘂𝗯 𝗚𝗿𝗼𝘂𝗽
            </h1>
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand">
              Badminton Hub
            </span>
          </div>
          <p className="mt-1 text-body-sm text-ink-soft">
            ศูนย์ควบคุมระบบก๊วนแบดมินตัน จัดคิวอัตโนมัติ คำนวณค่าลูก และบอร์ดสดเรียลไทม์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/badminton-group/dashboard">
            <Button variant="secondary" size="md" className="gap-1.5 font-semibold">
              <ExternalLink className="h-4 w-4" />
              <span>หน้าระบบก๊วนเต็ม</span>
            </Button>
          </Link>

          <Link href="/badminton-group/dashboard/admin/events/create">
            <Button variant="primary" size="md" className="gap-2 font-bold shadow-md shadow-brand/20">
              <Plus className="h-5 w-5" />
              <span>เปิดก๊วนใหม่</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              สถานะก๊วน
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-ink">
            {activeEvent?.status === "open" ? "กำลังเปิดก๊วน" : "ไม่มีก๊วนที่เปิด"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {activeEvent ? `วันที่ ${new Date(activeEvent.event_date).toLocaleDateString("th-TH")}` : "กดเปิดก๊วนเพื่อเริ่ม"}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              ผู้เล่นในก๊วน
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-ink">
            {activePlayers.length} <span className="text-sm font-semibold text-ink-soft">คน</span>
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-semibold">
            เช็คอินแล้ว {checkedInCount} คน
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              แมตช์การแข่งขัน
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Swords className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-ink">
            {playingMatchesCount} <span className="text-sm font-semibold text-amber-600">กำลังแข่ง</span>
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            แข่งเสร็จแล้ว {finishedMatchesCount} แมตช์
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              การชำระเงิน
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-ink">
            {paidCount} / {activePlayers.length}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {activePlayers.length - paidCount > 0 ? `รอชำระ ${activePlayers.length - paidCount} คน` : "ชำระครบทุกคนแล้ว"}
          </p>
        </div>
      </div>

      {/* Active Session Spotlight */}
      {activeEvent && activeEvent.status === "open" ? (
        <div className="relative overflow-hidden rounded-3xl border border-brand/20 bg-gradient-to-br from-brand-soft/40 via-surface to-surface p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  ก๊วนที่กำลังเปิดอยู่
                </span>
                <span className="text-xs font-bold text-ink-soft">
                  คอร์ท {activeEvent.courts?.join(", ") || "1, 2"}
                </span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
                ก๊วนวันที่ {new Date(activeEvent.event_date).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h2>

              <p className="text-body-sm text-ink-soft">
                ลูกแบด: <strong className="text-ink">{activeEvent.shuttlecock_brand}</strong> (฿{activeEvent.shuttlecock_price}/ลูก) · ค่าสนาม ฿{activeEvent.entry_fee} · {activePlayers.length} ผู้เล่นลงทะเบียน
              </p>
            </div>

            {/* Quick Management Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/badminton-group/dashboard/admin/matches/${activeEvent.id}`}>
                <Button variant="primary" size="lg" className="gap-2 font-bold shadow-md shadow-brand/20">
                  <Swords className="h-5 w-5" />
                  <span>จัดคิว & จัดแมตช์</span>
                </Button>
              </Link>

              <Link href={`/badminton-group/dashboard/admin/events/${activeEvent.id}`}>
                <Button variant="secondary" size="lg" className="gap-2 font-bold">
                  <Users className="h-5 w-5" />
                  <span>จัดการผู้เล่น & คิดเงิน</span>
                </Button>
              </Link>

              <Link href={`/badminton-group/live/${activeEvent.id}`} target="_blank">
                <Button variant="secondary" size="lg" className="gap-2 font-bold">
                  <Tv className="h-5 w-5 text-brand" />
                  <span>จอ Live Board</span>
                  <ArrowUpRight className="h-4 w-4 opacity-50" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-line bg-surface/50 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-sm">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-xl font-bold text-ink">
            ยังไม่มีก๊วนที่เปิดอยู่ในขณะนี้
          </h3>
          <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-soft">
            กดปุ่มเปิดก๊วนเพื่อกำหนดวันที่ คอร์ทที่ใช้งาน ราคาลูกแบด และเริ่มรับผู้เล่นเข้าคิวได้ทันที
          </p>
          <div className="mt-6">
            <Link href="/badminton-group/dashboard/admin/events/create">
              <Button variant="primary" size="lg" className="gap-2 font-bold shadow-md shadow-brand/20">
                <Plus className="h-5 w-5" />
                <span>เปิดก๊วนแบดมินตันใหม่</span>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Events List / History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              รายการก๊วนทั้งหมด
            </h3>
            <p className="text-xs text-ink-soft">
              ประวัติก๊วนย้อนหลัง และสถานะการจัดกิจกรรม
            </p>
          </div>
          <Link href="/badminton-group/dashboard/admin/events" className="text-xs font-bold text-brand hover:underline">
            ดูทั้งหมด ({rawEvents.length}) →
          </Link>
        </div>

        {rawEvents.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center text-ink-soft">
            ไม่มีประวัติก๊วนในระบบ
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rawEvents.slice(0, 9).map((event) => {
              const count = allPlayers.filter((p) => p.event_id === event.id).length;
              const isToday = event.event_date === today;

              return (
                <div
                  key={event.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-surface p-5 shadow-xs transition-all hover:border-brand/40 hover:shadow-md ${
                    event.status === "open"
                      ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
                      : "border-line"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          event.status === "open"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-ink-soft/10 text-ink-soft"
                        }`}
                      >
                        {event.status === "open" ? "กำลังเปิด" : "ปิดแล้ว"}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
                          วันนี้
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-display text-base font-bold text-ink group-hover:text-brand transition-colors">
                        ก๊วนวันที่ {new Date(event.event_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                      </h4>
                      <p className="mt-1 text-xs text-ink-soft">
                        {event.shuttlecock_brand} · ฿{event.shuttlecock_price}/ลูก · {count} ผู้เล่น
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-line/60 pt-4">
                    <Link
                      href={`/badminton-group/dashboard/admin/events/${event.id}`}
                      className="flex-1"
                    >
                      <Button variant="secondary" size="sm" className="w-full font-semibold">
                        จัดการก๊วน
                      </Button>
                    </Link>

                    <Link
                      href={`/badminton-group/dashboard/admin/matches/${event.id}`}
                      className="flex-1"
                    >
                      <Button variant="primary" size="sm" className="w-full font-bold">
                        จัดแมตช์
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
