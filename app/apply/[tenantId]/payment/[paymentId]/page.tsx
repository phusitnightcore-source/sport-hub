import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { SlipUploadForm } from "./SlipUploadForm";
import { formatBahtFromDb, toSatang, satangToBahtString } from "@/lib/money";
import { promptpayPayload } from "@/lib/promptpay";
import { CheckCircle } from "lucide-react";

/* eslint-disable @next/next/no-img-element */

export default async function ApplyPaymentPage({
  params,
}: {
  params: Promise<{ tenantId: string; paymentId: string }>;
}) {
  const { tenantId, paymentId } = await params;
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("*, members(first_name, packages(name)), tenants(promptpay_id)")
    .eq("id", paymentId)
    .eq("tenant_id", tenantId)
    .single();

  if (!payment) notFound();

  // ส่งสลิปแล้ว → หน้ารอตรวจสอบ
  if (payment.slip_image_url || payment.status !== "awaiting_verification") {
    return (
      <div className="flex min-h-screen flex-col bg-surface/50">
        <header className="flex h-16 items-center justify-center border-b border-line bg-surface px-6">
          <span className="font-display text-lg font-bold text-brand">SportHub</span>
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="card-floating flex max-w-md flex-col items-center gap-4 p-10 text-center">
            <CheckCircle className="h-16 w-16 text-success" />
            <h1 className="text-display-md font-bold text-ink">อัปโหลดสลิปไปแล้ว</h1>
            <p className="text-body text-ink-soft">
              กรุณารอแอดมินตรวจสอบการชำระเงินของคุณ เมื่อยืนยันแล้วบัตรสมาชิกจะพร้อมใช้งานทันที
            </p>
          </div>
        </main>
      </div>
    );
  }

  // สร้าง QR PromptPay ของสนามจาก promptpay_id + ยอด (amount เก็บเป็นบาท)
  const promptpayId = payment.tenants?.promptpay_id;
  let qrDataUrl: string | null = null;
  if (promptpayId) {
    const amountBaht = satangToBahtString(toSatang(payment.amount));
    const payload = promptpayPayload(promptpayId, amountBaht);
    qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 240 });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface/50">
      <header className="flex h-16 items-center justify-center border-b border-line bg-surface px-6">
        <span className="font-display text-lg font-bold text-brand">SportHub</span>
      </header>
      <main className="flex flex-1 flex-col items-center p-6 py-12">
        <div className="card-floating w-full max-w-md p-8">
          <h1 className="text-center font-display text-display-md font-semibold text-brand">
            ชำระค่าสมาชิก
          </h1>
          <div className="mt-6 text-center">
            <p className="text-body text-ink">
              แพ็กเกจ:{" "}
              <span className="font-bold">{payment.members?.packages?.name}</span>
            </p>
            <p className="mt-2 font-display text-display-md font-bold text-brand">
              ฿{formatBahtFromDb(payment.amount)}
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR PromptPay ชำระค่าสมาชิก"
                width={240}
                height={240}
                className="rounded-lg border border-line p-2"
              />
            ) : (
              <p className="text-center text-body-sm text-danger">
                สนามยังไม่ได้ตั้งค่า PromptPay กรุณาติดต่อสนามโดยตรง
              </p>
            )}
          </div>
          <p className="mt-3 text-center text-body-sm text-ink-soft">
            สแกนเพื่อชำระเงิน แล้วแนบสลิปด้านล่าง
          </p>

          <div className="mt-8">
            <SlipUploadForm paymentId={payment.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
