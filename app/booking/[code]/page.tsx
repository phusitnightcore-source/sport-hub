import { notFound } from "next/navigation";
import { z } from "zod";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { promptpayPayload } from "@/lib/promptpay";
import { toSatang, satangToBahtString } from "@/lib/money";
import { PaymentClient } from "./PaymentClient";

// หน้าชำระเงิน/ติดตามสถานะของลูกค้า — เข้าถึงด้วย booking_code (capability)
// service role อย่างจงใจ: guest ไม่มี session อ่านผ่าน RLS ไม่ได้
export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const parsed = z
    .string()
    .regex(/^[A-Z0-9]{8}$/)
    .safeParse(code?.toUpperCase());
  if (!parsed.success) notFound();

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, booking_code, tenant_id, court_id, user_name, booking_date, start_time, end_time, total_price, status, slot_locked_until",
    )
    .eq("booking_code", parsed.data)
    .single();
  if (!booking) notFound();

  const [{ data: court }, { data: tenant }, { data: payment }] =
    await Promise.all([
      admin.from("courts").select("name, type").eq("id", booking.court_id).single(),
      admin
        .from("tenants")
        .select("name, promptpay_id")
        .eq("id", booking.tenant_id)
        .single(),
      admin
        .from("payments")
        .select("status, reject_reason, refund_status")
        .eq("booking_id", booking.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // สร้าง QR เฉพาะตอนยังรอชำระ และ tenant ตั้ง promptpay_id แล้ว (§9.7)
  let qrDataUrl: string | null = null;
  const amountBaht = satangToBahtString(toSatang(booking.total_price));
  if (booking.status === "pending_payment" && tenant?.promptpay_id) {
    const payload = promptpayPayload(tenant.promptpay_id, amountBaht);
    qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 280 });
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <PaymentClient
        booking={{
          code: booking.booking_code,
          status: booking.status,
          courtName: court?.name ?? "",
          courtType: court?.type ?? "",
          tenantName: tenant?.name ?? "",
          date: booking.booking_date,
          startTime: booking.start_time.slice(0, 5),
          endTime: booking.end_time.slice(0, 5),
          totalPrice: amountBaht,
          slotLockedUntil: booking.slot_locked_until,
          userName: booking.user_name,
        }}
        payment={
          payment
            ? {
                status: payment.status,
                rejectReason: payment.reject_reason,
                refundStatus: payment.refund_status,
              }
            : null
        }
        qrDataUrl={qrDataUrl}
      />
    </main>
  );
}
