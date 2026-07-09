"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";

type MemberStatus = Database["public"]["Enums"]["member_status"];

export async function updateMemberStatus(memberId: string, newStatus: MemberStatus) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("members")
    .select("status, tenant_id")
    .eq("id", memberId)
    .single();

  if (!member || member.tenant_id !== ctx.tenantId) {
    return { success: false, error: "Not found" };
  }

  const { error } = await admin
    .from("members")
    .update({ status: newStatus })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "update",
    module: "members",
    referenceId: memberId,
    before: { status: member.status },
    after: { status: newStatus },
  });

  revalidatePath(`/dashboard/members/${memberId}`);
  revalidatePath(`/dashboard/members`);

  return { success: true };
}
