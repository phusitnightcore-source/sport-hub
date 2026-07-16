import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSuperAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BannerForm } from "../BannerForm";

export const dynamic = "force-dynamic";

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  const admin = createAdminClient();
  const { data: banner } = await admin
    .from("banners")
    .select("id, name, image_url, link_url, placement, weight, is_active, starts_at, ends_at")
    .eq("id", id)
    .maybeSingle();
  if (!banner) notFound();

  return (
    <main className="flex flex-col gap-6">
      <Link
        href="/super-admin/banners"
        className="inline-flex items-center gap-1.5 text-body-sm text-ink-soft hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับรายการแบนเนอร์
      </Link>
      <h1 className="font-display text-display-md font-semibold text-ink">แก้ไขแบนเนอร์</h1>
      <div className="card-floating p-6">
        <BannerForm banner={banner} />
      </div>
    </main>
  );
}
