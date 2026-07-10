import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { PLANS, effectivePlan, type PlanType } from "@/lib/plans";

type DB = SupabaseClient<Database>;

// แหล่งความจริงเดียวของ "แพลนที่มีผลจริง" ของ tenant — ใช้ gate ฟีเจอร์ทุกจุด
// คำนวณ real-time (trial/grace หมดอายุ → free) ไม่พึ่ง cron
export async function getEffectivePlan(
  db: DB,
  tenantId: string,
): Promise<PlanType> {
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan, status, trial_end, grace_period_end")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!sub) return "free"; // ไม่มี subscription = ปฏิบัติเหมือน Free
  return effectivePlan(sub);
}

// ผลลัพธ์การตรวจสิทธิ์ฟีเจอร์ — ok=true ผ่าน / ไม่ผ่านพร้อมเหตุผลไทย
export type FeatureCheck = { ok: boolean; plan: PlanType; reason?: string };

/** ต้องมี Online Payment (Growth+) — ใช้กับสมัคร/ต่ออายุสมาชิก + จองออนไลน์ */
export async function requireOnlinePayment(
  db: DB,
  tenantId: string,
  reason = "สนามนี้ยังไม่เปิดรับชำระออนไลน์ กรุณาติดต่อสนามโดยตรง",
): Promise<FeatureCheck> {
  const plan = await getEffectivePlan(db, tenantId);
  return PLANS[plan].onlinePayment ? { ok: true, plan } : { ok: false, plan, reason };
}

/** เพดานจำนวนสนามตามแพลน (Free = 1) — คืน error ถ้าจะเกิน */
export async function checkCourtQuota(
  db: DB,
  tenantId: string,
): Promise<FeatureCheck> {
  const plan = await getEffectivePlan(db, tenantId);
  const max = PLANS[plan].maxCourts;
  if (max === null) return { ok: true, plan };
  const { count } = await db
    .from("courts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .neq("status", "closed");
  if ((count ?? 0) >= max) {
    return {
      ok: false,
      plan,
      reason: `แพลน ${PLANS[plan].name} เพิ่มสนามได้สูงสุด ${max} สนาม — อัปเกรดเพื่อเพิ่มสนาม`,
    };
  }
  return { ok: true, plan };
}
