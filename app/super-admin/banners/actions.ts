"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { captureException } from "@/lib/logger";

export type BannerState = { error?: string };

const urlSchema = z.string().url();

export async function saveBanner(
  _prev: BannerState,
  formData: FormData,
): Promise<BannerState> {
  const ctx = await getSuperAdminContext();
  if (!ctx) return { error: "เฉพาะทีม SportHub เท่านั้น" };

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const image_url = String(formData.get("image_url") ?? "").trim();
  const link_url = String(formData.get("link_url") ?? "").trim();
  if (name.length < 2) return { error: "กรุณากรอกชื่อแบนเนอร์" };
  if (!urlSchema.safeParse(image_url).success) return { error: "URL รูปไม่ถูกต้อง" };
  if (!urlSchema.safeParse(link_url).success) return { error: "URL ปลายทางไม่ถูกต้อง" };

  const placement = ["home", "blog", "sidebar"].includes(
    String(formData.get("placement")),
  )
    ? String(formData.get("placement"))
    : "home";
  const weight = Math.max(1, Math.min(100, Number(formData.get("weight")) || 1));
  const is_active = formData.get("is_active") === "on";
  const starts_at = String(formData.get("starts_at") ?? "").trim() || null;
  const ends_at = String(formData.get("ends_at") ?? "").trim() || null;

  const base = { name, image_url, link_url, placement, weight, is_active, starts_at, ends_at };

  const admin = createAdminClient();
  const { error } = id
    ? await admin.from("banners").update(base).eq("id", id)
    : await admin.from("banners").insert(base);

  if (error) {
    captureException("banners.save", error, { id });
    return { error: "บันทึกไม่สำเร็จ (ตาราง banners อาจยังไม่ถูก apply migration)" };
  }

  await logAudit({
    tenantId: null,
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: id ? "update" : "create",
    module: "banner",
    after: { name, placement, is_active },
  });

  revalidatePath("/super-admin/banners");
  redirect("/super-admin/banners");
}

export async function deleteBanner(formData: FormData): Promise<void> {
  const ctx = await getSuperAdminContext();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("banners").delete().eq("id", id);
  await logAudit({
    tenantId: null,
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: "delete",
    module: "banner",
    referenceId: id,
  });
  revalidatePath("/super-admin/banners");
}
