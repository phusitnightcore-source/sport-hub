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
    // SOW v1.1 กำหนด Hold เป็น 15 นาทีและไม่อนุญาตให้ Owner ปรับ/ต่อเวลา
    slot_lock_minutes: 15,
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

// เชื่อมต่อ LINE OA ของสนาม (per-tenant) — เก็บ Channel Access Token/Secret ใน settings.line_oa
// token เป็นความลับ: ไม่ log ค่าจริง / ไม่ส่งกลับ client (หน้า settings แสดงแค่สถานะ + 4 ตัวท้าย)
export async function saveLineOa(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };
  if (!hasPermission(ctx, "manage_settings")) {
    return { error: "เฉพาะผู้ดูแลสนามเท่านั้นที่แก้ไขการตั้งค่าได้" };
  }

  const token = String(formData.get("channel_access_token") ?? "").trim();
  const secret = String(formData.get("channel_secret") ?? "").trim();
  const friendUrl = String(formData.get("oa_friend_url") ?? "").trim();

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", ctx.tenantId)
    .single();
  const prevSettings = (current?.settings as SettingsObj | null) ?? {};
  const prevOa = (prevSettings.line_oa as Record<string, Json | undefined> | undefined) ?? {};

  // อัปเดต token/secret เฉพาะเมื่อกรอกใหม่ (เว้นว่าง = คงของเดิม)
  const nextToken = token || (prevOa.channel_access_token as string | undefined) || null;
  const nextOa = {
    ...prevOa,
    has_oa: true,
    channel_access_token: nextToken,
    channel_secret: secret || (prevOa.channel_secret as string | undefined) || null,
    oa_friend_url: friendUrl || (prevOa.oa_friend_url as string | undefined) || null,
    connected: Boolean(nextToken),
  };

  const { error } = await admin
    .from("tenants")
    .update({ settings: { ...prevSettings, line_oa: nextOa } })
    .eq("id", ctx.tenantId);
  if (error) {
    captureException("settings.saveLineOa", error);
    return { error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "update",
    module: "settings",
    referenceId: ctx.tenantId,
    after: { line_oa_connected: nextOa.connected }, // ไม่ log token จริง
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ตัดการเชื่อมต่อ LINE OA (ล้าง token/secret)
export async function disconnectLineOa(): Promise<void> {
  const ctx = await getStaffContext();
  if (!ctx || !hasPermission(ctx, "manage_settings")) return;

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", ctx.tenantId)
    .single();
  const prevSettings = (current?.settings as SettingsObj | null) ?? {};
  const prevOa = (prevSettings.line_oa as Record<string, Json | undefined> | undefined) ?? {};
  const nextOa = {
    ...prevOa,
    channel_access_token: null,
    channel_secret: null,
    connected: false,
  };
  await admin
    .from("tenants")
    .update({ settings: { ...prevSettings, line_oa: nextOa } })
    .eq("id", ctx.tenantId);
  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "update",
    module: "settings",
    referenceId: ctx.tenantId,
    after: { line_oa_connected: false },
  });
  revalidatePath("/dashboard/settings");
}

// ลบรูป QR ที่อัปโหลด (กลับไปใช้ QR สร้างจากเลขพร้อมเพย์)
// ---- เสียงแจ้งเตือนที่สนามอัปโหลดเอง (เก็บ path ใน tenant-media + settings.notification_sounds) ----
const SOUND_TYPES = ["booking", "payment", "membership", "promotion", "system"] as const;
const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm"];
const MAX_SOUND_BYTES = 1024 * 1024; // 1 MB

export async function saveNotificationSound(formData: FormData): Promise<SettingsState> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };
  if (!hasPermission(ctx, "manage_settings")) {
    return { error: "เฉพาะผู้ดูแลสนามเท่านั้นที่แก้ไขการตั้งค่าได้" };
  }
  const type = String(formData.get("type") ?? "");
  if (!(SOUND_TYPES as readonly string[]).includes(type)) return { error: "ประเภทไม่ถูกต้อง" };
  const file = formData.get("sound");
  if (!(file instanceof File) || file.size === 0) return { error: "กรุณาเลือกไฟล์เสียง" };
  if (!AUDIO_TYPES.includes(file.type)) return { error: "รองรับ MP3 / WAV / OGG เท่านั้น" };
  if (file.size > MAX_SOUND_BYTES) return { error: "ไฟล์ใหญ่เกิน 1 MB — กรุณาย่อก่อน" };

  const ext = file.type.includes("mpeg") || file.type.includes("mp3")
    ? "mp3"
    : file.type.includes("ogg") || file.type.includes("webm")
      ? "ogg"
      : "wav";

  const admin = createAdminClient();
  const path = `${ctx.tenantId}/sounds/${type}-${Date.now()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from("tenant-media")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
  if (upErr) {
    captureException("settings.saveNotificationSound", upErr);
    return { error: "อัปโหลดไม่สำเร็จ กรุณาลองใหม่" };
  }

  const { data: current } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", ctx.tenantId)
    .single();
  const prevSettings = (current?.settings as SettingsObj | null) ?? {};
  const prevSounds =
    (prevSettings.notification_sounds as Record<string, string | undefined> | undefined) ?? {};
  const oldPath = prevSounds[type];

  const { error } = await admin
    .from("tenants")
    .update({
      settings: { ...prevSettings, notification_sounds: { ...prevSounds, [type]: path } },
    })
    .eq("id", ctx.tenantId);
  if (error) {
    captureException("settings.saveNotificationSound.update", error);
    return { error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }
  if (oldPath && oldPath !== path) {
    await admin.storage.from("tenant-media").remove([oldPath]);
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "update",
    module: "settings",
    referenceId: ctx.tenantId,
    after: { notification_sound: type },
  });
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function resetNotificationSound(formData: FormData): Promise<SettingsState> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };
  if (!hasPermission(ctx, "manage_settings")) {
    return { error: "เฉพาะผู้ดูแลสนามเท่านั้นที่แก้ไขการตั้งค่าได้" };
  }
  const type = String(formData.get("type") ?? "");
  if (!(SOUND_TYPES as readonly string[]).includes(type)) return { error: "ประเภทไม่ถูกต้อง" };

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", ctx.tenantId)
    .single();
  const prevSettings = (current?.settings as SettingsObj | null) ?? {};
  const prevSounds =
    (prevSettings.notification_sounds as Record<string, string | undefined> | undefined) ?? {};
  const oldPath = prevSounds[type];
  const nextSounds = { ...prevSounds };
  delete nextSounds[type];

  await admin
    .from("tenants")
    .update({ settings: { ...prevSettings, notification_sounds: nextSounds } })
    .eq("id", ctx.tenantId);
  if (oldPath) await admin.storage.from("tenant-media").remove([oldPath]);

  revalidatePath("/dashboard/settings");
  return { success: true };
}

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
