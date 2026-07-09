"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";

export type CheckinQueryType = "qr" | "phone";

type FailReason = Database["public"]["Enums"]["checkin_fail_reason"];

// ค้นหาสมาชิกสำหรับเช็คอิน — รองรับทั้ง venue_admin และ staff (getStaffContext)
export async function findMemberForCheckin(query: string, type: CheckinQueryType) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const supabase = await createClient();
  let memberQuery = supabase
    .from("members")
    .select(
      "id, member_number, first_name, last_name, phone, status, end_date, sessions_used, packages(id, name, type, sessions_limit, branch_access_all, branch_access_ids)",
    )
    .eq("tenant_id", ctx.tenantId);

  if (type === "qr") {
    // QR format: sport-hub:checkin:MEMBER_NUMBER หรือ member id ตรงๆ
    if (query.startsWith("sport-hub:checkin:")) {
      memberQuery = memberQuery.eq("member_number", query.split(":")[2]);
    } else {
      memberQuery = memberQuery.eq("id", query);
    }
  } else {
    memberQuery = memberQuery.eq("phone", query);
  }

  const { data: member } = await memberQuery.maybeSingle();
  if (!member) return { success: false, error: "ไม่พบข้อมูลสมาชิกในระบบ" };

  let isValid = true;
  let failReason: string | null = null;
  if (member.status === "frozen") {
    isValid = false;
    failReason = "สมาชิกถูกระงับชั่วคราว (Frozen)";
  } else if (member.status !== "active") {
    isValid = false;
    failReason = "สมาชิกหมดอายุ กรุณาต่ออายุ";
  } else if (member.end_date && new Date(member.end_date) < new Date()) {
    isValid = false;
    failReason = "แพ็กเกจหมดอายุแล้ว";
  } else if (
    member.packages?.type === "session_based" &&
    member.packages.sessions_limit &&
    member.sessions_used >= member.packages.sessions_limit
  ) {
    isValid = false;
    failReason = "ใช้สิทธิ์ครบจำนวนครั้งแล้ว";
  }

  return { success: true, member, isValid, failReason };
}

// ยืนยันเช็คอิน — enforce สถานะ/สิทธิ์สาขา/สิทธิ์ครั้ง/ความจุ (§10)
export async function processCheckin(memberId: string, branchId: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select(
      "id, tenant_id, status, end_date, sessions_used, packages(type, sessions_limit, branch_access_all, branch_access_ids)",
    )
    .eq("id", memberId)
    .eq("tenant_id", ctx.tenantId)
    .single();
  if (!member) return { success: false, error: "ไม่พบสมาชิก" };

  const recordFail = async (reason: FailReason) => {
    await admin.from("checkins").insert({
      tenant_id: ctx.tenantId,
      branch_id: branchId,
      member_id: memberId,
      method: "staff",
      verified_by: ctx.staffId,
      result: "failed",
      fail_reason: reason,
    });
  };

  // สถานะ (§28.2 MEMBER_FROZEN / MEMBER_EXPIRED)
  if (member.status === "frozen") {
    await recordFail("frozen");
    return { success: false, error: "สมาชิกถูกระงับชั่วคราว" };
  }
  if (member.status !== "active" || (member.end_date && new Date(member.end_date) < new Date())) {
    await recordFail("expired");
    return { success: false, error: "สมาชิกหมดอายุ กรุณาต่ออายุ" };
  }
  // สิทธิ์สาขา (§28.2 MEMBER_BRANCH_DENIED)
  if (
    !member.packages?.branch_access_all &&
    !(member.packages?.branch_access_ids ?? []).includes(branchId)
  ) {
    await recordFail("branch_denied");
    return { success: false, error: "สมาชิกไม่มีสิทธิ์เข้าสาขานี้" };
  }
  // สิทธิ์ครั้ง
  if (
    member.packages?.type === "session_based" &&
    member.packages.sessions_limit &&
    member.sessions_used >= member.packages.sessions_limit
  ) {
    await recordFail("session_limit");
    return { success: false, error: "ใช้สิทธิ์ครบจำนวนครั้งแล้ว" };
  }
  // กันเช็คอินซ้ำ (ยังไม่เช็คเอาท์)
  const { data: openCheckin } = await admin
    .from("checkins")
    .select("id")
    .eq("member_id", memberId)
    .eq("branch_id", branchId)
    .eq("result", "passed")
    .is("actual_checkout_time", null)
    .limit(1)
    .maybeSingle();
  if (openCheckin) {
    return { success: false, error: "สมาชิกเช็คอินอยู่แล้ว (ยังไม่เช็คเอาท์)" };
  }
  // ความจุสาขา (§10.5, §28.2 BRANCH_CAPACITY_FULL)
  const { data: occ } = await admin
    .from("branch_occupancy")
    .select("current_occupancy, max_capacity")
    .eq("branch_id", branchId)
    .single();
  if (occ && (occ.current_occupancy ?? 0) >= (occ.max_capacity ?? 0)) {
    await recordFail("capacity_full");
    return { success: false, error: "สาขาเต็มแล้ว กรุณารอสักครู่" };
  }

  const { error: checkinErr } = await admin.from("checkins").insert({
    tenant_id: ctx.tenantId,
    branch_id: branchId,
    member_id: memberId,
    method: "staff",
    verified_by: ctx.staffId,
    result: "passed",
  });
  if (checkinErr) {
    return { success: false, error: "บันทึกการเช็คอินไม่สำเร็จ: " + checkinErr.message };
  }

  if (member.packages?.type === "session_based") {
    await admin
      .from("members")
      .update({ sessions_used: member.sessions_used + 1 })
      .eq("id", memberId);
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "checkin",
    module: "checkin",
    referenceId: memberId,
    after: { branch_id: branchId },
  });

  revalidatePath("/dashboard/checkin");
  return { success: true };
}

// เช็คเอาท์ด้วยตนเอง (ลด occupancy) — §10.4
export async function checkoutMember(checkinId: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("checkins")
    .update({
      actual_checkout_time: new Date().toISOString(),
      checkout_method: "staff_manual",
    })
    .eq("id", checkinId)
    .eq("tenant_id", ctx.tenantId)
    .is("actual_checkout_time", null);
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/checkin");
  return { success: true };
}
