"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { captureException } from "@/lib/logger";
import type { Json } from "@/lib/supabase/types";

type SettingsObj = Record<string, Json | undefined>;

// ตั้งค่าสนามแบบรวม (§23) — ข้อมูลธุรกิจ + PromptPay + settings JSONB
const schema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อสนาม").max(120),
  owner_name: z.string().trim().min(1, "กรุณากรอกชื่อเจ้าของ").max(120),
  phone: z.string().trim().min(1, "กรุณากรอกเบอร์โทร").max(30),
  email: z.string().trim().email("อีเมลไม่ถูกต้อง").max(160),
  address: z.string().trim().max(300).optional(),
  promptpay_id: z.string().trim().max(50).optional(),
  tax_id: z.string().trim().max(30).optional(),
  slot_lock_minutes: z.coerce.number().int().min(5).max(120),
  auto_approve_slip: z.coerce.boolean(),
});

export type SettingsState = { error?: string; success?: boolean };

export async function updateTenantSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };
  if (!hasPermission(ctx, "manage_settings")) {
    return { error: "เฉพาะผู้ดูแลสนามเท่านั้นที่แก้ไขการตั้งค่าได้" };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    owner_name: formData.get("owner_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address") || undefined,
    promptpay_id: formData.get("promptpay_id") || undefined,
    tax_id: formData.get("tax_id") || undefined,
    slot_lock_minutes: formData.get("slot_lock_minutes"),
    auto_approve_slip: formData.get("auto_approve_slip") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const v = parsed.data;

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", ctx.tenantId)
    .single();

  const prevSettings =
    (current?.settings as Record<string, unknown> | null) ?? {};
  const nextSettings = {
    ...prevSettings,
    slot_lock_minutes: v.slot_lock_minutes,
    auto_approve_slip: v.auto_approve_slip,
  };

  const { error } = await admin
    .from("tenants")
    .update({
      name: v.name,
      owner_name: v.owner_name,
      phone: v.phone,
      email: v.email,
      address: v.address ?? null,
      promptpay_id: v.promptpay_id ?? null,
      tax_id: v.tax_id ?? null,
      settings: nextSettings,
    })
    .eq("id", ctx.tenantId);

  if (error) {
    console.error("update settings failed:", error);
    return { error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "update",
    module: "settings",
    referenceId: ctx.tenantId,
    after: { name: v.name, settings: nextSettings },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

const MAX_QR_BYTES = 300 * 1024; // 300 KB — QR ปกติเล็กมาก
const QR_TYPES = ["image/png", "image/jpeg", "image/webp"];

// อัปโหลดรูป QR PromptPay ของสนาม (static) — เก็บเป็น data URL ใน settings.promptpay_qr
// ใช้เมื่อสนามมี QR สำเร็จรูป (เช่น QR ร้านค้าจากแอปธนาคาร) แทน/เสริมเลขพร้อมเพย์
export async function savePromptpayQr(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };
  if (!hasPermission(ctx, "manage_settings")) {
    return { error: "เฉพาะผู้ดูแลสนามเท่านั้นที่แก้ไขการตั้งค่าได้" };
  }

  const file = formData.get("qr");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "กรุณาเลือกรูป QR" };
  }
  if (!QR_TYPES.includes(file.type)) {
    return { error: "รองรับเฉพาะ PNG / JPG / WEBP" };
  }
  if (file.size > MAX_QR_BYTES) {
    return { error: "รูปใหญ่เกิน 300 KB — กรุณาย่อขนาดก่อน" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", ctx.tenantId)
    .single();
  const prevSettings = (current?.settings as SettingsObj | null) ?? {};

  const { error } = await admin
    .from("tenants")
    .update({ settings: { ...prevSettings, promptpay_qr: dataUrl } })
    .eq("id", ctx.tenantId);
  if (error) {
    captureException("settings.savePromptpayQr", error);
    return { error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "update",
    module: "settings",
    referenceId: ctx.tenantId,
    after: { promptpay_qr: "uploaded" },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ลบรูป QR ที่อัปโหลด (กลับไปใช้ QR สร้างจากเลขพร้อมเพย์)
export async function removePromptpayQr(): Promise<void> {
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "manage_settings")) return;

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", ctx.tenantId)
    .single();
  const prevSettings = (current?.settings as SettingsObj | null) ?? {};
  const next = { ...prevSettings };
  delete next.promptpay_qr;

  await admin.from("tenants").update({ settings: next }).eq("id", ctx.tenantId);
  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "update",
    module: "settings",
    referenceId: ctx.tenantId,
    after: { promptpay_qr: "removed" },
  });
  revalidatePath("/dashboard/settings");
}
