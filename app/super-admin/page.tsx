import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSuperAdminContext } from "@/lib/auth";
import { PLANS, effectivePlan } from "@/lib/plans";
import { formatBaht, formatBahtFromDb } from "@/lib/money";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { MarkPaidButton } from "./MarkPaidButton";

// Dashboard Subscription ของ Super Admin (§11.6)
export default async function SuperAdminPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const [{ data: subs }, { data: pendingInvoices }, { data: recentPaid }, { data: planLogs }] =
    await Promise.all([
      supabase.from("subscriptions").select("plan, status, trial_end"),
      supabase
        .from("subscription_invoices")
        .select("id, invoice_number, plan_name, total_amount, due_date, tenants(name)")
        .eq("payment_status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("subscription_invoices")
        .select("id, invoice_number, plan_name, total_amount, paid_at, tenants(name)")
        .eq("payment_status", "paid")
        .order("paid_at", { ascending: false })
        .limit(8),
      supabase
        .from("plan_change_logs")
        .select("id, from_plan, to_plan, effective_at, tenants(name)")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const all = subs ?? [];
  // MRR = ผลรวมราคาแพลนของ subscription ที่ active (ไม่รวม trial/free)
  const mrrSatang = all
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + PLANS[s.plan].priceSatang, 0);
  const countBy = (pred: (s: (typeof all)[number]) => boolean) =>
    all.filter(pred).length;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        ภาพรวมระบบ
      </h1>

      <StatCard
        stats={[
          { label: "MRR", value: `฿${formatBaht(mrrSatang)}` },
          { label: "Trial", value: countBy((s) => s.status === "trial"), unit: "สนาม" },
          {
            label: "Free",
            value: countBy((s) => effectivePlan(s) === "free"),
            unit: "สนาม",
          },
          {
            label: "Growth",
            value: countBy((s) => s.status === "active" && s.plan === "growth"),
            unit: "สนาม",
          },
          {
            label: "Pro",
            value: countBy((s) => s.status === "active" && s.plan === "pro"),
            unit: "สนาม",
          },
          {
            label: "ค้างชำระ",
            value: (pendingInvoices ?? []).length,
            unit: "ใบ",
          },
        ]}
      />

      {/* Invoice รอตรวจสอบยอด — จุดที่ Super Admin เป็นตัวกลาง */}
      <div className="card-floating p-6">
        <h2 className="mb-4 text-body font-medium text-ink">
          Invoice รอตรวจสอบยอดโอน
        </h2>
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
                    <span className="font-mono text-mono-sm">{inv.invoice_number}</span>{" "}
                    · ครบกำหนด {inv.due_date}
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
                  <span className="shrink-0 text-ink-soft">
                    ฿{formatBahtFromDb(inv.total_amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ประวัติเปลี่ยนแพลน */}
        <div className="card-floating p-6">
          <h2 className="mb-4 text-body font-medium text-ink">
            Upgrade / Downgrade ล่าสุด
          </h2>
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
    </main>
  );
}
