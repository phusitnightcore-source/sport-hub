"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { captureException } from "@/lib/logger";

export type PostState = { error?: string };

function slugify(s: string): string {
  const out = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return out || `post-${Date.now()}`;
}

// สร้าง/แก้ไขบทความ (super_admin) — เขียนผ่าน service role
export async function savePost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const ctx = await getSuperAdminContext();
  if (!ctx) return { error: "เฉพาะทีม SportHub เท่านั้น" };

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3) return { error: "กรุณากรอกหัวข้อ (อย่างน้อย 3 ตัวอักษร)" };

  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugInput ? slugify(slugInput) : slugify(title);
  const status: "draft" | "published" =
    formData.get("status") === "published" ? "published" : "draft";
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const base = {
    slug,
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim() || null,
    content: String(formData.get("content") ?? ""),
    cover_image_url: String(formData.get("cover_image_url") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    tags,
    status,
    author_name: String(formData.get("author_name") ?? "").trim() || null,
  };

  const admin = createAdminClient();
  let error;
  if (id) {
    const { data: existing } = await admin
      .from("blog_posts")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();
    const published_at =
      status === "published"
        ? (existing?.published_at ?? new Date().toISOString())
        : null;
    ({ error } = await admin
      .from("blog_posts")
      .update({ ...base, published_at })
      .eq("id", id));
  } else {
    const published_at = status === "published" ? new Date().toISOString() : null;
    ({ error } = await admin.from("blog_posts").insert({ ...base, published_at }));
  }

  if (error) {
    captureException("blog.savePost", error, { id, slug });
    if (error.code === "23505") return { error: "slug นี้ถูกใช้แล้ว กรุณาเปลี่ยน" };
    return {
      error: "บันทึกไม่สำเร็จ (ตาราง blog_posts อาจยังไม่ถูก apply migration)",
    };
  }

  await logAudit({
    tenantId: null,
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: id ? "update" : "create",
    module: "blog",
    after: { slug, title, status },
  });

  revalidatePath("/super-admin/blog");
  revalidatePath("/blog");
  redirect("/super-admin/blog");
}

// อนุมัติบทความที่ผู้ใช้ส่งมา (pending_review → published)
export async function approvePost(formData: FormData): Promise<void> {
  const ctx = await getSuperAdminContext();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("blog_posts")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();
  await admin
    .from("blog_posts")
    .update({
      status: "published",
      published_at: existing?.published_at ?? new Date().toISOString(),
    })
    .eq("id", id);

  await logAudit({
    tenantId: null,
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: "approve",
    module: "blog",
    referenceId: id,
  });
  revalidatePath("/super-admin/blog");
  revalidatePath("/blog");
}

// ลบบทความ
export async function deletePost(formData: FormData): Promise<void> {
  const ctx = await getSuperAdminContext();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const admin = createAdminClient();
  await admin.from("blog_posts").delete().eq("id", id);
  await logAudit({
    tenantId: null,
    actorId: ctx.userId,
    actorRole: "super_admin",
    action: "delete",
    module: "blog",
    referenceId: id,
  });
  revalidatePath("/super-admin/blog");
  revalidatePath("/blog");
}
