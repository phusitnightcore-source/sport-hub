"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, StickyNote, Banknote, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { createWalkInBooking, createRecurringWalkIn } from "./actions";

type CourtOpt = { id: string; label: string; openTime: string; closeTime: string };

function hourRange(open: string, close: string): string[] {
  const out: string[] = [];
  for (let h = parseInt(open, 10); h < parseInt(close, 10); h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
  }
  return out;
}

export function WalkInForm({
  courts,
  defaultCourtId,
  defaultDate,
  defaultStart,
  canUsePos = false,
}: {
  courts: CourtOpt[];
  defaultCourtId?: string;
  defaultDate?: string;
  defaultStart?: string;
  canUsePos?: boolean;
}) {
  const router = useRouter();
  const [courtId, setCourtId] = useState(defaultCourtId ?? courts[0]?.id ?? "");
  const [todayStr] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
  );
  const [date, setDate] = useState(defaultDate ?? todayStr);
  const [start, setStart] = useState(defaultStart ?? "");
  const [hours, setHours] = useState(1);
  const [method, setMethod] = useState<"walk_in_cash" | "walk_in_transfer">("walk_in_cash");
  const [collectAtPos, setCollectAtPos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [summary, setSummary] = useState<{ created: string[]; conflicts: string[] } | null>(null);

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
    try {
    const f = new FormData(e.currentTarget);
    const endH = parseInt(start, 10) + hours;
    const input = {
      courtId,
      date,
      startTime: start,
      endTime: `${String(endH).padStart(2, "0")}:00`,
      userName: String(f.get("userName")),
      userPhone: String(f.get("userPhone")),
      method,
      collectAtPos,
      note: String(f.get("note") ?? "").trim() || undefined,
    };

    if (repeat) {
      const res = await createRecurringWalkIn(input, weeks);
      if (res.error) {
        setError(res.error);
        setBusy(false);
        return;
      }
      setSummary({ created: res.created ?? [], conflicts: res.conflicts ?? [] });
      setBusy(false);
      return;
    }

    const res = await createWalkInBooking(input);
    if (res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    if (res.collectAtPos) {
      router.push(`/pos?booking=${encodeURIComponent(res.bookingCode!)}&branch=${encodeURIComponent(res.branchId!)}`);
      return;
    }
    setDone(res.bookingCode!);
    } catch {
      setError("การเชื่อมต่อขัดข้อง กรุณาตรวจรายการจองก่อนลองซ้ำ");
    } finally { setBusy(false); }
  }

  if (summary) {
    return (
      <div className="card-floating flex flex-col items-center gap-4 p-10 text-center">
        <h2 className="font-display text-display-md font-semibold text-success">
          จองซ้ำสำเร็จ {summary.created.length} ครั้ง
        </h2>
        {summary.conflicts.length > 0 && (
          <p className="text-body-sm text-warning">
            ข้าม {summary.conflicts.length} วันที่ชนกับการจองอื่น: {summary.conflicts.join(", ")}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => { setSummary(null); setStart(""); setRepeat(false); }}>
            จองรายการต่อไป
          </Button>
          <Button onClick={() => router.push("/dashboard/bookings")}>
            ไปหน้ารายการจอง
          </Button>
        </div>
      </div>
    );
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
      <fieldset disabled={busy} className="contents">
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

      {canUsePos && <label className="flex items-start gap-3 rounded-xl border border-line bg-brand-soft p-4 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={collectAtPos} disabled={repeat} onChange={e => setCollectAtPos(e.target.checked)}/><span><strong>รับชำระพร้อมสินค้าใน POS</strong><span className="mt-1 block">กันสนาม 15 นาที แล้วย้ายไปเลือกสินค้าและรับชำระในใบเสร็จเดียว ยังไม่ถือว่ารับเงินแล้ว</span></span></label>}
      {!collectAtPos && <div className="flex flex-col gap-2">
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

      }
      {/* จองซ้ำรายสัปดาห์ (ทีมประจำ) */}
      <div className="flex flex-col gap-2 rounded-sm bg-brand-soft/30 p-4 ring-1 ring-inset ring-line">
        <label className="flex items-center gap-2 text-body-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={repeat}
            disabled={collectAtPos}
            onChange={(e) => setRepeat(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          จองซ้ำทุกสัปดาห์ (วัน/เวลาเดิม)
        </label>
        {repeat && (
          <div className="flex items-center gap-2 text-body-sm text-ink-soft">
            จำนวน
            <input
              type="number"
              min={2}
              max={12}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-20 rounded-sm bg-surface px-3 py-1.5 text-body text-ink shadow-sm outline-none ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand"
            />
            สัปดาห์ (วันที่ชนกับการจองอื่นจะถูกข้าม)
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy || !start}>
        {busy
          ? "กำลังจอง..."
          : repeat
            ? `ยืนยันจองซ้ำ ${weeks} สัปดาห์ (รับเงินแล้ว)`
            : collectAtPos ? "กันสนามและไปชำระที่ POS" : "ยืนยันการจอง (รับเงินแล้ว)"}
      </Button>
      </fieldset>
    </form>
  );
}
