"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { captureException } from "@/lib/logger";

export type WriteState = { error?: string; success?: boolean };

function slugify(s: string): string {
  const out = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .slice(0, 100);
  return out || "post";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// เนื้อหาจากผู้ใช้ทั่วไป = ไม่เชื่อถือ → escape + แปลงเป็นย่อหน้า (กัน XSS โดยไม่ต้องพึ่ง sanitizer lib)
function plainToSafeHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

// ผู้ใช้ที่ล็อกอินส่งบทความ → สถานะ pending_review รอทีม SportHub อนุมัติ
export async function submitUserPost(
  _prev: WriteState,
  formData: FormData,
): Promise<WriteState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อนเขียนบทความ" };

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 5) return { error: "หัวข้ออย่างน้อย 5 ตัวอักษร" };
  const contentRaw = String(formData.get("content") ?? "").trim();
  if (contentRaw.length < 50) return { error: "เนื้อหาอย่างน้อย 50 ตัวอักษร" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const excerpt =
    String(formData.get("excerpt") ?? "").trim() || contentRaw.slice(0, 150);
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  const { error } = await admin.from("blog_posts").insert({
    slug: `${slugify(title)}-${Date.now().toString(36)}`,
    title,
    excerpt,
    content: plainToSafeHtml(contentRaw),
    cover_image_url: String(formData.get("cover_image_url") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    tags,
    status: "pending_review",
    author_id: user.id,
    author_name: profile?.full_name ?? "ผู้ใช้ SportHub",
  });

  if (error) {
    captureException("blog.submitUserPost", error);
    return { error: "ส่งบทความไม่สำเร็จ (ตาราง blog_posts อาจยังไม่ถูก apply migration)" };
  }

  await logAudit({
    tenantId: null,
    actorId: user.id,
    actorRole: profile?.role ?? "member",
    action: "submit",
    module: "blog",
    after: { title },
  });

  revalidatePath("/super-admin/blog");
  return { success: true };
}
