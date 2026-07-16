import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyWaitlistForFreedSlot } from "@/lib/waitlist";

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Admin ยืนยัน "โอนคืนแล้ว" + แนบหลักฐาน (§9.4 ขั้น 4-5)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "confirm_refund")) {
    return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return apiError("VALIDATION_ERROR", "รหัสรายการไม่ถูกต้อง", 400);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง", 400);
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, tenant_id, booking_id, refund_status")
    .eq("id", id)
    .single();
  if (!payment || payment.tenant_id !== ctx.tenantId) {
    return apiError("NOT_FOUND", "ไม่พบรายการ", 404);
  }
  if (payment.refund_status !== "awaiting_refund") {
    return apiError("VALIDATION_ERROR", "รายการนี้ไม่อยู่ในคิวรอคืนเงิน", 400);
  }

  // หลักฐานการโอนคืน (ไม่บังคับแต่ควรแนบ)
  let evidencePath: string | null = null;
  const evidence = form.get("evidence");
  if (evidence instanceof File && evidence.size > 0) {
    if (evidence.size > MAX_EVIDENCE_BYTES) {
      return apiError("PAYMENT_SLIP_TOO_LARGE", "ไฟล์ต้องไม่เกิน 10 MB", 413);
    }
    if (!ALLOWED_TYPES.includes(evidence.type)) {
      return apiError("VALIDATION_ERROR", "รองรับเฉพาะไฟล์รูปภาพ (JPG/PNG/WebP)", 400);
    }
    const ext =
      evidence.type === "image/png" ? "png" : evidence.type === "image/webp" ? "webp" : "jpg";
    evidencePath = `${ctx.tenantId}/refund-${payment.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("slips")
      .upload(evidencePath, Buffer.from(await evidence.arrayBuffer()), {
        contentType: evidence.type,
      });
    if (uploadError) {
      console.error("refund evidence upload failed:", uploadError);
      return apiError("INTERNAL_ERROR", "อัปโหลดหลักฐานไม่สำเร็จ กรุณาลองใหม่", 500);
    }
  }

  const { error } = await admin
    .from("payments")
    .update({
      refund_status: "refunded",
      refund_evidence_url: evidencePath,
      refund_confirmed_at: new Date().toISOString(),
    })
    .eq("id", payment.id);
  if (error) {
    console.error("refund confirm failed:", error);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
  }
  if (payment.booking_id) {
    await admin
      .from("bookings")
      .update({ status: "refunded" })
      .eq("id", payment.booking_id);

    // slot ว่างลง (refunded ไม่อยู่ใน exclusion constraint แล้ว) → แจ้ง waitlist
    const { data: b } = await admin
      .from("bookings")
      .select("tenant_id, court_id, booking_date, start_time, end_time, courts(name)")
      .eq("id", payment.booking_id)
      .maybeSingle();
    if (b) {
      await notifyWaitlistForFreedSlot(admin, {
        tenantId: b.tenant_id,
        courtId: b.court_id,
        bookingDate: b.booking_date,
        startTime: b.start_time,
        endTime: b.end_time,
        courtName: b.courts?.name ?? null,
      });
    }
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "confirm_refund",
    module: "payment",
    referenceId: payment.id,
    before: { refund_status: "awaiting_refund" },
    after: { refund_status: "refunded", evidence: evidencePath },
  });

  return apiOk({ refundStatus: "refunded" });
}
