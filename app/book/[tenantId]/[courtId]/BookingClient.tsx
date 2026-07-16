"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, User, Phone, StickyNote, Ticket } from "lucide-react";
import { SlotGrid } from "@/components/ui/SlotGrid";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { formatBaht } from "@/lib/money";
import { toMinutes, type Slot } from "@/lib/booking/slots";
import { cn } from "@/lib/utils";
import { joinWaitlist } from "./actions";

type WaitlistOffer = {
  start: string;
  end: string;
  userName: string;
  userPhone: string;
};

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
  member: { name: string; phone: string } | null;
  policy: Policy;
};

export function BookingClient({ courtId, minDate, maxDate, member, policy }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [waitlistOffer, setWaitlistOffer] = useState<WaitlistOffer | null>(null);
  const [waitlistState, setWaitlistState] = useState<"idle" | "joining" | "joined">("idle");
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

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
    setWaitlistOffer(null);
    setWaitlistState("idle");
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
    const userName = String(form.get("userName") ?? "").trim();
    const userPhone = String(form.get("userPhone") ?? "").trim();
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courtId,
        date,
        startTime: range.start,
        endTime: range.end,
        userName,
        userPhone,
        note: String(form.get("note") ?? "").trim() || undefined,
        couponCode: coupon.trim() || undefined,
        acceptPolicy: accepted,
      }),
    });
    const json = await res.json();

    if (!json.success) {
      setError(json.error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setSubmitting(false);
      // slot ถูกตัดหน้า → เสนอ Waitlist สำหรับช่วงที่เลือก + reload ตาราง (§28.2)
      if (json.error?.code === "BOOKING_SLOT_UNAVAILABLE") {
        setWaitlistOffer({ start: range.start, end: range.end, userName, userPhone });
        setWaitlistState("idle");
        setWaitlistError(null);
      }
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

  async function handleJoinWaitlist() {
    if (!waitlistOffer) return;
    if (waitlistOffer.userName.length < 2 || !/^0[0-9]{8,9}$/.test(waitlistOffer.userPhone)) {
      setWaitlistError("กรุณากรอกชื่อและเบอร์โทรให้ถูกต้องก่อนลงคิว");
      return;
    }
    setWaitlistState("joining");
    setWaitlistError(null);
    const res = await joinWaitlist({
      courtId,
      date,
      startTime: waitlistOffer.start,
      endTime: waitlistOffer.end,
      userName: waitlistOffer.userName,
      userPhone: waitlistOffer.userPhone,
    });
    if (res.success) {
      setWaitlistState("joined");
    } else {
      setWaitlistState("idle");
      setWaitlistError(res.error ?? "ลงคิวไม่สำเร็จ");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Badge: กำลังจองในนามสมาชิก */}
      {member && (
        <div className="flex items-center gap-2 rounded-sm bg-brand-soft px-4 py-3 text-body-sm text-brand-dark ring-1 ring-inset ring-brand/20">
          <UserCheck aria-hidden className="h-5 w-5 shrink-0 text-brand" />
          <span>
            กำลังจองในนามสมาชิก{" "}
            <span className="font-semibold">{member.name}</span> — กรอกข้อมูลให้แล้ว
          </span>
        </div>
      )}

      {/* เลือกวันที่ */}
      <div className="card-floating p-6">
        <DatePicker
          name="bookingDate"
          label="วันที่จอง"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={changeDate}
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
        <Input
          label="ชื่อผู้จอง"
          name="userName"
          required
          minLength={2}
          icon={<User />}
          defaultValue={member?.name}
        />
        <Input
          label="เบอร์โทรศัพท์"
          name="userPhone"
          type="tel"
          required
          pattern="0[0-9]{8,9}"
          placeholder="08XXXXXXXX"
          icon={<Phone />}
          defaultValue={member?.phone}
        />
        <Input label="หมายเหตุ (ถ้ามี)" name="note" icon={<StickyNote />} />
        <Input
          label="โค้ดส่วนลด (ถ้ามี)"
          name="coupon"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          placeholder="เช่น NEW50"
          icon={<Ticket />}
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

      {/* Waitlist — เสนอเมื่อช่วงที่เลือกถูกจองตัดหน้า */}
      {waitlistOffer && (
        <div className="card-floating flex flex-col gap-3 p-6">
          {waitlistState === "joined" ? (
            <p className="text-body-sm text-success">
              ลงคิวเรียบร้อย — เราจะแจ้งเตือนทันทีที่ช่วง{" "}
              <span className="font-mono text-mono-sm font-medium">
                {waitlistOffer.start}–{waitlistOffer.end}
              </span>{" "}
              ว่างลง
            </p>
          ) : (
            <>
              <p className="text-body-sm text-ink">
                ช่วง{" "}
                <span className="font-mono text-mono-sm font-medium">
                  {waitlistOffer.start}–{waitlistOffer.end}
                </span>{" "}
                ถูกจองแล้ว — ลงชื่อรอคิวไว้ไหม? เราจะแจ้งเตือนทันทีที่ว่าง
              </p>
              {waitlistError && (
                <p role="alert" className="text-body-sm text-danger">
                  {waitlistError}
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={handleJoinWaitlist}
                disabled={waitlistState === "joining"}
                className="self-start"
              >
                {waitlistState === "joining" ? "กำลังลงคิว..." : "แจ้งเตือนเมื่อว่าง"}
              </Button>
            </>
          )}
        </div>
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
