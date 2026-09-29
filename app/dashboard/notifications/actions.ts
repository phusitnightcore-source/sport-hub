"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";

export async function markAllRead() {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "Unauthorized" };

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("tenant_id", ctx.tenantId)
    .eq("recipient_type", "admin")
    .eq("is_read", false);

  revalidatePath("/dashboard/notifications");
  return { success: true };
}
