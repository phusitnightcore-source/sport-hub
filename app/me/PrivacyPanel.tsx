"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, BellOff, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";
import { toggleBroadcastOptOut, requestErasure } from "./actions";

// จัดการข้อมูลส่วนตัว (PDPA §6.5) — Export CSV / Opt-out Broadcast / ขอลบบัญชี
export function PrivacyPanel({ optOut }: { optOut: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onToggle() {
    setBusy(true);
    await toggleBroadcastOptOut();
    router.refresh();
    setBusy(false);
  }

  async function onErase() {
    const res = await requestErasure();
    setMsg(
      res.success
        ? "ส่งคำขอลบบัญชีแล้ว สนามจะดำเนินการภายใน 30 วันตามกฎหมาย"
        : res.error ?? "เกิดข้อผิดพลาด",
    );
  }

  return (
    <div className="card-floating flex flex-col gap-3 p-6">
      <h2 className="text-body font-medium text-ink">จัดการข้อมูลส่วนตัว (PDPA)</h2>
      <div className="flex flex-wrap gap-2">
        <a href="/api/me/export">
          <Button size="sm" variant="secondary">
            <Download aria-hidden className="h-4 w-4" />
            ดาวน์โหลดข้อมูลของฉัน (CSV)
          </Button>
        </a>
        <Button size="sm" variant="secondary" onClick={onToggle} disabled={busy}>
          {optOut ? (
            <>
              <Bell aria-hidden className="h-4 w-4" /> เปิดรับข่าวสาร
            </>
          ) : (
            <>
              <BellOff aria-hidden className="h-4 w-4" /> ไม่รับข่าวสาร/โปรโมชั่น
            </>
          )}
        </Button>
        <ConfirmButton
          onConfirm={onErase}
          title="ขอลบบัญชีถาวร?"
          message="สนามจะดำเนินการลบข้อมูลของคุณภายใน 30 วันตามกฎหมาย PDPA — การกระทำนี้ย้อนกลับไม่ได้"
          confirmLabel="ยืนยันส่งคำขอลบบัญชี"
          tone="danger"
          triggerVariant="secondary"
          triggerSize="sm"
          triggerClassName="text-danger"
          disabled={busy}
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          ขอลบบัญชี
        </ConfirmButton>
      </div>
      {msg && <p className="text-body-sm text-ink-soft">{msg}</p>}
    </div>
  );
}
