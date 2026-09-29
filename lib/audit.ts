import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureException } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import type { Json } from "@/lib/supabase/types";

type AuditEntry = {
  tenantId: string | null;
  actorId: string | null; // null = guest/ระบบ
  actorRole: Database["public"]["Enums"]["user_role"];
  action: string; // create/update/verify/reject/refund/...
  module: string; // booking/payment/member/...
  referenceId?: string;
  before?: Json;
  after?: Json;
  ip?: string | null;
};

// ทุก mutation สำคัญต้องผ่านตัวนี้ (CLAUDE.md) — insert ด้วย service role เท่านั้น
// (ตาราง audit_logs ไม่มี insert policy ฝั่ง client โดยตั้งใจ)
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      tenant_id: entry.tenantId,
      actor_id: entry.actorId,
      actor_role: entry.actorRole,
      action: entry.action,
      module: entry.module,
      reference_id: entry.referenceId ?? null,
      before_value: entry.before ?? null,
      after_value: entry.after ?? null,
      ip_address: entry.ip ?? null,
    });
  } catch (e) {
    // audit ล้มเหลวต้องไม่ทำให้ flow หลักพัง — log ไว้พอ
    captureException("audit_logs.insert", e);
  }
}
