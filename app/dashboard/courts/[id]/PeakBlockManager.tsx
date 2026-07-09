"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import {
  addPeakWindow,
  deletePeakWindow,
  addBlock,
  deleteBlock,
} from "../actions";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

type Peak = { id: string; day_of_week: number; start_time: string; end_time: string };
type Block = {
  id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  note: string | null;
};

export function PeakBlockManager({
  courtId,
  isAdmin,
  peaks,
  blocks,
  minDate,
}: {
  courtId: string;
  isAdmin: boolean;
  peaks: Peak[];
  blocks: Block[];
  minDate: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // peak form
  const [pDay, setPDay] = useState(1);
  const [pStart, setPStart] = useState("17:00");
  const [pEnd, setPEnd] = useState("21:00");
  // block form
  const [bDate, setBDate] = useState(minDate);
  const [bStart, setBStart] = useState("08:00");
  const [bEnd, setBEnd] = useState("22:00");
  const [bReason, setBReason] = useState("maintenance");
  const [bNote, setBNote] = useState("");

  async function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setBusy(true);
    setErr(null);
    const res = await fn();
    if (res.error) setErr(res.error);
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Peak windows */}
      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">ช่วงราคา Peak</h2>
        {peaks.length === 0 ? (
          <p className="text-body-sm text-ink-soft">ยังไม่มีช่วง Peak</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {peaks.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="text-body-sm text-ink">
                  {DAYS[p.day_of_week]} {p.start_time.slice(0, 5)}–{p.end_time.slice(0, 5)}
                </span>
                {isAdmin && (
                  <IconButton
                    variant="surface"
                    size="sm"
                    aria-label="ลบช่วง Peak"
                    onClick={() => run(() => deletePeakWindow(p.id, courtId))}
                    disabled={busy}
                  >
                    <Trash2 />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
            <select
              value={pDay}
              onChange={(e) => setPDay(Number(e.target.value))}
              className="rounded-sm bg-surface px-3 py-2 text-body-sm shadow-sm outline-none focus:ring-2 focus:ring-brand"
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={pStart}
              onChange={(e) => setPStart(e.target.value)}
              className="rounded-sm bg-surface px-3 py-2 text-body-sm shadow-sm outline-none focus:ring-2 focus:ring-brand"
            />
            <input
              type="time"
              value={pEnd}
              onChange={(e) => setPEnd(e.target.value)}
              className="rounded-sm bg-surface px-3 py-2 text-body-sm shadow-sm outline-none focus:ring-2 focus:ring-brand"
            />
            <Button
              size="sm"
              onClick={() => run(() => addPeakWindow(courtId, pDay, pStart, pEnd))}
              disabled={busy}
            >
              เพิ่ม
            </Button>
          </div>
        )}
      </div>

      {/* Block schedules */}
      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">บล็อกเวลา / ปิดชั่วคราว</h2>
        {blocks.length === 0 ? (
          <p className="text-body-sm text-ink-soft">ไม่มีการบล็อกที่จะถึง</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <span className="text-body-sm text-ink">
                  {b.block_date} {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}{" "}
                  <span className="text-ink-soft">({b.reason})</span>
                </span>
                <IconButton
                  variant="surface"
                  size="sm"
                  aria-label="ลบการบล็อก"
                  onClick={() => run(() => deleteBlock(b.id, courtId))}
                  disabled={busy}
                >
                  <Trash2 />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <input
            type="date"
            value={bDate}
            min={minDate}
            onChange={(e) => setBDate(e.target.value)}
            className="rounded-sm bg-surface px-3 py-2 text-body-sm shadow-sm outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            type="time"
            value={bStart}
            onChange={(e) => setBStart(e.target.value)}
            className="rounded-sm bg-surface px-3 py-2 text-body-sm shadow-sm outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            type="time"
            value={bEnd}
            onChange={(e) => setBEnd(e.target.value)}
            className="rounded-sm bg-surface px-3 py-2 text-body-sm shadow-sm outline-none focus:ring-2 focus:ring-brand"
          />
          <select
            value={bReason}
            onChange={(e) => setBReason(e.target.value)}
            className="rounded-sm bg-surface px-3 py-2 text-body-sm shadow-sm outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="maintenance">ซ่อมบำรุง</option>
            <option value="vip">จอง VIP</option>
            <option value="other">อื่นๆ</option>
          </select>
          <input
            type="text"
            value={bNote}
            onChange={(e) => setBNote(e.target.value)}
            placeholder="หมายเหตุ (ไม่บังคับ)"
            className="min-w-32 flex-1 rounded-sm bg-surface px-3 py-2 text-body-sm shadow-sm outline-none placeholder:text-ink-soft focus:ring-2 focus:ring-brand"
          />
          <Button
            size="sm"
            onClick={() => run(() => addBlock(courtId, bDate, bStart, bEnd, bReason, bNote))}
            disabled={busy}
          >
            บล็อก
          </Button>
        </div>
      </div>

      {err && <p className="text-body-sm text-danger lg:col-span-2">{err}</p>}
    </div>
  );
}
