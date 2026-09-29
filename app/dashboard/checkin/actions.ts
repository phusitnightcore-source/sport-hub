"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";
import { verifyMemberQrToken } from "@/lib/membership/qr";
import { notifyMemberSafely } from "@/lib/membership/notifications";

export type CheckinQueryType = "qr" | "phone" | "code";

type FailReason = Database["public"]["Enums"]["checkin_fail_reason"];

function todayInBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export type UnifiedCheckinResult = {
  success: boolean;
  error?: string;
  targetType?: "member" | "booking";
  member?: {
    id: string;
    member_number: string;
    first_name: string;
    last_name: string | null;
    phone: string | null;
    status: string;
    end_date: string | null;
    sessions_used: number;
    packages: {
      id: string;
      name: string;
      type: string;
      sessions_limit: number | null;
      branch_access_all: boolean;
      branch_access_ids: string[] | null;
    } | null;
  };
  booking?: {
    id: string;
    booking_code: string;
    user_name: string | null;
    user_phone: string | null;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    total_price: number;
    courts: {
      name: string;
      branch_id: string;
    } | null;
  };
  isValid?: boolean;
  failReason?: string | null;
};

// ค้นหาสมาชิกหรือตั๋วการจองสำหรับเช็คอิน
export async function findMemberForCheckin(
  query: string,
  type: CheckinQueryType
): Promise<UnifiedCheckinResult> {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const supabase = await createClient();
  const trimmed = query.trim();

  // 1. ลองค้นหาใน Members ก่อน
  let memberQuery = supabase
    .from("members")
    .select(
      "id, member_number, first_name, last_name, phone, status, end_date, sessions_used, packages(id, name, type, sessions_limit, branch_access_all, branch_access_ids)"
    )
    .eq("tenant_id", ctx.tenantId);

  if (type === "qr") {
    if (trimmed.startsWith("sport-hub:member:v1:")) {
      const verified = verifyMemberQrToken(trimmed);
      if (!verified.valid) {
        return {
          success: false,
          error: verified.reason === "expired"
            ? "QR หมดอายุแล้ว กรุณาให้สมาชิกเปิดบัตรใหม่"
            : "QR สมาชิกไม่ถูกต้อง",
        };
      }
      memberQuery = memberQuery.eq("id", verified.memberId);
    } else if (trimmed.startsWith("sport-hub:checkin:")) {
      return { success: false, error: "บัตรรูปแบบเก่าหมดอายุ กรุณาเปิดบัตรสมาชิกใหม่" };
    } else {
      return { success: false, error: "QR สมาชิกไม่ถูกต้อง" };
    }
  } else if (type === "phone") {
    memberQuery = memberQuery.eq("phone", trimmed);
  } else {
    memberQuery = memberQuery.or(`member_number.eq.${trimmed},phone.eq.${trimmed}`);
  }

  const { data: member } = await memberQuery.maybeSingle();

  if (member) {
    let isValid = true;
    let failReason: string | null = null;
    if (member.status === "frozen") {
      isValid = false;
      failReason = "สมาชิกถูกระงับชั่วคราว (Frozen)";
    } else if (member.status !== "active") {
      isValid = false;
      failReason = "สมาชิกหมดอายุ กรุณาต่ออายุ";
    } else if (member.end_date && member.end_date < todayInBangkok()) {
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

    return {
      success: true,
      targetType: "member",
      member,
      isValid,
      failReason,
    };
  }

  // 2. ถ้าไม่พบสมาชิก ลองค้นหาใน Bookings (ตั๋วการจองสนาม)
  let bookingCode = trimmed;
  if (trimmed.startsWith("sport-hub:booking:")) {
    bookingCode = trimmed.split(":")[2];
  }

  let bookingQuery = supabase
    .from("bookings")
    .select(
      "id, booking_code, user_name, user_phone, booking_date, start_time, end_time, status, total_price, courts(name, branch_id)"
    )
    .eq("tenant_id", ctx.tenantId);

  if (type === "phone") {
    bookingQuery = bookingQuery.eq("user_phone", trimmed).order("booking_date", { ascending: false });
  } else {
    bookingQuery = bookingQuery.or(`booking_code.eq.${bookingCode},id.eq.${bookingCode}`);
  }

  const { data: bookingsData } = await bookingQuery.limit(1);
  const booking = bookingsData?.[0];

  if (booking) {
    let isValid = true;
    let failReason: string | null = null;

    if (booking.status === "cancelled") {
      isValid = false;
      failReason = "รายการจองนี้ถูกยกเลิกแล้ว";
    } else if (booking.status === "awaiting_verification") {
      isValid = false;
      failReason = "สลิปโอนเงินรอยืนยัน กรุณาตรวจสลิปก่อนเข้าใช้สนาม";
    }

    return {
      success: true,
      targetType: "booking",
      booking,
      isValid,
      failReason,
    };
  }

  return { success: false, error: "ไม่พบข้อมูลสมาชิกหรือรหัสการจองในระบบ" };
}

// ยืนยันเช็คอินสมาชิก — enforce สถานะ/สิทธิ์สาขา/สิทธิ์ครั้ง/ความจุ
export async function processCheckin(memberId: string, branchId: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select(
      "id, tenant_id, status, end_date, sessions_used, packages(type, sessions_limit, branch_access_all, branch_access_ids)"
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

  // สถานะ
  if (member.status === "frozen") {
    await recordFail("frozen");
    return { success: false, error: "สมาชิกถูกระงับชั่วคราว" };
  }
  if (member.status !== "active" || (member.end_date && member.end_date < todayInBangkok())) {
    await recordFail("expired");
    return { success: false, error: "สมาชิกหมดอายุ กรุณาต่ออายุ" };
  }
  // สิทธิ์สาขา
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

  // บันทึก checkin
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

  await notifyMemberSafely({
    tenantId: ctx.tenantId,
    memberId,
    title: "เช็กอินสำเร็จ",
    body: `เช็กอินเข้าสาขาเรียบร้อยเมื่อ ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`,
    referenceType: "checkin",
  });

  revalidatePath("/dashboard/checkin");
  return { success: true };
}

// ยืนยันเช็คอินการจองสนาม (Court Booking Check-in)
export async function processBookingCheckin(bookingId: string, branchId: string) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const admin = createAdminClient();
  const { data: booking, error: bErr } = await admin
    .from("bookings")
    .select("id, booking_code, status, total_price, courts(name)")
    .eq("id", bookingId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (bErr || !booking) {
    return { success: false, error: "ไม่พบข้อมูลการจอง" };
  }

  if (booking.status === "cancelled") {
    return { success: false, error: "รายการจองนี้ถูกยกเลิกแล้ว" };
  }

  // อัปเดตสถานะการเช็คอิน
  const { error: updateErr } = await admin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId);

  if (updateErr) {
    return { success: false, error: "อัปเดตสถานะไม่สำเร็จ: " + updateErr.message };
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "checkin_booking",
    module: "bookings",
    referenceId: bookingId,
    after: { branch_id: branchId, booking_code: booking.booking_code },
  });

  revalidatePath("/dashboard/checkin");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/schedule");
  return { success: true };
}

// เช็คเอาท์ด้วยตนเอง (ลด occupancy)
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
