import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError, bangkokToday } from "@/lib/api";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { PLANS, prorateUpgradeSatang, type PlanType } from "@/lib/plans";
import { satangToBahtString } from "@/lib/money";

const bodySchema = z.object({
  plan: z.enum(["free", "growth", "pro"]),
});

const DAY_MS = 24 * 60 * 60_000;

function addMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// สนามเลือกแพลน (§11.2) — เฉพาะ venue_admin
// growth/pro → ออก Invoice pending (ชำระ QR PromptPay ของ SportHub แล้ว
// Super Admin ยืนยัน) / upgrade กลางรอบ → คิดเฉพาะส่วนต่าง pro-rata (§11.4)
// downgrade → มีผลรอบถัดไป (§11.4)
export async function POST(request: Request) {
  const ctx = await getStaffContext();
  if (!ctx || ctx.role !== "venue_admin") {
    return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "แพลนไม่ถูกต้อง", 400);
  }
  const targetPlan = parsed.data.plan as PlanType;

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .single();
  if (!sub) {
    return apiError("NOT_FOUND", "ไม่พบข้อมูล Subscription", 404);
  }

  const today = bangkokToday();

  // ---- เลือก Free: ไม่มี invoice ----
  if (targetPlan === "free") {
    if (sub.plan === "free" && sub.status !== "trial") {
      return apiError("VALIDATION_ERROR", "ใช้แพลน Free อยู่แล้ว", 400);
    }
    const isPaidActive =
      sub.status === "active" &&
      sub.current_period_end &&
      new Date(sub.current_period_end).getTime() > Date.now();
    if (isPaidActive) {
      // downgrade มีผลรอบถัดไป — ใช้ฟีเจอร์เดิมได้จนหมดรอบ (§11.4)
      await admin.from("plan_change_logs").insert({
        tenant_id: ctx.tenantId,
        from_plan: sub.plan,
        to_plan: "free",
        effective_at: sub.current_period_end!,
      });
      await logAudit({
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        actorRole: ctx.role,
        action: "downgrade_scheduled",
        module: "subscription",
        referenceId: sub.id,
        after: { to_plan: "free", effective_at: sub.current_period_end },
      });
      return apiOk({
        result: "scheduled",
        message: `จะเปลี่ยนเป็น Free เมื่อหมดรอบวันที่ ${sub.current_period_end!.slice(0, 10)}`,
      });
    }
    await admin
      .from("subscriptions")
      .update({ plan: "free", status: "active" })
      .eq("id", sub.id);
    await admin.from("plan_change_logs").insert({
      tenant_id: ctx.tenantId,
      from_plan: sub.plan,
      to_plan: "free",
    });
    await logAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: "change_plan",
      module: "subscription",
      referenceId: sub.id,
      after: { plan: "free" },
    });
    return apiOk({ result: "changed", plan: "free" });
  }

  // ---- growth / pro ----
  const isPaidActive =
    sub.status === "active" &&
    sub.current_period_end &&
    new Date(sub.current_period_end).getTime() > Date.now();

  if (isPaidActive && sub.plan === targetPlan) {
    return apiError("VALIDATION_ERROR", "ใช้แพลนนี้อยู่แล้ว", 400);
  }

  // downgrade แพลนจ่ายเงิน (pro→growth): มีผลรอบถัดไป ไม่ออก invoice ตอนนี้ (§11.4)
  if (
    isPaidActive &&
    PLANS[targetPlan].priceSatang < PLANS[sub.plan].priceSatang
  ) {
    await admin.from("plan_change_logs").insert({
      tenant_id: ctx.tenantId,
      from_plan: sub.plan,
      to_plan: targetPlan,
      effective_at: sub.current_period_end!,
    });
    await logAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: "downgrade_scheduled",
      module: "subscription",
      referenceId: sub.id,
      after: { to_plan: targetPlan, effective_at: sub.current_period_end },
    });
    return apiOk({
      result: "scheduled",
      message: `จะเปลี่ยนเป็น ${PLANS[targetPlan].name} เมื่อหมดรอบวันที่ ${sub.current_period_end!.slice(0, 10)}`,
    });
  }

  // มี invoice pending อยู่แล้ว → ส่งใบเดิมกลับ (idempotent)
  const { data: existing } = await admin
    .from("subscription_invoices")
    .select("id, invoice_number, total_amount")
    .eq("tenant_id", ctx.tenantId)
    .eq("payment_status", "pending")
    .maybeSingle();
  if (existing) {
    return apiOk({
      result: "pending_invoice",
      invoiceNumber: existing.invoice_number,
      message: "มี Invoice รอชำระอยู่แล้ว กรุณาชำระใบเดิมก่อน",
    });
  }

  // คำนวณยอด: upgrade กลางรอบคิด pro-rata เฉพาะส่วนต่าง / นอกนั้นเต็มเดือน
  let totalSatang: number;
  let periodStart: string;
  let periodEnd: string;
  let prorate = false;
  if (isPaidActive) {
    const endMs = new Date(sub.current_period_end!).getTime();
    const startMs = new Date(sub.current_period_start!).getTime();
    const daysLeft = Math.max(1, Math.ceil((endMs - Date.now()) / DAY_MS));
    const daysInPeriod = Math.max(1, Math.round((endMs - startMs) / DAY_MS));
    totalSatang = prorateUpgradeSatang({
      fromPlan: sub.plan,
      toPlan: targetPlan,
      daysLeft,
      daysInPeriod,
    });
    periodStart = today;
    periodEnd = sub.current_period_end!.slice(0, 10);
    prorate = true;
  } else {
    totalSatang = PLANS[targetPlan].priceSatang;
    periodStart = today;
    periodEnd = addMonth(today);
  }

  // ออก Invoice ตาม §11.3 — เลขรันต่อเดือน INV-YYYYMM-XXXX
  const { count } = await admin
    .from("subscription_invoices")
    .select("id", { count: "exact", head: true });
  const ym = today.slice(0, 7).replace("-", "");
  const invoiceNumber = `INV-${ym}-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const vatSatang = totalSatang - Math.round(totalSatang / 1.07);
  const dueDate = new Date(Date.now() + 3 * DAY_MS).toISOString().slice(0, 10);

  const { data: invoice, error } = await admin
    .from("subscription_invoices")
    .insert({
      tenant_id: ctx.tenantId,
      invoice_number: invoiceNumber,
      plan: targetPlan, // structured — mark-paid ใช้อันนี้ ไม่ต้องเดาจากชื่อ
      plan_name: PLANS[targetPlan].name + (prorate ? " (Pro-rata upgrade)" : ""),
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      amount_before_vat: Number(satangToBahtString(totalSatang - vatSatang)),
      vat_7: Number(satangToBahtString(vatSatang)),
      total_amount: Number(satangToBahtString(totalSatang)),
      due_date: dueDate,
      payment_method: "promptpay",
      payment_status: "pending",
    })
    .select("id, invoice_number, total_amount")
    .single();
  if (error) {
    console.error("invoice insert failed:", error);
    return apiError("INTERNAL_ERROR", "ออก Invoice ไม่สำเร็จ กรุณาลองใหม่", 500);
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "create_invoice",
    module: "subscription",
    referenceId: invoice.id,
    after: {
      invoice_number: invoice.invoice_number,
      plan: targetPlan,
      total: invoice.total_amount,
    },
  });

  return apiOk(
    {
      result: "invoice_created",
      invoiceNumber: invoice.invoice_number,
      totalAmount: invoice.total_amount,
    },
    201,
  );
}
