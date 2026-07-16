"use client";

import { useState } from "react";
import { Send, CheckCircle2, Type } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";
import { sendBroadcast } from "./actions";

export function BroadcastForm({ memberCount }: { memberCount: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ error?: string; sent?: number } | null>(null);

  async function send() {
    const r = await sendBroadcast(title, body);
    setResult(r);
    if (!r.error) {
      setTitle("");
      setBody("");
    }
  }

  const disabled = title.trim().length < 2 || body.trim().length < 2;

  return (
    <div className="card-floating flex flex-col gap-4 p-6">
      <p className="text-body-sm text-ink-soft">
        ส่งข้อความถึงสมาชิก <strong>{memberCount}</strong> คน (เฉพาะคนที่ยินยอมรับข่าวสาร) —
        ส่งผ่าน LINE/อีเมล/ในแอปตามที่ผูกไว้
      </p>
      <Input
        label="หัวข้อ"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        icon={<Type />}
        maxLength={100}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium text-ink">ข้อความ</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="เช่น โปรโมชั่นเดือนนี้ ต่ออายุสมาชิกลด 20%…"
          className="w-full rounded-sm bg-surface px-4 py-3 text-body text-ink shadow-sm outline-none ring-1 ring-inset ring-line transition-all focus:shadow-md focus:ring-2 focus:ring-brand"
        />
      </label>

      {result?.error && <p className="text-body-sm text-danger">{result.error}</p>}
      {result?.sent != null && (
        <p className="flex items-center gap-1.5 text-body-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          ส่งแล้ว {result.sent} คน
        </p>
      )}

      <div>
        <ConfirmButton
          onConfirm={send}
          title={`ส่ง Broadcast ถึงสมาชิก ${memberCount} คน?`}
          message="ยืนยันส่งข้อความหาสมาชิกทั้งหมดที่ยินยอมรับข่าวสาร — ส่งแล้วยกเลิกไม่ได้"
          confirmLabel="ส่งเลย"
          tone="brand"
          triggerVariant="primary"
          disabled={disabled}
        >
          <Send className="h-4 w-4" />
          ส่ง Broadcast
        </ConfirmButton>
      </div>
    </div>
  );
}
