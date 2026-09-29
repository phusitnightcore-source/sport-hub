import { redirect } from "next/navigation";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { PLANS } from "@/lib/plans";
import { UpgradeLock } from "@/components/ui/UpgradeLock";
import { BroadcastForm } from "./BroadcastForm";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { plan, entitlements } = await getTenantEntitlements(admin, ctx.tenantId);
  if (!entitlements.broadcast) {
    return <UpgradeLock feature="Broadcast หาสมาชิก" plan={PLANS[plan].name} />;
  }
  if (!hasPermission(ctx, "broadcast")) {
    return (
      <main className="p-8 text-center text-body text-ink-soft">
        เฉพาะผู้ดูแลสนามที่มีสิทธิ์เท่านั้นที่ส่ง Broadcast ได้
      </main>
    );
  }

  const { count } = await admin
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "active")
    .eq("broadcast_opt_out", false);

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">
          Broadcast หาสมาชิก
        </h1>
        <p className="text-body-sm text-ink-soft">
          ส่งโปรโมชั่น/ข่าวสารถึงสมาชิกที่ยินยอมรับข่าวสาร
        </p>
      </div>
      <BroadcastForm memberCount={count ?? 0} />
    </main>
  );
}
