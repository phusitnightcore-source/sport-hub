import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { UpgradeLock } from "@/components/ui/UpgradeLock";
import { formatBahtFromDb } from "@/lib/money";

export default async function PackagesPage() {
  const ctx = await getStaffContext();
  if (!ctx) return null;

  const supabase = await createClient();

  const { plan, entitlements } = await getTenantEntitlements(supabase, ctx.tenantId);
  if (!entitlements.member_system) {
    return <UpgradeLock feature="แพ็กเกจสมาชิก" plan={PLANS[plan].name} />;
  }
  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-md font-semibold text-ink">
          แพ็กเกจสมาชิก
        </h1>
        <Link href="/dashboard/packages/new">
          <Button variant="primary">
            <Plus className="h-5 w-5" />
            เพิ่มแพ็กเกจ
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {(packages ?? []).map((pkg) => (
          <div
            key={pkg.id}
            className="card-floating flex items-center justify-between p-4"
          >
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-body-lg font-bold text-ink">{pkg.name}</h3>
                <StatusPill tone={pkg.is_active ? "success" : "warning"}>
                  {pkg.is_active ? "เปิดขาย" : "ปิดชั่วคราว"}
                </StatusPill>
              </div>
              <p className="mt-1 flex items-center gap-2 text-body-sm text-ink-soft">
                <span>ราคา: ฿{formatBahtFromDb(pkg.price)}</span>
                <span>•</span>
                <span>
                  {pkg.type === "session_based"
                    ? `${pkg.sessions_limit} ครั้ง`
                    : pkg.duration_days
                      ? `${pkg.duration_days} วัน`
                      : "ไม่ระบุระยะเวลา"}
                </span>
                <span>•</span>
                <span>{pkg.branch_access_all ? "เข้าได้ทุกสาขา" : "เฉพาะสาขาที่กำหนด"}</span>
              </p>
            </div>
            <Link href={`/dashboard/packages/${pkg.id}`}>
              <Button variant="secondary" size="sm">
                จัดการ
              </Button>
            </Link>
          </div>
        ))}
        {(packages ?? []).length === 0 && (
          <div className="card-floating p-10 text-center text-ink-soft">
            ยังไม่มีข้อมูลแพ็กเกจ
          </div>
        )}
      </div>
    </main>
  );
}
