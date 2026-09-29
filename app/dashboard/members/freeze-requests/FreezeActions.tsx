"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { processFreezeRequest } from "./actions";

export function FreezeActions({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "approve" | "reject") {
    const reason = action === "reject" ? window.prompt("เหตุผลที่ไม่อนุมัติ:") : undefined;
    if (action === "reject" && !reason) return;

    setLoading(true);
    const res = await processFreezeRequest(requestId, action, reason || undefined);
    
    if (!res.success) {
      alert(res.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={loading}
        onClick={() => handleAction("reject")}
        className="text-danger hover:bg-danger-soft hover:text-danger"
      >
        ปฏิเสธ
      </Button>
      <Button
        variant="primary"
        size="sm"
        disabled={loading}
        onClick={() => handleAction("approve")}
      >
        อนุมัติ
      </Button>
    </div>
  );
}
