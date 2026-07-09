import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(2).max(300) }),
]);

// Admin ยืนยัน/ปฏิเสธสลิป (§9.2 ขั้น 6, §9.4)
// permission check ที่ API layer (staff extended: verify_slip) แล้ว mutate ด้วย
// service role — เป็นจุด bypass RLS อย่างจงใจตามคอมเมนต์ใน schema
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "verify_slip")) {
    return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return apiError("VALIDATION_ERROR", "รหัสรายการไม่ถูกต้อง", 400);
  }
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

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, tenant_id, booking_id, status, amount, member_id, package_id")
    .eq("id", id)
    .single();
  if (!payment || payment.tenant_id !== ctx.tenantId) {
    return apiError("NOT_FOUND", "ไม่พบรายการ", 404);
  }
  if (payment.status !== "awaiting_verification") {
    return apiError("VALIDATION_ERROR", "รายการนี้ถูกตรวจสอบไปแล้ว", 400);
  }

  // verified_by อ้าง staff.id — venue_admin อาจไม่มีแถว staff (เก็บ null, ตัวตนอยู่ใน audit)
  const { data: staffRow } = await admin
    .from("staff")
    .select("id")
    .eq("profile_id", ctx.userId)
    .maybeSingle();

  if (parsed.data.action === "approve") {
    // payments → verified (trigger ใน DB ออกใบเสร็จอัตโนมัติ §9.8) + booking → confirmed
    const { error } = await admin
      .from("payments")
      .update({
        status: "verified",
        verified_by: staffRow?.id ?? null,
        verified_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    if (error) {
      console.error("payment approve failed:", error);
      return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
    }
    if (payment.booking_id) {
      await admin
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", payment.booking_id);
    }
    
    if (payment.member_id) {
      // Calculate dates
      let startDate = new Date();
      let endDate = null;
      let package_id = payment.package_id;
      
      const { data: memberData } = await admin
        .from("members")
        .select("end_date, package_id")
        .eq("id", payment.member_id)
        .single();
        
      if (memberData) {
        if (!package_id) package_id = memberData.package_id;
        
        // If it's a renewal and current end date is in future, extend from that date
        if (memberData.end_date && new Date(memberData.end_date) > new Date()) {
          startDate = new Date(memberData.end_date);
        }
        
        if (package_id) {
          const { data: pkgData } = await admin
            .from("packages")
            .select("duration_days")
            .eq("id", package_id)
            .single();
            
          if (pkgData && pkgData.duration_days) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + pkgData.duration_days);
          }
        }
      }

      await admin
        .from("members")
        .update({ 
          status: "active",
          package_id: package_id,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate ? endDate.toISOString().split("T")[0] : null
        })
        .eq("id", payment.member_id);
    }
    await logAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: "verify",
      module: "payment",
      referenceId: payment.id,
      before: { status: "awaiting_verification" },
      after: { status: "verified", booking_id: payment.booking_id },
    });
    return apiOk({ status: "verified" });
  }

  // reject → payment rejected + เข้าคิวรอคืนเงิน, booking → awaiting_refund (§9.4)
  const { error } = await admin
    .from("payments")
    .update({
      status: "rejected",
      reject_reason: parsed.data.reason,
      verified_by: staffRow?.id ?? null,
      verified_at: new Date().toISOString(),
      refund_status: "awaiting_refund",
    })
    .eq("id", payment.id);
  if (error) {
    console.error("payment reject failed:", error);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
  }
  if (payment.booking_id) {
    await admin
      .from("bookings")
      .update({ status: "awaiting_refund" })
      .eq("id", payment.booking_id);
  }
  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "reject",
    module: "payment",
    referenceId: payment.id,
    before: { status: "awaiting_verification" },
    after: {
      status: "rejected",
      reason: parsed.data.reason,
      refund_status: "awaiting_refund",
    },
  });
  return apiOk({ status: "rejected" });
}
