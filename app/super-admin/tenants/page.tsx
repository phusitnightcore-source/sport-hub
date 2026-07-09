import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSuperAdminContext } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { ListRowCard, LeadingIcon } from "@/components/ui/ListRowCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { TenantStatusButton } from "./TenantStatusButton";

const TENANT_STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "brand" }
> = {
  active: { label: "ใช้งานอยู่", tone: "success" },
  trial: { label: "Trial", tone: "brand" },
  free: { label: "Free", tone: "warning" },
  suspended: { label: "ถูกระงับ", tone: "danger" },
  cancelled_pending_delete: { label: "รอลบข้อมูล", tone: "danger" },
};

// รายชื่อสนามทั้งหมดในระบบ (Super Admin — §3.1)
export default async function TenantsPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const [{ data: tenants }, { data: subs }] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, owner_name, email, phone, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("tenant_id, plan, status, trial_end"),
  ]);

  const subByTenant = new Map((subs ?? []).map((s) => [s.tenant_id, s]));

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        สนามทั้งหมด ({(tenants ?? []).length})
      </h1>
      <div className="flex flex-col gap-3">
        {(tenants ?? []).map((t) => {
          const st = TENANT_STATUS[t.status] ?? TENANT_STATUS.active;
          const sub = subByTenant.get(t.id);
          return (
            <ListRowCard
              key={t.id}
              leading={
                <LeadingIcon>
                  <Building2 aria-hidden />
                </LeadingIcon>
              }
              title={t.name}
              subtitle={`${t.owner_name} · ${t.email}`}
              trailing={
                <div className="flex items-center gap-2">
                  <StatusPill tone={st.tone}>{st.label}</StatusPill>
                  <TenantStatusButton
                    tenantId={t.id}
                    suspended={t.status === "suspended"}
                  />
                </div>
              }
            >
              <span className="text-body-sm text-ink">
                {sub ? PLANS[sub.plan].name : "-"}
                {sub?.status === "trial" && sub.trial_end && (
                  <span className="text-ink-soft">
                    {" "}
                    (ถึง {sub.trial_end.slice(0, 10)})
                  </span>
                )}
              </span>
            </ListRowCard>
          );
        })}
        {(tenants ?? []).length === 0 && (
          <p className="text-body text-ink-soft">ยังไม่มีสนามในระบบ</p>
        )}
      </div>
    </main>
  );
}
