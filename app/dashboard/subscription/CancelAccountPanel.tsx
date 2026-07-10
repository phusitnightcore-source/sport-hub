"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cancelTenantAccount } from "./offboarding-actions";

// Offboarding (§32): ยกเลิกบัญชี → มีเวลา Export ข้อมูล 30 วัน แล้วลบถาวร
export function CancelAccountPanel({
  pendingDelete,
  hardDeleteAfter,
}: {
  pendingDelete: boolean;
  hardDeleteAfter: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (pendingDelete) {
    return (
      <div className="card-floating flex flex-col gap-2 p-6">
        <h2 className="text-body font-medium text-danger">บัญชีอยู่ระหว่างรอลบถาวร</h2>
        <p className="text-body-sm text-ink-soft">
          ข้อมูลทั้งหมดจะถูกลบถาวรวันที่{" "}
          {hardDeleteAfter ? hardDeleteAfter.slice(0, 10) : "-"} — Export
          ข้อมูลที่ต้องการก่อนถึงวันดังกล่าว (หน้ารายงาน) หรือติดต่อทีมงานเพื่อยกเลิกคำขอ
        </p>
      </div>
    );
  }

  return (
    <div className="card-floating flex flex-col gap-3 p-6">
      <h2 className="text-body font-medium text-ink">ยกเลิกบัญชีสนาม</h2>
      <p className="text-body-sm text-ink-soft">
        เมื่อยกเลิก คุณมีเวลา 30 วันในการ Export ข้อมูลทั้งหมด หลังจากนั้นข้อมูลสนาม
        สมาชิก การจอง และไฟล์ทั้งหมดจะถูกลบถาวร (§PDPA 6.4)
      </p>
      {confirming ? (
        <div className="flex gap-3">
          <Button
            variant="danger"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await cancelTenantAccount();
              if (res.error) {
                setError(res.error);
                setBusy(false);
                setConfirming(false);
                return;
              }
              router.refresh();
            }}
          >
            {busy ? "กำลังดำเนินการ..." : "ยืนยันยกเลิกบัญชี"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
            กลับ
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="self-start text-danger"
          onClick={() => setConfirming(true)}
        >
          ต้องการยกเลิกบัญชี...
        </Button>
      )}
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
