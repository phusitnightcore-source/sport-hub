"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import type { Database } from "@/lib/supabase/types";

type FailReason = Database["public"]["Enums"]["checkin_fail_reason"];

// Self check-in ผ่านหน้า Kiosk สาธารณะ (§10 + Kiosk mode) — ระบุสาขาด้วย kiosk_token
// ไม่มี staff context: mutate ผ่าน service role โดยจงใจ (public page), method = 'kiosk'
// ตรวจ entitlement kiosk_mode ของ tenant ก่อนเสมอ
export async function selfCheckin(
  token: string,
  phone: string,
): Promise<{ success: boolean; error?: string; memberName?: string }> {
  const admin = createAdminClient();

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (!/^0[0-9]{8,9}$/.test(cleanPhone)) {
    return { success: false, error: "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง" };
  }

  // สาขาจาก token (unique) → tenant + branch
  const { data: branch } = await admin
    .from("branches")
    .select("id, tenant_id, name, status")
    .eq("kiosk_token", token)
    .maybeSingle();
  if (!branch || branch.status !== "active") {
    return { success: false, error: "ไม่พบสาขาหรือปิดใช้งานอยู่" };
  }
  const tenantId = branch.tenant_id;
  const branchId = branch.id;

  // gate: entitlement kiosk_mode (import แบบ dynamic เพื่อไม่ให้ client bundle แตะ server helper)
  const { getTenantEntitlements } = await import("@/lib/entitlements.server");
  const { entitlements } = await getTenantEntitlements(admin, tenantId);
  if (!entitlements.kiosk_mode) {
    return { success: false, error: "สาขานี้ยังไม่เปิดใช้งาน Kiosk" };
  }

  const { data: member } = await admin
    .from("members")
    .select(
      "id, first_name, last_name, status, end_date, sessions_used, packages(type, sessions_limit, branch_access_all, branch_access_ids)",
    )
    .eq("tenant_id", tenantId)
    .eq("phone", cleanPhone)
    .maybeSingle();
  if (!member) {
    return { success: false, error: "ไม่พบสมาชิกจากเบอร์นี้ กรุณาติดต่อเจ้าหน้าที่" };
  }
  const memberName = `${member.first_name} ${member.last_name ?? ""}`.trim();

  const recordFail = async (reason: FailReason) => {
    await admin.from("checkins").insert({
      tenant_id: tenantId,
      branch_id: branchId,
      member_id: member.id,
      method: "kiosk",
      verified_by: null,
      result: "failed",
      fail_reason: reason,
    });
  };

  // สถานะ (§28.2)
  if (member.status === "frozen") {
    await recordFail("frozen");
    return { success: false, error: "สมาชิกถูกระงับชั่วคราว กรุณาติดต่อเจ้าหน้าที่", memberName };
  }
  if (member.status !== "active" || (member.end_date && new Date(member.end_date) < new Date())) {
    await recordFail("expired");
    return { success: false, error: "สมาชิกหมดอายุ กรุณาต่ออายุ", memberName };
  }
  // สิทธิ์สาขา
  if (
    !member.packages?.branch_access_all &&
    !(member.packages?.branch_access_ids ?? []).includes(branchId)
  ) {
    await recordFail("branch_denied");
    return { success: false, error: "สมาชิกไม่มีสิทธิ์เข้าสาขานี้", memberName };
  }
  // สิทธิ์ครั้ง
  if (
    member.packages?.type === "session_based" &&
    member.packages.sessions_limit &&
    member.sessions_used >= member.packages.sessions_limit
  ) {
    await recordFail("session_limit");
    return { success: false, error: "ใช้สิทธิ์ครบจำนวนครั้งแล้ว", memberName };
  }
  // กันเช็คอินซ้ำ (ยังไม่เช็คเอาท์)
  const { data: openCheckin } = await admin
    .from("checkins")
    .select("id")
    .eq("member_id", member.id)
    .eq("branch_id", branchId)
    .eq("result", "passed")
    .is("actual_checkout_time", null)
    .limit(1)
    .maybeSingle();
  if (openCheckin) {
    return { success: false, error: "คุณเช็คอินอยู่แล้ว", memberName };
  }
  // ความจุสาขา (§10.5)
  const { data: occ } = await admin
    .from("branch_occupancy")
    .select("current_occupancy, max_capacity")
    .eq("branch_id", branchId)
    .single();
  if (occ && (occ.current_occupancy ?? 0) >= (occ.max_capacity ?? 0)) {
    await recordFail("capacity_full");
    return { success: false, error: "สาขาเต็มแล้ว กรุณารอสักครู่", memberName };
  }

  const { error: checkinErr } = await admin.from("checkins").insert({
    tenant_id: tenantId,
    branch_id: branchId,
    member_id: member.id,
    method: "kiosk",
    verified_by: null,
    result: "passed",
  });
  if (checkinErr) {
    return { success: false, error: "บันทึกการเช็คอินไม่สำเร็จ กรุณาลองใหม่", memberName };
  }

  if (member.packages?.type === "session_based") {
    await admin
      .from("members")
      .update({ sessions_used: member.sessions_used + 1 })
      .eq("id", member.id);
  }

  await logAudit({
    tenantId,
    actorId: null,
    actorRole: "member",
    action: "checkin",
    module: "checkin",
    referenceId: member.id,
    after: { branch_id: branchId, method: "kiosk" },
  });

  return { success: true, memberName };
}
