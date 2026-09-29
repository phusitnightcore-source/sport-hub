"use server";

import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { notifyMemberSafely } from "@/lib/membership/notifications";

export async function processFreezeRequest(
  requestId: string,
  action: "approve" | "reject",
  rejectReason?: string
) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  
  // Get request details
  const { data: request, error: reqError } = await supabase
    .from("freeze_requests")
    .select("*, members(*)")
    .eq("id", requestId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (reqError || !request) return { success: false, error: "ไม่พบคำขอ" };
  if (request.status !== "pending") return { success: false, error: "คำขอนี้ถูกจัดการไปแล้ว" };

  if (action === "reject") {
    const { error } = await supabase
      .from("freeze_requests")
      .update({
        status: "rejected",
        reject_reason: rejectReason || "ไม่อนุมัติ",
        reviewed_by: ctx.staffId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (error) return { success: false, error: error.message };

    await logAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: "reject_freeze",
      module: "members",
      referenceId: requestId,
    });
  } else {
    // Approve
    const { error: freezeError } = await supabase
      .from("freeze_requests")
      .update({
        status: "approved",
        reviewed_by: ctx.staffId,
        reviewed_at: new Date().toISOString(),
        freeze_start: new Date().toISOString().split("T")[0],
      })
      .eq("id", requestId);
      
    if (freezeError) return { success: false, error: freezeError.message };

    // Update member status — เก็บ original_end_date ครั้งแรกที่ freeze (§8.3)
    const { error: memberError } = await supabase
      .from("members")
      .update({
        status: "frozen",
        freeze_start_date: new Date().toISOString().split("T")[0],
        freeze_count: (request.members?.freeze_count ?? 0) + 1,
        original_end_date:
          request.members?.original_end_date ?? request.members?.end_date,
      })
      .eq("id", request.member_id);

    if (memberError) return { success: false, error: memberError.message };

    await logAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: "approve_freeze",
      module: "members",
      referenceId: requestId,
    });
  }

  await notifyMemberSafely({
    tenantId: ctx.tenantId,
    memberId: request.member_id,
    title: action === "approve" ? "อนุมัติการระงับสมาชิกแล้ว" : "คำขอระงับสมาชิกไม่ได้รับอนุมัติ",
    body: action === "approve"
      ? "สนามอนุมัติคำขอ Freeze แล้ว อายุสมาชิกจะหยุดนับจนกว่าคุณจะกลับมาเปิดใช้งาน"
      : `เหตุผล: ${rejectReason || "ไม่อนุมัติ"}`,
    referenceId: requestId,
    referenceType: "freeze_request",
  });

  revalidatePath("/dashboard/members/freeze-requests");
  revalidatePath("/dashboard/members");
  return { success: true };
}
