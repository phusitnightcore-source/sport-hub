import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { captureException, logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import { lineConfigured, pushLineMessage } from "./line";
import { emailConfigured, sendEmail } from "./email";

// ============================================================================
// Unified Notification Dispatcher (§14.2)
// ----------------------------------------------------------------------------
// นโยบายช่องทาง:
//   1. In-app  — บันทึกประวัติเสมอ ไม่ขึ้นกับ LINE/Email
//   2. LINE    — ช่องทางหลัก (ถ้าผู้รับผูก lineUserId + ตั้ง token แล้ว)
//                ส่งไม่สำเร็จ → retry อัตโนมัติสูงสุด 3 ครั้ง → fallback Email
//   3. Email   — สำรอง / ใบเสร็จ / Invoice
//
// ออกแบบให้ทำงานได้ทันทีก่อนใส่ API key: ถ้ายังไม่ตั้ง token/key ระบบจะบันทึก
// in_app ไว้เป็นประวัติ และข้ามการส่งภายนอกอย่างสวยงาม (ไม่มี exception หลุด)
// ============================================================================

type NotifType = Database["public"]["Enums"]["notification_type"];
type NotifChannel = Database["public"]["Enums"]["notification_channel"];
type NotifStatus = Database["public"]["Enums"]["notification_status"];
type RecipientType = "member" | "admin" | "staff";

export type DispatchParams = {
  tenantId: string | null;
  recipientId?: string | null;
  recipientType: RecipientType;
  type: NotifType;
  title: string;
  body?: string;
  referenceId?: string | null;
  referenceType?: string | null;
  /** LINE userId ปลายทาง — ถ้า null จะข้าม LINE */
  lineUserId?: string | null;
  /** อีเมลปลายทาง — ใช้เป็น fallback หรือช่องทางหลักเมื่อไม่มี LINE */
  email?: string | null;
};

export type DispatchResult = {
  inApp: boolean;
  line: "sent" | "failed" | "skipped";
  email: "sent" | "failed" | "skipped";
  lineRetries: number;
};

const LINE_MAX_RETRY = 3;

type AdminClient = ReturnType<typeof createAdminClient>;

async function insertRow(
  admin: AdminClient,
  p: DispatchParams,
  channel: NotifChannel,
  status: NotifStatus,
  retryCount: number,
) {
  await admin.from("notifications").insert({
    tenant_id: p.tenantId,
    recipient_id: p.recipientId ?? null,
    recipient_type: p.recipientType,
    type: p.type,
    channel,
    title: p.title,
    body: p.body ?? null,
    reference_id: p.referenceId ?? null,
    reference_type: p.referenceType ?? null,
    status,
    retry_count: retryCount,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
}

export async function dispatchNotification(
  p: DispatchParams,
): Promise<DispatchResult> {
  const admin = createAdminClient();
  const result: DispatchResult = {
    inApp: false,
    line: "skipped",
    email: "skipped",
    lineRetries: 0,
  };

  // 1) In-app — บันทึกประวัติเสมอ
  try {
    await insertRow(admin, p, "in_app", "sent", 0);
    result.inApp = true;
  } catch (e) {
    captureException("notify.in_app_insert", e);
  }

  // 2) LINE — ช่องทางหลัก (retry ≤ 3)
  let lineDelivered = false;
  if (p.lineUserId && lineConfigured()) {
    let attempts = 0;
    let lastError: string | undefined;
    while (attempts < LINE_MAX_RETRY) {
      attempts += 1;
      const r = await pushLineMessage({
        to: p.lineUserId,
        text: `${p.title}\n${p.body ?? ""}`.trim(),
      });
      if (r.ok) {
        lineDelivered = true;
        break;
      }
      if (r.unconfigured) break; // ไม่ควรเกิดเพราะเช็ค lineConfigured แล้ว
      lastError = r.error;
    }
    result.lineRetries = attempts;
    result.line = lineDelivered ? "sent" : "failed";
    await insertRow(admin, p, "line", lineDelivered ? "sent" : "failed", attempts);
    if (!lineDelivered) {
      logger.warn("notify.line_failed", { attempts, error: lastError });
    }
  }

  // 3) Email — fallback เมื่อ LINE ล้มเหลว หรือใช้เป็นช่องทางหลักเมื่อไม่มี LINE
  const needEmail = p.email && emailConfigured() && !lineDelivered;
  if (needEmail && p.email) {
    const r = await sendEmail({
      to: p.email,
      subject: p.title,
      text: p.body ?? p.title,
    });
    result.email = r.ok ? "sent" : "failed";
    await insertRow(admin, p, "email", r.ok ? "sent" : "failed", 0);
    if (!r.ok && !r.unconfigured) {
      logger.warn("notify.email_failed", { error: r.error });
    }
  }

  return result;
}
