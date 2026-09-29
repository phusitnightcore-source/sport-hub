import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { Plus, MapPin, Clock, Users, Building } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

export default async function BranchesPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, address, open_time, close_time, max_capacity, status")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-display-md font-semibold text-ink">
            การจัดการสาขา
          </h1>
          <p className="mt-1 text-body-sm text-ink-soft">
            เพิ่ม แก้ไข และตั้งค่าสาขาต่างๆ ของคุณ
          </p>
        </div>
        <Link href="/dashboard/branches/new">
          <Button className="flex w-full items-center gap-2 sm:w-auto">
            <Plus className="h-5 w-5" /> เพิ่มสาขาใหม่
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(branches ?? []).length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-line p-12 text-center">
            <Building className="mb-4 h-12 w-12 text-line" />
            <h3 className="text-display-xs font-semibold text-ink">ยังไม่มีสาขา</h3>
            <p className="mt-2 text-body text-ink-soft max-w-sm">
              คุณยังไม่ได้เพิ่มสาขาในระบบ กรุณาเพิ่มสาขาอย่างน้อย 1 แห่งเพื่อเริ่มต้นใช้งานระบบจอง
            </p>
            <Link href="/dashboard/branches/new" className="mt-6">
              <Button variant="secondary">สร้างสาขาแรกของคุณ</Button>
            </Link>
          </div>
        ) : (
          (branches ?? []).map((branch) => (
            <Link
              key={branch.id}
              href={`/dashboard/branches/${branch.id}`}
              className="group card-floating flex flex-col p-5 hover:border-brand-soft hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand group-hover:scale-105 transition-transform">
                    <Building className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-body-lg font-bold text-ink group-hover:text-brand transition-colors">
                      {branch.name}
                    </h3>
                    <StatusPill
                      tone={
                        branch.status === "active"
                          ? "success"
                          : branch.status === "maintenance"
                            ? "brand"
                            : "danger"
                      }
                      className="mt-1"
                    >
                      {branch.status.toUpperCase()}
                    </StatusPill>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-line">
                <div className="flex items-start gap-2 text-body-sm text-ink-soft">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{branch.address || "ยังไม่ระบุที่อยู่"}</span>
                </div>
                <div className="flex items-center gap-2 text-body-sm text-ink-soft">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    {branch.open_time?.slice(0, 5) || "--:--"} - {branch.close_time?.slice(0, 5) || "--:--"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-body-sm text-ink-soft">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>รองรับสูงสุด {branch.max_capacity} คน</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
