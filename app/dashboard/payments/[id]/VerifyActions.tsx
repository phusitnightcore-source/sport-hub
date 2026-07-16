"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";

// ปุ่มยืนยัน/ปฏิเสธสลิป — ปฏิเสธต้องระบุเหตุผลเสมอ (§9.4)
export function VerifyActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(body: { action: "approve" } | { action: "reject"; reason: string }) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/payments/${paymentId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setBusy(false);
      return;
    }
    router.push("/dashboard/payments");
    router.refresh();
  }

  return (
    <div className="card-floating flex flex-col gap-4 p-6">
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-3">
          <ConfirmButton
            onConfirm={() => submit({ action: "approve" })}
            title="ยืนยันสลิปนี้?"
            message="ยืนยันแล้วการจอง/สมาชิกจะถูกยืนยันและออกใบเสร็จให้ทันที"
            confirmLabel="ยืนยันสลิป"
            tone="brand"
            triggerVariant="primary"
            triggerClassName="flex-1"
            disabled={busy}
          >
            {busy ? "กำลังบันทึก..." : "ยืนยันสลิป"}
          </ConfirmButton>
          <Button
            variant="danger"
            onClick={() => setMode("rejecting")}
            disabled={busy}
            className="flex-1"
          >
            ปฏิเสธ
          </Button>
        </div>
      ) : (
        <>
          <label htmlFor="reject-reason" className="text-body-sm font-medium text-ink">
            เหตุผลที่ปฏิเสธ (เช่น ยอดไม่ตรง / สลิปไม่ชัด / ชื่อผู้โอนไม่ตรง / สลิปซ้ำ)
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="rounded-sm bg-surface px-4 py-2.5 text-body text-ink shadow-sm outline-none transition-shadow duration-fast placeholder:text-ink-soft focus:shadow-md focus:ring-2 focus:ring-brand"
            placeholder="ระบุเหตุผลให้ลูกค้าทราบ"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              onClick={() => submit({ action: "reject", reason: reason.trim() })}
              disabled={busy || reason.trim().length < 2}
              className="flex-1"
            >
              {busy ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setMode("idle")}
              disabled={busy}
              className="flex-1"
            >
              ย้อนกลับ
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
