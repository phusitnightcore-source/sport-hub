import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { toSatang, satangToBahtString } from "@/lib/money";
import { rateLimit } from "@/lib/ratelimit";

const codeSchema = z.string().regex(/^[A-Z0-9]{8}$/);

// ลูกค้ายกเลิกการจอง (§7.1) — enforce Cancellation Policy ของสนามอัตโนมัติ:
// ก่อน free_cancel_hours = ฟรี / หลังจากนั้น = หัก cancel_fee_percent
// จ่ายเงินแล้ว → เข้าคิวคืนเงิน (สนามโอนคืนเองภายใน 24 ชม. — §7.2)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const limited = await rateLimit(request, "cancel", 10, 60_000);
  if (limited) return limited;

  const { code } = await params;
  const parsed = codeSchema.safeParse(code?.toUpperCase());
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "รหัสการจองไม่ถูกต้อง", 400);
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, tenant_id, status, booking_date, start_time, total_price, courts(free_cancel_hours, cancel_fee_percent)",
    )
    .eq("booking_code", parsed.data)
    .single();
  if (!booking) return apiError("NOT_FOUND", "ไม่พบการจอง", 404);

  const cancellable: (typeof booking.status)[] = [
    "pending_payment",
    "awaiting_verification",
    "confirmed",
  ];
  if (!cancellable.includes(booking.status)) {
    return apiError("VALIDATION_ERROR", "การจองนี้ยกเลิกไม่ได้แล้ว", 400);
  }

  // เวลาเริ่มจอง (เขตเวลาไทย) — ยกเลิกได้เฉพาะก่อนเวลาเริ่ม
  const startMs = new Date(
    `${booking.booking_date}T${booking.start_time}+07:00`,
  ).getTime();
  const hoursLeft = (startMs - Date.now()) / 3_600_000;
  if (hoursLeft <= 0) {
    return apiError("VALIDATION_ERROR", "เลยเวลาเริ่มใช้สนามแล้ว ยกเลิกไม่ได้", 400);
  }

  const freeHours = booking.courts?.free_cancel_hours ?? 24;
  const feePercent = booking.courts?.cancel_fee_percent ?? 50;
  const withinFree = hoursLeft >= freeHours;

  // ค่าธรรมเนียม (สตางค์) — คิดเฉพาะกรณีจ่ายเงินแล้ว
  const paid = booking.status !== "pending_payment";
  const totalSatang = toSatang(booking.total_price);
  const feeSatang = paid && !withinFree ? Math.round((totalSatang * feePercent) / 100) : 0;

  const nowIso = new Date().toISOString();
  const newStatus = paid ? "awaiting_refund" : "cancelled";
  const cancelReason = withinFree
    ? "ลูกค้ายกเลิก (ภายในช่วงยกเลิกฟรี)"
    : `ลูกค้ายกเลิก (หักค่าธรรมเนียม ${feePercent}%)`;

  const { error } = await admin
    .from("bookings")
    .update({
      status: newStatus,
      cancelled_at: nowIso,
      cancel_reason: cancelReason,
      cancel_fee: Number(satangToBahtString(feeSatang)),
    })
    .eq("id", booking.id)
    .in("status", cancellable); // กัน race กับ admin ที่กำลังเปลี่ยนสถานะ
  if (error) {
    console.error("cancel booking failed:", error);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
  }

  // จ่ายแล้ว → ตั้ง payment เข้าคิวรอคืนเงิน (ยอดคืน = total - fee)
  if (paid) {
    await admin
      .from("payments")
      .update({ refund_status: "awaiting_refund" })
      .eq("booking_id", booking.id)
      .in("status", ["awaiting_verification", "verified"]);
  }

  await logAudit({
    tenantId: booking.tenant_id,
    actorId: null,
    actorRole: "member",
    action: "cancel_booking",
    module: "booking",
    referenceId: booking.id,
    before: { status: booking.status },
    after: {
      status: newStatus,
      fee: satangToBahtString(feeSatang),
      hours_before_start: Math.round(hoursLeft * 10) / 10,
    },
  });

  return apiOk({
    status: newStatus,
    cancelFee: Number(satangToBahtString(feeSatang)),
    refundAmount: paid ? Number(satangToBahtString(totalSatang - feeSatang)) : 0,
    message: paid
      ? withinFree
        ? "ยกเลิกแล้ว สนามจะโอนเงินคืนเต็มจำนวนภายใน 24 ชั่วโมง"
        : `ยกเลิกแล้ว สนามจะโอนคืน ${satangToBahtString(totalSatang - feeSatang)} บาท (หักค่าธรรมเนียม ${feePercent}%) ภายใน 24 ชั่วโมง`
      : "ยกเลิกการจองเรียบร้อยแล้ว",
  });
}
