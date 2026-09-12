import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffContext } from "@/lib/auth";

export async function canUsePosBranch(ctx: StaffContext, branchId: string) {
  const admin = createAdminClient();
  const { data: branch } = await admin.from("branches").select("id").eq("id", branchId).eq("tenant_id", ctx.tenantId).eq("status", "active").maybeSingle();
  if (!branch) return false;
  if (ctx.role === "venue_admin") return true;
  if (!ctx.staffId) return false;
  const { data: staff } = await admin.from("staff").select("status, multi_branch_access, staff_branches(branch_id)").eq("id", ctx.staffId).eq("tenant_id", ctx.tenantId).maybeSingle();
  return !!staff && staff.status === "active" && (staff.multi_branch_access || staff.staff_branches.some(row => row.branch_id === branchId));
}
