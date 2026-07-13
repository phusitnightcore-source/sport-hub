"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, StickyNote, Banknote, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
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
  const [todayStr] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
  );
  const [date, setDate] = useState(todayStr);
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
      <Select
        name="courtId"
        label="สนาม"
        value={courtId}
        onChange={(v) => { setCourtId(v); setStart(""); }}
        options={courts.map((c) => ({ value: c.id, label: c.label }))}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <DatePicker
          name="date"
          label="วันที่"
          value={date}
          onChange={setDate}
          min={todayStr}
        />
        <Select
          name="startTime"
          label="เวลาเริ่ม"
          value={start}
          onChange={setStart}
          placeholder="เลือกเวลา"
          options={startOptions.map((t) => ({ value: t, label: t }))}
        />
        <Select
          name="hours"
          label="จำนวนชั่วโมง"
          value={String(hours)}
          onChange={(v) => setHours(Number(v))}
          options={[1, 2, 3, 4].map((h) => ({ value: String(h), label: `${h} ชั่วโมง` }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="ชื่อลูกค้า" name="userName" required minLength={2} icon={<User />} />
        <Input
          label="เบอร์โทร"
          name="userPhone"
          type="tel"
          required
          pattern="0[0-9]{8,9}"
          placeholder="08XXXXXXXX"
          icon={<Phone />}
        />
      </div>
      <Input label="หมายเหตุ (ถ้ามี)" name="note" icon={<StickyNote />} />

      <div className="flex flex-col gap-2">
        <label className="text-body-sm font-medium text-ink">วิธีรับชำระ</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { key: "walk_in_cash", label: "เงินสด", icon: Banknote },
            { key: "walk_in_transfer", label: "โอนเงิน", icon: Wallet },
          ] as const).map((m) => {
            const active = method === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={
                  "flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-body-sm font-medium shadow-sm transition-all duration-fast " +
                  (active
                    ? "bg-brand text-white ring-2 ring-brand"
                    : "bg-surface text-ink ring-1 ring-inset ring-line hover:ring-brand/40")
                }
              >
                <m.icon className="h-[18px] w-[18px]" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy || !start}>
        {busy ? "กำลังจอง..." : "ยืนยันการจอง (รับเงินแล้ว)"}
      </Button>
    </form>
  );
}
