"use client";

import { useState } from "react";
import { MessageCircle, Check, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";
import { disconnectLine } from "./actions";

export function LineConnection({
  connected,
  enabled,
}: {
  connected: boolean;
  enabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect() {
    setError(null);
    const res = await disconnectLine();
    if (!res.success) setError(res.error ?? "ยกเลิกไม่สำเร็จ");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle aria-hidden className="h-5 w-5 text-[#06C755]" />
          <span className="text-body font-medium text-ink">บัญชี LINE</span>
        </div>
        {connected && (
          <StatusPill tone="success">
            <Check className="h-3.5 w-3.5" />
            เชื่อมต่อแล้ว
          </StatusPill>
        )}
      </div>

      {connected ? (
        <>
          <p className="text-body-sm text-ink-soft">
            คุณจะได้รับแจ้งเตือนการจอง/สมาชิกทาง LINE
          </p>
          <ConfirmButton
            onConfirm={handleDisconnect}
            title="ยกเลิกการเชื่อมต่อ LINE?"
            message="คุณจะไม่ได้รับแจ้งเตือนทาง LINE อีก จนกว่าจะเชื่อมต่อใหม่"
            confirmLabel="ยกเลิกการเชื่อมต่อ"
            tone="danger"
            triggerVariant="ghost"
            triggerSize="sm"
            triggerClassName="self-start text-danger"
          >
            <Unlink className="h-4 w-4" />
            ยกเลิกการเชื่อมต่อ
          </ConfirmButton>
        </>
      ) : enabled ? (
        <>
          <p className="text-body-sm text-ink-soft">
            เชื่อมต่อ LINE เพื่อรับแจ้งเตือนและเข้าใช้งานได้เร็วขึ้น
          </p>
          <a href="/api/auth/line/start?mode=link" className="self-start">
            <Button variant="secondary" size="sm">
              <MessageCircle className="h-4 w-4" />
              เชื่อมต่อกับ LINE
            </Button>
          </a>
        </>
      ) : (
        <p className="text-body-sm text-ink-soft">
          ระบบยังไม่ได้เปิดใช้งานการเชื่อมต่อ LINE
        </p>
      )}

      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
