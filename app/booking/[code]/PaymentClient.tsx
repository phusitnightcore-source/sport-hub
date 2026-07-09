"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/booking/status";
import { formatBahtFromDb } from "@/lib/money";

type Props = {
  booking: {
    code: string;
    status: BookingStatus;
    courtName: string;
    courtType: string;
    tenantName: string;
    date: string;
    startTime: string;
    endTime: string;
    totalPrice: string;
    slotLockedUntil: string | null;
    userName: string;
  };
  payment: {
    status: string;
    rejectReason: string | null;
    refundStatus: string | null;
  } | null;
  qrDataUrl: string | null;
};

function useCountdown(deadline: string | null) {
  const [left, setLeft] = useState(() =>
    deadline ? Math.max(0, new Date(deadline).getTime() - Date.now()) : 0,
  );
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(
      () => setLeft(Math.max(0, new Date(deadline).getTime() - Date.now())),
      1000,
    );
    return () => clearInterval(t);
  }, [deadline]);
  const mm = String(Math.floor(left / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, "0");
  return { text: `${mm}:${ss}`, expired: left <= 0 };
}

export function PaymentClient({ booking, payment, qrDataUrl }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const countdown = useCountdown(
    booking.status === "pending_payment" ? booking.slotLockedUntil : null,
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // รอยืนยัน → poll สถานะทุก 10 วิ ให้เห็นผลตรวจสลิปโดยไม่ต้องรีเฟรชเอง
  useEffect(() => {
    if (booking.status !== "awaiting_verification") return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/bookings/${booking.code}`);
      const json = await res.json();
      if (json.success && json.data.status !== "awaiting_verification") {
        router.refresh();
      }
    }, 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [booking.status, booking.code, router]);

  async function handleSlipSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    form.set("bookingCode", booking.code);
    const res = await fetch("/api/payments", { method: "POST", body: form });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setSubmitting(false);
      if (json.error?.code === "PAYMENT_TIMEOUT") router.refresh();
      return;
    }
    router.refresh();
  }

  const statusInfo = BOOKING_STATUS_LABEL[booking.status];

  return (
    <div className="flex flex-col gap-6">
      {/* สรุปการจอง */}
      <div className="card-floating p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-display-md font-semibold text-ink">
              {booking.courtName}
            </h1>
            <p className="text-body-sm text-ink-soft">
              {booking.tenantName} · {booking.courtType}
            </p>
          </div>
          <StatusPill tone={statusInfo.tone}>{statusInfo.label}</StatusPill>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
          <dt className="text-ink-soft">รหัสการจอง</dt>
          <dd className="text-right font-mono text-mono-sm font-medium text-ink">
            {booking.code}
          </dd>
          <dt className="text-ink-soft">ผู้จอง</dt>
          <dd className="text-right text-ink">{booking.userName}</dd>
          <dt className="text-ink-soft">วัน-เวลา</dt>
          <dd className="text-right text-ink">
            {booking.date}{" "}
            <span className="font-mono text-mono-sm">
              {booking.startTime}–{booking.endTime}
            </span>
          </dd>
          <dt className="text-ink-soft">ยอดชำระ</dt>
          <dd className="text-right font-display text-body-lg font-bold text-brand">
            ฿{formatBahtFromDb(booking.totalPrice)}
          </dd>
        </dl>
      </div>

      {/* รอชำระ: QR + ฟอร์มแนบสลิป */}
      {booking.status === "pending_payment" && (
        <>
          <div className="card-floating flex flex-col items-center gap-3 p-6">
            <h2 className="text-body font-medium text-ink">
              สแกน QR PromptPay เพื่อชำระเงิน
            </h2>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR PromptPay ยอด ${booking.totalPrice} บาท`}
                width={280}
                height={280}
                className="rounded-sm"
              />
            ) : (
              <p className="text-body-sm text-danger">
                สนามยังไม่ได้ตั้งค่า PromptPay กรุณาติดต่อสนามโดยตรง
              </p>
            )}
            <p
              className={
                countdown.expired
                  ? "text-body-sm text-danger"
                  : "text-body-sm text-ink-soft"
              }
            >
              <Clock3 aria-hidden className="mr-1 inline h-4 w-4" />
              {countdown.expired
                ? "หมดเวลาชำระเงินแล้ว การจองจะถูกยกเลิก"
                : `ชำระและแนบสลิปภายใน ${countdown.text} นาที`}
            </p>
          </div>

          <form
            onSubmit={handleSlipSubmit}
            className="card-floating flex flex-col gap-4 p-6"
          >
            <h2 className="text-body font-medium text-ink">แนบสลิปโอนเงิน</h2>
            <Input label="ชื่อผู้โอน" name="senderName" required minLength={2} />
            <Input
              label="วัน-เวลาที่โอน"
              name="transferDatetime"
              type="datetime-local"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="slip" className="text-body-sm font-medium text-ink">
                รูปสลิป (JPG/PNG ไม่เกิน 10 MB)
              </label>
              <input
                id="slip"
                name="slip"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                className="rounded-sm bg-surface px-4 py-2.5 text-body-sm text-ink shadow-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-1.5 file:text-body-sm file:font-medium file:text-brand"
              />
            </div>
            {error && (
              <p role="alert" className="text-body-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={submitting || countdown.expired}>
              {submitting ? "กำลังส่ง..." : "ส่งสลิปให้สนามตรวจสอบ"}
            </Button>
          </form>
        </>
      )}

      {/* รอยืนยัน */}
      {booking.status === "awaiting_verification" && (
        <div className="card-floating flex flex-col items-center gap-3 p-8 text-center">
          <Clock3 aria-hidden className="h-10 w-10 text-warning" />
          <h2 className="text-body-lg font-medium text-ink">
            ส่งสลิปแล้ว กำลังรอสนามตรวจสอบ
          </h2>
          <p className="text-body-sm text-ink-soft">
            หน้านี้จะอัปเดตอัตโนมัติเมื่อสนามยืนยัน
          </p>
        </div>
      )}

      {/* ยืนยันแล้ว */}
      {booking.status === "confirmed" && (
        <div className="card-floating flex flex-col items-center gap-3 p-8 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="h-12 w-12 text-success"
          >
            <path
              d="M4 12.5 9.5 18 20 6.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-checkmark-draw"
            />
          </svg>
          <h2 className="text-body-lg font-medium text-ink">การจองยืนยันแล้ว</h2>
          <p className="text-body-sm text-ink-soft">
            แสดงรหัสจองนี้กับเจ้าหน้าที่เมื่อถึงสนาม
          </p>
          <p className="font-mono text-display-md font-medium tracking-widest text-brand">
            {booking.code}
          </p>
        </div>
      )}

      {/* ปฏิเสธ / รอคืนเงิน / คืนเงินแล้ว (§9.4 ฝั่งลูกค้า) */}
      {(booking.status === "awaiting_refund" ||
        booking.status === "rejected" ||
        booking.status === "refunded") && (
        <div className="card-floating flex flex-col items-center gap-3 p-8 text-center">
          {booking.status === "refunded" ? (
            <CheckCircle2 aria-hidden className="h-10 w-10 text-brand" />
          ) : (
            <XCircle aria-hidden className="h-10 w-10 text-danger" />
          )}
          <h2 className="text-body-lg font-medium text-ink">
            {booking.status === "refunded"
              ? "สนามโอนเงินคืนเรียบร้อยแล้ว"
              : "สลิปถูกปฏิเสธ"}
          </h2>
          {payment?.rejectReason && (
            <p className="text-body-sm text-ink">เหตุผล: {payment.rejectReason}</p>
          )}
          {booking.status === "awaiting_refund" && (
            <p className="text-body-sm text-ink-soft">
              สนามจะโอนเงินคืนภายใน 24 ชั่วโมง กรุณาติดต่อสนามหากไม่ได้รับ
            </p>
          )}
        </div>
      )}

      {/* ยกเลิก */}
      {booking.status === "cancelled" && (
        <div className="card-floating flex flex-col items-center gap-3 p-8 text-center">
          <XCircle aria-hidden className="h-10 w-10 text-danger" />
          <h2 className="text-body-lg font-medium text-ink">การจองถูกยกเลิก</h2>
          <p className="text-body-sm text-ink-soft">
            หากต้องการจองใหม่ กรุณากลับไปที่หน้าเลือกสนาม
          </p>
        </div>
      )}
    </div>
  );
}
