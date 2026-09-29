import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchNotification } from "@/lib/notify";

type MemberNotice = {
  tenantId: string;
  memberId: string;
  title: string;
  body: string;
  referenceId?: string;
  referenceType?: string;
};

/** แจ้งสมาชิกโดยดึงช่องทางล่าสุดจากข้อมูลสมาชิก และไม่ทำให้ธุรกรรมหลักล้มเมื่อ provider ภายนอกมีปัญหา */
export async function notifyMemberSafely(notice: MemberNotice): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: member } = await admin
      .from("members")
      .select("id, email, line_user_id")
      .eq("id", notice.memberId)
      .eq("tenant_id", notice.tenantId)
      .maybeSingle();
    if (!member) return;

    await dispatchNotification({
      tenantId: notice.tenantId,
      recipientId: member.id,
      recipientType: "member",
      type: "membership",
      title: notice.title,
      body: notice.body,
      referenceId: notice.referenceId ?? member.id,
      referenceType: notice.referenceType ?? "member",
      lineUserId: member.line_user_id,
      email: member.email,
    });
  } catch (error) {
    console.error("membership notification failed", error);
  }
}

export async function notifyTenantAdminsSafely(notice: {
  tenantId: string;
  title: string;
  body: string;
  referenceId?: string;
  referenceType?: string;
}): Promise<void> {
  try {
    await dispatchNotification({
      tenantId: notice.tenantId,
      recipientId: null,
      recipientType: "admin",
      type: "membership",
      title: notice.title,
      body: notice.body,
      referenceId: notice.referenceId,
      referenceType: notice.referenceType,
    });
  } catch (error) {
    console.error("membership admin notification failed", error);
  }
}
