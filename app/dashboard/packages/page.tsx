import Link from "next/link";
import { Plus, Package, Clock, Building, Snowflake, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { UpgradeLock } from "@/components/ui/UpgradeLock";
import { formatBahtFromDb } from "@/lib/money";

export const metadata = {
  title: "แพ็กเกจสมาชิก | Dashboard",
};

export default async function PackagesPage() {
  const ctx = await getStaffContext();
  if (!ctx) return null;

  const supabase = await createClient();

  const { plan, entitlements } = await getTenantEntitlements(supabase, ctx.tenantId);
  if (!entitlements.member_system) {
    return <UpgradeLock feature="แพ็กเกจสมาชิก" plan={PLANS[plan].name} />;
  }

  const [{ data: packages }, { data: branches }] = await Promise.all([
    supabase
      .from("packages")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("branches")
      .select("id, name")
      .eq("tenant_id", ctx.tenantId),
  ]);

  const allPackages = packages ?? [];
  const branchMap = new Map((branches ?? []).map((b) => [b.id, b.name]));

  const activeCount = allPackages.filter((p) => p.is_active).length;
  const sessionCount = allPackages.filter((p) => p.type === "session_based").length;
  const timeCount = allPackages.filter((p) => p.type !== "session_based").length;

  return (
    <main className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md font-bold text-ink">
            แพ็กเกจสมาชิก (Membership Packages)
          </h1>
          <p className="text-body-sm text-ink-soft">
            จัดการแพ็กเกจนับครั้ง รายเดือน รายปี และสิทธิ์การเข้าใช้สนามของสมาชิก
          </p>
        </div>

        <Link href="/dashboard/packages/new">
          <Button className="rounded-2xl font-bold shadow-xs">
            <Plus className="mr-1.5 h-4 w-4" />
            + สร้างแพ็กเกจใหม่
          </Button>
        </Link>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-floating p-4 border border-line">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[12px] font-bold uppercase tracking-wider">แพ็กเกจที่เปิดขาย</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {activeCount} <span className="text-body-sm font-normal text-ink-soft">/ {allPackages.length} รายการ</span>
          </p>
        </div>

        <div className="card-floating p-4 border border-line">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[12px] font-bold uppercase tracking-wider">แพ็กเกจนับครั้ง (Sessions)</span>
            <Package className="h-4 w-4 text-brand" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {sessionCount} <span className="text-body-sm font-normal text-ink-soft">รายการ</span>
          </p>
        </div>

        <div className="card-floating p-4 border border-line">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[12px] font-bold uppercase tracking-wider">แพ็กเกจตามระยะเวลา (Time-based)</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {timeCount} <span className="text-body-sm font-normal text-ink-soft">รายการ</span>
          </p>
        </div>
      </div>

      {/* Packages List Grid */}
      <div className="flex flex-col gap-3.5">
        {allPackages.map((pkg) => {
          const isSession = pkg.type === "session_based";

          const branchText = pkg.branch_access_all
            ? "เข้าได้ทุกสาขา"
            : pkg.branch_access_ids && pkg.branch_access_ids.length > 0
            ? `เฉพาะสาขา: ${pkg.branch_access_ids.map((id) => branchMap.get(id) || id).join(", ")}`
            : "เฉพาะสาขาหลัก";

          return (
            <div
              key={pkg.id}
              className="card-floating flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition-all hover:border-brand/40 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Left: Info */}
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand font-bold shadow-xs">
                  {isSession ? <Package className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-body-lg font-bold text-ink truncate">
                      {pkg.name}
                    </h3>
                    <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                      {isSession ? "นับครั้ง" : pkg.type === "monthly" ? "รายเดือน" : pkg.type === "yearly" ? "รายปี" : pkg.type}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-body-sm text-ink-soft">
                    <span className="font-mono font-bold text-brand text-body">
                      ฿{formatBahtFromDb(pkg.price)}
                    </span>
                    <span>•</span>
                    <span>
                      {isSession
                        ? `จำนวน ${pkg.sessions_limit} ครั้ง ${pkg.sessions_carryover ? "(ยกยอดได้)" : ""}`
                        : `อายุ ${pkg.duration_days ?? 30} วัน`}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" />
                      {branchText}
                    </span>
                  </div>

                  {pkg.freeze_max_times > 0 && (
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-soft/80">
                      <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                      <span>
                        ขอพักได้สูงสุด {pkg.freeze_max_times} ครั้ง (รวมไม่เกิน {pkg.freeze_max_days} วัน)
                        {pkg.freeze_auto_approve ? " • อนุมัติอัตโนมัติ" : ""}
                      </span>
                    </p>
                  )}

                  {pkg.benefits && (
                    <p className="mt-1.5 text-[12px] text-ink-soft line-clamp-1">
                      {pkg.benefits}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Status Pill & Manage Button */}
              <div className="flex items-center gap-3 sm:justify-end border-t border-line/60 pt-3 sm:border-t-0 sm:pt-0">
                <StatusPill tone={pkg.is_active ? "success" : "warning"}>
                  {pkg.is_active ? "เปิดขาย" : "ปิดชั่วคราว"}
                </StatusPill>
                <Link href={`/dashboard/packages/${pkg.id}`}>
                  <Button variant="secondary" size="sm" className="rounded-xl border-line font-semibold">
                    จัดการแพ็กเกจ
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}

        {allPackages.length === 0 && (
          <div className="card-floating flex flex-col items-center gap-3 p-12 text-center border border-line">
            <Package className="h-10 w-10 text-ink-soft/40" />
            <h3 className="font-bold text-body-lg text-ink">ยังไม่มีข้อมูลแพ็กเกจ</h3>
            <p className="text-body-sm text-ink-soft max-w-sm">
              สร้างแพ็กเกจสมาชิกเพื่อให้ลูกค้าสามารถสมัครและซื้อสิทธิ์เข้าใช้สนามของคุณได้
            </p>
            <Link href="/dashboard/packages/new" className="mt-2">
              <Button size="sm" className="rounded-xl">
                <Plus className="mr-1 h-4 w-4" />
                สร้างแพ็กเกจแรก
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
