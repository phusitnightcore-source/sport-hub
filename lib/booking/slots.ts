import { toSatang } from "@/lib/money";

// คำนวณตาราง slot รายชั่วโมงของสนามในวันหนึ่งๆ — ใช้ร่วมกันทั้ง
// GET /api/slots (แสดงตาราง) และ POST /api/bookings (validate ราคา/ความว่างซ้ำ)

export type SlotStatus = "available" | "booked" | "blocked" | "past";

export type Slot = {
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  status: SlotStatus;
  isPeak: boolean;
  /** ราคา slot นี้ (สตางค์) */
  priceSatang: number;
};

type CourtInfo = {
  open_time: string; // "08:00:00"
  close_time: string;
  price_standard: number | string;
  price_peak: number | string | null;
};

type PeakWindow = { day_of_week: number; start_time: string; end_time: string };
type TimeRange = { start_time: string; end_time: string };

/** "08:00:00" | "08:00" → นาทีตั้งแต่เที่ยงคืน */
export function toMinutes(t: string): number {
  const [h, m] = t.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function toHHMM(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export function buildSlots(params: {
  court: CourtInfo;
  peakWindows: PeakWindow[];
  /** การจองสถานะ active (pending_payment/awaiting_verification/confirmed/awaiting_refund) ของวันนั้น */
  bookings: TimeRange[];
  blocks: TimeRange[];
  /** วันที่ของตาราง YYYY-MM-DD */
  date: string;
  /** วันนี้ (เขตเวลาไทย) YYYY-MM-DD */
  today: string;
  /** เวลาปัจจุบัน (เขตเวลาไทย) HH:MM */
  nowTime: string;
}): Slot[] {
  const { court, peakWindows, bookings, blocks, date, today, nowTime } = params;
  const dow = dayOfWeekOf(date);

  const openM = toMinutes(court.open_time);
  const closeM = toMinutes(court.close_time);
  const standardSatang = toSatang(court.price_standard);
  const peakSatang =
    court.price_peak != null ? toSatang(court.price_peak) : standardSatang;

  const todaysPeaks = peakWindows.filter((w) => w.day_of_week === dow);
  const nowM = toMinutes(nowTime);

  const slots: Slot[] = [];
  for (let m = openM; m + 60 <= closeM; m += 60) {
    const end = m + 60;
    const isPeak = todaysPeaks.some((w) =>
      overlaps(m, end, toMinutes(w.start_time), toMinutes(w.end_time)),
    );

    let status: SlotStatus = "available";
    if (date < today || (date === today && m < nowM)) {
      status = "past";
    } else if (
      blocks.some((b) => overlaps(m, end, toMinutes(b.start_time), toMinutes(b.end_time)))
    ) {
      status = "blocked";
    } else if (
      bookings.some((b) => overlaps(m, end, toMinutes(b.start_time), toMinutes(b.end_time)))
    ) {
      status = "booked";
    }

    slots.push({
      start: toHHMM(m),
      end: toHHMM(end),
      status,
      isPeak,
      priceSatang: isPeak ? peakSatang : standardSatang,
    });
  }
  return slots;
}

/** วันในสัปดาห์ (0=อาทิตย์) ของวันที่ YYYY-MM-DD ตามปฏิทิน ไม่ขึ้นกับ timezone */
export function dayOfWeekOf(date: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}
