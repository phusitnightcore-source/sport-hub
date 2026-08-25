"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffContext, hasPermission, type StaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

const checkoutSchema = z.object({
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

async function canUseBranch(ctx: StaffContext, branchId: string) {
  if (ctx.role === "venue_admin") return true;
  if (!ctx.staffId) return false;
  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("staff")
    .select("multi_branch_access, status, staff_branches(branch_id)")
    .eq("id", ctx.staffId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!staff || staff.status !== "active") return false;
  return (
    staff.multi_branch_access ||
    (staff.staff_branches ?? []).some((assignment: any) => assignment.branch_id === branchId)
  );
}

export async function openShift(branchId: string, startingCash: number) {
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
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "use_pos")) return { error: "คุณไม่มีสิทธิ์ใช้งาน POS" };

  const admin = createAdminClient();
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
  if (!ctx) return { error: "ไม่พบข้อมูลพนักงาน" };
  const admin = createAdminClient();
  let query = admin
    .from("pos_shifts")
    .select("id, opened_at, starting_cash")
    .eq("tenant_id", ctx.tenantId)
    .eq("branch_id", branchId)
    .eq("status", "open")
    .is("closed_at", null);

  if (ctx.staffId) {
    query = query.eq("opened_by", ctx.staffId);
  }

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

  // 2. Get payments
  const { data: payments } = await admin
    .from("pos_payments")
    .select("method, amount, sales!inner(shift_id, status)")
    .eq("sales.shift_id", shiftId)
    .eq("sales.status", "completed");

  // 3. Get sold items
  const { data: items } = await admin
    .from("sale_items")
    .select("product_id, product_name, quantity, line_total, sales!inner(shift_id, status)")
    .eq("sales.shift_id", shiftId)
    .eq("sales.status", "completed");

  const salesByMethod = { cash: 0, transfer: 0, card: 0, other: 0 };
  let totalRevenue = 0;
  
  (payments ?? []).forEach(p => {
    salesByMethod[p.method as keyof typeof salesByMethod] += Number(p.amount);
    totalRevenue += Number(p.amount);
  });

  const soldItems: Record<string, { name: string; quantity: number; revenue: number }> = {};
  (items ?? []).forEach(item => {
    const pid = item.product_id ?? "unknown";
    if (!soldItems[pid]) {
      soldItems[pid] = { name: item.product_name, quantity: 0, revenue: 0 };
    }
    soldItems[pid].quantity += item.quantity;
    soldItems[pid].revenue += Number(item.line_total);
  });

  return {
    success: true,
    data: {
      shift,
      totalRevenue,
      salesByMethod,
      soldItems: Object.values(soldItems).sort((a, b) => b.quantity - a.quantity),
      expectedCash: Number(shift.starting_cash) + salesByMethod.cash
    }
  };
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

  const { data, error } = await admin.rpc("complete_pos_sale", {
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
    return { error: "ไม่สามารถทำรายการขายได้ กรุณาลองใหม่" };
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
