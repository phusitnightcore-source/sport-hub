import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { getSuperAdminContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { toSatang } from "@/lib/money";
import type { PlanType } from "@/lib/plans";

// Fallback สำหรับ invoice เก่าที่ยังไม่มีคอลัมน์ plan (structured)
function planFromInvoiceName(planName: string): PlanType | null {
  if (planName.startsWith("Growth")) return "growth";
  if (planName.startsWith("Pro")) return "pro";
  return null;
}

// Super Admin (ตัวกลาง) ยืนยันรับชำระ Invoice PromptPay (§11.2)
// → invoice paid + เปิด/ต่อแพลนทันที + แจ้งเตือนสนาม
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getSuperAdminContext();
  if (!ctx) {
    return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return apiError("VALIDATION_ERROR", "รหัสรายการไม่ถูกต้อง", 400);
  }

  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("subscription_invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (!invoice) return apiError("NOT_FOUND", "ไม่พบ Invoice", 404);
  // idempotent + กันยืนยันสถานะอื่นที่ไม่ใช่ pending
  if (invoice.payment_status !== "pending") {
    return apiError("VALIDATION_ERROR", "Invoice นี้ไม่อยู่ในสถานะรอชำระ", 400);
  }

  // ใช้คอลัมน์ plan ที่เก็บไว้ตอนออก Invoice (ไม่เดาจากชื่อ) — fallback เฉพาะ row เก่า
  const plan: PlanType | null = invoice.plan ?? planFromInvoiceName(invoice.plan_name);
  if (!plan) {
    return apiError("VALIDATION_ERROR", "ไม่รู้จักแพลนใน Invoice", 400);
  }

  const now = new Date().toISOString();
  const { error: invErr } = await admin
    .from("subscription_invoices")
    .update({ payment_status: "paid", paid_at: now, payment_method: "promptpay" })
    .eq("id", invoice.id);
  if (invErr) {
    console.error("mark-paid failed:", invErr);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
  }

  // เปิด/ต่อแพลนตามรอบใน invoice — บัญชีกลับสู่แพลนภายใน 5 นาทีตาม §11.2
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
  if (subErr) {
    console.error("subscription activate failed:", subErr);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
  }

  // tenant ที่เคยถูกระงับจากค้างชำระ → กลับมา active
  await admin
    .from("tenants")
    .update({ status: "active" })
    .eq("id", invoice.tenant_id)
    .in("status", ["trial", "free", "suspended", "active"]);

  // แจ้งเตือนในแอปให้สนาม (LINE/Email ต่อคิว Module 8)
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
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: "mark_invoice_paid",
    module: "subscription",
    referenceId: invoice.id,
    after: {
      invoice_number: invoice.invoice_number,
      plan,
      amount: toSatang(invoice.total_amount) / 100,
    },
  });

  return apiOk({ status: "paid", plan });
}
