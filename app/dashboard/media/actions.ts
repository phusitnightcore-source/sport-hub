"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { MEDIA_BUCKET, isValidFolder } from "./folders";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB (§25.1)

export type MediaState = { error?: string; success?: boolean };

// อัปโหลดไฟล์เข้าโฟลเดอร์ของ tenant (§25) — path ขึ้นต้นด้วย tenant_id เสมอ
export async function uploadMedia(
  _prev: MediaState,
  formData: FormData,
): Promise<MediaState> {
  const ctx = await getStaffContext();
  if (!ctx) return { error: "ไม่มีสิทธิ์เข้าถึง" };

  const folder = String(formData.get("folder") ?? "");
  if (!isValidFolder(folder)) return { error: "หมวดไฟล์ไม่ถูกต้อง" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "กรุณาเลือกไฟล์" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "ไฟล์ใหญ่เกิน 20 MB" };
  }

  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${ctx.tenantId}/${folder}/${Date.now()}-${safeName}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });

  if (error) {
    console.error("media upload failed:", error);
    return { error: "อัปโหลดไม่สำเร็จ กรุณาลองใหม่" };
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "create",
    module: "media",
    after: { path },
  });

  revalidatePath("/dashboard/media");
  return { success: true };
}

// ลบไฟล์ — บังคับให้ path อยู่ใน tenant ตัวเองเท่านั้น
export async function deleteMedia(formData: FormData): Promise<void> {
  const ctx = await getStaffContext();
  if (!ctx) return;

  const path = String(formData.get("path") ?? "");
  if (!path.startsWith(`${ctx.tenantId}/`)) return; // กันลบข้าม tenant

  const admin = createAdminClient();
  const { error } = await admin.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) {
    console.error("media delete failed:", error);
    return;
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "delete",
    module: "media",
    after: { path },
  });

  revalidatePath("/dashboard/media");
}
