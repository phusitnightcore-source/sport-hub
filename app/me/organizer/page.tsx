import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CalendarClock, Trophy, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizerAccess } from "@/lib/organizer";
import { OrganizerBadges } from "@/components/ui/OrganizerBadge";
import { OrganizerPlans } from "./OrganizerPlans";

export const dynamic = "force-dynamic";

const PLAN_LABELS = {
  group_host: "ผู้จัดก๊วน",
  tournament_host: "ผู้จัดทัวร์นาเมนต์",
  organizer_pro: "Organizer Pro",
} as const;

const ORDER_STATUS_LABELS: Record<string, string> = {
  awaiting_verification: "รอตรวจสอบ",
  paid: "เปิดสิทธิ์แล้ว",
  rejected: "ไม่ผ่านการตรวจสอบ",
  expired: "หมดอายุ",
};

export default async function OrganizerHubPage() {
  const access = await getCurrentOrganizerAccess();
  if (!access) redirect("/login?next=/me/organizer");
  const admin = createAdminClient();
  const [{ data: plans }, { data: orders }] = await Promise.all([
    admin.from("organizer_plans").select("code,name,description,price_satang,can_manage_groups,can_manage_tournaments").eq("is_active", true).order("price_satang"),
    admin.from("organizer_subscription_orders").select("id,plan_code,amount_satang,status,created_at,review_note").eq("profile_id", access.userId).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="rounded-3xl border border-line bg-gradient-to-br from-brand/10 via-surface to-violet-500/10 p-7">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-black text-ink">Organizer Hub</h1>
          <OrganizerBadges badges={access.badges} showLabels />
        </div>
        <p className="mt-2 text-ink-soft">พื้นที่สำหรับผู้จัดก๊วนและผู้จัดการแข่งขันที่ได้รับการยืนยัน</p>
      </header>

      {!access.isFacilityOwner && access.subscription?.status === "active" && access.subscription.currentPeriodEnd && (access.canManageGroups || access.canManageTournaments) && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-success/25 bg-success/10 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success text-white"><BadgeCheck className="h-6 w-6" /></span>
            <div><p className="font-display font-bold text-ink">แพ็กเกจ {PLAN_LABELS[access.subscription.planCode]}</p><p className="text-body-sm text-ink-soft">สิทธิ์พร้อมใช้งานทุกอุปกรณ์</p></div>
          </div>
          <p className="rounded-full bg-surface px-3 py-1.5 text-body-sm font-bold text-success">ใช้ได้ถึง {new Date(access.subscription.currentPeriodEnd).toLocaleDateString("th-TH", { dateStyle: "long" })}</p>
        </section>
      )}

      {(access.canManageGroups || access.canManageTournaments) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {access.canManageGroups && <Link href="/groups" className="card-floating rounded-2xl border border-line p-5 hover:border-brand"><Users className="h-6 w-6 text-brand" /><h2 className="mt-3 font-display text-lg font-bold text-ink">จัดการก๊วนกีฬา</h2><p className="text-body-sm text-ink-soft">สร้างก๊วนใหม่และรับสมาชิก</p></Link>}
          {access.canManageTournaments && <Link href="/me/organizer/tournaments" className="card-floating rounded-2xl border border-line p-5 hover:border-brand"><Trophy className="h-6 w-6 text-amber-500" /><h2 className="mt-3 font-display text-lg font-bold text-ink">จัดการแข่งขัน</h2><p className="text-body-sm text-ink-soft">สร้างทัวร์นาเมนต์ จัดสาย และบันทึกผล</p></Link>}
        </section>
      )}

      {!access.isFacilityOwner && <section className="space-y-4"><div><h2 className="font-display text-2xl font-black text-ink">แพ็กเกจรายเดือน</h2><p className="text-body-sm text-ink-soft">สิทธิ์เริ่มหลังทีมตรวจหลักฐาน และต่ออายุจากวันหมดอายุเดิม</p></div><OrganizerPlans plans={plans ?? []} promptpayId={process.env.SPORTHUB_PROMPTPAY_ID ?? null} /></section>}

      {(orders ?? []).length > 0 && <section className="space-y-3"><h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><CalendarClock className="h-5 w-5 text-brand" /> ประวัติการสมัคร</h2>{(orders ?? []).map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-4"><div><p className="font-bold text-ink">{PLAN_LABELS[order.plan_code]}</p><p className="text-body-xs text-ink-soft">{new Date(order.created_at).toLocaleString("th-TH")}</p></div><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span></div>)}</section>}
    </main>
  );
}
