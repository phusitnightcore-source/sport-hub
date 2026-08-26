"use server";

import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";

type PackageType = Database["public"]["Enums"]["package_type"];

export async function createPackage(data: {
  name: string;
  type: string;
  price: number;
  duration_days: number | null;
  sessions_limit: number | null;
  sessions_carryover: boolean;
  branch_access_all: boolean;
  branch_access_ids?: string[] | null;
  freeze_max_times: number;
  freeze_max_days: number;
  freeze_auto_approve: boolean;
  benefits: string;
}) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  const { data: newPackage, error } = await supabase
    .from("packages")
    .insert({
      tenant_id: ctx.tenantId,
      name: data.name,
      type: data.type as PackageType,
      price: data.price,
      duration_days: data.duration_days,
      sessions_limit: data.sessions_limit,
      sessions_carryover: data.sessions_carryover,
      branch_access_all: data.branch_access_all,
      branch_access_ids: data.branch_access_ids ?? [],
      freeze_max_times: data.freeze_max_times,
      freeze_max_days: data.freeze_max_days,
      freeze_auto_approve: data.freeze_auto_approve,
      benefits: data.benefits,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "create",
    module: "packages",
    referenceId: newPackage.id,
    after: newPackage,
  });

  revalidatePath("/dashboard/packages");
  return { success: true };
}

export async function updatePackage(
  id: string,
  data: {
    name: string;
    type: string;
    price: number;
    duration_days: number | null;
    sessions_limit: number | null;
    sessions_carryover: boolean;
    branch_access_all: boolean;
    branch_access_ids?: string[] | null;
    freeze_max_times: number;
    freeze_max_days: number;
    freeze_auto_approve: boolean;
    benefits: string;
  }
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("packages")
    .update({
      name: data.name,
      type: data.type as PackageType,
      price: data.price,
      duration_days: data.duration_days,
      sessions_limit: data.sessions_limit,
      sessions_carryover: data.sessions_carryover,
      branch_access_all: data.branch_access_all,
      branch_access_ids: data.branch_access_ids ?? [],
      freeze_max_times: data.freeze_max_times,
      freeze_max_days: data.freeze_max_days,
      freeze_auto_approve: data.freeze_auto_approve,
      benefits: data.benefits,
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "update",
    module: "packages",
    referenceId: id,
    after: updated,
  });

  revalidatePath("/dashboard/packages");
  return { success: true };
}

export async function togglePackageStatus(id: string, isActive: boolean) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("packages")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "update_status",
    module: "packages",
    referenceId: id,
    after: updated,
  });

  revalidatePath("/dashboard/packages");
  return { success: true };
}
