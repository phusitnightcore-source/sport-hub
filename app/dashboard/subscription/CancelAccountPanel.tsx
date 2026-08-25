"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";
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
      <ConfirmButton
        onConfirm={async () => {
          setError(null);
          const res = await cancelTenantAccount();
          if (res.error) {
            setError(res.error);
            return;
          }
          router.refresh();
        }}
        title="ยกเลิกบัญชีสนาม?"
        message="ข้อมูลสนาม สมาชิก การจอง และไฟล์ทั้งหมดจะถูกลบถาวรหลังพ้น 30 วัน — ยืนยันการยกเลิกบัญชีหรือไม่?"
        confirmLabel="ยืนยันยกเลิกบัญชี"
        tone="danger"
        triggerVariant="secondary"
        triggerSize="sm"
        triggerClassName="self-start text-danger"
      >
        ต้องการยกเลิกบัญชี...
      </ConfirmButton>
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
