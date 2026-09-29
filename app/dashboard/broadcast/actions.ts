"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { dispatchNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

// ส่ง Broadcast หาสมาชิก (§14.1 Promotion) — gate: entitlement broadcast + permission broadcast
// วนส่งทีละคนผ่าน dispatcher (in-app เสมอ + LINE/email ถ้ามี) เฉพาะคนที่ไม่ opt-out
export async function sendBroadcast(
  title: string,
  body: string,
): Promise<{ error?: string; sent?: number }> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };
  if (!hasPermission(ctx, "broadcast")) {
    return { error: "ไม่มีสิทธิ์ส่ง Broadcast" };
  }

  const admin = createAdminClient();
  const { entitlements } = await getTenantEntitlements(admin, ctx.tenantId);
  if (!entitlements.broadcast) {
    return { error: "แพลนนี้ยังไม่รองรับ Broadcast — อัปเกรดแพลน" };
  }

  const t = title.trim();
  const b = body.trim();
  if (t.length < 2 || b.length < 2) {
    return { error: "กรุณากรอกหัวข้อและข้อความ" };
  }

  const { data: members } = await admin
    .from("members")
    .select("id, line_user_id, email")
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "active")
    .eq("broadcast_opt_out", false)
    .limit(5000);

  let sent = 0;
  for (const m of members ?? []) {
    await dispatchNotification({
      tenantId: ctx.tenantId,
      recipientId: m.id,
      recipientType: "member",
      type: "promotion",
      title: t,
      body: b,
      lineUserId: m.line_user_id,
      email: m.email,
    });
    sent += 1;
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "broadcast",
    module: "notification",
    after: { title: t, sent },
  });

  return { sent };
}
