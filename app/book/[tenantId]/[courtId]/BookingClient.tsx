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
import { shiftBookingDate } from "@/lib/booking/dates";
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
  courtName: string;
  branchName: string;
  minDate: string;
  maxDate: string;
  member: { name: string; phone: string } | null;
  policy: Policy;
};

export function BookingClient({ courtId, courtName, branchName, minDate, maxDate, member, policy }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [weeks, setWeeks] = useState(4);

  const [waitlistOffer, setWaitlistOffer] = useState<WaitlistOffer | null>(null);
  const [waitlistState, setWaitlistState] = useState<"idle" | "joining" | "joined">("idle");
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [slotError, setSlotError] = useState<string | null>(null);
  const quickDays = Array.from({ length: 7 }, (_,i) => shiftBookingDate(minDate,i)).filter(day => day <= maxDate);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/slots?courtId=${courtId}&date=${date}`, { signal: controller.signal, cache: "no-store" });
        const json = await res.json();
        if (controller.signal.aborted) return;
        if (!res.ok || !json.success) throw new Error(json.error?.message ?? "โหลดตารางไม่สำเร็จ");
        setSlots(json.data.slots);
        setSlotError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSlots([]);
        setSlotError(error instanceof Error ? error.message : "การเชื่อมต่อขัดข้อง");
      }
    })();
    return () => controller.abort();
  }, [courtId, date, reloadKey]);

  function changeDate(value: string) {
    if (!value || value < minDate || value > maxDate) return;
    setDate(value);
    setSlotError(null);
    setError(null);
    setSlots(null);
    setSelected([]);
    setWaitlistOffer(null);
    setWaitlistState("idle");
  }

  function reloadSlots() {
    setSlotError(null);
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
    const useRecurring = repeatWeekly && weeks >= 2;
    try {
    const res = await fetch(useRecurring ? "/api/bookings/recurring" : "/api/bookings", {
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
        ...(useRecurring ? { repeatWeeks: weeks } : {}),
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
    const code = useRecurring ? json.data.primaryCode : json.data.bookingCode;
    router.push(`/booking/${code}`);
    } catch {
      setError("การเชื่อมต่อขัดข้อง กรุณาตรวจการจองของฉันก่อนลองจองซ้ำ");
      setSubmitting(false);
    }
  }

  async function handleJoinWaitlist() {
    if (!waitlistOffer) return;
    if (waitlistOffer.userName.length < 2 || !/^0[0-9]{8,9}$/.test(waitlistOffer.userPhone)) {
      setWaitlistError("กรุณากรอกชื่อและเบอร์โทรให้ถูกต้องก่อนลงคิว");
      return;
    }
    setWaitlistState("joining");
    setWaitlistError(null);
    try {
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
    } catch { setWaitlistState("idle"); setWaitlistError("การเชื่อมต่อขัดข้อง กรุณาลองใหม่"); }
  }

  return (
    <form onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <fieldset disabled={submitting} className="contents">
      <div className="space-y-5">
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
      <div className="card-floating space-y-4 border border-line p-5 sm:p-6">
        <h2 className="font-semibold text-ink"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-sm text-brand">1</span>เลือกวันเล่น</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">{quickDays.map((day,i) => <button key={day} type="button" aria-pressed={date === day} onClick={() => changeDate(day)} className={"min-h-16 min-w-16 shrink-0 rounded-xl border px-3 py-2 text-center transition focus-visible:ring-2 focus-visible:ring-brand " + (date === day ? "border-brand bg-brand-soft text-ink" : "border-line bg-surface text-ink/70")}><span className="block text-xs">{i === 0 ? "วันนี้" : new Date(day+"T12:00:00+07:00").toLocaleDateString("th-TH", { weekday:"short",timeZone:"Asia/Bangkok" })}</span><strong className="mt-1 block text-lg">{Number(day.slice(-2))}</strong></button>)}</div>
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
        <h2 className="mb-2 font-semibold text-ink"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-sm text-brand">2</span>เลือกเวลา</h2><p className="mb-4 text-sm text-ink/70">แตะช่วงที่ว่าง แล้วแตะช่วงติดกันเพื่อเพิ่มชั่วโมง</p>
        {slotError ? <div role="alert" className="rounded-xl border border-warning/40 p-4"><p className="text-sm text-ink">{slotError}</p><button type="button" className="mt-3 rounded-lg bg-brand-soft px-4 py-2 text-sm font-semibold text-ink" onClick={reloadSlots}>ลองโหลดเวลาอีกครั้ง</button></div> : slots === null ? (
          <div className="animate-shimmer h-24 rounded-sm bg-line" />
        ) : slots.length === 0 ? <p className="py-6 text-sm text-ink/70">ไม่มีช่วงเวลาเปิดให้จองในวันนี้ ลองเลือกวันอื่น</p> : (
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

      {/* จองซ้ำรายสัปดาห์ (§7.1) */}
      <div className="card-floating flex flex-col gap-3 p-6">
        <label className="flex cursor-pointer items-center gap-2 text-body font-medium text-ink">
          <input
            type="checkbox"
            checked={repeatWeekly}
            onChange={(e) => setRepeatWeekly(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          จองซ้ำเวลานี้ทุกสัปดาห์
        </label>
        {repeatWeekly && (
          <div className="flex flex-wrap items-center gap-2 text-body-sm text-ink/70">
            <span>ต่อเนื่อง</span>
            <select
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="rounded-sm bg-surface px-3 py-2 text-body-sm text-ink shadow-sm outline-none focus:ring-2 focus:ring-brand"
            >
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n} สัปดาห์
                </option>
              ))}
            </select>
            <span>
              (เริ่ม {date} เวลาเดิม — สัปดาห์ที่เต็มจะถูกข้าม
              ชำระเงินแยกแต่ละครั้งที่ &ldquo;การจองของฉัน&rdquo;)
            </span>
          </div>
        )}
      </div>

      {/* ข้อมูลผู้จอง */}
      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="font-semibold text-ink"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-sm text-brand">3</span>ข้อมูลติดต่อ</h2>
        <Input
          label="ชื่อผู้จอง"
          name="userName"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          icon={<User />}
          defaultValue={member?.name}
        />
        <Input
          label="เบอร์โทรศัพท์"
          name="userPhone"
          type="tel"
          maxLength={10}
          autoComplete="tel"
          inputMode="tel"
          required
          pattern="0[0-9]{8,9}"
          placeholder="08XXXXXXXX"
          icon={<Phone />}
          defaultValue={member?.phone}
        />
        <Input label="หมายเหตุ (ถ้ามี)" maxLength={500} name="note" icon={<StickyNote />} />
        <Input
          label="โค้ดส่วนลด (ถ้ามี)"
          name="coupon"
          maxLength={40}
          value={coupon}
          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          placeholder="เช่น NEW50"
          icon={<Ticket />}
        />
      </div>

      </div>
      <aside className="space-y-5 lg:sticky lg:top-6">
      <section className="rounded-3xl border border-brand/20 bg-surface p-6 shadow-sm" aria-live="polite"><p className="text-xs font-semibold tracking-widest text-brand">YOUR COURT TIME</p><h2 className="mt-3 text-xl font-bold text-ink">{courtName}</h2><p className="mt-1 text-sm text-ink/70">{branchName}</p><div className="mt-5 space-y-3 border-y border-line py-4 text-sm text-ink"><p>{new Date(date+"T12:00:00+07:00").toLocaleDateString("th-TH", { weekday:"long",day:"numeric",month:"long",timeZone:"Asia/Bangkok" })}</p><p className="font-mono text-xl font-semibold">{range ? range.start+"–"+range.end : "ยังไม่ได้เลือกเวลา"}</p>{range && <p className="text-ink/70">{selected.length} ชั่วโมง · {repeatWeekly ? "จองซ้ำ "+weeks+" สัปดาห์" : "จองครั้งเดียว"}</p>}</div><div className="mt-5 flex items-center justify-between text-ink"><span className="text-sm">{repeatWeekly ? "ยอดครั้งแรก" : "ยอดค่าจอง"}</span><strong className="text-3xl">฿{formatBaht(totalSatang)}</strong></div>{coupon && <p className="mt-2 text-xs text-ink/70">ตรวจส่วนลดจากโค้ด {coupon} เมื่อดำเนินการจอง</p>}</section>
      {/* Cancellation Policy — ต้องยอมรับก่อนยืนยัน (§7.1) */}
      <div className="card-floating flex flex-col gap-3 p-6">
        <h2 className="text-body font-medium text-ink">นโยบายการยกเลิก</h2>
        <ul className="list-disc pl-5 text-body-sm text-ink/70">
          <li>ยกเลิกฟรีก่อนเวลาจอง {policy.freeCancelHours} ชั่วโมง</li>
          <li>
            ยกเลิกช้ากว่านั้น มีค่าธรรมเนียม {policy.cancelFeePercent}% ของราคา
          </li>
          {policy.allowReschedule && (
            <li>เลื่อนการจองได้ โดยแจ้งก่อน {policy.rescheduleHours} ชั่วโมง</li>
          )}
          {policy.refundNote && <li>{policy.refundNote}</li>}
          <li>สนามเป็นผู้ดำเนินการคืนเงิน กรุณาตรวจเงื่อนไขก่อนจอง</li>
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
        disabled={!range || !accepted || submitting || !!slotError}
        className={cn("booking-action w-full min-h-12", submitting && "animate-press")}
      >
        {submitting
          ? "กำลังจอง..."
          : range
            ? "จองและไปชำระเงิน"
            : "เลือกช่วงเวลาก่อน"}
      </Button>
      <p className="text-center text-xs text-ink/70">หลังจองสำเร็จ กรุณาชำระภายในเวลาที่กำหนด</p>
      <a href="/track" className="block text-center text-sm text-brand underline underline-offset-4">ตรวจการจองของฉัน</a>
      </aside>
      </fieldset>
    </form>
  );
}
