"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { canUsePosBranch } from "@/lib/pos/access";
import { logAudit } from "@/lib/audit";
import { bangkokToday, bangkokNowTime } from "@/lib/api";
import { buildSlots, toMinutes } from "@/lib/booking/slots";
import { satangToBahtString } from "@/lib/money";

const schema = z.object({
  courtId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  userName: z.string().trim().min(2).max(100),
  userPhone: z.string().regex(/^0\d{8,9}$/),
  collectAtPos: z.boolean().default(false),
  method: z.enum(["walk_in_cash", "walk_in_transfer"]),
  note: z.string().trim().max(500).optional(),
});

// Staff จองให้ลูกค้า walk-in/โทรจอง (§7.2) — รับเงินหน้าร้าน → confirmed ทันที
// mutate ด้วย service role หลังเช็คสิทธิ์ (staff insert booking ตาม RLS ได้เฉพาะ
// สาขาตัวเอง แต่ walk-in ต้องเช็ค block/ราคา peak เหมือน flow ลูกค้า จึงรวมที่นี่)
export async function createWalkInBooking(input: z.input<typeof schema>) {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.collectAtPos && !hasPermission(ctx, "use_pos")) return { error: "ไม่มีสิทธิ์รับชำระผ่าน POS" };

  const admin = createAdminClient();
  const { data: court } = await admin
    .from("courts")
    .select(
      "id, tenant_id, branch_id, name, status, open_time, close_time, price_standard, price_peak",
    )
    .eq("id", d.courtId)
    .eq("tenant_id", ctx.tenantId)
    .single();
  if (!court || court.status !== "open") return { error: "ไม่พบสนามหรือสนามปิด" };

  // staff เฉพาะสาขา — จองได้เฉพาะสนามในสาขาที่ตัวเองดูแล (venue_admin ทุกสาขา)
  if (ctx.role === "staff") {
    const { data: staffRow } = await admin
      .from("staff")
      .select("multi_branch_access, staff_branches(branch_id)")
      .eq("profile_id", ctx.userId)
      .single();
    const allowed =
      staffRow?.multi_branch_access ||
      (staffRow?.staff_branches ?? []).some((b) => b.branch_id === court.branch_id);
    if (!allowed) return { error: "ไม่มีสิทธิ์จองสนามสาขานี้" };
  }

  if (!(await canUsePosBranch(ctx, court.branch_id))) return { error: "ไม่มีสิทธิ์ใช้งานสาขานี้" };
  const today = bangkokToday();
  if (d.date < today) return { error: "จองย้อนหลังไม่ได้" };

  // เช็คความว่าง + คิดราคาจากแหล่งเดียวกับ flow ลูกค้า
  const [{ data: peaks }, { data: active }, { data: blocks }] = await Promise.all([
    admin
      .from("court_peak_windows")
      .select("day_of_week, start_time, end_time")
      .eq("court_id", court.id),
    admin
      .from("bookings")
      .select("start_time, end_time")
      .eq("court_id", court.id)
      .eq("booking_date", d.date)
      .in("status", ["pending_payment", "awaiting_verification", "confirmed", "awaiting_refund"]),
    admin
      .from("block_schedules")
      .select("start_time, end_time")
      .eq("court_id", court.id)
      .eq("block_date", d.date),
  ]);
  const slots = buildSlots({
    court,
    peakWindows: peaks ?? [],
    bookings: active ?? [],
    blocks: blocks ?? [],
    date: d.date,
    today,
    nowTime: bangkokNowTime(),
  });
  const startM = toMinutes(d.startTime);
  const endM = toMinutes(d.endTime);
  const chosen = slots.filter(
    (s) => toMinutes(s.start) >= startM && toMinutes(s.end) <= endM,
  );
  if (endM <= startM || chosen.length !== (endM - startM) / 60) {
    return { error: "ช่วงเวลาไม่ถูกต้อง" };
  }
  // walk-in ให้จอง slot "past" ของวันนี้ได้ (ลูกค้าเล่นอยู่แล้ว) แต่ห้ามชน booked/blocked
  if (chosen.some((s) => s.status === "booked" || s.status === "blocked")) {
    return { error: "ช่วงเวลานี้ถูกจองหรือถูกบล็อกแล้ว" };
  }

  const totalSatang = chosen.reduce((sum, s) => sum + s.priceSatang, 0);
  const anyPeak = chosen.some((s) => s.isPeak);

  const { data: rows, error } = await admin.rpc("create_pos_walk_in", {
    p_tenant_id: ctx.tenantId, p_staff_id: ctx.staffId, p_collect_at_pos: d.collectAtPos,
    p_booking: {
      tenant_id: ctx.tenantId,
      court_id: court.id,
      branch_id: court.branch_id,
      user_name: d.userName,
      user_phone: d.userPhone,
      booking_date: d.date,
      start_time: d.startTime,
      end_time: d.endTime,
      price_per_hour: Number(satangToBahtString(Math.round(totalSatang / chosen.length))),
      total_price: Number(satangToBahtString(totalSatang)),
      price_type: anyPeak ? "peak" : "standard",
      status: d.collectAtPos ? "pending_payment" : "confirmed",
      slot_locked_until: d.collectAtPos ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
      payment_method: d.method,
      created_by: ctx.staffId,
      note: d.note ?? null,
      policy_accepted_at: new Date().toISOString(),
    },
  });
  if (error) {
    if (error.code === "23P01") return { error: "ช่วงเวลานี้ถูกจองตัดหน้าแล้ว" };
    console.error("walk-in booking failed:", error);
    return { error: "จองไม่สำเร็จ กรุณาลองใหม่" };
  }

  const booking = rows?.[0];
  if (!booking) return { error: "ไม่ได้รับผลการจอง กรุณาตรวจรายการจองก่อนลองซ้ำ" };

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "walk_in_booking",
    module: "booking",
    referenceId: booking.id,
    after: { booking_code: booking.booking_code, total: booking.total_price, method: d.method },
  });

  revalidatePath("/dashboard/bookings");
  return { success: true, bookingCode: booking.booking_code, branchId: court.branch_id, collectAtPos: d.collectAtPos };
}

// บวกวันแบบ UTC (เลี่ยง DST/timezone) — คืน YYYY-MM-DD
function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

// จองซ้ำรายสัปดาห์ (§7.1 recurring) — Staff จองทีมประจำ N สัปดาห์ติด (walk-in confirmed)
// วนสร้างทีละวันด้วย logic เดียวกับ createWalkInBooking; ชนวันไหนข้ามแล้วรายงาน
export async function createRecurringWalkIn(
  input: z.input<typeof schema>,
  weeks: number,
): Promise<{ error?: string; created?: string[]; conflicts?: string[] }> {
  if (input.collectAtPos) return { error: "จองซ้ำยังไม่รองรับรวมหลายการจองในบิลเดียว กรุณาจองทีละรายการ" };
  const n = Math.max(2, Math.min(12, Math.floor(weeks) || 0));
  const created: string[] = [];
  const conflicts: string[] = [];

  for (let k = 0; k < n; k++) {
    const date = addDays(input.date, 7 * k);
    const res = await createWalkInBooking({ ...input, date });
    if (res.success && res.bookingCode) created.push(res.bookingCode);
    else conflicts.push(date);
  }

  if (created.length === 0) {
    return { error: "จองซ้ำไม่สำเร็จ — ทุกสัปดาห์ชนกับการจองอื่นหรือช่วงเวลาไม่ถูกต้อง" };
  }
  revalidatePath("/dashboard/bookings");
  return { created, conflicts };
}
