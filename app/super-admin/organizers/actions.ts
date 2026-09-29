"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const reviewSchema = z.object({
  orderId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export async function reviewOrganizerOrder(formData: FormData) {
  const ctx = await getSuperAdminContext();
  if (!ctx) throw new Error("ไม่มีสิทธิ์ดำเนินการ");
  const parsed = reviewSchema.safeParse({
    orderId: formData.get("order_id"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) throw new Error("ข้อมูลไม่ถูกต้อง");

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("organizer_subscription_orders")
    .select("id,profile_id,plan_code,status")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (!order || order.status !== "awaiting_verification") throw new Error("รายการนี้ถูกดำเนินการแล้ว");

  const { error: reviewError } = await admin.rpc("review_organizer_order", {
    p_order_id: order.id,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || "",
    p_reviewer: ctx.userId,
  });
  if (reviewError) {
    console.error("Review organizer order error:", reviewError);
    throw new Error("ตรวจสอบรายการไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่");
  }

  await logAudit({
    tenantId: null,
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: parsed.data.decision === "approve" ? "approve" : "reject",
    module: "organizer_subscription",
    referenceId: order.id,
    after: { profile_id: order.profile_id, plan_code: order.plan_code, note: parsed.data.note },
  });
  revalidatePath("/super-admin/organizers");
  revalidatePath("/me/organizer");
}
