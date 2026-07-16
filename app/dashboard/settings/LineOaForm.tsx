"use client";

import { useActionState } from "react";
import { MessageCircle, Save, Unlink, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { ConfirmSubmit } from "@/components/ui/ConfirmDialog";
import { saveLineOa, disconnectLineOa, type SettingsState } from "./actions";

const SECONDARY_DANGER_BTN =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-fast active:scale-[0.97] bg-surface text-danger shadow-sm hover:shadow-md hover:-translate-y-px px-4 py-1.5 text-body-sm";

export function LineOaForm({
  connected,
  tokenLast4,
  friendUrl,
  webhookUrl,
}: {
  connected: boolean;
  tokenLast4?: string;
  friendUrl?: string;
  webhookUrl: string;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    saveLineOa,
    {},
  );

  return (
    <section className="card-floating flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-brand" />
          <h2 className="font-display text-body-lg font-semibold text-ink">
            เชื่อมต่อ LINE OA
          </h2>
        </div>
        <StatusPill tone={connected ? "success" : "warning"}>
          {connected ? "เชื่อมแล้ว" : "ยังไม่เชื่อม"}
        </StatusPill>
      </div>

      <p className="text-body-sm text-ink-soft">
        วาง <strong>Channel Access Token</strong> + <strong>Channel Secret</strong> จาก
        LINE Developers Console (Messaging API ของ OA สนามคุณ) — ระบบจะส่งแจ้งเตือนจาก OA
        ของคุณเอง
        {connected && tokenLast4 ? ` · Token ปัจจุบัน ••••${tokenLast4}` : ""}
      </p>

      <form action={action} className="flex flex-col gap-4">
        <Input
          label="Channel Access Token"
          name="channel_access_token"
          type="password"
          autoComplete="off"
          placeholder={connected ? "กรอกใหม่เพื่อเปลี่ยน (เว้นว่าง = ใช้ของเดิม)" : "วาง token ที่นี่"}
        />
        <Input
          label="Channel Secret"
          name="channel_secret"
          type="password"
          autoComplete="off"
          placeholder={connected ? "เว้นว่าง = ใช้ของเดิม" : "วาง secret ที่นี่"}
        />
        <Input
          label="ลิงก์เพิ่มเพื่อน OA (ไม่บังคับ)"
          name="oa_friend_url"
          defaultValue={friendUrl ?? ""}
          placeholder="https://lin.ee/xxxxx"
        />

        {state.error && <p className="text-body-sm text-danger">{state.error}</p>}
        {state.success && (
          <p className="flex items-center gap-1.5 text-body-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            บันทึก & เชื่อมต่อแล้ว
          </p>
        )}

        <div>
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? "กำลังบันทึก…" : "บันทึก & เชื่อมต่อ"}
          </Button>
        </div>
      </form>

      {connected && (
        <ConfirmSubmit
          action={disconnectLineOa}
          title="ตัดการเชื่อมต่อ LINE OA?"
          message="ระบบจะหยุดส่งแจ้งเตือนจาก OA ของสนาม จนกว่าจะเชื่อมใหม่"
          confirmLabel="ตัดการเชื่อมต่อ"
          triggerClassName={SECONDARY_DANGER_BTN}
        >
          <Unlink className="h-4 w-4" />
          ตัดการเชื่อมต่อ
        </ConfirmSubmit>
      )}

      {/* Webhook URL — copy ไปวางใน LINE Console เพื่อเก็บ userId ลูกค้าอัตโนมัติ */}
      <div className="flex flex-col gap-1.5 border-t border-line pt-4">
        <label className="text-body-sm font-medium text-ink">
          Webhook URL (วางในช่อง Webhook URL ของ LINE Console แล้วเปิด &quot;Use webhook&quot;)
        </label>
        <input
          readOnly
          value={webhookUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-sm bg-brand-soft/40 px-4 py-2.5 font-mono text-mono-sm text-ink ring-1 ring-inset ring-line"
        />
        <span className="text-body-sm text-ink-soft">
          เมื่อลูกค้าแอด OA เป็นเพื่อนแล้วพิมพ์เบอร์ที่สมัคร ระบบจะผูก LINE ให้อัตโนมัติ
          แล้วส่งแจ้งเตือนการจอง/สมาชิกได้ทันที
        </span>
      </div>
    </section>
  );
}
