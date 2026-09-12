"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffContext, hasPermission, type StaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { canUsePosBranch } from "@/lib/pos/access";
import type { CounterReport } from "@/lib/pos/types";

const checkoutSchema = z.object({
  checkoutKey: z.string().uuid(),
  expectedTotal: z.number().finite().min(0).max(1_000_000),
  cashReceived: z.number().finite().min(0).max(1_000_000).nullable(),
  paymentConfirmed: z.literal(true),
  paymentReference: z.string().trim().max(120).optional(),
  branchId: z.string().uuid(),
  shiftId: z.string().uuid(),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(100) }))
    .min(1)
    .max(100),
  paymentMethod: z.enum(["cash", "transfer", "card", "other"]),
  customerName: z.string().trim().max(120).optional(),
  customerPhone: z.string().trim().max(30).optional(),
  bookingCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional(),
  discountAmount: z.number().min(0).max(1_000_000).default(0),
});

const canUseBranch = canUsePosBranch;

export async function openShift(branchId: string, startingCash: number) {
  if (!z.number().finite().min(0).max(1000000).safeParse(startingCash).success) return { error: "ยอดเงินตั้งต้นไม่ถูกต้อง" };
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "use_pos")) return { error: "คุณไม่มีสิทธิ์ใช้งาน POS" };
  if (!(await canUseBranch(ctx, branchId))) return { error: "คุณไม่มีสิทธิ์ใช้งานสาขานี้" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("open_pos_shift", {
    p_tenant_id: ctx.tenantId,
    p_branch_id: branchId,
    p_staff_id: ctx.staffId,
    p_starting_cash: startingCash,
  });

  if (error) return { error: error.message };
  
  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "open_pos_shift",
    module: "pos_shifts",
    referenceId: data,
    after: { branchId, startingCash },
  });

  revalidatePath("/pos");
  return { success: true, shiftId: data };
}

export async function closeShift(shiftId: string, actualCash: number, notes?: string) {
  if (!z.number().finite().min(0).max(1000000).safeParse(actualCash).success || (notes?.length ?? 0) > 500) return { error: "ข้อมูลปิดกะไม่ถูกต้อง" };
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "use_pos")) return { error: "คุณไม่มีสิทธิ์ใช้งาน POS" };

  const admin = createAdminClient();
  const { data: shift } = await admin.from("pos_shifts").select("branch_id").eq("id", shiftId).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!shift || !(await canUseBranch(ctx, shift.branch_id))) return { error: "ไม่มีสิทธิ์ใช้งานกะนี้" };
  const { error } = await admin.rpc("close_pos_shift", {
    p_tenant_id: ctx.tenantId,
    p_shift_id: shiftId,
    p_staff_id: ctx.staffId,
    p_actual_cash: actualCash,
    p_notes: notes || null,
  });

  if (error) return { error: error.message };

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "close_pos_shift",
    module: "pos_shifts",
    referenceId: shiftId,
    after: { actualCash, notes },
  });

  revalidatePath("/pos");
  return { success: true };
}

export async function getActiveShift(branchId: string) {
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "use_pos") || !(await canUseBranch(ctx, branchId))) return { error: "ไม่มีสิทธิ์ใช้งานสาขานี้" };
  const admin = createAdminClient();
  let query = admin
    .from("pos_shifts")
    .select("id, opened_at, starting_cash")
    .eq("tenant_id", ctx.tenantId)
    .eq("branch_id", branchId)
    .eq("status", "open")
    .is("closed_at", null);



  const { data, error } = await query.maybeSingle();
  if (error) return { error: error.message };
  return { data };
}

export async function getShiftReport(shiftId: string) {
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "use_pos")) return { error: "ไม่มีสิทธิ์" };
  const admin = createAdminClient();
  
  // 1. Get shift info
  const { data: shift, error: shiftErr } = await admin
    .from("pos_shifts")
    .select("*")
    .eq("id", shiftId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (shiftErr || !shift) return { error: "ไม่พบข้อมูลกะ" };

  if (!(await canUseBranch(ctx, shift.branch_id))) return { error: "ไม่มีสิทธิ์ดูกะนี้" };
  const { data, error } = await admin.rpc("pos_counter_report", { p_tenant_id: ctx.tenantId, p_shift_id: shiftId });
  if (error) return { error: "โหลดรายงานไม่สำเร็จ ตรวจสอบว่าระบบ POS อัปเดตครบแล้ว" };
  return { success: true, data: data as unknown as CounterReport };
}

