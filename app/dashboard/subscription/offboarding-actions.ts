"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Offboarding (§32, PDPA §6.4): venue_admin ยกเลิกบัญชี
// → status cancelled_pending_delete + hard_delete_after = +30 วัน
// cron จะลบถาวรเมื่อถึงกำหนด — ระหว่างนั้น Export ข้อมูลได้
export async function cancelTenantAccount() {
  const ctx = await getStaffContext();
  if (!ctx || ctx.role !== "venue_admin") {
    return { error: "เฉพาะเจ้าของสนามเท่านั้น" };
  }

  const admin = createAdminClient();
  const now = new Date();
  const hardDeleteAfter = new Date(now.getTime() + 30 * 86_400_000);

  const { error } = await admin
    .from("tenants")
    .update({
      status: "cancelled_pending_delete",
      cancelled_at: now.toISOString(),
      hard_delete_after: hardDeleteAfter.toISOString(),
    })
    .eq("id", ctx.tenantId);
  if (error) return { error: "ยกเลิกไม่สำเร็จ กรุณาลองใหม่" };

  await admin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("tenant_id", ctx.tenantId);

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "cancel_account",
    module: "tenant",
    referenceId: ctx.tenantId,
    after: { hard_delete_after: hardDeleteAfter.toISOString() },
  });

  revalidatePath("/dashboard/subscription");
  return { success: true };
}
