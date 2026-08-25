import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { getSuperAdminContext } from "@/lib/auth";
import { activatePaidInvoice } from "@/lib/subscription-billing";

// Super Admin (ตัวกลาง) ยืนยันรับชำระ Invoice PromptPay (§11.2)
// → invoice paid + เปิด/ต่อแพลนทันที + แจ้งเตือนสนาม (logic กลางที่ lib/subscription-billing)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getSuperAdminContext();
  if (!ctx) {
    return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return apiError("VALIDATION_ERROR", "รหัสรายการไม่ถูกต้อง", 400);
  }

  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("subscription_invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (!invoice) return apiError("NOT_FOUND", "ไม่พบ Invoice", 404);

  const res = await activatePaidInvoice(admin, invoice, "promptpay", {
    id: ctx.userId,
    role: "super_admin",
  });
  if (!res.ok) {
    if (res.error?.includes("รอชำระ")) {
      return apiError("VALIDATION_ERROR", "Invoice นี้ไม่อยู่ในสถานะรอชำระ", 400);
    }
    if (res.error?.includes("แพลน")) {
      return apiError("VALIDATION_ERROR", "ไม่รู้จักแพลนใน Invoice", 400);
    }
    console.error("mark-paid failed:", res.error);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
  }

  return apiOk({ status: "paid", plan: res.plan });
}
