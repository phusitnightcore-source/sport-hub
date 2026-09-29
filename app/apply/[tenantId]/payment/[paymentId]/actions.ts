"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyMemberSafely, notifyTenantAdminsSafely } from "@/lib/membership/notifications";

const MAX_SLIP_BYTES = 10 * 1024 * 1024; // 10 MB — §28.2 PAYMENT_SLIP_TOO_LARGE
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// สมาชิกแนบสลิปค่าสมาชิก (§34.2) — อัปโหลดผ่าน server action ด้วย admin
// เข้า bucket slips path {tenant_id}/... (private) ให้ admin ดูผ่าน signed URL
// เหมือน flow การจอง — guest ไม่ได้ login จึงอัปจาก browser ตรงๆ ไม่ได้ (RLS)
export async function uploadApplicationSlip(paymentId: string, formData: FormData) {
  const file = formData.get("slip");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "กรุณาแนบรูปสลิป" };
  }
  if (file.size > MAX_SLIP_BYTES) {
    return { success: false, error: "ไฟล์ต้องไม่เกิน 10 MB" };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "รองรับเฉพาะไฟล์รูปภาพ (JPG/PNG/WebP)" };
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, tenant_id, status, slip_image_url, member_id")
    .eq("id", paymentId)
    .single();
  if (!payment) return { success: false, error: "ไม่พบรายการชำระเงิน" };
  if (payment.status !== "awaiting_verification" || payment.slip_image_url) {
    return { success: false, error: "รายการนี้ส่งสลิปไปแล้ว" };
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${payment.tenant_id}/member-${payment.id}-${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("slips")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (uploadError) {
    return { success: false, error: "อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่" };
  }

  const { error } = await admin
    .from("payments")
    .update({ slip_image_url: path, transfer_datetime: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) return { success: false, error: error.message };

  if (payment.member_id) {
    await Promise.all([
      notifyMemberSafely({
        tenantId: payment.tenant_id,
        memberId: payment.member_id,
        title: "ได้รับสลิปแล้ว",
        body: "สนามได้รับหลักฐานการชำระเงินของคุณแล้ว และจะแจ้งผลทันทีหลังตรวจสอบ",
        referenceId: payment.id,
        referenceType: "payment",
      }),
      notifyTenantAdminsSafely({
        tenantId: payment.tenant_id,
        title: "มีสลิปสมาชิกใหม่รอตรวจ",
        body: "สมาชิกส่งหลักฐานการชำระเงินแล้ว กรุณาตรวจสอบเพื่อเปิดใช้งานสมาชิก",
        referenceId: payment.id,
        referenceType: "payment",
      }),
    ]);
  }

  return { success: true, tenantId: payment.tenant_id };
}
