"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { updateMemberStatus } from "./actions";
import type { Database } from "@/lib/supabase/types";
import { CheckCircle, PauseCircle, XCircle } from "lucide-react";

type MemberStatus = Database["public"]["Enums"]["member_status"];

export function QuickActions({ 
  memberId, 
  currentStatus 
}: { 
  memberId: string, 
  currentStatus: MemberStatus 
}) {
  const [busy, setBusy] = useState(false);
  
  async function handleStatusChange(status: MemberStatus) {
    if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น ${status.toUpperCase()}?`)) return;
    setBusy(true);
    await updateMemberStatus(memberId, status);
    setBusy(false);
  }

  return (
    <div className="flex gap-2">
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
        <Button 
          variant="secondary" 
          onClick={() => handleStatusChange("frozen")}
          disabled={busy}
          className="flex items-center gap-2"
        >
          <PauseCircle className="h-4 w-4" /> ระงับชั่วคราว (Freeze)
        </Button>
      )}

      {currentStatus !== "expired" && (
        <Button 
          variant="danger" 
          onClick={() => handleStatusChange("expired")}
          disabled={busy}
          className="flex items-center gap-2"
        >
          <XCircle className="h-4 w-4" /> ยกเลิก/หมดอายุ
        </Button>
      )}
    </div>
  );
}
