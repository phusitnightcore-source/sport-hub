"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export async function updateCoachStatus(
  coachId: string,
  status: "approved" | "rejected" | "suspended" | "pending",
  isVisible: boolean = status === "approved"
) {
  const ctx = await getSuperAdminContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์ Super Admin" };

  const admin = createAdminClient();

  const { error } = await admin
    .from("coach_profiles")
    .update({
      approval_status: status,
      is_visible: isVisible,
      updated_at: new Date().toISOString(),
    })
    .eq("id", coachId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    tenantId: "platform",
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: status === "approved" ? "activate" : "suspend",
    module: "coaches",
    referenceId: coachId,
    after: { approval_status: status, is_visible: isVisible },
  });

  revalidatePath("/super-admin/coaches");
  revalidatePath("/super-admin");
  revalidatePath("/coaches");
  return { success: true };
}
