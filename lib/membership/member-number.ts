import "server-only";

import { randomInt } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function createMemberNumber(
  admin: AdminClient,
  tenantId: string,
): Promise<string> {
  const { data, error } = await admin.rpc("next_member_number", {
    p_tenant_id: tenantId,
  });
  if (!error && data) return data;

  // Compatibility before the hardening migration is applied. The database
  // unique constraint remains the final guard against a collision.
  return `M-${randomInt(0, 100_000_000).toString().padStart(8, "0")}`;
}
