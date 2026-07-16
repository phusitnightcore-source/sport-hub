import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdSlot } from "@/components/ads/AdSlot";

export const dynamic = "force-dynamic";

const TH_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getUTCDate()} ${TH_MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

async function getPost(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

// SEO: title/description/OpenGraph ต่อบทความ (สำคัญต่อการติดอันดับ Google)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "ไม่พบบทความ — SportHub Blog" };
  const desc = post.excerpt ?? `${post.title} — SportHub Blog`;
  return {
    title: `${post.title} — SportHub Blog`,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
      type: "article",
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  // นับยอดอ่าน (best-effort — ไม่กระทบการแสดงผลถ้าล้มเหลว)
  const admin = createAdminClient();
  await admin
    .from("blog_posts")
    .update({ views: post.views + 1 })
    .eq("id", post.id);

  return (
    <article className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/blog"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-ink-soft hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับหน้าบทความ
      </Link>

      <header className="mb-8">
        {post.category && (
          <span className="text-body-sm font-medium text-brand">{post.category}</span>
        )}
        <h1 className="mt-1 font-display text-display-lg font-bold leading-tight text-ink">
          {post.title}
        </h1>
        <div className="mt-3 flex items-center gap-3 text-body-sm text-ink-soft">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {fmtDate(post.published_at)}
          </span>
          {post.author_name && <span>· โดย {post.author_name}</span>}
        </div>
      </header>

      {post.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="mb-8 w-full rounded-md shadow-md"
        />
      )}

      {/* เนื้อหา HTML เขียนโดยทีม SportHub (super_admin) ที่เชื่อถือได้ */}
      <div
        className="prose-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* โฆษณา AdSense (แสดงเมื่อตั้ง NEXT_PUBLIC_ADSENSE_CLIENT) */}
      <AdSlot slot="article" className="mt-10" />

      {post.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-brand-soft px-3 py-1 text-body-sm text-brand-dark"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
