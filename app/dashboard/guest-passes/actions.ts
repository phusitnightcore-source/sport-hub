"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// ออก Guest Pass (§10.6) — บัตรเข้าใช้ชั่วคราวสำหรับผู้ที่ไม่ใช่สมาชิก
const schema = z
  .object({
    recipient_name: z.string().trim().min(1, "กรุณากรอกชื่อผู้รับ").max(120),
    valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง"),
    valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง"),
    sessions_limit: z.coerce.number().int().min(1).max(999).optional(),
  })
  .refine((v) => v.valid_until >= v.valid_from, {
    message: "วันหมดอายุต้องไม่ก่อนวันเริ่ม",
    path: ["valid_until"],
  });

export type GuestPassState = { error?: string; success?: boolean };

export async function issueGuestPass(
  _prev: GuestPassState,
  formData: FormData,
): Promise<GuestPassState> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };

  const parsed = schema.safeParse({
    recipient_name: formData.get("recipient_name"),
    valid_from: formData.get("valid_from"),
    valid_until: formData.get("valid_until"),
    sessions_limit: formData.get("sessions_limit") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const v = parsed.data;

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("guest_passes")
    .insert({
      tenant_id: ctx.tenantId,
      recipient_name: v.recipient_name,
      valid_from: v.valid_from,
      valid_until: v.valid_until,
      sessions_limit: v.sessions_limit ?? null,
      branch_access_all: true,
      issued_by: ctx.staffId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("issue guest pass failed:", error);
    return { error: "ออกบัตรไม่สำเร็จ กรุณาลองใหม่" };
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "create",
    module: "guest_pass",
    referenceId: inserted?.id,
    after: { recipient_name: v.recipient_name, valid_until: v.valid_until },
  });

  revalidatePath("/dashboard/guest-passes");
  return { success: true };
}
