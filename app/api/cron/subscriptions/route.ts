import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError, isoDatePlusDays } from "@/lib/api";
import { dispatchNotification } from "@/lib/notify";
import { captureException } from "@/lib/logger";

const DAY_MS = 24 * 60 * 60_000;

// Cron รายวัน: จัดการวงจร Subscription (§4, §11.2)
//  1. Trial หมด → Downgrade เป็น Free อัตโนมัติ (ข้อมูลอยู่ครบ)
//  2. Grace Period หมด → Downgrade เป็น Free
//  3. แจ้งเตือนก่อนหมด Trial 3 วัน (in-app; LINE/Email ต่อคิว Module 8)
//  4. Downgrade ที่ตั้งเวลาไว้ (§11.4) ถึงกำหนด → เปลี่ยนแพลนจริง
//  5. Hard delete tenant ที่ยกเลิกเกิน 30 วัน (§32, PDPA §6.4) รวมไฟล์ใน storage
export async function GET(request: Request) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const result = {
    trialExpired: 0,
    graceExpired: 0,
    reminders: 0,
    memberReminders: 0,
    downgrades: 0,
    hardDeleted: 0,
  };

  // 1) Trial หมดอายุ
  const { data: expiredTrials } = await admin
    .from("subscriptions")
    .update({ plan: "free", status: "active" })
    .eq("status", "trial")
    .lt("trial_end", nowIso)
    .select("id, tenant_id");
  result.trialExpired = (expiredTrials ?? []).length;
  for (const sub of expiredTrials ?? []) {
    await admin.from("notifications").insert({
      tenant_id: sub.tenant_id,
      recipient_type: "admin",
      type: "system",
      channel: "in_app",
      title: "Trial หมดอายุแล้ว",
      body: "บัญชีถูกปรับเป็น Free Plan — ข้อมูลยังอยู่ครบ อัปเกรดได้ตลอดเวลา",
      reference_id: sub.id,
      reference_type: "subscription",
      status: "sent",
      sent_at: nowIso,
    });
  }

  // 2) Grace Period หมด → Free (§11.2)
  const { data: expiredGrace } = await admin
    .from("subscriptions")
    .update({ plan: "free", status: "active", grace_period_end: null })
    .eq("status", "grace")
    .lt("grace_period_end", nowIso)
    .select("id");
  result.graceExpired = (expiredGrace ?? []).length;

  // 3) เตือนก่อนหมด Trial 3 วัน (ยังไม่เคยเตือน)
  const threeDays = new Date(Date.now() + 3 * DAY_MS).toISOString();
  const { data: expiring } = await admin
    .from("subscriptions")
    .select("id, tenant_id, trial_end")
    .eq("status", "trial")
    .gt("trial_end", nowIso)
    .lt("trial_end", threeDays);
  for (const sub of expiring ?? []) {
    const { data: already } = await admin
      .from("notifications")
      .select("id")
      .eq("reference_id", sub.id)
      .eq("title", "Trial ใกล้หมดอายุ")
      .limit(1)
      .maybeSingle();
    if (already) continue;
    await admin.from("notifications").insert({
      tenant_id: sub.tenant_id,
      recipient_type: "admin",
      type: "system",
      channel: "in_app",
      title: "Trial ใกล้หมดอายุ",
      body: `Trial จะหมดวันที่ ${sub.trial_end!.slice(0, 10)} — เลือกแพลนเพื่อใช้งานต่อเนื่อง`,
      reference_id: sub.id,
      reference_type: "subscription",
      status: "sent",
      sent_at: nowIso,
    });
    result.reminders += 1;
  }

  // 3b) เตือนสมาชิกใกล้หมดอายุ 7/3/0 วัน (§14.1) ผ่าน dispatcher (LINE→email→in-app)
  try {
    for (const d of [7, 3, 0]) {
      const targetDate = isoDatePlusDays(d);
      const { data: expiringMembers } = await admin
        .from("members")
        .select("id, tenant_id, line_user_id, email, end_date")
        .eq("status", "active")
        .eq("end_date", targetDate);
      for (const m of expiringMembers ?? []) {
        const title = d === 0 ? "สมาชิกหมดอายุวันนี้" : `สมาชิกใกล้หมดอายุ (${d} วัน)`;
        const { data: dup } = await admin
          .from("notifications")
          .select("id")
          .eq("reference_id", m.id)
          .eq("type", "membership")
          .eq("title", title)
          .limit(1)
          .maybeSingle();
        if (dup) continue;
        await dispatchNotification({
          tenantId: m.tenant_id,
          recipientId: m.id,
          recipientType: "member",
          type: "membership",
          title,
          body: `สมาชิกภาพจะหมดวันที่ ${m.end_date} — ต่ออายุเพื่อใช้งานต่อเนื่อง`,
          referenceId: m.id,
          referenceType: "member",
          lineUserId: m.line_user_id,
          email: m.email,
        });
        result.memberReminders += 1;
      }
    }
  } catch (e) {
    captureException("cron.subscriptions.memberReminders", e);
  }

  // 4) Downgrade ตามกำหนด (plan_change_logs ที่ effective_at ถึงแล้ว)
  const { data: dueChanges } = await admin
    .from("plan_change_logs")
    .select("id, tenant_id, to_plan, effective_at")
    .lte("effective_at", nowIso);
  for (const change of dueChanges ?? []) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, plan, current_period_end")
      .eq("tenant_id", change.tenant_id)
      .single();
    // ใช้เฉพาะรายการที่ยังไม่ถูก apply (แพลนปัจจุบันยังไม่ตรงเป้า)
    if (!sub || sub.plan === change.to_plan) continue;
    // ข้ามถ้ารอบปัจจุบันยังไม่หมด (upgrade ระหว่างทางทับ log เก่า)
    if (
      sub.current_period_end &&
      new Date(sub.current_period_end).getTime() > Date.now()
    ) {
      continue;
    }
    await admin
      .from("subscriptions")
      .update({ plan: change.to_plan, status: "active" })
      .eq("id", sub.id);
    result.downgrades += 1;
  }

  // 5) Hard delete tenant ที่พ้นกำหนด 30 วันหลังยกเลิก (§32)
  //    ลบไฟล์ storage ทุก bucket (path ขึ้นต้น tenant_id) แล้วลบ tenant (cascade ทั้ง DB)
  const { data: dueTenants } = await admin
    .from("tenants")
    .select("id, name")
    .eq("status", "cancelled_pending_delete")
    .lt("hard_delete_after", nowIso);
  const BUCKETS = [
    "logos",
    "branch-images",
    "court-images",
    "member-profiles",
    "slips",
    "receipts",
    "documents",
  ];
  for (const t of dueTenants ?? []) {
    for (const bucket of BUCKETS) {
      const { data: files } = await admin.storage.from(bucket).list(t.id, { limit: 1000 });
      if (files && files.length > 0) {
        await admin.storage
          .from(bucket)
          .remove(files.map((f) => `${t.id}/${f.name}`));
      }
    }
    await admin.from("tenants").delete().eq("id", t.id);
    result.hardDeleted += 1;
    console.log(`hard-deleted tenant ${t.id} (${t.name})`);
  }

  return apiOk(result);
}
