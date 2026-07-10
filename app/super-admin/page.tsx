import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSuperAdminContext } from "@/lib/auth";
import { bangkokToday } from "@/lib/api";
import { PLANS, effectivePlan } from "@/lib/plans";
import { formatBaht, formatBahtFromDb, toSatang } from "@/lib/money";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { MarkPaidButton } from "./MarkPaidButton";

// ป้ายกำกับ action ในกิจกรรมล่าสุด (§24.3 Super Admin ดู audit ทุก tenant)
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

// Dashboard ภาพรวมทั้งระบบสำหรับทีม SportHub (§3.1, §11.6)
export default async function SuperAdminPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
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

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">ภาพรวมระบบ</h1>
        <p className="text-body-sm text-ink-soft">สถิติรวมทุกสนามในแพลตฟอร์ม SportHub</p>
      </div>

      {/* ภาพรวมธุรกิจ */}
      <StatCard
        stats={[
          { label: "MRR (รายได้ประจำเดือน)", value: `฿${formatBaht(mrrSatang)}` },
          { label: "ARR (รายได้ต่อปีโดยประมาณ)", value: `฿${formatBaht(mrrSatang * 12)}` },
          { label: "รับชำระเดือนนี้", value: `฿${formatBaht(revenueThisMonthSatang)}` },
          { label: "สนามใหม่เดือนนี้", value: newThisMonth, unit: "สนาม" },
        ]}
      />

      {/* สนามในระบบแยกตามสถานะ */}
      <StatCard
        stats={[
          { label: "สนามทั้งหมด", value: totalTenants, unit: "สนาม" },
          { label: "Active (จ่ายเงิน)", value: countSub((s) => s.status === "active" && s.plan !== "free"), unit: "สนาม" },
          { label: "Trial", value: countSub((s) => s.status === "trial"), unit: "สนาม" },
          { label: "Free", value: countSub((s) => effectivePlan(s) === "free"), unit: "สนาม" },
          { label: "ถูกระงับ", value: suspendedCount, unit: "สนาม" },
        ]}
      />

      {/* การใช้งานรวมทั้งระบบ */}
      <StatCard
        stats={[
          { label: "Growth", value: countSub((s) => s.status === "active" && s.plan === "growth"), unit: "สนาม" },
          { label: "Pro", value: countSub((s) => s.status === "active" && s.plan === "pro"), unit: "สนาม" },
          { label: "การจองทั้งหมด", value: (bookingCount.count ?? 0).toLocaleString("th-TH"), unit: "รายการ" },
          { label: "สมาชิกทั้งหมด", value: (memberCount.count ?? 0).toLocaleString("th-TH"), unit: "คน" },
          { label: "Invoice ค้างชำระ", value: (pendingInvoices ?? []).length, unit: "ใบ" },
        ]}
      />

      {/* Invoice รอตรวจสอบยอด — จุดที่ Super Admin เป็นตัวกลาง */}
      <div className="card-floating p-6">
        <h2 className="mb-4 text-body font-medium text-ink">Invoice รอตรวจสอบยอดโอน</h2>
        {(pendingInvoices ?? []).length === 0 ? (
          <p className="text-body-sm text-ink-soft">ไม่มีรายการค้างชำระ</p>
        ) : (
          <div className="flex flex-col gap-3">
            {(pendingInvoices ?? []).map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0"
              >
                <div>
                  <p className="text-body font-medium text-ink">
                    {inv.tenants?.name} · {inv.plan_name}
                  </p>
                  <p className="text-body-sm text-ink-soft">
                    <span className="font-mono text-mono-sm">{inv.invoice_number}</span> · ครบกำหนด{" "}
                    {inv.due_date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-bold text-brand">
                    ฿{formatBahtFromDb(inv.total_amount)}
                  </span>
                  <MarkPaidButton invoiceId={inv.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ประวัติการชำระ */}
        <div className="card-floating p-6">
          <h2 className="mb-4 text-body font-medium text-ink">การชำระล่าสุด</h2>
          {(recentPaid ?? []).length === 0 ? (
            <p className="text-body-sm text-ink-soft">ยังไม่มีรายการ</p>
          ) : (
            <ul className="flex flex-col gap-2 text-body-sm">
              {(recentPaid ?? []).map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">
                    {inv.tenants?.name} · {inv.plan_name}
                  </span>
                  <span className="shrink-0 text-ink-soft">฿{formatBahtFromDb(inv.total_amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ประวัติเปลี่ยนแพลน */}
        <div className="card-floating p-6">
          <h2 className="mb-4 text-body font-medium text-ink">Upgrade / Downgrade ล่าสุด</h2>
          {(planLogs ?? []).length === 0 ? (
            <p className="text-body-sm text-ink-soft">ยังไม่มีรายการ</p>
          ) : (
            <ul className="flex flex-col gap-2 text-body-sm">
              {(planLogs ?? []).map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">{log.tenants?.name}</span>
                  <StatusPill
                    tone={
                      PLANS[log.to_plan].priceSatang >= PLANS[log.from_plan].priceSatang
                        ? "success"
                        : "warning"
                    }
                  >
                    {PLANS[log.from_plan].name} → {PLANS[log.to_plan].name}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* กิจกรรมล่าสุดทั้งระบบ (§24.3) */}
      <div className="card-floating p-6">
        <h2 className="mb-4 text-body font-medium text-ink">กิจกรรมล่าสุดทั้งระบบ</h2>
        {(activity ?? []).length === 0 ? (
          <p className="text-body-sm text-ink-soft">ยังไม่มีกิจกรรม</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {(activity ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-body-sm">
                <span className="min-w-0 flex-1 truncate text-ink">
                  <span className="text-ink-soft">{a.tenants?.name ?? "ระบบ"}</span> ·{" "}
                  {ACTION_LABEL[a.action] ?? a.action}
                  <span className="text-ink-soft"> ({a.module})</span>
                </span>
                <span className="shrink-0 font-mono text-mono-sm text-ink-soft">
                  {new Date(a.created_at).toLocaleString("th-TH", {
                    timeZone: "Asia/Bangkok",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
