"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState } from "react";
import { Upload, Trash2, QrCode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmit } from "@/components/ui/ConfirmDialog";
import { savePromptpayQr, removePromptpayQr, type SettingsState } from "./actions";

const SECONDARY_DANGER_BTN =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-fast active:scale-[0.97] bg-surface text-danger shadow-sm hover:shadow-md hover:-translate-y-px px-4 py-1.5 text-body-sm";

export function PromptpayQrUploader({ currentQr }: { currentQr: string | null }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    savePromptpayQr,
    {},
  );

  return (
    <section className="card-floating flex flex-col gap-4 p-6">
      <div>
        <h2 className="font-display text-body-lg font-semibold text-ink">
          รูป QR PromptPay (ทางเลือก)
        </h2>
        <p className="text-body-sm text-ink-soft">
          อัปโหลด QR สำเร็จรูปของสนาม (เช่น QR ร้านค้าจากแอปธนาคาร) ลูกค้าจะสแกนรูปนี้แทน
          — ถ้าไม่อัปโหลด ระบบจะสร้าง QR จากเลขพร้อมเพย์ให้อัตโนมัติ
        </p>
      </div>

      {currentQr ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={currentQr}
            alt="QR PromptPay ปัจจุบัน"
            width={200}
            height={200}
            className="rounded-sm ring-1 ring-inset ring-line"
          />
          <ConfirmSubmit
            action={removePromptpayQr}
            title="ลบรูป QR ที่อัปโหลด?"
            message="ระบบจะกลับไปสร้าง QR จากเลขพร้อมเพย์ให้อัตโนมัติ"
            confirmLabel="ลบรูป"
            triggerClassName={SECONDARY_DANGER_BTN}
          >
            <Trash2 className="h-4 w-4" />
            ลบรูป QR (กลับไปใช้ QR อัตโนมัติ)
          </ConfirmSubmit>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-sm bg-brand-soft/40 p-6 text-center">
          <QrCode className="h-10 w-10 text-ink-soft" />
          <p className="text-body-sm text-ink-soft">ยังไม่มีรูป QR ที่อัปโหลด</p>
        </div>
      )}

      <form action={action} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="qr"
          accept="image/png,image/jpeg,image/webp"
          required
          className="flex-1 text-body-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-1.5 file:text-brand"
        />
        <Button type="submit" size="sm" disabled={pending}>
          <Upload className="h-4 w-4" />
          {pending ? "กำลังอัปโหลด…" : "อัปโหลด QR"}
        </Button>
        {state.error && <p className="w-full text-body-sm text-danger">{state.error}</p>}
        {state.success && (
          <p className="flex w-full items-center gap-1.5 text-body-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            บันทึกรูป QR แล้ว
          </p>
        )}
      </form>
    </section>
  );
}
