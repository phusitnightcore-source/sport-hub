import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

// Sitemap สำหรับ SEO — หน้า public + บทความ Blog ที่เผยแพร่
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let posts: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published");
    posts = (data ?? []).map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    /* ตาราง blog_posts ยังไม่ push — คืน sitemap เฉพาะหน้า static */
  }

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.5 },
    ...posts,
  ];
}
