import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSuperAdminContext } from "@/lib/auth";
import { BannerForm } from "../BannerForm";

export default async function NewBannerPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  return (
    <main className="flex flex-col gap-6">
      <Link
        href="/super-admin/banners"
        className="inline-flex items-center gap-1.5 text-body-sm text-ink-soft hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับรายการแบนเนอร์
      </Link>
      <h1 className="font-display text-display-md font-semibold text-ink">เพิ่มแบนเนอร์</h1>
      <div className="card-floating p-6">
        <BannerForm />
      </div>
    </main>
  );
}
