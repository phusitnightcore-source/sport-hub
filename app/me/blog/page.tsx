import Link from "next/link";
import { redirect } from "next/navigation";
import { PenLine, CalendarDays, Tag, Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill } from "@/components/ui/StatusPill";
import { BlogWriteHeader } from "./BlogWriteHeader";

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

const STATUS_META: Record<
  string,
  { tone: "success" | "warning" | "brand"; label: string }
> = {
  published: { tone: "success", label: "เผยแพร่แล้ว" },
  pending_review: { tone: "warning", label: "รอทีมงานตรวจ" },
  draft: { tone: "brand", label: "ฉบับร่าง" },
};

// หน้ารวมบทความของผู้ใช้ทั่วไป (โซน /me) — บทความของฉัน + ฟีดบทความล่าสุด + ปุ่มเขียนบทความ
export default async function MeBlogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/me/blog");

  const admin = createAdminClient();

  const { data: mine } = await admin
    .from("blog_posts")
    .select("slug, title, status, category, created_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: feed } = await admin
    .from("blog_posts")
    .select("slug, title, excerpt, cover_image_url, category, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12);

  const myPosts = mine ?? [];
  const posts = feed ?? [];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-8 sm:px-6">
      <BlogWriteHeader />

      {/* บทความของฉัน */}
      <section className="flex flex-col gap-3">
        <h2 className="text-body font-medium text-ink">บทความของฉัน</h2>
        {myPosts.length === 0 ? (
          <div className="card-floating flex flex-col items-center gap-3 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
              <PenLine className="h-6 w-6 text-brand" />
            </span>
            <p className="text-body-sm text-ink-soft">
              ยังไม่มีบทความของคุณ — เริ่มเขียนบทความแรกได้เลย
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myPosts.map((p) => {
              const meta = STATUS_META[p.status] ?? STATUS_META.draft;
              const row = (
                <div className="card-floating flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-ink">{p.title}</p>
                    <p className="text-body-sm text-ink-soft">
                      {p.category ? `${p.category} · ` : ""}
                      {fmtDate(p.created_at)}
                    </p>
                  </div>
                  <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                </div>
              );
              return p.status === "published" ? (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="block">
                  {row}
                </Link>
              ) : (
                <div key={p.slug}>{row}</div>
              );
            })}
          </div>
        )}
      </section>

      {/* ฟีดบทความล่าสุด */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-body font-medium text-ink">บทความล่าสุด</h2>
          <Link href="/blog" className="text-body-sm text-brand hover:underline">
            ดูทั้งหมด
          </Link>
        </div>
        {posts.length === 0 ? (
          <div className="card-floating flex items-center gap-3 p-6 text-body-sm text-ink-soft">
            <Newspaper className="h-5 w-5 text-ink-soft" />
            ยังไม่มีบทความเผยแพร่
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {posts.map((p) => (
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
                      <Tag className="h-7 w-7" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  {p.category && (
                    <span className="text-body-sm font-medium text-brand">{p.category}</span>
                  )}
                  <h3 className="font-display text-body-lg font-bold text-ink line-clamp-2">
                    {p.title}
                  </h3>
                  {p.excerpt && (
                    <p className="text-body-sm text-ink-soft line-clamp-2">{p.excerpt}</p>
                  )}
                  <span className="mt-auto flex items-center gap-1.5 pt-1 text-body-sm text-ink-soft">
                    <CalendarDays className="h-4 w-4" />
                    {fmtDate(p.published_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
