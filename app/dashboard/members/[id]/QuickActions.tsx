"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";
import { updateMemberStatus } from "./actions";
import type { Database } from "@/lib/supabase/types";
import { CheckCircle, PauseCircle, XCircle } from "lucide-react";

type MemberStatus = Database["public"]["Enums"]["member_status"];

export function QuickActions({
  memberId,
  currentStatus,
}: {
  memberId: string;
  currentStatus: MemberStatus;
}) {
  const [busy, setBusy] = useState(false);

  async function handleStatusChange(status: MemberStatus) {
    setBusy(true);
    await updateMemberStatus(memberId, status);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus !== "active" && (
        <Button
          variant="secondary"
          onClick={() => handleStatusChange("active")}
          disabled={busy}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" /> ปรับเป็น Active
        </Button>
      )}

      {currentStatus !== "frozen" && (
        <ConfirmButton
          onConfirm={() => handleStatusChange("frozen")}
          title="ระงับสมาชิกชั่วคราว?"
          message="สมาชิกจะเช็คอิน/ใช้สิทธิ์ไม่ได้จนกว่าจะเลิกระงับ"
          confirmLabel="ระงับชั่วคราว"
          tone="brand"
          triggerVariant="secondary"
          triggerSize="md"
          triggerClassName="flex items-center gap-2"
          disabled={busy}
        >
          <PauseCircle className="h-4 w-4" /> ระงับชั่วคราว (Freeze)
        </ConfirmButton>
      )}

      {currentStatus !== "expired" && (
        <ConfirmButton
          onConfirm={() => handleStatusChange("expired")}
          title="ยกเลิก/หมดอายุสมาชิก?"
          message="สมาชิกจะถูกตั้งเป็นหมดอายุและใช้บริการไม่ได้"
          confirmLabel="ยืนยันยกเลิก/หมดอายุ"
          tone="danger"
          triggerVariant="danger"
          triggerSize="md"
          triggerClassName="flex items-center gap-2"
          disabled={busy}
        >
          <XCircle className="h-4 w-4" /> ยกเลิก/หมดอายุ
        </ConfirmButton>
      )}
    </div>
  );
}
