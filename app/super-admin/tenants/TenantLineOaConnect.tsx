"use client";

import { useActionState, useState } from "react";
import { MessageCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { connectTenantLineOa, type ConnectState } from "./actions";

// ปุ่ม + ฟอร์มให้ทีม SportHub เชื่อม LINE OA ให้สนาม (โผล่ในหน้า super-admin/tenants)
export function TenantLineOaConnect({
  tenantId,
  connected,
  webhookBase,
}: {
  tenantId: string;
  connected: boolean;
  webhookBase: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ConnectState, FormData>(
    connectTenantLineOa,
    {},
  );

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant={connected ? "secondary" : "primary"}
        onClick={() => setOpen((o) => !o)}
      >
        <MessageCircle className="h-4 w-4" />
        {connected ? "แก้ไข LINE OA" : "เชื่อม LINE OA"}
      </Button>

      {open && (
        <form
          action={action}
          className="flex flex-col gap-3 rounded-sm bg-surface p-4 shadow-sm ring-1 ring-inset ring-line"
        >
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium text-ink">เชื่อม LINE OA ให้สนามนี้</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="ปิด">
              <X className="h-4 w-4 text-ink-soft" />
            </button>
          </div>
          <input type="hidden" name="tenantId" value={tenantId} />
          <Input label="Channel Access Token" name="channel_access_token" required />
          <Input label="Channel Secret" name="channel_secret" required />
          <Input label="ลิงก์เพิ่มเพื่อน OA (ไม่บังคับ)" name="oa_friend_url" />
          <p className="rounded-sm bg-brand-soft/40 px-3 py-2 font-mono text-mono-sm text-ink-soft">
            Webhook URL: {webhookBase}/api/line/webhook/{tenantId}
          </p>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "กำลังบันทึก…" : "บันทึกการเชื่อมต่อ"}
            </Button>
            {state.error && <span className="text-body-sm text-danger">{state.error}</span>}
            {state.success && (
              <span className="flex items-center gap-1.5 text-body-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                เชื่อมต่อแล้ว
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
