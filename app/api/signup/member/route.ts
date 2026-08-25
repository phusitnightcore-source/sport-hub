import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { captureException } from "@/lib/logger";
import { rateLimit } from "@/lib/ratelimit";

// สมัคร "ผู้ใช้ทั่วไป" (ผู้เล่น/ลูกค้า) — role=member, tenant_id=null
// จองคอร์ทผ่านลิงก์ของสนามได้ + เขียนบทความได้ (รออนุมัติ) — §6.2 PDPA consent
const bodySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง").optional(),
  email: z.string().email().max(200),
  password: z.string().min(8).max(72),
  acceptPdpa: z.literal(true),
});

export async function POST(request: Request) {
  const limited = await rateLimit(request, "signup", 5, 60_000);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "ข้อมูลไม่ครบหรือไม่ถูกต้อง", 400, {
      issues: parsed.error.issues,
    });
  }
  const body = parsed.data;
  const admin = createAdminClient();

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  });
  if (userErr) {
    if (userErr.code === "email_exists" || /already/i.test(userErr.message)) {
      return apiError("VALIDATION_ERROR", "อีเมลนี้ถูกใช้สมัครไปแล้ว", 409);
    }
    captureException("signup.member.createUser", userErr);
    return apiError("INTERNAL_ERROR", "สมัครไม่สำเร็จ กรุณาลองใหม่", 500);
  }
  const userId = created.user.id;

  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: null, // ผู้ใช้ทั่วไปไม่สังกัดสนาม
    role: "member",
    full_name: body.fullName,
    phone: body.phone ?? null,
    email: body.email,
    pdpa_consent_at: new Date().toISOString(),
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(userId);
    captureException("signup.member.profile", profileErr);
    return apiError("INTERNAL_ERROR", "สมัครไม่สำเร็จ กรุณาลองใหม่", 500);
  }

  await logAudit({
    tenantId: null,
    actorId: userId,
    actorRole: "member",
    action: "signup",
    module: "user",
    referenceId: userId,
    after: { email: body.email },
  });

  return apiOk({ userId }, 201);
}
