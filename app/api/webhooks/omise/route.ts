import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { omiseConfigured, retrieveCharge } from "@/lib/omise";
import { activatePaidInvoice } from "@/lib/subscription-billing";
import { captureException } from "@/lib/logger";

// Omise webhook (§11) — event charge.complete → เปิด/ต่อแพลนตาม invoice ที่ผูกไว้ใน metadata
// ความปลอดภัย: Omise ไม่ส่ง HMAC signature โดย default → verify ด้วยการ re-fetch charge ด้วย
//   secret key (มีแค่เรา) ไม่เชื่อ payload ตรงๆ
// ตอบ 200 เสมอ (กัน Omise retry ถล่ม) — ทำงานเฉพาะ event ที่ verify ผ่านและ paid จริง
//
// หมายเหตุ: ต้องมี flow "เก็บบัตร (createCustomerWithCard) + ตัดบัตรตอนถึงรอบ (chargeCustomer)"
//   ถึงจะครบวงจร — ปัจจุบัน subscription เดินผ่าน PromptPay + super-admin mark-paid ซึ่งครบแล้ว
type OmiseEvent = {
  key?: string;
  data?: { object?: string; id?: string };
};

export async function POST(request: Request) {
  if (!omiseConfigured()) return NextResponse.json({ ok: true });

  let event: OmiseEvent;
  try {
    event = (await request.json()) as OmiseEvent;
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (event?.key !== "charge.complete" || event?.data?.object !== "charge") {
      return NextResponse.json({ ok: true });
    }
    const chargeId = String(event.data.id ?? "");
    if (!chargeId) return NextResponse.json({ ok: true });

    // ยืนยันกับ Omise ว่าชาร์จนี้จริงและสำเร็จ (อย่าเชื่อ payload)
    const charge = await retrieveCharge(chargeId);
    if (!charge.paid || charge.status !== "successful") {
      return NextResponse.json({ ok: true });
    }

    const invoiceId = charge.metadata?.invoice_id;
    if (!invoiceId) return NextResponse.json({ ok: true });

    const admin = createAdminClient();
    const { data: invoice } = await admin
      .from("subscription_invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!invoice) return NextResponse.json({ ok: true });

    // idempotent อยู่ในตัว: activatePaidInvoice ทำงานเฉพาะ invoice ที่ยัง pending
    await activatePaidInvoice(admin, invoice, "omise");
  } catch (e) {
    captureException("omise.webhook", e);
  }

  return NextResponse.json({ ok: true });
}
