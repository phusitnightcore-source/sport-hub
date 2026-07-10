import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { PLANS, effectivePlan, daysUntil, type PlanType } from "@/lib/plans";
import { promptpayPayload } from "@/lib/promptpay";
import { toSatang, satangToBahtString, formatBahtFromDb, formatBaht } from "@/lib/money";
import { StatusPill } from "@/components/ui/StatusPill";
import { PlanActions } from "./PlanActions";
import { CancelAccountPanel } from "./CancelAccountPanel";

/* eslint-disable @next/next/no-img-element */

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" | "brand" }> = {
  trial: { label: "ทดลองใช้", tone: "brand" },
  active: { label: "ใช้งานอยู่", tone: "success" },
  grace: { label: "รอชำระ (Grace)", tone: "warning" },
  suspended: { label: "ถูกระงับ", tone: "danger" },
  cancelled: { label: "ยกเลิกแล้ว", tone: "danger" },
};

// หน้า Subscription ของสนาม (§11) — เฉพาะ venue_admin
export default async function SubscriptionPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "venue_admin") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: sub }, { data: tenant }, { data: invoices }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("tenant_id", ctx.tenantId).single(),
    supabase
      .from("tenants")
      .select("status, hard_delete_after")
      .eq("id", ctx.tenantId)
      .single(),
    supabase
      .from("subscription_invoices")
      .select("id, invoice_number, plan_name, total_amount, amount_before_vat, vat_7, due_date, payment_status, paid_at, billing_period_start, billing_period_end")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (!sub) {
    return (
      <main className="card-floating p-8 text-body text-ink">
        ไม่พบข้อมูล Subscription กรุณาติดต่อทีมงาน SportHub
      </main>
    );
  }

  const current = effectivePlan(sub);
  const st = STATUS_LABEL[sub.status] ?? STATUS_LABEL.active;
  const trialDaysLeft = sub.trial_end ? daysUntil(sub.trial_end) : 0;

  // Invoice ที่รอชำระ → แสดง QR PromptPay ของ SportHub (§11.2)
  const pending = (invoices ?? []).find((i) => i.payment_status === "pending");
  let qrDataUrl: string | null = null;
  const platformPromptpay = process.env.SPORTHUB_PROMPTPAY_ID;
  if (pending && platformPromptpay) {
    const payload = promptpayPayload(
      platformPromptpay,
      satangToBahtString(toSatang(pending.total_amount)),
    );
    qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 240 });
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        แพลนและการชำระเงิน
      </h1>

      {/* สถานะปัจจุบัน */}
      <div className="card-floating flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-body-sm text-ink-soft">แพลนปัจจุบัน</p>
          <p className="font-display text-display-md font-bold text-ink">
            {PLANS[current].name}
            {sub.status === "trial" && (
              <span className="ml-2 text-body font-medium text-ink-soft">
                (Trial เหลือ {trialDaysLeft} วัน)
              </span>
            )}
          </p>
          {sub.status === "active" && sub.current_period_end && (
            <p className="text-body-sm text-ink-soft">
              รอบปัจจุบันถึง {sub.current_period_end.slice(0, 10)}
            </p>
          )}
        </div>
        <StatusPill tone={st.tone}>{st.label}</StatusPill>
      </div>

      {/* Invoice รอชำระ + QR ของ SportHub */}
      {pending && (
        <div className="card-floating flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR PromptPay ชำระ ${pending.total_amount} บาท`}
              width={240}
              height={240}
              className="rounded-sm"
            />
          ) : (
            <p className="text-body-sm text-danger">
              ยังไม่ได้ตั้งค่า SPORTHUB_PROMPTPAY_ID
            </p>
          )}
          <div className="flex-1">
            <h2 className="text-body-lg font-medium text-ink">
              Invoice รอชำระ ·{" "}
              <span className="font-mono text-mono-sm">{pending.invoice_number}</span>
            </h2>
            <dl className="mt-3 grid max-w-xs grid-cols-2 gap-y-1 text-body-sm">
              <dt className="text-ink-soft">แพลน</dt>
              <dd className="text-right text-ink">{pending.plan_name}</dd>
              <dt className="text-ink-soft">ก่อน VAT</dt>
              <dd className="text-right text-ink">฿{formatBahtFromDb(pending.amount_before_vat)}</dd>
              <dt className="text-ink-soft">VAT 7%</dt>
              <dd className="text-right text-ink">฿{formatBahtFromDb(pending.vat_7)}</dd>
              <dt className="text-ink-soft">ยอดรวม</dt>
              <dd className="text-right font-display font-bold text-brand">
                ฿{formatBahtFromDb(pending.total_amount)}
              </dd>
              <dt className="text-ink-soft">ครบกำหนด</dt>
              <dd className="text-right text-ink">{pending.due_date}</dd>
            </dl>
            <p className="mt-3 text-body-sm text-ink-soft">
              สแกนโอนเข้าบัญชี SportHub — ทีมงานตรวจสอบและเปิดใช้แพลนภายใน 24
              ชั่วโมงหลังได้รับยอด
            </p>
          </div>
        </div>
      )}

      {/* เลือกแพลน */}
      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(PLANS) as PlanType[]).map((key) => {
          const plan = PLANS[key];
          return (
            <div key={key} className="card-floating flex flex-col gap-3 p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-body-lg font-semibold text-ink">
                  {plan.name}
                </h2>
                <p className="font-display text-display-md font-bold text-brand">
                  {plan.priceSatang === 0 ? "ฟรี" : `฿${formatBaht(plan.priceSatang)}`}
                  {plan.priceSatang > 0 && (
                    <span className="text-body-sm font-normal text-ink-soft">/เดือน</span>
                  )}
                </p>
              </div>
              <ul className="flex-1 list-disc pl-5 text-body-sm text-ink-soft">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <PlanActions
                plan={key}
                isCurrent={sub.status === "active" && sub.plan === key}
                hasPending={Boolean(pending)}
              />
            </div>
          );
        })}
      </div>

      {/* ประวัติ Invoice */}
      {(invoices ?? []).length > 0 && (
        <div className="card-floating p-6">
          <h2 className="mb-4 text-body font-medium text-ink">ประวัติ Invoice</h2>
          <table className="w-full text-body-sm">
            <thead>
              <tr className="text-left uppercase text-ink-soft">
                <th className="pb-2 font-medium">เลขที่</th>
                <th className="pb-2 font-medium">แพลน</th>
                <th className="pb-2 font-medium">รอบ</th>
                <th className="pb-2 text-right font-medium">ยอดรวม</th>
                <th className="pb-2 text-right font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((inv) => (
                <tr key={inv.id} className="border-t border-line">
                  <td className="py-2 font-mono text-mono-sm text-ink">
                    {inv.invoice_number}
                  </td>
                  <td className="py-2 text-ink">{inv.plan_name}</td>
                  <td className="py-2 text-ink-soft">
                    {inv.billing_period_start} → {inv.billing_period_end}
                  </td>
                  <td className="py-2 text-right text-ink">
                    ฿{formatBahtFromDb(inv.total_amount)}
                  </td>
                  <td className="py-2 text-right">
                    <StatusPill tone={inv.payment_status === "paid" ? "success" : "warning"}>
                      {inv.payment_status === "paid" ? "ชำระแล้ว" : "รอชำระ"}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Offboarding (§32) */}
      <CancelAccountPanel
        pendingDelete={tenant?.status === "cancelled_pending_delete"}
        hardDeleteAfter={tenant?.hard_delete_after ?? null}
      />
    </main>
  );
}
