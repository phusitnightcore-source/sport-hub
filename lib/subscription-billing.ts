import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import type { PlanType } from "@/lib/plans";
import { logAudit } from "@/lib/audit";

type Admin = ReturnType<typeof createAdminClient>;
type Invoice = Database["public"]["Tables"]["subscription_invoices"]["Row"];

// fallback สำหรับ invoice เก่าที่ยังไม่มีคอลัมน์ plan (structured)
function planFromInvoiceName(planName: string): PlanType | null {
  if (planName.startsWith("Growth")) return "growth";
  if (planName.startsWith("Pro")) return "pro";
  return null;
}

// ยืนยัน invoice ว่าชำระแล้ว → เปิด/ต่อแพลน + ปลดระงับ tenant + แจ้งเตือนในแอป (§11.2)
// ใช้ร่วมกัน: super-admin กด mark-paid (PromptPay) และ Omise webhook (charge.complete)
// idempotent: ทำงานเฉพาะ invoice ที่ยัง pending
export async function activatePaidInvoice(
  admin: Admin,
  invoice: Invoice,
  method: "promptpay" | "omise",
  actor?: { id: string; role: "super_admin" | "venue_admin" },
): Promise<{ ok: boolean; plan?: PlanType; error?: string }> {
  if (invoice.payment_status !== "pending") {
    return { ok: false, error: "invoice ไม่อยู่ในสถานะรอชำระ" };
  }
  const plan: PlanType | null = invoice.plan ?? planFromInvoiceName(invoice.plan_name);
  if (!plan) return { ok: false, error: "ไม่รู้จักแพลนใน invoice" };

  const now = new Date().toISOString();

  const { error: invErr } = await admin
    .from("subscription_invoices")
    .update({ payment_status: "paid", paid_at: now, payment_method: method })
    .eq("id", invoice.id)
    .eq("payment_status", "pending"); // กัน race (double activate)
  if (invErr) return { ok: false, error: invErr.message };

  const { error: subErr } = await admin
    .from("subscriptions")
    .update({
      plan,
      status: "active",
      current_period_start: invoice.billing_period_start,
      current_period_end: invoice.billing_period_end,
      next_billing_date: invoice.billing_period_end,
      last_payment_date: now,
      last_payment_amount: invoice.total_amount,
      grace_period_end: null,
    })
    .eq("tenant_id", invoice.tenant_id);
  if (subErr) return { ok: false, error: subErr.message };

  await admin
    .from("tenants")
    .update({ status: "active" })
    .eq("id", invoice.tenant_id)
    .in("status", ["trial", "free", "suspended", "active"]);

  await admin.from("notifications").insert({
    tenant_id: invoice.tenant_id,
    recipient_type: "admin",
    type: "system",
    channel: "in_app",
    title: "ชำระ Subscription สำเร็จ",
    body: `Invoice ${invoice.invoice_number} ชำระแล้ว — แพลน ${invoice.plan_name} ใช้งานได้ทันที`,
    reference_id: invoice.id,
    reference_type: "subscription",
    status: "sent",
    sent_at: now,
  });

  await logAudit({
    tenantId: invoice.tenant_id,
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? "super_admin",
    action: "mark_invoice_paid",
    module: "subscription",
    referenceId: invoice.id,
    after: { invoice_number: invoice.invoice_number, plan, method },
  });

  return { ok: true, plan };
}
