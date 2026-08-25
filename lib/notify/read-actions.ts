"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";

const now = () => new Date().toISOString();

// mark-read แยก 3 โหมด — ใช้ service role (เลี่ยง gap ของ RLS update ฝั่ง staff)
// scope แน่นด้วย context ของผู้เรียกเสมอ (tenant ของ staff / recipient ของตัวเอง / platform สำหรับ super_admin)

export async function markTenantNotificationsRead(): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "unauthorized" };
  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ is_read: true, read_at: now() })
    .eq("tenant_id", ctx.tenantId)
    .in("recipient_type", ["admin", "staff"])
    .eq("is_read", false);
  return { success: true };
}

export async function markSelfNotificationsRead(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const ids = member ? [user.id, member.id] : [user.id];
  await admin
    .from("notifications")
    .update({ is_read: true, read_at: now() })
    .in("recipient_id", ids)
    .eq("is_read", false);
  return { success: true };
}

export async function markPlatformNotificationsRead(): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if (!ctx || ctx.role !== "super_admin") return { error: "unauthorized" };
  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ is_read: true, read_at: now() })
    .is("tenant_id", null)
    .eq("recipient_type", "admin")
    .eq("is_read", false);
  return { success: true };
}
