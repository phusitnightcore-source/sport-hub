"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SlotGrid } from "@/components/ui/SlotGrid";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatBaht } from "@/lib/money";
import { toMinutes, type Slot } from "@/lib/booking/slots";
import { cn } from "@/lib/utils";

type Policy = {
  freeCancelHours: number;
  cancelFeePercent: number;
  allowReschedule: boolean;
  rescheduleHours: number;
  refundNote: string | null;
};

type Props = {
  courtId: string;
  minDate: string;
  maxDate: string;
  policy: Policy;
};

export function BookingClient({ courtId, minDate, maxDate, policy }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/slots?courtId=${courtId}&date=${date}`);
      const json = await res.json();
      if (cancelled) return;
      if (json.success) setSlots(json.data.slots);
      else setError(json.error?.message ?? "โหลดตารางไม่สำเร็จ");
    })();
    return () => {
      cancelled = true;
    };
  }, [courtId, date, reloadKey]);

  function changeDate(value: string) {
    setDate(value);
    setSlots(null);
    setSelected([]);
  }

  function reloadSlots() {
    setSlots(null);
    setSelected([]);
    setReloadKey((k) => k + 1);
  }

  // เลือกได้เฉพาะช่วงติดกัน: คลิกติดขอบ = ขยาย / คลิกขอบเดิม = หด / อื่นๆ = เริ่มใหม่
  function toggleSlot(start: string) {
    setSelected((prev) => {
      if (prev.length === 0) return [start];
      const sorted = [...prev].sort(
        (a, b) => toMinutes(a) - toMinutes(b),
      );
      const first = toMinutes(sorted[0]);
      const last = toMinutes(sorted[sorted.length - 1]);
      const m = toMinutes(start);
      if (m === first || m === last) {
        const next = sorted.filter((s) => s !== start);
        return next.length > 0 ? next : [];
      }
      if (m === first - 60 || m === last + 60) return [...sorted, start];
      return [start];
    });
  }

  const totalSatang = useMemo(() => {
    if (!slots) return 0;
    return slots
      .filter((s) => selected.includes(s.start))
      .reduce((sum, s) => sum + s.priceSatang, 0);
  }, [slots, selected]);

  const range = useMemo(() => {
    if (selected.length === 0) return null;
    const sorted = [...selected].sort((a, b) => toMinutes(a) - toMinutes(b));
    const last = sorted[sorted.length - 1];
    const endM = toMinutes(last) + 60;
    const end = `${String(Math.floor(endM / 60)).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
    return { start: sorted[0], end };
  }, [selected]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!range) return;
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courtId,
        date,
        startTime: range.start,
        endTime: range.end,
        userName: form.get("userName"),
        userPhone: form.get("userPhone"),
        note: String(form.get("note") ?? "").trim() || undefined,
        couponCode: coupon.trim() || undefined,
        acceptPolicy: accepted,
      }),
    });
    const json = await res.json();

    if (!json.success) {
      setError(json.error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setSubmitting(false);
      // slot ถูกตัดหน้า/ถูกบล็อก → reload ตารางตาม §28.2
      if (
        json.error?.code === "BOOKING_SLOT_UNAVAILABLE" ||
        json.error?.code === "BOOKING_SLOT_BLOCKED"
      ) {
        reloadSlots();
      }
      return;
    }
    router.push(`/booking/${json.data.bookingCode}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* เลือกวันที่ */}
      <div className="card-floating p-6">
        <label
          htmlFor="booking-date"
          className="mb-2 block text-body-sm font-medium text-ink"
        >
          วันที่จอง
        </label>
        <input
          id="booking-date"
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={(e) => changeDate(e.target.value)}
          className="rounded-sm bg-surface px-4 py-2.5 text-body text-ink shadow-sm outline-none transition-shadow duration-fast focus:shadow-md focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* Live Slot Grid */}
      <div className="card-floating p-6">
        <h2 className="mb-4 text-body font-medium text-ink">เลือกช่วงเวลา</h2>
        {slots === null ? (
          <div className="animate-shimmer h-24 rounded-sm bg-line" />
        ) : (
          <SlotGrid
            slots={slots}
            selected={selected}
            onToggle={toggleSlot}
            pulseFirstAvailable={date === minDate}
          />
        )}
        {range && (
          <p className="mt-4 text-body text-ink">
            เลือก{" "}
            <span className="font-mono text-mono-sm font-medium">
              {range.start}–{range.end}
            </span>{" "}
            รวม{" "}
            <span className="font-display font-semibold text-brand">
              ฿{formatBaht(totalSatang)}
            </span>
          </p>
        )}
      </div>

      {/* ข้อมูลผู้จอง */}
      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body font-medium text-ink">ข้อมูลผู้จอง</h2>
        <Input label="ชื่อผู้จอง" name="userName" required minLength={2} />
        <Input
          label="เบอร์โทรศัพท์"
          name="userPhone"
          type="tel"
          required
          pattern="0[0-9]{8,9}"
          placeholder="08XXXXXXXX"
        />
        <Input label="หมายเหตุ (ถ้ามี)" name="note" />
        <Input
          label="โค้ดส่วนลด (ถ้ามี)"
          name="coupon"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          placeholder="เช่น NEW50"
        />
      </div>

      {/* Cancellation Policy — ต้องยอมรับก่อนยืนยัน (§7.1) */}
      <div className="card-floating flex flex-col gap-3 p-6">
        <h2 className="text-body font-medium text-ink">นโยบายการยกเลิก</h2>
        <ul className="list-disc pl-5 text-body-sm text-ink-soft">
          <li>ยกเลิกฟรีก่อนเวลาจอง {policy.freeCancelHours} ชั่วโมง</li>
          <li>
            ยกเลิกช้ากว่านั้น มีค่าธรรมเนียม {policy.cancelFeePercent}% ของราคา
          </li>
          {policy.allowReschedule && (
            <li>เลื่อนการจองได้ โดยแจ้งก่อน {policy.rescheduleHours} ชั่วโมง</li>
          )}
          {policy.refundNote && <li>{policy.refundNote}</li>}
          <li>การคืนเงินดำเนินการโดยสนามผ่าน PromptPay ภายใน 24 ชั่วโมง</li>
        </ul>
        <label className="flex cursor-pointer items-center gap-2 text-body-sm text-ink">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          ฉันได้อ่านและยอมรับนโยบายการยกเลิกแล้ว
        </label>
      </div>

      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!range || !accepted || submitting}
        className={cn("self-center", submitting && "animate-press")}
      >
        {submitting
          ? "กำลังจอง..."
          : range
            ? `ยืนยันการจอง ฿${formatBaht(totalSatang)}`
            : "เลือกช่วงเวลาก่อน"}
      </Button>
    </form>
  );
}
