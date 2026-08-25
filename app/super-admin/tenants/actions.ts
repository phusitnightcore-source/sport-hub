"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { captureException } from "@/lib/logger";
import type { Json } from "@/lib/supabase/types";

export type ConnectState = { error?: string; success?: boolean };

// ทีม SportHub เชื่อม LINE OA ให้สนาม (แทนที่จะต้องล็อกอินเข้าแดชบอร์ดของสนามเอง)
// เก็บ token/secret ใน tenants.settings.line_oa (จุด bypass RLS โดยเจตนา — service role)
export async function connectTenantLineOa(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const ctx = await getSuperAdminContext();
  if (!ctx) return { error: "เฉพาะทีม SportHub เท่านั้น" };

  const tenantId = String(formData.get("tenantId") ?? "");
  const token = String(formData.get("channel_access_token") ?? "").trim();
  const secret = String(formData.get("channel_secret") ?? "").trim();
  const friendUrl = String(formData.get("oa_friend_url") ?? "").trim();

  if (!z.string().uuid().safeParse(tenantId).success) return { error: "รหัสสนามไม่ถูกต้อง" };
  if (!token || !secret) return { error: "กรุณากรอก Channel Access Token และ Channel Secret" };

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();
  const prevSettings = (current?.settings as Record<string, Json | undefined> | null) ?? {};
  const prevOa = (prevSettings.line_oa as Record<string, Json | undefined> | undefined) ?? {};

  const nextOa = {
    ...prevOa,
    has_oa: true,
    channel_access_token: token,
    channel_secret: secret,
    oa_friend_url: friendUrl || (prevOa.oa_friend_url as string | undefined) || null,
    connected: true,
  };

  const { error } = await admin
    .from("tenants")
    .update({ settings: { ...prevSettings, line_oa: nextOa } })
    .eq("id", tenantId);
  if (error) {
    captureException("superadmin.connectTenantLineOa", error);
    return { error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }

  await logAudit({
    tenantId,
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: "connect_line_oa",
    module: "settings",
    referenceId: tenantId,
    after: { connected: true, by: "team" }, // ไม่ log token จริง
  });

  revalidatePath("/super-admin/tenants");
  return { success: true };
}
