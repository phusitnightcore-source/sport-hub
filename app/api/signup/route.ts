import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";

// Onboarding สนามใหม่ (§4) — field ครบตามตาราง + PDPA consent (§6.2: timestamp + IP)
const bodySchema = z.object({
  venueName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง"),
  email: z.string().email().max(200),
  password: z.string().min(8).max(72),
  address: z.string().trim().max(300).optional(),
  promptpayId: z
    .string()
    .regex(/^\d{10}$|^\d{13}$|^\d{15}$/, "พร้อมเพย์ต้องเป็นเบอร์โทร/บัตรประชาชน/e-Wallet")
    .optional(),
  businessType: z.enum(["sports_venue", "fitness", "both"]),
  taxId: z.string().regex(/^\d{13}$/).optional(),
  // LINE OA (ไม่บังคับ) — เก็บไว้ให้ทีมตามไปเชื่อมต่อ
  lineOa: z
    .object({
      has: z.boolean().default(false),
      inviteLink: z.string().trim().max(500).optional(),
      wantSetup: z.enum(["team", "self"]).optional(),
      sendLater: z.boolean().optional(),
    })
    .optional(),
  acceptPdpa: z.literal(true), // ต้องยินยอมก่อน Activate บัญชี (§6.2)
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
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const admin = createAdminClient();

  // 1) สร้าง auth user ก่อน — อีเมลซ้ำคือเคส error หลัก
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  });
  if (userErr) {
    if (userErr.code === "email_exists" || /already/i.test(userErr.message)) {
      return apiError("VALIDATION_ERROR", "อีเมลนี้ถูกใช้สมัครไปแล้ว", 409);
    }
    console.error("signup createUser failed:", userErr);
    return apiError("INTERNAL_ERROR", "สมัครไม่สำเร็จ กรุณาลองใหม่", 500);
  }
  const userId = created.user.id;

  // 2) tenant (สถานะ trial) + PDPA consent
  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .insert({
      name: body.venueName,
      owner_name: body.ownerName,
      phone: body.phone,
      email: body.email,
      address: body.address ?? null,
      business_type: body.businessType,
      promptpay_id: body.promptpayId ?? null,
      tax_id: body.taxId ?? null,
      status: "trial",
      pdpa_consent_at: new Date().toISOString(),
      pdpa_consent_ip: ip,
      consent_version: "1.0",
      settings: {
        slot_lock_minutes: 15,
        auto_approve_slip: false,
        renewal_reminder_days: [7, 3, 0],
        theme: {},
        line_oa: {
          has_oa: body.lineOa?.has ?? false,
          invite_link: body.lineOa?.inviteLink ?? null,
          want_setup: body.lineOa?.wantSetup ?? null,
          send_later: body.lineOa?.sendLater ?? false,
          connected: false, // ทีมอัปเดตเป็น true เมื่อเชื่อมเสร็จ
        },
      },
    })
    .select("id, name")
    .single();
  if (tenantErr) {
    await admin.auth.admin.deleteUser(userId); // rollback user ที่สร้างไป
    console.error("signup tenant failed:", tenantErr);
    return apiError("INTERNAL_ERROR", "สมัครไม่สำเร็จ กรุณาลองใหม่", 500);
  }

  // 3) profile (venue_admin) + subscription trial 14 วัน (Growth features — §4)
  //    + สาขาแรกอัตโนมัติ
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString();
  const [profileRes, subRes, branchRes] = await Promise.all([
    admin.from("profiles").insert({
      id: userId,
      tenant_id: tenant.id,
      role: "venue_admin",
      full_name: body.ownerName,
      display_name: body.ownerName?.trim() || body.email.split("@")[0],
      phone: body.phone,
      email: body.email,
    }),
    admin.from("subscriptions").insert({
      tenant_id: tenant.id,
      plan: "growth",
      status: "trial",
      trial_start: new Date().toISOString(),
      trial_end: trialEnd,
    }),
    admin.from("branches").insert({
      tenant_id: tenant.id,
      name: "สาขาหลัก",
      address: body.address ?? null,
      phone: body.phone,
    }),
  ]);
  const stepErr = profileRes.error ?? subRes.error ?? branchRes.error;
  if (stepErr) {
    console.error("signup provisioning failed:", stepErr);
    // tenant cascade จะลบ profile/subscription/branch ให้เอง
    await admin.from("tenants").delete().eq("id", tenant.id);
    await admin.auth.admin.deleteUser(userId);
    return apiError("INTERNAL_ERROR", "สมัครไม่สำเร็จ กรุณาลองใหม่", 500);
  }

  await logAudit({
    tenantId: tenant.id,
    actorId: userId,
    actorRole: "venue_admin",
    action: "signup",
    module: "tenant",
    referenceId: tenant.id,
    after: { name: tenant.name, trial_end: trialEnd },
    ip,
  });

  return apiOk({ tenantId: tenant.id, trialEnd }, 201);
}
