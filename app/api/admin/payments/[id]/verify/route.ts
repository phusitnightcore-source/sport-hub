import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notify";
import { canUsePosBranch } from "@/lib/pos/access";
import { notifyMemberSafely } from "@/lib/membership/notifications";

type PaymentRow = {
  id: string;
  tenant_id: string;
  booking_id: string | null;
  member_id: string | null;
};

// แจ้งเตือนผลการตรวจสลิปไปยังสมาชิก (§14.1 Payment) — LINE หลัก → Email fallback → in-app
// ทำงานได้แม้ยังไม่ใส่ API key (บันทึก in-app เป็นประวัติ) จึงไม่กระทบ flow หลัก
async function notifyPaymentResult(
  admin: ReturnType<typeof createAdminClient>,
  payment: PaymentRow,
  kind: "verified" | "rejected",
  reason?: string,
): Promise<void> {
  if (!payment.member_id) return; // guest booking ไม่มีช่องทางติดต่อ — ข้าม
  const { data: member } = await admin
    .from("members")
    .select("id, line_user_id, email")
    .eq("id", payment.member_id)
    .maybeSingle();
  if (!member) return;

  const title =
    kind === "verified" ? "ยืนยันการชำระเงินแล้ว" : "สลิปถูกปฏิเสธ";
  const body =
    kind === "verified"
      ? "สนามได้ตรวจสอบและยืนยันการชำระเงินของคุณเรียบร้อยแล้ว"
      : `สลิปของคุณถูกปฏิเสธ${reason ? ` — เหตุผล: ${reason}` : ""} กรุณาติดต่อสนามหรือชำระใหม่อีกครั้ง`;

  await dispatchNotification({
    tenantId: payment.tenant_id,
    recipientId: member.id,
    recipientType: "member",
    type: "payment",
    title,
    body,
    referenceId: payment.id,
    referenceType: "payment",
    lineUserId: member.line_user_id,
    email: member.email,
  });
}

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

  if (payment.booking_id) {
    const {data:booking} = await admin.from("bookings").select("branch_id").eq("id",payment.booking_id).eq("tenant_id",ctx.tenantId).maybeSingle();
    if (!booking || !await canUsePosBranch(ctx,booking.branch_id)) return apiError("AUTH_UNAUTHORIZED","ไม่มีสิทธิ์จัดการสาขานี้",403);
    const approve = parsed.data.action === "approve";
    const reason = parsed.data.action === "reject" ? parsed.data.reason : "";
    const {data,error} = await admin.rpc("verify_booking_payment",{p_tenant_id:ctx.tenantId,p_payment_id:payment.id,p_staff_id:ctx.staffId,p_actor_id:ctx.userId,p_approve:approve,p_reason:reason});
    if (error) return apiError("VALIDATION_ERROR","บันทึกไม่สำเร็จ กรุณาอัปเดตสถานะการจองและสลิปก่อนลองใหม่",409);
    await notifyPaymentResult(admin,payment,approve ? "verified" : "rejected",reason);
    return apiOk(data);
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

      const { error: memberUpdateError } = await admin
        .from("members")
        .update({ 
          status: "active",
          package_id: package_id,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate ? endDate.toISOString().split("T")[0] : null
        })
        .eq("id", payment.member_id);
      if (memberUpdateError) {
        await admin
          .from("payments")
          .update({ status: "awaiting_verification", verified_by: null, verified_at: null })
          .eq("id", payment.id);
        return apiError("INTERNAL_ERROR", "เปิดใช้งานสมาชิกไม่สำเร็จ กรุณาลองใหม่", 500);
      }

      const { data: activated } = await admin
        .from("members")
        .select("member_number, end_date, packages(name)")
        .eq("id", payment.member_id)
        .maybeSingle();
      await notifyMemberSafely({
        tenantId: payment.tenant_id,
        memberId: payment.member_id,
        title: "บัตรสมาชิกพร้อมใช้งานแล้ว",
        body: `ชำระเงินสำเร็จ สมาชิก ${activated?.member_number ?? ""} แพ็กเกจ ${activated?.packages?.name ?? "ฟิตเนส"}${activated?.end_date ? ` ใช้ได้ถึง ${new Date(`${activated.end_date}T00:00:00`).toLocaleDateString("th-TH")}` : " ใช้งานได้ไม่จำกัดวัน"} เปิดบัตรดิจิทัลเพื่อเช็กอินได้ทันที`,
        referenceId: payment.id,
        referenceType: "payment",
      });
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
    await notifyPaymentResult(admin, payment, "verified");
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
  await notifyPaymentResult(admin, payment, "rejected", parsed.data.reason);
  return apiOk({ status: "rejected" });
}
