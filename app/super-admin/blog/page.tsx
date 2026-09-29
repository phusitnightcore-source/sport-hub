import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, ExternalLink, Check } from "lucide-react";
import { getSuperAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { ConfirmSubmit } from "@/components/ui/ConfirmDialog";
import { deletePost, approvePost } from "./actions";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { data: posts } = await admin
    .from("blog_posts")
    .select("id, slug, title, status, views, category, author_name, author_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  const pending = (posts ?? []).filter((p) => p.status === "pending_review");

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-display-md font-semibold text-ink">
            บทความ (Blog)
          </h1>
          <p className="text-body-sm text-ink-soft">
            คอนเทนต์ SEO สร้างทราฟฟิก — รองรับ AdSense / Affiliate / Banner
          </p>
          {pending.length > 0 && (
            <p className="mt-1 text-body-sm font-medium text-brand">
              มีบทความจากผู้ใช้รอตรวจ {pending.length} รายการ
            </p>
          )}
        </div>
        <Link href="/super-admin/blog/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            เขียนบทความใหม่
          </Button>
        </Link>
      </div>

      {(posts ?? []).length === 0 ? (
        <div className="card-floating p-10 text-center text-body-sm text-ink-soft">
          ยังไม่มีบทความ — เริ่มเขียนบทความแรกได้เลย
          <br />
          <span className="text-mono-sm">
            (ถ้าบันทึกไม่ได้ ให้ push migration blog_posts ก่อน)
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(posts ?? []).map((p) => (
            <div
              key={p.id}
              className="card-floating flex flex-wrap items-center gap-3 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-ink">{p.title}</p>
                <p className="font-mono text-mono-sm text-ink-soft">
                  /blog/{p.slug}
                  {p.category ? ` · ${p.category}` : ""}
                  {p.author_id ? ` · โดย ${p.author_name ?? "ผู้ใช้"}` : ""}
                </p>
              </div>
              <span className="flex items-center gap-1 text-body-sm text-ink-soft">
                <Eye className="h-4 w-4" />
                {p.views}
              </span>
              {p.status === "pending_review" ? (
                <>
                  <StatusPill tone="brand">รอตรวจ</StatusPill>
                  <ConfirmSubmit
                    action={approvePost}
                    hidden={{ id: p.id }}
                    title="อนุมัติเผยแพร่บทความนี้?"
                    message="บทความจะแสดงต่อสาธารณะทันที"
                    confirmLabel="อนุมัติ"
                    tone="brand"
                    ariaLabel="อนุมัติเผยแพร่"
                    triggerClassName="rounded-full p-2 text-success hover:bg-success/10"
                  >
                    <Check className="h-4 w-4" />
                  </ConfirmSubmit>
                </>
              ) : (
                <StatusPill tone={p.status === "published" ? "success" : "warning"}>
                  {p.status === "published" ? "เผยแพร่" : "แบบร่าง"}
                </StatusPill>
              )}
              {p.status === "published" && (
                <Link
                  href={`/blog/${p.slug}`}
                  target="_blank"
                  className="rounded-full p-2 text-ink-soft hover:bg-brand-soft hover:text-brand"
                  aria-label="เปิดหน้าจริง"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              <Link
                href={`/super-admin/blog/${p.id}`}
                className="rounded-full p-2 text-ink-soft hover:bg-brand-soft hover:text-brand"
                aria-label="แก้ไข"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <ConfirmSubmit
                action={deletePost}
                hidden={{ id: p.id }}
                title="ลบบทความนี้?"
                message="ลบแล้วกู้คืนไม่ได้"
                confirmLabel="ลบ"
                ariaLabel="ลบ"
                triggerClassName="rounded-full p-2 text-ink-soft hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </ConfirmSubmit>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
