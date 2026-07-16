"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";

// ปุ่มยืนยัน "ได้รับยอดโอนแล้ว" — เปิดแพลนให้สนามทันที (§11.2)
export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    setError(null);
    const res = await fetch(`/api/super/invoices/${invoiceId}/mark-paid`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "เกิดข้อผิดพลาด");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmButton
        onConfirm={markPaid}
        title="ยืนยันรับชำระ Invoice นี้?"
        message="ระบบจะเปิดแพลนให้สนามทันที — ตรวจสอบยอดโอนให้แน่ใจก่อน"
        confirmLabel="ยืนยันรับชำระ"
        tone="brand"
        triggerVariant="primary"
        triggerSize="sm"
      >
        ยืนยันรับชำระ
      </ConfirmButton>
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
