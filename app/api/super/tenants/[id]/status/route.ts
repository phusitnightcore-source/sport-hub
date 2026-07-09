import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { getSuperAdminContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({
  action: z.enum(["suspend", "activate"]),
});

// Super Admin ระงับ/คืนสถานะสนาม (§3.1) — tenant ที่ suspended จะรับจองไม่ได้
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getSuperAdminContext();
  if (!ctx) {
    return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return apiError("VALIDATION_ERROR", "รหัสสนามไม่ถูกต้อง", 400);
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "action ไม่ถูกต้อง", 400);
  }

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, status")
    .eq("id", id)
    .single();
  if (!tenant) return apiError("NOT_FOUND", "ไม่พบสนาม", 404);

  const newStatus = parsed.data.action === "suspend" ? "suspended" : "active";
  if (tenant.status === newStatus) {
    return apiError("VALIDATION_ERROR", "สนามอยู่ในสถานะนี้แล้ว", 400);
  }

  const { error } = await admin
    .from("tenants")
    .update({ status: newStatus })
    .eq("id", tenant.id);
  if (error) {
    console.error("tenant status update failed:", error);
    return apiError("INTERNAL_ERROR", "เกิดข้อผิดพลาด กรุณาลองใหม่", 500);
  }

  await logAudit({
    tenantId: tenant.id,
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: parsed.data.action,
    module: "tenant",
    referenceId: tenant.id,
    before: { status: tenant.status },
    after: { status: newStatus },
  });

  return apiOk({ status: newStatus });
}