export async function completePosSale(input: z.input<typeof checkoutSchema>) {
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "use_pos")) {
    return { error: "คุณไม่มีสิทธิ์ใช้งาน POS" };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "ข้อมูลการขายไม่ถูกต้อง" };
  const sale = parsed.data;
  if (!(await canUseBranch(ctx, sale.branchId))) {
    return { error: "คุณไม่มีสิทธิ์ใช้งานสาขานี้" };
  }

  const admin = createAdminClient();
  let bookingId: string | null = null;
  let customerName = sale.customerName || null;
  let customerPhone = sale.customerPhone || null;
  if (sale.bookingCode) {
    const { data: booking } = await admin
      .from("bookings")
      .select("id, branch_id, user_name, user_phone")
      .eq("tenant_id", ctx.tenantId)
      .eq("booking_code", sale.bookingCode)
      .maybeSingle();
    if (!booking) return { error: "ไม่พบรหัสการจอง" };
    if (booking.branch_id !== sale.branchId) {
      return { error: "รหัสการจองนี้อยู่คนละสาขา" };
    }
    bookingId = booking.id;
    customerName ||= booking.user_name;
    customerPhone ||= booking.user_phone;
  }

  const { data, error } = await admin.rpc("checkout_pos_counter", {
    p_checkout_key: sale.checkoutKey,
    p_expected_total: sale.expectedTotal,
    p_cash_received: sale.cashReceived,
    p_reference: sale.paymentReference || null,
    p_tenant_id: ctx.tenantId,
    p_branch_id: sale.branchId,
    p_staff_id: ctx.staffId,
    p_shift_id: sale.shiftId,
    p_payment_method: sale.paymentMethod,
    p_items: sale.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })) as Json,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_booking_id: bookingId,
    p_note: sale.note || null,
    p_discount_amount: sale.discountAmount,
  });
  if (error || !data?.[0]) {
    console.error("POS checkout failed:", error);
    const message = error?.message ?? "ไม่สามารถทำรายการขายได้";
    if (message.includes("สต็อกคงเหลือไม่เพียงพอ")) {
      return { error: "สินค้าในสต็อกไม่เพียงพอ กรุณาตรวจสอบอีกครั้ง" };
    }
    return { retrySafe: !!error?.code && /^(P0001|22|23|42|PGRST)/.test(error.code), error: /[ก-๙]/.test(message) ? message : "ไม่สามารถทำรายการขายได้ กรุณาตรวจสอบว่าระบบ POS อัปเดตครบแล้ว" };
  }

  const result = data[0];
  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "complete_pos_sale",
    module: "pos",
    referenceId: result.sale_id,
    after: { branchId: sale.branchId, receiptNumber: result.receipt_number },
  });

  revalidatePath("/dashboard");
  revalidatePath("/pos");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/reports");
  return { success: true, saleId: result.sale_id, receiptNumber: result.receipt_number };
}
export async function recordCashMovement(input: { shiftId: string; amount: number; reason: string; requestId: string }) {
  const parsed = z.object({ shiftId: z.string().uuid(), amount: z.number().finite().min(-1000000).max(1000000).refine(n => n !== 0 && Math.abs(n*100-Math.round(n*100))<0.000001), reason: z.string().trim().min(1).max(500), requestId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: "ระบุจำนวนเงินและเหตุผลให้ครบ" };
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "use_pos")) return { error: "ไม่มีสิทธิ์" };
  const admin = createAdminClient();
  const { data: shift } = await admin.from("pos_shifts").select("branch_id").eq("id", input.shiftId).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!shift || !(await canUseBranch(ctx, shift.branch_id))) return { error: "ไม่มีสิทธิ์ใช้งานกะนี้" };
  const { error } = await admin.rpc("record_pos_cash", { p_tenant_id: ctx.tenantId, p_shift_id: input.shiftId, p_amount: input.amount, p_reason: parsed.data.reason, p_actor_id: ctx.userId, p_request_id: input.requestId });
  if (error) return { error: /[ก-๙]/.test(error.message) ? error.message : "บันทึกเงินสดไม่สำเร็จ" };
  await logAudit({ tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.role, action: "pos_cash_movement", module: "pos", referenceId: input.shiftId, after: parsed.data });
  revalidatePath("/pos");
  return { success: true };
}

export async function refundPosSale(input: { saleId: string; reason: string; restock: boolean; confirmed: boolean }) {
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "use_pos") || !hasPermission(ctx, "confirm_refund")) return { error: "ต้องมีสิทธิ์ยืนยันคืนเงิน" };
  const parsed = z.object({ saleId: z.string().uuid(), reason: z.string().trim().min(1).max(500), restock: z.boolean(), confirmed: z.literal(true) }).safeParse(input);
  if (!parsed.success) return { error: "ระบุเหตุผลและยืนยันว่าได้คืนเงินแล้ว" };
  const admin = createAdminClient();
  const { data: sale } = await admin.from("sales").select("branch_id").eq("id", input.saleId).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!sale || !(await canUseBranch(ctx, sale.branch_id))) return { error: "ไม่มีสิทธิ์เข้าถึงบิลนี้" };
  const { error } = await admin.rpc("void_pos_counter_sale", { p_tenant_id: ctx.tenantId, p_sale_id: input.saleId, p_staff_id: ctx.staffId, p_reason: parsed.data.reason, p_restock: input.restock });
  if (error) return { error: /[ก-๙]/.test(error.message) ? error.message : "คืนเงินไม่สำเร็จ" };
  await logAudit({ tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.role, action: "refund_pos_sale", module: "pos", referenceId: input.saleId, after: parsed.data });
  for (const path of ["/pos", "/dashboard", "/dashboard/inventory", "/dashboard/reports", "/pos/" + input.saleId + "/receipt"]) revalidatePath(path);
  return { success: true };
}
