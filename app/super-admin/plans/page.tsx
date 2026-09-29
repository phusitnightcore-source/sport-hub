import { redirect } from "next/navigation";
import { getSuperAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllEntitlements } from "@/lib/entitlements.server";
import { PLANS, type PlanType } from "@/lib/plans";
import { formatBaht } from "@/lib/money";
import { PlanEditor } from "./PlanEditor";

// Super Admin: กำหนดสิทธิ์การใช้งานต่อแพลน (§5/§26)
export const dynamic = "force-dynamic";

const PLAN_ORDER: PlanType[] = ["free", "growth", "pro"];

export default async function SuperAdminPlansPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const all = await getAllEntitlements(admin);

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">
          แพลน & สิทธิ์การใช้งาน
        </h1>
        <p className="text-body-sm text-ink-soft">
          กำหนดว่าแต่ละแพลนใช้ฟีเจอร์และลิมิตอะไรได้บ้าง — มีผลกับทุกสนามทันที
        </p>
      </div>

      {PLAN_ORDER.map((plan) => (
        <PlanEditor
          key={plan}
          plan={plan}
          planName={PLANS[plan].name}
          priceLabel={
            PLANS[plan].priceSatang === 0
              ? "ฟรี"
              : `฿${formatBaht(PLANS[plan].priceSatang)}/เดือน`
          }
          entitlements={all[plan]}
        />
      ))}
    </main>
  );
}
