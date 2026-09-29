import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSuperAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PostForm } from "../PostForm";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  const admin = createAdminClient();
  const { data: post } = await admin
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();

  return (
    <main className="flex flex-col gap-6">
      <Link
        href="/super-admin/blog"
        className="inline-flex items-center gap-1.5 text-body-sm text-ink-soft hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับรายการบทความ
      </Link>
      <h1 className="font-display text-display-md font-semibold text-ink">
        แก้ไขบทความ
      </h1>
      <div className="card-floating p-6">
        <PostForm
          post={{
            id: post.id,
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            cover_image_url: post.cover_image_url,
            category: post.category,
            tags: post.tags,
            status: post.status,
            author_name: post.author_name,
          }}
        />
      </div>
    </main>
  );
}
