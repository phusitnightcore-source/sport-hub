import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";

const codeSchema = z.string().regex(/^[A-Z0-9]{8}$/);

// สถานะการจองสำหรับหน้า /booking/[code] (ลูกค้า polling)
// booking_code เป็น capability lookup — ส่งออกเฉพาะข้อมูลที่ลูกค้าเจ้าของรหัสควรเห็น
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const parsed = codeSchema.safeParse(code?.toUpperCase());
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "รหัสการจองไม่ถูกต้อง", 400);
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, booking_code, status, slot_locked_until")
    .eq("booking_code", parsed.data)
    .single();
  if (!booking) {
    return apiError("NOT_FOUND", "ไม่พบการจอง", 404);
  }

  const { data: payment } = await admin
    .from("payments")
    .select("status, reject_reason, refund_status")
    .eq("booking_id", booking.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return apiOk({
    bookingCode: booking.booking_code,
    status: booking.status,
    slotLockedUntil: booking.slot_locked_until,
    payment: payment
      ? {
          status: payment.status,
          rejectReason: payment.reject_reason,
          refundStatus: payment.refund_status,
        }
      : null,
  });
}
