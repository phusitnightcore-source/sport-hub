"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

// ยืนยัน "โอนคืนแล้ว" + แนบหลักฐาน (§9.4 ขั้น 4)
export function RefundConfirm({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setBusy(true);
    const form = new FormData();
    const file = fileRef.current?.files?.[0];
    if (file) form.set("evidence", file);
    const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
      method: "POST",
      body: form,
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
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="หลักฐานการโอนคืน"
          className="w-40 text-body-sm text-ink-soft file:mr-2 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-body-sm file:text-brand"
        />
        <Button size="sm" onClick={confirm} disabled={busy}>
          {busy ? "กำลังบันทึก..." : "โอนคืนแล้ว"}
        </Button>
      </div>
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
