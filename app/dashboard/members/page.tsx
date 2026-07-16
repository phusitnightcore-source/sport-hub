import Link from "next/link";
import { Snowflake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { UpgradeLock } from "@/components/ui/UpgradeLock";

export default async function MembersPage() {
  const ctx = await getStaffContext();
  if (!ctx) return null;

  const supabase = await createClient();

  const { plan, entitlements } = await getTenantEntitlements(supabase, ctx.tenantId);
  if (!entitlements.member_system) {
    return <UpgradeLock feature="ระบบสมาชิกฟิตเนส" plan={PLANS[plan].name} />;
  }
  const { data: members } = await supabase
    .from("members")
    .select(`
      *,
      packages ( name )
    `)
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  // Count pending freeze requests
  const { count: pendingFreezeCount } = await supabase
    .from("freeze_requests")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "pending");

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-md font-semibold text-ink">
          สมาชิกฟิตเนส
        </h1>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/members/freeze-requests">
            <Button variant="secondary" className="relative">
              <Snowflake className="h-5 w-5" />
              คำขอ Freeze
              {(pendingFreezeCount ?? 0) > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {pendingFreezeCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/dashboard/members/new">
            <Button variant="primary">เพิ่มสมาชิก</Button>
          </Link>
        </div>
      </div>

      {/* TODO: Add Search Component here */}
      
      <div className="flex flex-col gap-3">
        {(members ?? []).map((m) => (
          <div
            key={m.id}
            className="card-floating flex items-center justify-between p-4"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-body font-medium text-ink">
                  {m.member_number}
                </span>
                <span className="text-body-lg font-bold text-ink">
                  {m.first_name} {m.last_name || ""}
                </span>
                <StatusPill
                  tone={
                    m.status === "active"
                      ? "success"
                      : m.status === "frozen"
                        ? "brand"
                        : "danger"
                  }
                >
                  {m.status.toUpperCase()}
                </StatusPill>
              </div>
              <p className="mt-1 flex items-center gap-2 text-body-sm text-ink-soft">
                <span>เบอร์โทร: {m.phone}</span>
                <span>•</span>
                <span>แพ็กเกจ: {m.packages?.name || "-"}</span>
                <span>•</span>
                <span>
                  วันหมดอายุ: {m.end_date || "ไม่มีวันหมดอายุ"}
                </span>
              </p>
            </div>
            <Link href={`/dashboard/members/${m.id}`}>
              <Button variant="secondary" size="sm">
                ดูรายละเอียด
              </Button>
            </Link>
          </div>
        ))}
        {(members ?? []).length === 0 && (
          <div className="card-floating p-10 text-center text-ink-soft">
            ยังไม่มีข้อมูลสมาชิก
          </div>
        )}
      </div>
    </main>
  );
}
