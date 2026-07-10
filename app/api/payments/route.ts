import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";

const MAX_SLIP_BYTES = 10 * 1024 * 1024; // 10 MB — §28.2 PAYMENT_SLIP_TOO_LARGE
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const fieldsSchema = z.object({
  bookingCode: z.string().regex(/^[A-Z0-9]{8}$/),
  senderName: z.string().trim().min(2).max(100),
  // datetime-local จากฟอร์ม เช่น "2026-07-09T14:30" (เวลาไทย)
  transferDatetime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
});

// ลูกค้าแนบสลิป (§9.2 ขั้น 4-5) — service role อย่างจงใจ: guest upload ผ่าน RLS ไม่ได้
export async function POST(request: Request) {
  const limited = rateLimit(request, "payments", 10, 60_000);
  if (limited) return limited;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง", 400);
  }

  const parsed = fieldsSchema.safeParse({
    bookingCode: String(form.get("bookingCode") ?? "").toUpperCase(),
    senderName: form.get("senderName"),
    transferDatetime: form.get("transferDatetime"),
  });
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "ข้อมูลไม่ครบหรือไม่ถูกต้อง", 400, {
      issues: parsed.error.issues,
    });
  }
  const slip = form.get("slip");
  if (!(slip instanceof File) || slip.size === 0) {
    return apiError("VALIDATION_ERROR", "กรุณาแนบรูปสลิป", 400);
  }
  if (slip.size > MAX_SLIP_BYTES) {
    return apiError("PAYMENT_SLIP_TOO_LARGE", "ไฟล์ต้องไม่เกิน 10 MB", 413);
  }
  if (!ALLOWED_TYPES.includes(slip.type)) {
    return apiError("VALIDATION_ERROR", "รองรับเฉพาะไฟล์รูปภาพ (JPG/PNG/WebP)", 400);
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, tenant_id, status, total_price, slot_locked_until")
    .eq("booking_code", parsed.data.bookingCode)
    .single();
  if (!booking) {
    return apiError("NOT_FOUND", "ไม่พบการจอง", 404);
  }
  if (booking.status !== "pending_payment") {
    return apiError("VALIDATION_ERROR", "การจองนี้ไม่อยู่ในสถานะรอชำระ", 400);
  }

  // หมดเวลา slot lock 30 นาที → ยกเลิกอัตโนมัติ (§9.3 + PAYMENT_TIMEOUT)
  if (
    booking.slot_locked_until &&
    new Date(booking.slot_locked_until).getTime() < Date.now()
  ) {
    await admin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: "หมดเวลาชำระเงิน 30 นาที",
      })
      .eq("id", booking.id);
    return apiError(
      "PAYMENT_TIMEOUT",
      "หมดเวลาชำระเงิน การจองถูกยกเลิกแล้ว กรุณาจองใหม่",
      408,
    );
  }

  // Duplicate Slip Detection (§9.5): hash ไฟล์ เทียบภายใน tenant เดียวกัน
  const buffer = Buffer.from(await slip.arrayBuffer());
  const slipHash = createHash("sha256").update(buffer).digest("hex");
  const { data: dup } = await admin
    .from("payments")
    .select("id")
    .eq("tenant_id", booking.tenant_id)
    .eq("slip_hash", slipHash)
    .limit(1)
    .maybeSingle();
  if (dup) {
    return apiError(
      "PAYMENT_SLIP_DUPLICATE",
      "สลิปนี้ถูกใช้ไปแล้ว กรุณาตรวจสอบ",
      409,
    );
  }

  // อัปโหลดเข้า bucket slips — path ขึ้นต้น tenant_id ตามโครงสร้าง Storage RLS (§25.3)
  const ext = slip.type === "image/png" ? "png" : slip.type === "image/webp" ? "webp" : "jpg";
  const path = `${booking.tenant_id}/${booking.id}-${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("slips")
    .upload(path, buffer, { contentType: slip.type });
  if (uploadError) {
    console.error("slip upload failed:", uploadError);
    return apiError("INTERNAL_ERROR", "อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่", 500);
  }

  // เวลาโอนจากฟอร์มเป็นเวลาไทย → เก็บเป็น timestamptz
  const transferAt = new Date(
    parsed.data.transferDatetime.slice(0, 16) + ":00+07:00",
  ).toISOString();

  const { data: payment, error: insertError } = await admin
    .from("payments")
    .insert({
      tenant_id: booking.tenant_id,
      booking_id: booking.id,
      amount: booking.total_price,
      slip_image_url: path,
      slip_hash: slipHash,
      sender_name: parsed.data.senderName,
      transfer_datetime: transferAt,
      status: "awaiting_verification",
    })
    .select("id")
    .single();
  if (insertError) {
    console.error("payment insert failed:", insertError);
    return apiError("INTERNAL_ERROR", "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่", 500);
  }

  await admin
    .from("bookings")
    .update({ status: "awaiting_verification" })
    .eq("id", booking.id);

  await logAudit({
    tenantId: booking.tenant_id,
    actorId: null,
    actorRole: "member",
    action: "submit_slip",
    module: "payment",
    referenceId: payment.id,
    after: {
      booking_id: booking.id,
      amount: booking.total_price,
      sender_name: parsed.data.senderName,
    },
  });

  return apiOk({ paymentId: payment.id, status: "awaiting_verification" }, 201);
}
