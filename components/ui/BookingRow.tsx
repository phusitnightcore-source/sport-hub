import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/booking/status";

const TH_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

// แปลง YYYY-MM-DD → "12 ก.ค. 2569" แบบ pure string (เลี่ยง new Date ใน render)
function formatThaiDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  return `${+m[3]} ${TH_MONTHS_SHORT[+m[2] - 1]} ${+m[1] + 543}`;
}

export type BookingRowData = {
  code: string;
  courtName: string;
  /** ชื่อสนาม/สาขา (แสดงเมื่อรวมหลาย venue เช่นหน้า guest track) */
  venue?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM[:SS]
  endTime: string;
  totalPrice: string | number;
  status: BookingStatus;
};

// การ์ดแถวการจอง — ใช้ร่วมกันในหน้าสมาชิก (/me/bookings) และหน้า guest (/track)
export function BookingRow({ booking }: { booking: BookingRowData }) {
  const s = BOOKING_STATUS_LABEL[booking.status];
  return (
    <Link
      href={`/booking/${booking.code}`}
      className="card-floating group flex items-center gap-4 p-4 transition-all duration-base hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Clock className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        {booking.venue && (
          <p className="truncate text-body-sm text-ink-soft">{booking.venue}</p>
        )}
        <p className="truncate font-display font-semibold text-ink">
          {booking.courtName}
        </p>
        <p className="font-mono text-mono-sm text-ink-soft">
          {formatThaiDate(booking.date)} · {booking.startTime.slice(0, 5)}–
          {booking.endTime.slice(0, 5)}
        </p>
        <p className="mt-0.5 font-mono text-mono-sm text-ink-soft">
          #{booking.code} · ฿{booking.totalPrice}
        </p>
      </div>
      <StatusPill tone={s.tone}>{s.label}</StatusPill>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft transition-transform duration-fast group-hover:translate-x-1 group-hover:text-brand" />
    </Link>
  );
}
