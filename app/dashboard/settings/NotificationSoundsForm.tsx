"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { playNotificationSound, type NotifSoundType } from "@/lib/sounds";
import { saveNotificationSound, resetNotificationSound } from "./actions";

const ROWS: { type: NotifSoundType; label: string; hint: string }[] = [
  { type: "booking", label: "จองสนามใหม่", hint: "ค่าเริ่มต้น: โน้ตไล่ขึ้น 2 ตัว" },
  { type: "payment", label: "สลิป / ชำระเงิน", hint: "ค่าเริ่มต้น: จึ๊ง 2 ตัว (cha-ching)" },
  { type: "membership", label: "สมาชิก / คำขอ Freeze", hint: "ค่าเริ่มต้น: 3 โน้ตอบอุ่น" },
  { type: "promotion", label: "โปรโมชั่น / Broadcast", hint: "ค่าเริ่มต้น: กริ๊งโน้ตเดียว" },
  { type: "system", label: "ระบบทั่วไป", hint: "ค่าเริ่มต้น: โทนต่ำ" },
];

export function NotificationSoundsForm({
  custom,
}: {
  custom: Partial<Record<NotifSoundType, string>>;
}) {
  return (
    <section className="card-floating flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Volume2 className="h-5 w-5 text-brand" />
        <h2 className="font-display text-body-lg font-semibold text-ink">เสียงแจ้งเตือน</h2>
      </div>
      <p className="text-body-sm text-ink-soft">
        ตั้งเสียงแยกตามเหตุการณ์ — ค่าเริ่มต้นเป็นเสียงสังเคราะห์ในตัว
        อัปโหลดไฟล์เสียงของสนามเอง (MP3 / WAV / OGG ≤ 1 MB) เพื่อใช้แทนได้
      </p>
      <ul className="flex flex-col divide-y divide-line">
        {ROWS.map((r) => (
          <SoundRow key={r.type} row={r} customUrl={custom[r.type]} />
        ))}
      </ul>
      <p className="text-body-sm text-ink-soft">
        * เสียงจะเล่นได้หลังคลิกบนหน้าเว็บครั้งแรก (ข้อกำหนดของเบราว์เซอร์)
      </p>
    </section>
  );
}

function SoundRow({
  row,
  customUrl,
}: {
  row: { type: NotifSoundType; label: string; hint: string };
  customUrl?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // เล่นไฟล์ที่เพิ่งอัปได้ทันทีโดยไม่ต้องรอ refresh (เผื่อ dev/refresh ไม่เสถียร)
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);

  // URL ที่ใช้จริง: local (เพิ่งอัป) → signed จาก server → ไม่มี = ใช้ default
  const effectiveUrl = cleared ? undefined : localUrl ?? customUrl;

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("type", row.type);
    fd.set("sound", file);
    const res = await saveNotificationSound(fd);
    setBusy(false);
    if (res.success) {
      setLocalUrl(URL.createObjectURL(file)); // โชว์/เล่นได้ทันที
      setCleared(false);
      setFile(null);
      setMsg({ ok: true, text: "บันทึกเสียงแล้ว" });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.error ?? "ไม่สำเร็จ" });
    }
  }

  async function reset() {
    setBusy(true);
    const fd = new FormData();
    fd.set("type", row.type);
    await resetNotificationSound(fd);
    setBusy(false);
    setLocalUrl(null);
    setCleared(true);
    setMsg({ ok: true, text: "คืนค่าเริ่มต้นแล้ว" });
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-body font-medium text-ink">{row.label}</span>
          {effectiveUrl && (
            <StatusPill tone="success" className="ml-2">
              เสียงของสนาม
            </StatusPill>
          )}
          <p className="text-body-sm text-ink-soft">{row.hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => playNotificationSound(row.type, effectiveUrl)}
          >
            <Play className="h-4 w-4" />
            ทดลองฟัง
          </Button>
          {effectiveUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={busy}
              className="text-danger"
            >
              <RotateCcw className="h-4 w-4" />
              คืนค่าเริ่มต้น
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="flex-1 text-body-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-1.5 file:text-brand"
        />
        <Button type="button" size="sm" onClick={upload} disabled={busy || !file}>
          <Upload className="h-4 w-4" />
          {busy ? "กำลังอัปโหลด…" : "อัปโหลด"}
        </Button>
        {msg && (
          <span className={`text-body-sm ${msg.ok ? "text-success" : "text-danger"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </li>
  );
}
