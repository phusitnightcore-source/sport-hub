import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffForm } from "../StaffForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewStaffPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", ctx.tenantId)
    .order("name");

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
            เพิ่มพนักงาน
          </h1>
          <p className="text-body-sm text-ink-soft">
            สร้างบัญชีและกำหนดสิทธิ์ให้พนักงาน
          </p>
        </div>
      </div>

      <StaffForm branches={branches ?? []} />
    </main>
  );
}
