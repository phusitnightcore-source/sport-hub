import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { bangkokToday } from "@/lib/api";
import { PLANS, effectivePlan } from "@/lib/plans";
import { formatBaht, formatBahtFromDb, toSatang } from "@/lib/money";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { MarkPaidButton } from "./MarkPaidButton";
import {
  Building2,
  GraduationCap,
  Users,
  Trophy,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const ACTION_LABEL: Record<string, string> = {
  signup: "สมัครสนามใหม่",
  create_invoice: "ออก Invoice",
  mark_invoice_paid: "ยืนยันรับชำระ",
  change_plan: "เปลี่ยนแพลน",
  downgrade_scheduled: "ตั้งลดแพลนรอบหน้า",
  suspend: "ระงับสนาม",
  activate: "คืนสถานะสนาม",
  create: "สร้างรายการ",
  verify: "ยืนยันสลิป",
  reject: "ปฏิเสธสลิป",
  confirm_refund: "ยืนยันคืนเงิน",
  checkin: "เช็คอิน",
  freeze: "ระงับสมาชิก",
  unfreeze: "เลิกระงับสมาชิก",
};

export default async function SuperAdminPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const admin = createAdminClient();
  const today = bangkokToday();
  const monthStartIso = new Date(`${today.slice(0, 7)}-01T00:00:00+07:00`).toISOString();

  const [
    { data: subs },
    { data: tenants },
    { data: pendingInvoices },
    { data: paidThisMonth },
    { data: recentPaid },
    { data: planLogs },
    { data: activity },
    bookingCount,
    memberCount,
    coachApprovedCount,
    coachPendingCount,
    groupCount,
    tournamentCount,
  ] = await Promise.all([
    supabase.from("subscriptions").select("plan, status, trial_end, grace_period_end"),
    supabase.from("tenants").select("id, status, created_at"),
    supabase
      .from("subscription_invoices")
      .select("id, invoice_number, plan_name, total_amount, due_date, tenants(name)")
      .eq("payment_status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("subscription_invoices")
      .select("total_amount")
      .eq("payment_status", "paid")
      .gte("paid_at", monthStartIso),
    supabase
      .from("subscription_invoices")
      .select("id, invoice_number, plan_name, total_amount, paid_at, tenants(name)")
      .eq("payment_status", "paid")
      .order("paid_at", { ascending: false })
      .limit(6),
    supabase
      .from("plan_change_logs")
      .select("id, from_plan, to_plan, effective_at, tenants(name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("audit_logs")
      .select("id, action, module, actor_role, created_at, tenants(name)")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("members").select("id", { count: "exact", head: true }),
    admin.from("coach_profiles").select("id", { count: "exact", head: true }).eq("approval_status", "approved"),
    admin.from("coach_profiles").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
    admin.from("groups").select("id", { count: "exact", head: true }),
    admin.from("tournaments").select("id", { count: "exact", head: true }),
  ]);

  const all = subs ?? [];
  const mrrSatang = all
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + PLANS[s.plan].priceSatang, 0);
  const countSub = (pred: (s: (typeof all)[number]) => boolean) => all.filter(pred).length;

  const tenantList = tenants ?? [];
  const totalTenants = tenantList.length;
  const suspendedCount = tenantList.filter((t) => t.status === "suspended").length;
  const newThisMonth = tenantList.filter((t) => t.created_at >= monthStartIso).length;
  const revenueThisMonthSatang = (paidThisMonth ?? []).reduce(
    (sum, i) => sum + toSatang(i.total_amount),
    0,
  );

  const pendingCoaches = coachPendingCount.count ?? 0;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display-md font-bold text-ink">ภาพรวมระบบ SportHub</h1>
        <p className="text-body-sm text-ink-soft">ศูนย์ควบคุม สถิติธุรกิจ และการดูแลแพลตฟอร์มทั้งระบบ</p>
      </div>

      {/* 1. URGENT PENDING ACTIONS */}
      {pendingCoaches > 0 && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5 text-warning-dark dark:text-warning flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Clock className="h-6 w-6 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-body">มีใบสมัครโค้ชรอการอนุมัติ {pendingCoaches} รายการ</h3>
              <p className="text-body-sm text-ink-soft mt-0.5">
                กรุณาตรวจสอบเอกสารและประวัติของโค้ชเพื่อให้สามารถแสดงผลใน Coach Marketplace
              </p>
            </div>
          </div>
          <Link href="/super-admin/coaches">
            <Button size="sm" className="rounded-xl font-bold bg-warning text-white hover:bg-warning/90 shrink-0">
              ไปตรวจใบสมัคร
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* 2. PLATFORM REVENUE & MRR */}
      <StatCard
        stats={[
          { label: "MRR (รายได้ประจำเดือน)", value: `฿${formatBaht(mrrSatang)}` },
          { label: "ARR (รายได้ต่อปีโดยประมาณ)", value: `฿${formatBaht(mrrSatang * 12)}` },
          { label: "รับชำระเดือนนี้", value: `฿${formatBaht(revenueThisMonthSatang)}` },
          { label: "สนามใหม่เดือนนี้", value: newThisMonth, unit: "สนาม" },
        ]}
      />

      {/* 3. ECOSYSTEM TOTALS (Tenants, Coaches, Groups, Tournaments) */}
      <StatCard
        stats={[
          { label: "สนามทั้งหมด", value: totalTenants, unit: "สนาม" },
          { label: "โค้ชที่อนุมัติแล้ว", value: coachApprovedCount.count ?? 0, unit: "คน" },
          { label: "ก๊วนกีฬาในระบบ", value: groupCount.count ?? 0, unit: "ก๊วน" },
          { label: "การแข่งขันทั้งหมด", value: tournamentCount.count ?? 0, unit: "รายการ" },
          { label: "การจองสนามสะสม", value: (bookingCount.count ?? 0).toLocaleString("th-TH"), unit: "ครั้ง" },
        ]}
      />

      {/* 4. SUBSCRIPTION PLANS BREAKDOWN */}
      <StatCard
        stats={[
          { label: "สนาม Active (จ่ายเงิน)", value: countSub((s) => s.status === "active" && s.plan !== "free"), unit: "สนาม" },
          { label: "Growth Plan", value: countSub((s) => s.status === "active" && s.plan === "growth"), unit: "สนาม" },
          { label: "Pro Plan", value: countSub((s) => s.status === "active" && s.plan === "pro"), unit: "สนาม" },
          { label: "Trial (ทดลองใช้)", value: countSub((s) => s.status === "trial"), unit: "สนาม" },
          { label: "ถูกระงับ (Suspended)", value: suspendedCount, unit: "สนาม" },
        ]}
      />

      {/* 5. INVOICE AWAITING VERIFICATION */}
      <div className="card-floating p-6 border border-line">
        <h2 className="mb-4 text-body font-bold text-ink">Invoice ค่าบริการรอตรวจสอบยอดโอน</h2>
        {(pendingInvoices ?? []).length === 0 ? (
          <p className="text-body-sm text-ink-soft">ไม่มีรายการค้างชำระ</p>
        ) : (
          <div className="divide-y divide-line">
            {pendingInvoices!.map((inv: any) => (
              <div key={inv.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium text-ink">{inv.tenants?.name ?? "ไม่ระบุ"}</span>
                  <span className="ml-2 font-mono text-mono-sm text-ink-soft">{inv.invoice_number}</span>
                  <p className="text-body-sm text-ink-soft">
                    แพลน {inv.plan_name} · ครบกำหนด {inv.due_date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-body font-bold text-ink">
                    ฿{formatBahtFromDb(inv.total_amount)}
                  </span>
                  <MarkPaidButton invoiceId={inv.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. RECENT ACTIVITY AUDIT LOG */}
      <div className="card-floating p-6 border border-line">
        <h2 className="mb-4 text-body font-bold text-ink">กิจกรรมล่าสุดในระบบ (Audit Log)</h2>
        {(activity ?? []).length === 0 ? (
          <p className="text-body-sm text-ink-soft">ยังไม่มีกิจกรรม</p>
        ) : (
          <div className="divide-y divide-line">
            {activity!.map((act: any) => (
              <div key={act.id} className="flex items-center justify-between py-2.5 text-body-sm">
                <div>
                  <span className="font-medium text-ink">{act.tenants?.name ?? "Platform"}</span>
                  <span className="ml-2 text-ink-soft">{ACTION_LABEL[act.action] ?? act.action}</span>
                  <span className="ml-2 text-[12px] text-ink-soft/70">({act.module})</span>
                </div>
                <span className="font-mono text-[12px] text-ink-soft">
                  {new Date(act.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
