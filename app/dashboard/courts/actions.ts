"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { checkCourtQuota } from "@/lib/entitlements.server";
import { logAudit } from "@/lib/audit";

const courtSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().trim().min(1, "กรุณากรอกชื่อสนาม"),
  type: z.string().trim().min(1, "กรุณาระบุประเภทสนาม"),
  price_standard: z.coerce.number().min(0),
  price_peak: z.coerce.number().min(0).nullable().optional(),
  price_offpeak: z.coerce.number().min(0).nullable().optional(),
  open_time: z.string().regex(/^\d{2}:\d{2}$/),
  close_time: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.coerce.number().int().min(1),
  advance_booking_days: z.coerce.number().int().min(1).max(90),
  status: z.enum(["open", "closed", "maintenance"]),
  free_cancel_hours: z.coerce.number().int().min(0),
  cancel_fee_percent: z.coerce.number().int().min(0).max(100),
  allow_reschedule: z.boolean(),
  reschedule_hours: z.coerce.number().int().min(0),
  refund_note: z.string().trim().max(500).optional(),
});

export type CourtInput = z.input<typeof courtSchema>;

async function requireAdmin() {
  const ctx = await getStaffContext();
  if (!ctx || ctx.role !== "venue_admin") return null;
  return ctx;
}

export async function createCourt(data: CourtInput) {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "เฉพาะผู้ดูแลสนามเท่านั้น" };
  const parsed = courtSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();

  // Gate: เพดานจำนวนสนามตามแพลน (Free = 1 สนาม) — §5
  const quota = await checkCourtQuota(supabase, ctx.tenantId);
  if (!quota.ok) return { error: quota.reason };

  const { data: court, error } = await supabase
    .from("courts")
    .insert({
      tenant_id: ctx.tenantId,
      branch_id: d.branch_id,
      name: d.name,
      type: d.type,
      price_standard: d.price_standard,
      price_peak: d.price_peak ?? null,
      price_offpeak: d.price_offpeak ?? null,
      open_time: d.open_time,
      close_time: d.close_time,
      capacity: d.capacity,
      advance_booking_days: d.advance_booking_days,
      status: d.status,
      free_cancel_hours: d.free_cancel_hours,
      cancel_fee_percent: d.cancel_fee_percent,
      allow_reschedule: d.allow_reschedule,
      reschedule_hours: d.reschedule_hours,
      refund_note: d.refund_note || null,
    })
    .select("id")
    .single();
  if (error) return { error: "สร้างสนามไม่สำเร็จ: " + error.message };

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "create",
    module: "court",
    referenceId: court.id,
    after: { name: d.name },
  });
  revalidatePath("/dashboard/courts");
  return { success: true, id: court.id };
}

export async function updateCourt(id: string, data: CourtInput) {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "เฉพาะผู้ดูแลสนามเท่านั้น" };
  const parsed = courtSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update({
      name: d.name,
      type: d.type,
      price_standard: d.price_standard,
      price_peak: d.price_peak ?? null,
      price_offpeak: d.price_offpeak ?? null,
      open_time: d.open_time,
      close_time: d.close_time,
      capacity: d.capacity,
      advance_booking_days: d.advance_booking_days,
      status: d.status,
      free_cancel_hours: d.free_cancel_hours,
      cancel_fee_percent: d.cancel_fee_percent,
      allow_reschedule: d.allow_reschedule,
      reschedule_hours: d.reschedule_hours,
      refund_note: d.refund_note || null,
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  if (error) return { error: "แก้ไขสนามไม่สำเร็จ: " + error.message };

  revalidatePath("/dashboard/courts");
  revalidatePath(`/dashboard/courts/${id}`);
  return { success: true, id };
}

export async function deleteCourt(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "เฉพาะผู้ดูแลสนามเท่านั้น" };
  const supabase = await createClient();
  // ปิดการใช้งานแทนลบจริง เพื่อเก็บประวัติการจอง
  const { error } = await supabase
    .from("courts")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  if (error) return { error: "ปิดสนามไม่สำเร็จ" };
  revalidatePath("/dashboard/courts");
  return { success: true };
}

// ---- Peak windows (§7.2) ----
export async function addPeakWindow(
  courtId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
) {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "เฉพาะผู้ดูแลสนามเท่านั้น" };
  if (endTime <= startTime) return { error: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม" };
  const supabase = await createClient();
  const { error } = await supabase.from("court_peak_windows").insert({
    court_id: courtId,
    tenant_id: ctx.tenantId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  });
  if (error) return { error: "เพิ่มช่วง Peak ไม่สำเร็จ" };
  revalidatePath(`/dashboard/courts/${courtId}`);
  return { success: true };
}

export async function deletePeakWindow(id: string, courtId: string) {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "เฉพาะผู้ดูแลสนามเท่านั้น" };
  const supabase = await createClient();
  await supabase
    .from("court_peak_windows")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  revalidatePath(`/dashboard/courts/${courtId}`);
  return { success: true };
}

// ---- Block schedules (§7.2 บล็อกเวลา/ปิดสนามชั่วคราว) ----
export async function addBlock(
  courtId: string,
  blockDate: string,
  startTime: string,
  endTime: string,
  reason: string,
  note: string,
) {
  const ctx = await getStaffContext(); // staff จอง/บล็อกได้ตาม RLS สาขาตัวเอง
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };
  if (endTime <= startTime) return { error: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม" };
  const supabase = await createClient();
  const { error } = await supabase.from("block_schedules").insert({
    court_id: courtId,
    tenant_id: ctx.tenantId,
    block_date: blockDate,
    start_time: startTime,
    end_time: endTime,
    reason,
    note: note || null,
    created_by: ctx.staffId,
  });
  if (error) return { error: "บล็อกเวลาไม่สำเร็จ: " + error.message };
  revalidatePath(`/dashboard/courts/${courtId}`);
  return { success: true };
}

export async function deleteBlock(id: string, courtId: string) {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "เฉพาะผู้ดูแลสนามเท่านั้น" };
  const supabase = await createClient();
  await supabase
    .from("block_schedules")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  revalidatePath(`/dashboard/courts/${courtId}`);
  return { success: true };
}
