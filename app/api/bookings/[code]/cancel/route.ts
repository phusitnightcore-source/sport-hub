import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(request: Request,{ params }: { params: Promise<{ code: string }> }) {
  const limited = await rateLimit(request,"cancel",10,60_000);
  if (limited) return limited;
  const {code} = await params;
  const parsed = z.string().regex(/^[A-Z0-9]{8}$/).safeParse(code?.toUpperCase());
  if (!parsed.success) return apiError("VALIDATION_ERROR","รหัสการจองไม่ถูกต้อง",400);
  const {data,error} = await createAdminClient().rpc("cancel_guest_booking",{p_code:parsed.data});
  if (error) {
    if (error.message.includes("BOOKING_NOT_FOUND")) return apiError("NOT_FOUND","ไม่พบการจอง",404);
    if (error.message.includes("CANCEL_AT_POS")) return apiError("VALIDATION_ERROR","รายการนี้รับชำระผ่าน POS กรุณาติดต่อสนามเพื่อยกเลิกและคืนเงินจากใบเสร็จเดิม",409);
    if (/CANCEL_NOT_ALLOWED|BOOKING_ALREADY_STARTED/.test(error.message)) return apiError("VALIDATION_ERROR","การจองนี้ยกเลิกไม่ได้แล้ว กรุณาอัปเดตสถานะหรือติดต่อสนาม",409);
    return apiError("INTERNAL_ERROR","ยกเลิกไม่สำเร็จ กรุณาอัปเดตสถานะก่อนลองใหม่",503);
  }
  return apiOk(data);
}
