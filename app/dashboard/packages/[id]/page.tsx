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
  const { data: pkg } = await supabase
    .from("packages")
    .select("*")
    .eq("id", resolvedParams.id)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (!pkg) notFound();

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        จัดการแพ็กเกจ: {pkg.name}
      </h1>
      <PackageForm initialData={pkg} />
    </main>
  );
}
