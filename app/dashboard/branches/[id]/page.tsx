import { redirect, notFound } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BranchForm, BranchFormData } from "../BranchForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const supabase = await createClient();
  const { data: branch } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (!branch) {
    notFound();
  }

  const branchData: BranchFormData = {
    id: branch.id,
    name: branch.name,
    phone: branch.phone,
    email: branch.email,
    address: branch.address,
    open_time: branch.open_time,
    close_time: branch.close_time,
    max_capacity: branch.max_capacity,
    status: branch.status,
  };

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/branches"
          className="rounded-full bg-surface p-2 text-ink-soft shadow-sm transition-all hover:bg-line hover:text-ink"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="font-display text-display-sm font-semibold text-ink">
            แก้ไขสาขา
          </h1>
          <p className="text-body-sm text-ink-soft">
            ปรับปรุงข้อมูลสาขา {branch.name}
          </p>
        </div>
      </div>

      <BranchForm initialData={branchData} />
    </main>
  );
}
