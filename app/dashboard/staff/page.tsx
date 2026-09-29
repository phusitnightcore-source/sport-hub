import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { Plus, ShieldAlert, CheckCircle, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

export default async function StaffPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  
  const { data: staffList } = await supabase
    .from("staff")
    .select(`
      id, name, email, phone, status, multi_branch_access, extra_permissions,
      staff_branches (
        branches ( name )
      )
    `)
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-display-md font-semibold text-ink">
            พนักงาน
          </h1>
          <p className="mt-1 text-body-sm text-ink-soft">
            จัดการบัญชีพนักงานและสิทธิ์การเข้าถึงสาขาต่างๆ
          </p>
        </div>
        <Link href="/dashboard/staff/new">
          <Button className="flex w-full items-center gap-2 sm:w-auto">
            <Plus className="h-5 w-5" /> เพิ่มพนักงาน
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {(staffList ?? []).length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-line p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-display-xs font-semibold text-ink">ยังไม่มีพนักงาน</h3>
            <p className="mt-2 text-body text-ink-soft max-w-sm">
              คุณยังไม่ได้เชิญพนักงานเข้ามาในระบบ กดเพิ่มพนักงานเพื่อแบ่งเบาภาระการจัดการของคุณ
            </p>
            <Link href="/dashboard/staff/new" className="mt-6">
              <Button variant="secondary">เพิ่มพนักงานคนแรก</Button>
            </Link>
          </div>
        ) : (
          (staffList ?? []).map((staff) => {
            const branches = staff.staff_branches
              ?.map((sb: { branches: { name: string } | null }) => sb.branches?.name)
              .filter((n): n is string => Boolean(n));

            return (
              <Link
                key={staff.id}
                href={`/dashboard/staff/${staff.id}`}
                className="group card-floating flex flex-col p-5 hover:border-brand-soft hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-body-lg font-bold text-ink group-hover:text-brand transition-colors">
                      {staff.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-body-sm text-ink-soft">
                      <Mail className="h-3.5 w-3.5" />
                      {staff.email}
                    </div>
                  </div>
                  <StatusPill
                    tone={staff.status === "active" ? "success" : "danger"}
                    className="shrink-0"
                  >
                    {staff.status === "active" ? "ACTIVE" : "INACTIVE"}
                  </StatusPill>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-line">
                  <div className="flex items-start gap-2 text-body-sm">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-ink-soft" />
                    <div className="flex flex-wrap gap-1">
                      {staff.multi_branch_access ? (
                        <span className="rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand">
                          ทุกสาขา (Multi-branch)
                        </span>
                      ) : branches && branches.length > 0 ? (
                        branches.map((b: string) => (
                          <span key={b} className="rounded bg-surface px-1.5 py-0.5 text-xs font-medium text-ink">
                            {b}
                          </span>
                        ))
                      ) : (
                        <span className="text-danger text-xs font-medium">ยังไม่ระบุสาขา</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 text-body-sm">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-ink-soft" />
                    <div className="flex flex-wrap gap-1">
                      {staff.extra_permissions && staff.extra_permissions.length > 0 ? (
                        staff.extra_permissions.map((perm: string) => (
                          <span key={perm} className="rounded bg-info/10 px-1.5 py-0.5 text-xs font-medium text-info">
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-ink-soft text-xs">พนักงานทั่วไป (ไม่มีสิทธิ์พิเศษ)</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
