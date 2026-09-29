import { redirect, notFound } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffForm, StaffFormData } from "../StaffForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const supabase = await createClient();
  
  const [{ data: staff }, { data: branches }, { data: staffBranches }] = await Promise.all([
    supabase
      .from("staff")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId)
      .single(),
    supabase
      .from("branches")
      .select("id, name")
      .eq("tenant_id", ctx.tenantId)
      .order("name"),
    supabase
      .from("staff_branches")
      .select("branch_id")
      .eq("staff_id", id),
  ]);

  if (!staff) {
    notFound();
  }

  const branchIds = (staffBranches ?? []).map((sb) => sb.branch_id);

  const staffData: StaffFormData = {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    multi_branch_access: staff.multi_branch_access,
    branch_ids: branchIds,
    extra_permissions: staff.extra_permissions,
    status: staff.status === "inactive" ? "inactive" : "active",
  };

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/staff"
          className="rounded-full bg-surface p-2 text-ink-soft shadow-sm transition-all hover:bg-line hover:text-ink"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="font-display text-display-sm font-semibold text-ink">
            แก้ไขพนักงาน
          </h1>
          <p className="text-body-sm text-ink-soft">
            ปรับปรุงข้อมูลและสิทธิ์การเข้าถึงของ {staff.name}
          </p>
        </div>
      </div>

      <StaffForm initialData={staffData} branches={branches ?? []} />
    </main>
  );
}
