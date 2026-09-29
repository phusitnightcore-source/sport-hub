import { getStaffContext } from "@/lib/auth";
import { PackageForm } from "../PackageForm";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const resolvedParams = await params;

  const supabase = await createClient();
  const [{ data: pkg }, { data: branches }] = await Promise.all([
    supabase
      .from("packages")
      .select("*")
      .eq("id", resolvedParams.id)
      .eq("tenant_id", ctx.tenantId)
      .single(),
    supabase
      .from("branches")
      .select("id, name")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at"),
  ]);

  if (!pkg) notFound();

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display-md font-bold text-ink">
          จัดการแพ็กเกจ: {pkg.name}
        </h1>
        <p className="text-body-sm text-ink-soft">
          แก้ไขข้อมูล ราคา สิทธิ์สาขา และนโยบายการพักสมาชิก
        </p>
      </div>

      <PackageForm initialData={pkg} branches={branches ?? []} />
    </main>
  );
}
