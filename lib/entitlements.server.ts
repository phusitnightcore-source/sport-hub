import "server-only";
import { PLANS, type PlanType } from "@/lib/plans";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { captureException } from "@/lib/logger";
import { getEffectivePlan } from "@/lib/subscription";
import { DEFAULT_ENTITLEMENTS, type PlanEntitlements } from "@/lib/entitlements";

type Admin = ReturnType<typeof createAdminClient>;
type Row = Database["public"]["Tables"]["plan_entitlements"]["Row"];

function fromRow(r: Row): PlanEntitlements {
  return {
    online_payment: r.online_payment,
    monthly_booking_limit: r.monthly_booking_limit,
    max_courts: r.max_courts,
    max_branches: r.max_branches,
    line_notify: r.line_notify,
    member_system: r.member_system,
    peak_pricing: r.peak_pricing,
    broadcast: r.broadcast,
    export_reports: r.export_reports,
    guest_pass: r.guest_pass,
    kiosk_mode: r.kiosk_mode,
    custom_domain: r.custom_domain,
    analytics: r.analytics,
  };
}

/** สิทธิ์ของแพลนเดียว — อ่านจาก DB, fallback เป็น default ถ้าไม่มี/ผิดพลาด */
export async function getPlanEntitlements(
  admin: Admin,
  plan: PlanType,
): Promise<PlanEntitlements> {
  try {
    const { data, error } = await admin
      .from("plan_entitlements")
      .select("*")
      .eq("plan", plan)
      .maybeSingle();
    if (error || !data) return DEFAULT_ENTITLEMENTS[plan];
    return fromRow(data);
  } catch (e) {
    captureException("entitlements.get", e, { plan });
    return DEFAULT_ENTITLEMENTS[plan];
  }
}

/** สิทธิ์ที่มีผลจริงของ tenant — รวมแพลนจริง (trial/grace real-time) + entitlements */
export async function getTenantEntitlements(
  admin: Admin,
  tenantId: string,
): Promise<{ plan: PlanType; entitlements: PlanEntitlements }> {
  const plan = await getEffectivePlan(admin, tenantId);
  const entitlements = await getPlanEntitlements(admin, plan);
  return { plan, entitlements };
}

export type QuotaCheck = { ok: boolean; reason?: string };

/** เพดานจำนวนสนามตามแพลน — อ่านจาก plan_entitlements (Super Admin แก้ได้) */
export async function checkCourtQuota(
  admin: Admin,
  tenantId: string,
): Promise<QuotaCheck> {
  const { plan, entitlements } = await getTenantEntitlements(admin, tenantId);
  const max = entitlements.max_courts;
  if (max === null) return { ok: true };
  const { count } = await admin
    .from("courts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .neq("status", "closed");
  if ((count ?? 0) >= max) {
    return {
      ok: false,
      reason: `แพลน ${PLANS[plan].name} เพิ่มสนามได้สูงสุด ${max} สนาม — อัปเกรดเพื่อเพิ่มสนาม`,
    };
  }
  return { ok: true };
}

/** เพดานจำนวนสาขาตามแพลน — อ่านจาก plan_entitlements */
export async function checkBranchQuota(
  admin: Admin,
  tenantId: string,
): Promise<QuotaCheck> {
  const { plan, entitlements } = await getTenantEntitlements(admin, tenantId);
  const max = entitlements.max_branches;
  if (max === null) return { ok: true };
  const { count } = await admin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .neq("status", "inactive");
  if ((count ?? 0) >= max) {
    return {
      ok: false,
      reason: `แพลน ${PLANS[plan].name} เพิ่มสาขาได้สูงสุด ${max} สาขา — อัปเกรดเพื่อเพิ่มสาขา`,
    };
  }
  return { ok: true };
}

/** สิทธิ์ทุกแพลน (สำหรับหน้า super admin) — merge default กับค่าใน DB */
export async function getAllEntitlements(
  admin: Admin,
): Promise<Record<PlanType, PlanEntitlements>> {
  const result: Record<PlanType, PlanEntitlements> = {
    free: { ...DEFAULT_ENTITLEMENTS.free },
    growth: { ...DEFAULT_ENTITLEMENTS.growth },
    pro: { ...DEFAULT_ENTITLEMENTS.pro },
  };
  try {
    const { data } = await admin.from("plan_entitlements").select("*");
    for (const row of data ?? []) result[row.plan] = fromRow(row);
  } catch (e) {
    captureException("entitlements.getAll", e);
  }
  return result;
}
