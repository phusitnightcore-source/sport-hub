import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { bangkokToday } from "@/lib/api";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { PLANS } from "@/lib/plans";
import { StatusPill } from "@/components/ui/StatusPill";
import { UpgradeLock } from "@/components/ui/UpgradeLock";
import { GuestPassForm } from "./GuestPassForm";

// Guest Pass (§10.6) — ออก/ดูบัตรเข้าใช้ชั่วคราว
export const dynamic = "force-dynamic";

export default async function GuestPassesPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const today = bangkokToday();
  const admin = createAdminClient();

  // Plan gating — Guest Pass เฉพาะ Pro
  const { plan, entitlements } = await getTenantEntitlements(admin, ctx.tenantId);
  if (!entitlements.guest_pass) {
    return <UpgradeLock feature="บัตรเข้าใช้ชั่วคราว (Guest Pass)" plan={PLANS[plan].name} />;
  }

  const { data: passes } = await admin
    .from("guest_passes")
    .select(
      "id, recipient_name, valid_from, valid_until, sessions_limit, sessions_used, qr_token",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">
          บัตรเข้าใช้ชั่วคราว (Guest Pass)
        </h1>
        <p className="text-body-sm text-ink-soft">
          สำหรับผู้มาทดลอง/แขกที่ยังไม่เป็นสมาชิก
        </p>
      </div>

      <GuestPassForm today={today} />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-body-lg font-semibold text-ink">
          บัตรที่ออกแล้ว
        </h2>
        {(passes ?? []).length === 0 ? (
          <div className="card-floating p-8 text-center text-body-sm text-ink-soft">
            ยังไม่มีบัตร
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(passes ?? []).map((p) => {
              const expired = p.valid_until < today;
              const used = p.sessions_used;
              const limit = p.sessions_limit;
              const exhausted = limit != null && used >= limit;
              return (
                <div
                  key={p.id}
                  className="card-floating flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="text-body font-medium text-ink">
                      {p.recipient_name}
                    </p>
                    <p className="font-mono text-mono-sm text-ink-soft">
                      {p.valid_from} → {p.valid_until} · ใช้ {used}
                      {limit != null ? `/${limit}` : ""} ครั้ง
                    </p>
                    <p className="mt-1 font-mono text-mono-sm text-ink-soft">
                      รหัส: {p.qr_token.slice(0, 12)}…
                    </p>
                  </div>
                  <StatusPill
                    tone={expired || exhausted ? "danger" : "success"}
                  >
                    {expired ? "หมดอายุ" : exhausted ? "ใช้ครบแล้ว" : "ใช้งานได้"}
                  </StatusPill>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
