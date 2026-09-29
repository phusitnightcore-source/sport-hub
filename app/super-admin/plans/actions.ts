"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { captureException } from "@/lib/logger";
import { FEATURE_FLAGS, LIMIT_FIELDS } from "@/lib/entitlements";

export type PlanState = { error?: string; success?: boolean; plan?: string };

const planSchema = z.enum(["free", "growth", "pro"]);

// แปลงค่า limit จากฟอร์ม: ว่าง = null (ไม่จำกัด), มีค่า = จำนวนเต็ม >= 0
function parseLimit(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

// Super Admin กำหนดสิทธิ์ต่อแพลน (§5/§26) — เขียนผ่าน service role โดยเจตนา
export async function savePlanEntitlements(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const ctx = await getSuperAdminContext();
  if (!ctx) return { error: "เฉพาะทีม SportHub เท่านั้น" };

  const parsed = planSchema.safeParse(formData.get("plan"));
  if (!parsed.success) return { error: "แพลนไม่ถูกต้อง" };
  const plan = parsed.data;

  const row: Record<string, boolean | number | null | string> = { plan };
  for (const flag of FEATURE_FLAGS) row[flag] = formData.get(flag) === "on";
  for (const limit of LIMIT_FIELDS) row[limit] = parseLimit(formData.get(limit));
  row.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { error } = await admin
    .from("plan_entitlements")
    .upsert(row as never, { onConflict: "plan" });

  if (error) {
    captureException("plans.saveEntitlements", error, { plan });
    // ตารางยังไม่ถูก apply migration = ให้ข้อความชัด
    return {
      error: "บันทึกไม่สำเร็จ (ตาราง plan_entitlements อาจยังไม่ถูก apply migration)",
      plan,
    };
  }

  await logAudit({
    tenantId: null,
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: "update",
    module: "plan_entitlements",
    after: row,
  });

  revalidatePath("/super-admin/plans");
  return { success: true, plan };
}
