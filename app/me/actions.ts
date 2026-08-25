"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notify";
import { revalidatePath } from "next/cache";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
function daysBetween(from: string, to: string): number {
  const ms =
    new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// สมาชิกขอ Freeze (§8.1, §34.6) — enforce freeze_max_times ต่อแพ็กเกจ
export async function requestFreeze(reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: member } = await supabase
    .from("members")
    .select(
      "id, tenant_id, status, end_date, original_end_date, freeze_count, packages(freeze_max_times, freeze_auto_approve)",
    )
    .eq("profile_id", user.id)
    .single();

  if (!member) return { success: false, error: "ไม่พบข้อมูลสมาชิก" };
  if (member.status !== "active") {
    return { success: false, error: "สถานะสมาชิกต้องเป็น Active จึงจะขอระงับได้" };
  }

  const maxTimes = member.packages?.freeze_max_times ?? 2;
  if (member.freeze_count >= maxTimes) {
    return { success: false, error: `ใช้สิทธิ์ระงับชั่วคราวครบ ${maxTimes} ครั้งแล้ว` };
  }

  const autoApprove = member.packages?.freeze_auto_approve ?? false;
  const today = todayISO();

  const { data: request, error } = await supabase
    .from("freeze_requests")
    .insert({
      tenant_id: member.tenant_id,
      member_id: member.id,
      reason,
      status: autoApprove ? "approved" : "pending",
      freeze_start: autoApprove ? today : null,
      reviewed_at: autoApprove ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  if (autoApprove) {
    await supabase
      .from("members")
      .update({
        status: "frozen",
        freeze_start_date: today,
        // เก็บวันหมดอายุเดิมครั้งแรกที่ freeze (§8.3 original_end_date)
        original_end_date: member.original_end_date ?? member.end_date,
        freeze_count: member.freeze_count + 1,
      })
      .eq("id", member.id);
  }

  await logAudit({
    tenantId: member.tenant_id,
    actorId: user.id,
    actorRole: "member",
    action: autoApprove ? "freeze" : "request_freeze",
    module: "members",
    referenceId: request.id,
  });

  // แจ้งเตือนสนามเมื่อคำขอต้องรออนุมัติ (auto-approve = ไม่ต้องแจ้ง)
  if (!autoApprove) {
    await dispatchNotification({
      tenantId: member.tenant_id,
      recipientId: null,
      recipientType: "admin",
      type: "membership",
      title: "คำขอระงับสมาชิกใหม่",
      body: "มีสมาชิกขอระงับชั่วคราว (Freeze) — รออนุมัติที่หน้าคำขอ Freeze",
      referenceId: request.id,
      referenceType: "freeze_request",
    });
  }

  revalidatePath("/me");
  return { success: true, autoApprove };
}

// PDPA §6.5 Right to Object — opt-out/opt-in รับ Broadcast ด้วยตัวเอง
export async function toggleBroadcastOptOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: member } = await supabase
    .from("members")
    .select("id, tenant_id, broadcast_opt_out")
    .eq("profile_id", user.id)
    .single();
  if (!member) return { success: false, error: "ไม่พบข้อมูลสมาชิก" };

  const next = !member.broadcast_opt_out;
  await supabase
    .from("members")
    .update({ broadcast_opt_out: next })
    .eq("id", member.id);

  await logAudit({
    tenantId: member.tenant_id,
    actorId: user.id,
    actorRole: "member",
    action: next ? "broadcast_opt_out" : "broadcast_opt_in",
    module: "pdpa",
    referenceId: member.id,
  });
  revalidatePath("/me");
  return { success: true, optOut: next };
}

// PDPA §6.5 Right to Erasure — สมาชิกกด "ขอลบบัญชี" → แจ้ง Admin สนามยืนยัน
// (Admin ต้องดำเนินการภายใน 30 วันตามกฎหมาย — flow ฝั่ง admin ผ่าน notification)
export async function requestErasure() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: member } = await supabase
    .from("members")
    .select("id, tenant_id, first_name, last_name, member_number")
    .eq("profile_id", user.id)
    .single();
  if (!member) return { success: false, error: "ไม่พบข้อมูลสมาชิก" };

  // แจ้งเตือน admin ผ่าน service role (member insert notification เองไม่ได้ตาม RLS)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    tenant_id: member.tenant_id,
    recipient_type: "admin",
    type: "system",
    channel: "in_app",
    title: "คำขอลบบัญชีสมาชิก (PDPA)",
    body: `${member.first_name} ${member.last_name ?? ""} (${member.member_number}) ขอลบบัญชีและข้อมูลทั้งหมด — ต้องดำเนินการภายใน 30 วัน`,
    reference_id: member.id,
    reference_type: "member",
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  await logAudit({
    tenantId: member.tenant_id,
    actorId: user.id,
    actorRole: "member",
    action: "request_erasure",
    module: "pdpa",
    referenceId: member.id,
  });
  return { success: true };
}

// สมาชิก Unfreeze เอง (§8.1) — คืน Active + ยืดวันหมดอายุตามจำนวนวันที่ freeze
export async function unfreezeMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: member } = await supabase
    .from("members")
    .select(
      "id, tenant_id, status, end_date, freeze_start_date, freeze_days_used, packages(freeze_max_days)",
    )
    .eq("profile_id", user.id)
    .single();

  if (!member) return { success: false, error: "ไม่พบข้อมูลสมาชิก" };
  if (member.status !== "frozen" || !member.freeze_start_date) {
    return { success: false, error: "สมาชิกไม่ได้อยู่ในสถานะระงับ" };
  }

  const today = todayISO();
  let daysFrozen = daysBetween(member.freeze_start_date, today);

  // จำกัดไม่เกินโควตาวัน freeze ที่เหลือของแพ็กเกจ (§8.1 default 30 วัน)
  const maxDays = member.packages?.freeze_max_days ?? 30;
  const remaining = Math.max(0, maxDays - member.freeze_days_used);
  if (daysFrozen > remaining) daysFrozen = remaining;

  // วัน freeze ไม่นับรวมอายุ → ยืด end_date ออกตามจำนวนวันที่ freeze
  const newEnd = member.end_date ? addDays(member.end_date, daysFrozen) : null;

  await supabase
    .from("members")
    .update({
      status: "active",
      freeze_start_date: null,
      freeze_days_used: member.freeze_days_used + daysFrozen,
      end_date: newEnd,
    })
    .eq("id", member.id);

  // ปิดคำขอ freeze ที่ยัง active (freeze_end = วัน unfreeze จริง §schema)
  await supabase
    .from("freeze_requests")
    .update({ freeze_end: today })
    .eq("member_id", member.id)
    .eq("status", "approved")
    .is("freeze_end", null);

  await logAudit({
    tenantId: member.tenant_id,
    actorId: user.id,
    actorRole: "member",
    action: "unfreeze",
    module: "members",
    referenceId: member.id,
    after: { days_frozen: daysFrozen, new_end_date: newEnd },
  });

  revalidatePath("/me");
  return { success: true, daysFrozen };
}
