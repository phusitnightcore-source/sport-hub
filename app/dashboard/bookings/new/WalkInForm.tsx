"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createWalkInBooking } from "./actions";

type CourtOpt = { id: string; label: string; openTime: string; closeTime: string };

function hourRange(open: string, close: string): string[] {
  const out: string[] = [];
  for (let h = parseInt(open, 10); h < parseInt(close, 10); h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
  }
  return out;
}

export function WalkInForm({ courts }: { courts: CourtOpt[] }) {
  const router = useRouter();
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
  );
  const [start, setStart] = useState("");
  const [hours, setHours] = useState(1);
  const [method, setMethod] = useState<"walk_in_cash" | "walk_in_transfer">("walk_in_cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const court = courts.find((c) => c.id === courtId);
  const startOptions = useMemo(
    () => (court ? hourRange(court.openTime, court.closeTime) : []),
    [court],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!start) return setError("เลือกเวลาเริ่ม");
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const endH = parseInt(start, 10) + hours;
    const res = await createWalkInBooking({
      courtId,
      date,
      startTime: start,
      endTime: `${String(endH).padStart(2, "0")}:00`,
      userName: String(f.get("userName")),
      userPhone: String(f.get("userPhone")),
      method,
      note: String(f.get("note") ?? "").trim() || undefined,
    });
    if (res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    setDone(res.bookingCode!);
    setBusy(false);
  }

  if (done) {
    return (
      <div className="card-floating flex flex-col items-center gap-4 p-10 text-center">
        <h2 className="font-display text-display-md font-semibold text-success">
          จองสำเร็จ
        </h2>
        <p className="text-body text-ink">
          รหัสการจอง:{" "}
          <span className="font-mono text-body-lg font-bold text-brand">{done}</span>
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => { setDone(null); setStart(""); }}>
            จองรายการต่อไป
          </Button>
          <Button onClick={() => router.push("/dashboard/bookings")}>
            ไปหน้ารายการจอง
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card-floating flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <label className="text-body-sm font-medium text-ink">สนาม</label>
        <select
          value={courtId}
          onChange={(e) => { setCourtId(e.target.value); setStart(""); }}
          className="rounded-sm bg-surface px-4 py-2.5 text-body text-ink shadow-sm outline-none focus:ring-2 focus:ring-brand"
        >
          {courts.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink">วันที่</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-sm bg-surface px-4 py-2.5 text-body text-ink shadow-sm outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink">เวลาเริ่ม</label>
          <select
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-sm bg-surface px-4 py-2.5 text-body text-ink shadow-sm outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">-- เลือก --</option>
            {startOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink">จำนวนชั่วโมง</label>
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="rounded-sm bg-surface px-4 py-2.5 text-body text-ink shadow-sm outline-none focus:ring-2 focus:ring-brand"
          >
            {[1, 2, 3, 4].map((h) => (
              <option key={h} value={h}>{h} ชั่วโมง</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="ชื่อลูกค้า" name="userName" required minLength={2} />
        <Input
          label="เบอร์โทร"
          name="userPhone"
          type="tel"
          required
          pattern="0[0-9]{8,9}"
          placeholder="08XXXXXXXX"
        />
      </div>
      <Input label="หมายเหตุ (ถ้ามี)" name="note" />

      <div className="flex flex-col gap-2">
        <label className="text-body-sm font-medium text-ink">วิธีรับชำระ</label>
        <div className="flex gap-4 text-body-sm text-ink">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={method === "walk_in_cash"}
              onChange={() => setMethod("walk_in_cash")}
              className="accent-brand"
            />
            เงินสด
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={method === "walk_in_transfer"}
              onChange={() => setMethod("walk_in_transfer")}
              className="accent-brand"
            />
            โอนเงิน
          </label>
        </div>
      </div>

      {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy || !start}>
        {busy ? "กำลังจอง..." : "ยืนยันการจอง (รับเงินแล้ว)"}
      </Button>
    </form>
  );
}
