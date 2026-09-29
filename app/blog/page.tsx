import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, Tag } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { BannerSlot } from "@/components/ads/BannerSlot";

export const metadata: Metadata = {
  title: "บทความกีฬา & ฟิตเนส — SportHub Blog",
  description:
    "รีวิวสนามกีฬา ฟิตเนส เทคนิคออกกำลังกาย วิธีเลือกอุปกรณ์ และตารางแข่งขัน โดย SportHub",
};

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

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("blog_posts")
    .select("slug, title, excerpt, cover_image_url, category, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  if (cat) query = query.eq("category", cat);
  const { data: posts } = await query;

  const { data: catRows } = await admin
    .from("blog_posts")
    .select("category")
    .eq("status", "published")
    .not("category", "is", null);
  const categories = [...new Set((catRows ?? []).map((c) => c.category).filter(Boolean))];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="font-display text-display-lg font-bold text-ink">บทความ</h1>
        <p className="mt-2 text-body text-ink-soft">
          รีวิวสนาม ฟิตเนส เทคนิคออกกำลังกาย และวิธีเลือกอุปกรณ์กีฬา
        </p>
      </header>

      <BannerSlot placement="blog" className="mb-10 block" />

      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <Link
            href="/blog"
            className={
              !cat
                ? "rounded-full bg-brand px-4 py-1.5 text-body-sm font-medium text-white"
                : "rounded-full bg-surface px-4 py-1.5 text-body-sm font-medium text-ink-soft shadow-sm hover:text-brand"
            }
          >
            ทั้งหมด
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/blog?cat=${encodeURIComponent(c!)}`}
              className={
                cat === c
                  ? "rounded-full bg-brand px-4 py-1.5 text-body-sm font-medium text-white"
                  : "rounded-full bg-surface px-4 py-1.5 text-body-sm font-medium text-ink-soft shadow-sm hover:text-brand"
              }
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {(posts ?? []).length === 0 ? (
        <div className="card-floating p-12 text-center text-body text-ink-soft">
          ยังไม่มีบทความเผยแพร่
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(posts ?? []).map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="card-floating group flex flex-col overflow-hidden p-0 transition-all duration-base hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-[16/9] overflow-hidden bg-brand-soft/40">
                {p.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.cover_image_url}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-base group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-soft">
                    <Tag className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                {p.category && (
                  <span className="text-body-sm font-medium text-brand">{p.category}</span>
                )}
                <h2 className="font-display text-body-lg font-bold text-ink line-clamp-2">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="text-body-sm text-ink-soft line-clamp-2">{p.excerpt}</p>
                )}
                <span className="mt-auto flex items-center gap-1.5 pt-2 text-body-sm text-ink-soft">
                  <CalendarDays className="h-4 w-4" />
                  {fmtDate(p.published_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
