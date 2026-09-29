"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizerAccessForUser } from "@/lib/organizer";

export type OrganizerOrderState = { success?: boolean; error?: string };

const orderSchema = z.object({
  planCode: z.enum(["group_host", "tournament_host", "organizer_pro"]),
  senderName: z.string().trim().min(2).max(120),
  transferAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  paymentReference: z.string().trim().max(100).optional(),
});

export async function submitOrganizerOrder(
  _previous: OrganizerOrderState,
  formData: FormData,
): Promise<OrganizerOrderState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อนสมัครแพ็กเกจ" };

  const parsed = orderSchema.safeParse({
    planCode: formData.get("plan_code"),
    senderName: formData.get("sender_name"),
    transferAt: formData.get("transfer_at"),
    paymentReference: formData.get("payment_reference") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };

  const slip = formData.get("slip");
  if (!(slip instanceof File) || slip.size === 0) return { error: "กรุณาแนบหลักฐานการชำระเงิน" };
  if (slip.size > 4 * 1024 * 1024) return { error: "ไฟล์หลักฐานต้องไม่เกิน 4 MB" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(slip.type)) {
    return { error: "รองรับเฉพาะรูป JPG, PNG หรือ WebP" };
  }

  const admin = createAdminClient();
  const access = await getOrganizerAccessForUser(admin, user.id);
  if (!access) return { error: "บัญชีนี้ยังไม่พร้อมใช้งาน" };
  if (access.isFacilityOwner) {
    return { error: "บัญชีเจ้าของสนามได้รับสิทธิ์ผู้จัดครบอยู่แล้ว ไม่ต้องซื้อแพ็กเกจเพิ่ม" };
  }
  const { data: plan } = await admin
    .from("organizer_plans")
    .select("code, price_satang, is_active")
    .eq("code", parsed.data.planCode)
    .eq("is_active", true)
    .maybeSingle();
  if (!plan) return { error: "แพ็กเกจนี้ไม่พร้อมใช้งาน" };

  const { data: pending } = await admin
    .from("organizer_subscription_orders")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "awaiting_verification")
    .maybeSingle();
  if (pending) return { error: "คุณมีรายการรอตรวจสอบอยู่แล้ว กรุณารอผลก่อนส่งรายการใหม่" };

  const transferDate = new Date(`${parsed.data.transferAt.slice(0, 16)}:00+07:00`);
  if (Number.isNaN(transferDate.getTime())) return { error: "วันและเวลาโอนไม่ถูกต้อง" };
  const age = Date.now() - transferDate.getTime();
  if (age < -15 * 60 * 1000) return { error: "วันและเวลาโอนต้องไม่อยู่ในอนาคต" };
  if (age > 90 * 24 * 60 * 60 * 1000) return { error: "หลักฐานการโอนต้องไม่เกิน 90 วัน" };
  const transferAt = transferDate.toISOString();
  const { data: order, error: orderError } = await admin
    .from("organizer_subscription_orders")
    .insert({
      profile_id: user.id,
      plan_code: plan.code,
      amount_satang: plan.price_satang,
      sender_name: parsed.data.senderName,
      transfer_at: transferAt,
      payment_reference: parsed.data.paymentReference || null,
      status: "awaiting_verification",
    })
    .select("id")
    .single();
  if (orderError || !order) return { error: "สร้างรายการสมัครไม่สำเร็จ กรุณาลองใหม่" };

  const bytes = Buffer.from(await slip.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const ext = slip.type === "image/png" ? "png" : slip.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${order.id}-${digest}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("organizer-slips")
    .upload(path, bytes, { contentType: slip.type, upsert: false });
  if (uploadError) {
    await admin.from("organizer_subscription_orders").delete().eq("id", order.id);
    return { error: "อัปโหลดหลักฐานไม่สำเร็จ กรุณาลองใหม่" };
  }

  await admin.from("organizer_subscription_orders").update({ slip_path: path }).eq("id", order.id);
  revalidatePath("/me/organizer");
  revalidatePath("/super-admin/organizers");
  return { success: true };
}
