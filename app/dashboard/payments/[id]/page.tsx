import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { formatBahtFromDb } from "@/lib/money";
import { VerifyActions } from "./VerifyActions";

/* eslint-disable @next/next/no-img-element */

// รายละเอียดสลิป + ปุ่มยืนยัน/ปฏิเสธ (§9.6) — อ่านข้อมูลผ่าน session client (RLS)
// ใช้ admin client เฉพาะสร้าง signed URL ของรูปในบัคเก็ตส่วนตัว
export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select(
      "id, amount, status, slip_image_url, slip_hash, sender_name, transfer_datetime, submitted_at, reject_reason, refund_status, bookings(booking_code, user_name, user_phone, booking_date, start_time, end_time, courts(name), branches(name)), members(first_name, last_name, member_number, phone), packages(name)",
    )
    .eq("id", id)
    .single();
  if (!payment) notFound();

  const admin = createAdminClient();
  let slipUrl: string | null = null;
  if (payment.slip_image_url) {
    const { data: signed } = await admin.storage
      .from("slips")
      .createSignedUrl(payment.slip_image_url, 3600);
    slipUrl = signed?.signedUrl ?? null;
  }

  // แจ้งเตือนสลิปใกล้เคียง/ซ้ำใน tenant (§9.5) — admin ยังตัดสินใจเองได้
  let duplicateCount = 0;
  if (payment.slip_hash) {
    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("slip_hash", payment.slip_hash)
      .neq("id", payment.id);
    duplicateCount = count ?? 0;
  }

  const b = payment.bookings;
  const mem = payment.members;
  const isMembership = !b && !!mem;
  const fmtDateTime = (v: string | null) =>
    v
      ? new Date(v).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
      : "-";

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        ตรวจสลิป ·{" "}
        <span className="font-mono">
          {b?.booking_code ?? mem?.member_number}
        </span>
        {isMembership && (
          <span className="ml-2 text-body font-normal text-ink-soft">
            (ค่าสมาชิก)
          </span>
        )}
      </h1>

      {duplicateCount > 0 && (
        <div className="card-floating flex items-center gap-3 p-4">
          <AlertTriangle aria-hidden className="h-5 w-5 shrink-0 text-warning" />
          <p className="text-body-sm text-ink">
            พบสลิปเหมือนกันอีก {duplicateCount} รายการในระบบ —
            กรุณาตรวจสอบก่อนยืนยัน
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-floating flex items-start justify-center p-4">
          {slipUrl ? (
            <img
              src={slipUrl}
              alt="รูปสลิปโอนเงิน"
              className="max-h-[32rem] w-auto rounded-sm"
            />
          ) : (
            <p className="p-10 text-body-sm text-ink-soft">ไม่มีรูปสลิป</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="card-floating p-6">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
              {isMembership ? (
                <>
                  <dt className="text-ink-soft">สมาชิก</dt>
                  <dd className="text-right text-ink">
                    {mem?.first_name} {mem?.last_name}
                  </dd>
                  <dt className="text-ink-soft">เบอร์โทร</dt>
                  <dd className="text-right font-mono text-mono-sm text-ink">
                    {mem?.phone}
                  </dd>
                  <dt className="text-ink-soft">แพ็กเกจ</dt>
                  <dd className="text-right text-ink">{payment.packages?.name}</dd>
                </>
              ) : (
                <>
                  <dt className="text-ink-soft">ผู้จอง</dt>
                  <dd className="text-right text-ink">{b?.user_name}</dd>
                  <dt className="text-ink-soft">เบอร์โทร</dt>
                  <dd className="text-right font-mono text-mono-sm text-ink">
                    {b?.user_phone}
                  </dd>
                  <dt className="text-ink-soft">สนาม / สาขา</dt>
                  <dd className="text-right text-ink">
                    {b?.courts?.name} · {b?.branches?.name}
                  </dd>
                  <dt className="text-ink-soft">ช่วงเวลาจอง</dt>
                  <dd className="text-right text-ink">
                    {b?.booking_date}{" "}
                    <span className="font-mono text-mono-sm">
                      {b?.start_time?.slice(0, 5)}–{b?.end_time?.slice(0, 5)}
                    </span>
                  </dd>
                </>
              )}
              <dt className="text-ink-soft">ชื่อผู้โอน (จากสลิป)</dt>
              <dd className="text-right text-ink">{payment.sender_name ?? "-"}</dd>
              <dt className="text-ink-soft">เวลาที่โอน</dt>
              <dd className="text-right text-ink">
                {fmtDateTime(payment.transfer_datetime)}
              </dd>
              <dt className="text-ink-soft">แนบสลิปเมื่อ</dt>
              <dd className="text-right text-ink">
                {fmtDateTime(payment.submitted_at)}
              </dd>
              <dt className="text-ink-soft">ยอดเงิน</dt>
              <dd className="text-right font-display text-body-lg font-bold text-brand">
                ฿{formatBahtFromDb(payment.amount)}
              </dd>
            </dl>
          </div>

          {payment.status === "awaiting_verification" ? (
            <VerifyActions paymentId={payment.id} />
          ) : (
            <div className="card-floating p-6 text-body-sm text-ink-soft">
              รายการนี้ถูกตรวจสอบแล้ว (สถานะ: {payment.status}
              {payment.reject_reason ? ` — ${payment.reject_reason}` : ""})
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
