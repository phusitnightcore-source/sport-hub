import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiError, bangkokToday, bangkokNowTime } from "@/lib/api";
import { buildSlots, toMinutes } from "@/lib/booking/slots";
import { satangToBahtString, toSatang } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { getEffectivePlan } from "@/lib/subscription";
import { getPlanEntitlements } from "@/lib/entitlements.server";
import { rateLimit } from "@/lib/ratelimit";

const bodySchema = z.object({
  courtId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  userName: z.string().trim().min(2).max(100),
  userPhone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง"),
  note: z.string().trim().max(500).optional(),
  couponCode: z.string().trim().max(40).optional(),
  acceptPolicy: z.literal(true), // ต้องกดยอมรับ Cancellation Policy ก่อนเสมอ (§7.1)
});

// สร้างการจอง (guest) — ใช้ service role อย่างจงใจตามคอมเมนต์ใน schema:
// guest ไม่มี session จึง insert ผ่าน RLS ไม่ได้ ต้อง validate ครบที่ API ชั้นนี้
export async function POST(request: Request) {
  const limited = rateLimit(request, "bookings", 15, 60_000);
  if (limited) return limited;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "ข้อมูลไม่ครบหรือไม่ถูกต้อง", 400, {
      issues: parsed.error.issues,
    });
  }
  const body = parsed.data;

  const admin = createAdminClient();
  const { data: court } = await admin
    .from("courts")
    .select(
      "id, tenant_id, branch_id, name, status, open_time, close_time, price_standard, price_peak, advance_booking_days",
    )
    .eq("id", body.courtId)
    .single();
  if (!court || court.status !== "open") {
    return apiError("NOT_FOUND", "ไม่พบสนามหรือสนามปิดให้บริการ", 404);
  }

  // ถ้าผู้จองล็อกอินเป็นสมาชิกของสนามนี้ ผูก member_id ให้ประวัติจองของสมาชิก
  // (guest ที่ไม่ล็อกอินยังจองได้ปกติ — member_id = null)
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
    /* ไม่มี session = guest จองปกติ */
  }

  const today = bangkokToday();
  const nowTime = bangkokNowTime();

  // Advance Booking Limit ต่อสนาม (ค่าเริ่มต้น 30 วัน) — §7.1
  const maxDate = new Date(`${today}T00:00:00Z`);
  maxDate.setUTCDate(maxDate.getUTCDate() + court.advance_booking_days);
  const maxDateStr = maxDate.toISOString().slice(0, 10);
  if (body.date > maxDateStr) {
    return apiError(
      "BOOKING_ADVANCE_LIMIT",
      `จองล่วงหน้าได้ไม่เกิน ${court.advance_booking_days} วัน`,
      400,
    );
  }
  if (body.date < today) {
    return apiError("VALIDATION_ERROR", "จองย้อนหลังไม่ได้", 400);
  }

  // ช่วงเวลา: ต้องเต็มชั่วโมง อยู่ในเวลาเปิด-ปิด และไม่เริ่มในอดีต
  const startM = toMinutes(body.startTime);
  const endM = toMinutes(body.endTime);
  if (
    endM <= startM ||
    startM % 60 !== 0 ||
    endM % 60 !== 0 ||
    startM < toMinutes(court.open_time) ||
    endM > toMinutes(court.close_time)
  ) {
    return apiError("VALIDATION_ERROR", "ช่วงเวลาไม่ถูกต้อง", 400);
  }
  if (body.date === today && startM < toMinutes(nowTime)) {
    return apiError("VALIDATION_ERROR", "ช่วงเวลานี้ผ่านไปแล้ว", 400);
  }

  // คำนวณ slot วันนั้น (แหล่งเดียวกับตารางที่ลูกค้าเห็น) เพื่อเช็คบล็อก + คิดราคา
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
        .in("status", [
          "pending_payment",
          "awaiting_verification",
          "confirmed",
          "awaiting_refund",
        ]),
      admin
        .from("block_schedules")
        .select("start_time, end_time")
        .eq("court_id", court.id)
        .eq("block_date", body.date),
      admin
        .from("tenants")
        .select("id, status, settings")
        .eq("id", court.tenant_id)
        .single(),
    ]);

  if (!tenant || !["active", "trial", "free"].includes(tenant.status)) {
    return apiError("TENANT_SUSPENDED", "สนามนี้ปิดรับการจองชั่วคราว", 403);
  }

  // Plan gating (§5): อ่านสิทธิ์จาก plan_entitlements (Super Admin แก้ได้)
  // getEffectivePlan = แพลนจริงเช็ค trial/grace real-time / getPlanEntitlements = สิทธิ์แพลนนั้น
  const plan = await getEffectivePlan(admin, court.tenant_id);
  const entitlements = await getPlanEntitlements(admin, plan);
  if (!entitlements.online_payment) {
    return apiError(
      "SUBSCRIPTION_INACTIVE",
      "สนามนี้ยังไม่เปิดรับจองออนไลน์ กรุณาติดต่อสนามโดยตรง",
      402,
    );
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
      return apiError(
        "SUBSCRIPTION_INACTIVE",
        "สนามรับจองครบจำนวนของเดือนนี้แล้ว กรุณาติดต่อสนามโดยตรง",
        402,
      );
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

  const chosen = slots.filter(
    (s) => toMinutes(s.start) >= startM && toMinutes(s.end) <= endM,
  );
  if (chosen.length !== (endM - startM) / 60) {
    return apiError("VALIDATION_ERROR", "ช่วงเวลาอยู่นอกตารางของสนาม", 400);
  }
  if (chosen.some((s) => s.status === "blocked")) {
    return apiError("BOOKING_SLOT_BLOCKED", "สนามไม่พร้อมในช่วงนี้", 409);
  }
  if (chosen.some((s) => s.status !== "available")) {
    return apiError("BOOKING_SLOT_UNAVAILABLE", "ช่วงเวลานี้ถูกจองแล้ว", 409);
  }

  // ราคา: รวมรายชั่วโมงเป็นสตางค์ — ห้าม float (CLAUDE.md ข้อ 6)
  const totalSatang = chosen.reduce((sum, s) => sum + s.priceSatang, 0);
  const hours = chosen.length;
  const anyPeak = chosen.some((s) => s.isPeak);
  const perHourSatang = Math.round(totalSatang / hours);

  // คูปอง (§13) — validate + คิดส่วนลดเป็นสตางค์ (applicable_to all/court)
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
    if (!coupon) return apiError("COUPON_INVALID", "Coupon ไม่ถูกต้องหรือหมดอายุ", 400);
    if (body.date < coupon.start_date || today > coupon.end_date) {
      return apiError("COUPON_INVALID", "Coupon ไม่ถูกต้องหรือหมดอายุ", 400);
    }
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return apiError("COUPON_LIMIT_REACHED", "Coupon หมดสิทธิ์แล้ว", 409);
    }
    if (coupon.applicable_to === "package") {
      return apiError("COUPON_INVALID", "Coupon นี้ใช้กับค่าสมาชิกเท่านั้น", 400);
    }
    if (
      coupon.applicable_to === "court" &&
      !(coupon.applicable_ids ?? []).includes(court.id)
    ) {
      return apiError("COUPON_INVALID", "Coupon ใช้กับสนามนี้ไม่ได้", 400);
    }
    if (totalSatang < toSatang(coupon.min_purchase)) {
      return apiError("COUPON_INVALID", `ต้องมียอดขั้นต่ำ ${coupon.min_purchase} บาท`, 400);
    }
    if (coupon.first_booking_only) {
      const { count } = await admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", court.tenant_id)
        .eq("user_phone", body.userPhone)
        .in("status", ["awaiting_verification", "confirmed", "awaiting_refund", "refunded"]);
      if (count && count > 0) {
        return apiError("COUPON_INVALID", "Coupon นี้สำหรับลูกค้าใหม่เท่านั้น", 400);
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

  // Slot lock ตาม settings ของ tenant (ค่าเริ่มต้น 30 นาที) — §9.2
  const settings = (tenant.settings ?? {}) as { slot_lock_minutes?: number };
  const lockMinutes = settings.slot_lock_minutes ?? 30;
  const lockedUntil = new Date(Date.now() + lockMinutes * 60_000).toISOString();

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      tenant_id: court.tenant_id,
      court_id: court.id,
      branch_id: court.branch_id,
      member_id: bookerMemberId,
      profile_id: bookerActorId, // ผูกกับบัญชีผู้ใช้ (ถ้าล็อกอิน) — ดูประวัติข้ามสนามได้
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
    // 23P01 = exclusion constraint no_double_booking — มีคนจองตัดหน้า (CLAUDE.md ข้อ 4)
    if (error.code === "23P01") {
      return apiError("BOOKING_SLOT_UNAVAILABLE", "ช่วงเวลานี้ถูกจองแล้ว", 409);
    }
    console.error("booking insert failed:", error);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
  }

  // บันทึกการใช้คูปอง + เพิ่ม usage_count (§13)
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
    actorId: bookerActorId, // null = guest จองเอง
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

  return apiOk(
    {
      bookingCode: booking.booking_code,
      totalPrice: booking.total_price,
      slotLockedUntil: booking.slot_locked_until,
    },
    201,
  );
}
