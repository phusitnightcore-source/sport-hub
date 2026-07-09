"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

// ปุ่มยืนยัน "ได้รับยอดโอนแล้ว" — เปิดแพลนให้สนามทันที (§11.2)
export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/super/invoices/${invoiceId}/mark-paid`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "เกิดข้อผิดพลาด");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={markPaid} disabled={busy}>
        {busy ? "กำลังบันทึก..." : "ยืนยันรับชำระ"}
      </Button>
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
