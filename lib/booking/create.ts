import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bangkokToday, bangkokNowTime } from "@/lib/api";
import { buildSlots, toMinutes } from "@/lib/booking/slots";
import { satangToBahtString, toSatang } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notify";
import { getEffectivePlan } from "@/lib/subscription";
import { getPlanEntitlements } from "@/lib/entitlements.server";

export type BookingInput = {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  userName: string;
  userPhone: string;
  note?: string;
  couponCode?: string;
};

export type BookingResult =
  | {
      ok: true;
      bookingId: string;
      bookingCode: string;
      totalPrice: number;
      slotLockedUntil: string;
    }
  | { ok: false; code: string; message: string; status: number };

const fail = (code: string, message: string, status: number): BookingResult => ({
  ok: false,
  code,
  message,
  status,
});

// สร้างการจอง (guest หรือ member) — logic เดียวกับ POST /api/bookings เดิม
// แยกออกมาเพื่อ reuse ในการจองซ้ำรายสัปดาห์ (recurring) โดยไม่ทำโค้ดหลักซ้ำ
// ใช้ service role อย่างจงใจ (guest ไม่มี session → insert ผ่าน RLS ไม่ได้ ต้อง validate ครบที่นี่)
export async function createBooking(
  body: BookingInput,
  opts?: { notifyAdmin?: boolean },
): Promise<BookingResult> {
  const admin = createAdminClient();
  const { data: court } = await admin
    .from("courts")
    .select(
      "id, tenant_id, branch_id, name, status, open_time, close_time, price_standard, price_peak, advance_booking_days",
    )
    .eq("id", body.courtId)
    .single();
  if (!court || court.status !== "open") {
    return fail("NOT_FOUND", "ไม่พบสนามหรือสนามปิดให้บริการ", 404);
  }

  // ผูก member_id/profile_id ถ้าผู้จองล็อกอิน (guest = null)
  let bookerMemberId: string | null = null;
  let bookerActorId: string | null = null;
  try {
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (user) {
      bookerActorId = user.id;
      const { data: member } = await admin
        .from("members")
        .select("id")
        .eq("profile_id", user.id)
        .eq("tenant_id", court.tenant_id)
        .maybeSingle();
      if (member) bookerMemberId = member.id;
    }
  } catch {
    /* guest จองปกติ */
  }

  const today = bangkokToday();
  const nowTime = bangkokNowTime();

  // Advance Booking Limit ต่อสนาม (§7.1)
  const maxDate = new Date(`${today}T00:00:00Z`);
  maxDate.setUTCDate(maxDate.getUTCDate() + court.advance_booking_days);
  const maxDateStr = maxDate.toISOString().slice(0, 10);
  if (body.date > maxDateStr) {
    return fail("BOOKING_ADVANCE_LIMIT", `จองล่วงหน้าได้ไม่เกิน ${court.advance_booking_days} วัน`, 400);
  }
  if (body.date < today) {
    return fail("VALIDATION_ERROR", "จองย้อนหลังไม่ได้", 400);
  }

  const startM = toMinutes(body.startTime);
  const endM = toMinutes(body.endTime);
  if (
    endM <= startM ||
    startM % 60 !== 0 ||
    endM % 60 !== 0 ||
    startM < toMinutes(court.open_time) ||
    endM > toMinutes(court.close_time)
  ) {
    return fail("VALIDATION_ERROR", "ช่วงเวลาไม่ถูกต้อง", 400);
  }
  if (body.date === today && startM < toMinutes(nowTime)) {
    return fail("VALIDATION_ERROR", "ช่วงเวลานี้ผ่านไปแล้ว", 400);
  }

  const [{ data: peaks }, { data: activeBookings }, { data: blocks }, { data: tenant }] =
    await Promise.all([
      admin
        .from("court_peak_windows")
        .select("day_of_week, start_time, end_time")
        .eq("court_id", court.id),
      admin
        .from("bookings")
        .select("start_time, end_time")
        .eq("court_id", court.id)
        .eq("booking_date", body.date)
        .in("status", ["pending_payment", "awaiting_verification", "confirmed", "awaiting_refund"]),
      admin
        .from("block_schedules")
        .select("start_time, end_time")
        .eq("court_id", court.id)
        .eq("block_date", body.date),
      admin.from("tenants").select("id, status, settings").eq("id", court.tenant_id).single(),
    ]);

  if (!tenant || !["active", "trial", "free"].includes(tenant.status)) {
    return fail("TENANT_SUSPENDED", "สนามนี้ปิดรับการจองชั่วคราว", 403);
  }

  // Plan gating (§5)
  const plan = await getEffectivePlan(admin, court.tenant_id);
  const entitlements = await getPlanEntitlements(admin, plan);
  if (!entitlements.online_payment) {
    return fail("SUBSCRIPTION_INACTIVE", "สนามนี้ยังไม่เปิดรับจองออนไลน์ กรุณาติดต่อสนามโดยตรง", 402);
  }
  const limit = entitlements.monthly_booking_limit;
  if (limit !== null) {
    const monthStart = `${today.slice(0, 7)}-01T00:00:00+07:00`;
    const { count } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", court.tenant_id)
      .gte("created_at", new Date(monthStart).toISOString());
    if ((count ?? 0) >= limit) {
      return fail("SUBSCRIPTION_INACTIVE", "สนามรับจองครบจำนวนของเดือนนี้แล้ว กรุณาติดต่อสนามโดยตรง", 402);
    }
  }

  const slots = buildSlots({
    court,
    peakWindows: peaks ?? [],
    bookings: activeBookings ?? [],
    blocks: blocks ?? [],
    date: body.date,
    today,
    nowTime,
  });

  const chosen = slots.filter((s) => toMinutes(s.start) >= startM && toMinutes(s.end) <= endM);
  if (chosen.length !== (endM - startM) / 60) {
    return fail("VALIDATION_ERROR", "ช่วงเวลาอยู่นอกตารางของสนาม", 400);
  }
  if (chosen.some((s) => s.status === "blocked")) {
    return fail("BOOKING_SLOT_BLOCKED", "สนามไม่พร้อมในช่วงนี้", 409);
  }
  if (chosen.some((s) => s.status !== "available")) {
    return fail("BOOKING_SLOT_UNAVAILABLE", "ช่วงเวลานี้ถูกจองแล้ว", 409);
  }

  const totalSatang = chosen.reduce((sum, s) => sum + s.priceSatang, 0);
  const hours = chosen.length;
  const anyPeak = chosen.some((s) => s.isPeak);
  const perHourSatang = Math.round(totalSatang / hours);

  // คูปอง (§13)
  let discountSatang = 0;
  let couponId: string | null = null;
  if (body.couponCode) {
    const { data: coupon } = await admin
      .from("coupons")
      .select("*")
      .eq("tenant_id", court.tenant_id)
      .eq("code", body.couponCode.toUpperCase())
      .eq("status", "active")
      .maybeSingle();
    if (!coupon) return fail("COUPON_INVALID", "Coupon ไม่ถูกต้องหรือหมดอายุ", 400);
    if (body.date < coupon.start_date || today > coupon.end_date) {
      return fail("COUPON_INVALID", "Coupon ไม่ถูกต้องหรือหมดอายุ", 400);
    }
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return fail("COUPON_LIMIT_REACHED", "Coupon หมดสิทธิ์แล้ว", 409);
    }
    if (coupon.applicable_to === "package") {
      return fail("COUPON_INVALID", "Coupon นี้ใช้กับค่าสมาชิกเท่านั้น", 400);
    }
    if (coupon.applicable_to === "court" && !(coupon.applicable_ids ?? []).includes(court.id)) {
      return fail("COUPON_INVALID", "Coupon ใช้กับสนามนี้ไม่ได้", 400);
    }
    if (totalSatang < toSatang(coupon.min_purchase)) {
      return fail("COUPON_INVALID", `ต้องมียอดขั้นต่ำ ${coupon.min_purchase} บาท`, 400);
    }
    if (coupon.first_booking_only) {
      const { count } = await admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", court.tenant_id)
        .eq("user_phone", body.userPhone)
        .in("status", ["awaiting_verification", "confirmed", "awaiting_refund", "refunded"]);
      if (count && count > 0) {
        return fail("COUPON_INVALID", "Coupon นี้สำหรับลูกค้าใหม่เท่านั้น", 400);
      }
    }
    discountSatang =
      coupon.discount_type === "percent"
        ? Math.floor((totalSatang * coupon.discount_value) / 100)
        : toSatang(coupon.discount_value);
    if (discountSatang > totalSatang) discountSatang = totalSatang;
    couponId = coupon.id;
  }
  const payableSatang = totalSatang - discountSatang;

  // SOW v1.1 กำหนด HOLD คงที่ 15 นาที และไม่อนุญาตให้ต่อเวลา
  const lockMinutes = 15;
  const lockedUntil = new Date(Date.now() + lockMinutes * 60_000).toISOString();

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      tenant_id: court.tenant_id,
      court_id: court.id,
      branch_id: court.branch_id,
      member_id: bookerMemberId,
      profile_id: bookerActorId,
      user_name: body.userName,
      user_phone: body.userPhone,
      booking_date: body.date,
      start_time: body.startTime,
      end_time: body.endTime,
      price_per_hour: Number(satangToBahtString(perHourSatang)),
      total_price: Number(satangToBahtString(payableSatang)),
      discount_amount: Number(satangToBahtString(discountSatang)),
      coupon_id: couponId,
      price_type: anyPeak ? "peak" : "standard",
      status: "pending_payment",
      payment_method: "online_qr",
      slot_locked_until: lockedUntil,
      policy_accepted_at: new Date().toISOString(),
      note: body.note ?? null,
    })
    .select("id, booking_code, total_price, slot_locked_until")
    .single();

  if (error) {
    // 23P01 = exclusion constraint no_double_booking — มีคนจองตัดหน้า
    if (error.code === "23P01") {
      return fail("BOOKING_SLOT_UNAVAILABLE", "ช่วงเวลานี้ถูกจองแล้ว", 409);
    }
    console.error("booking insert failed:", error);
    return fail("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
  }

  if (couponId) {
    await admin.from("coupon_usages").insert({
      coupon_id: couponId,
      tenant_id: court.tenant_id,
      booking_id: booking.id,
      user_phone: body.userPhone,
      discount_amount: Number(satangToBahtString(discountSatang)),
    });
    const { data: c } = await admin
      .from("coupons")
      .select("usage_count")
      .eq("id", couponId)
      .single();
    if (c) {
      await admin
        .from("coupons")
        .update({ usage_count: c.usage_count + 1 })
        .eq("id", couponId);
    }
  }

  await logAudit({
    tenantId: court.tenant_id,
    actorId: bookerActorId,
    actorRole: "member",
    action: "create",
    module: "booking",
    referenceId: booking.id,
    after: {
      booking_code: booking.booking_code,
      court_id: court.id,
      date: body.date,
      start: body.startTime,
      end: body.endTime,
      total_price: booking.total_price,
    },
  });

  // แจ้งเตือนฝั่งสนามแบบเรียลไทม์ (in_app) ว่ามีจองใหม่ — กัน spam ตอนจองซ้ำ (notifyAdmin=false ยกเว้นครั้งแรก)
  if (opts?.notifyAdmin !== false) {
    await dispatchNotification({
      tenantId: court.tenant_id,
      recipientId: null,
      recipientType: "admin",
      type: "booking",
      title: "มีการจองใหม่",
      body: `${court.name} · ${body.date} ${body.startTime}–${body.endTime} โดย ${body.userName}`,
      referenceId: booking.id,
      referenceType: "booking",
    });
  }

  return {
    ok: true,
    bookingId: booking.id,
    bookingCode: booking.booking_code,
    totalPrice: booking.total_price,
    slotLockedUntil: booking.slot_locked_until ?? lockedUntil,
  };
}

// บวกวันแบบ UTC (เลี่ยง DST) — คืน YYYY-MM-DD
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
