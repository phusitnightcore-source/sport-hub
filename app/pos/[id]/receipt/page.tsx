import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { formatBahtFromDb } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { PrintReceipt } from "./PrintReceipt";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน / QR",
  card: "บัตร",
  other: "อื่น ๆ",
};

export default async function PosReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  if (!hasPermission(ctx, "use_pos")) redirect("/dashboard");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  // ใช้ session client ในหน้าอ่านใบเสร็จเพื่อให้ RLS บังคับ branch access ของพนักงาน
  const supabase = await createClient();
  const { data: sale } = await supabase
    .from("sales")
    .select("id, branch_id, booking_id, receipt_number, sale_number, customer_name, customer_phone, subtotal, discount_amount, total_amount, note, completed_at, status, void_reason, voided_at, cash_received, change_amount")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!sale) notFound();

  const [{ data: items }, { data: payment }, { data: branch }, { data: tenant }] = await Promise.all([
    supabase
      .from("sale_items")
      .select("id, product_name, quantity, unit_price, line_total")
      .eq("sale_id", id)
      .order("created_at"),
    supabase
      .from("pos_payments")
      .select("method, amount, reference")
      .eq("sale_id", id)
      .maybeSingle(),
    supabase.from("branches").select("name, address").eq("id", sale.branch_id).maybeSingle(),
    supabase.from("tenants").select("name, address, logo_url").eq("id", ctx.tenantId).maybeSingle(),
  ]);

  return (
    <main className="receipt-print mx-auto flex max-w-2xl flex-col gap-6">
      <div className="receipt-actions flex flex-wrap items-center justify-between gap-3">
        <Link href="/pos"><Button variant="secondary">กลับไป POS</Button></Link>
        <PrintReceipt />
      </div>

      <article className="receipt-paper card-floating mx-auto w-full max-w-md p-6 sm:p-8">
        <header className="border-b border-dashed border-line pb-5 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-body-sm font-medium">{sale.status === "voided" ? "คืนเงินเต็มบิลแล้ว" : "รับชำระเรียบร้อย"}</span>
          </div>
          <h1 className="font-display text-body-lg font-bold text-ink">{tenant?.name ?? "SportHub"}</h1>
          <p className="mt-1 text-body-sm text-ink-soft">{branch?.name}</p>
          {(branch?.address ?? tenant?.address) && <p className="mt-1 text-body-sm text-ink-soft">{branch?.address ?? tenant?.address}</p>}
        </header>

        <section className="border-b border-dashed border-line py-4 text-body-sm">
          <div className="flex justify-between gap-4"><span className="text-ink-soft">เลขที่ใบเสร็จ</span><span className="font-mono font-medium text-ink">{sale.receipt_number}</span></div>
          <div className="mt-1 flex justify-between gap-4"><span className="text-ink-soft">วันที่</span><span className="text-right text-ink">{new Date(sale.completed_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</span></div>
          {sale.customer_name && <div className="mt-1 flex justify-between gap-4"><span className="text-ink-soft">ลูกค้า</span><span className="text-right text-ink">{sale.customer_name}{sale.customer_phone ? ` · ${sale.customer_phone}` : ""}</span></div>}
          {sale.booking_id && <div className="mt-1 flex justify-between gap-4"><span className="text-ink-soft">เชื่อมการจอง</span><span className="font-mono text-ink">{sale.booking_id.slice(0, 8)}</span></div>}
        </section>

        <section className="border-b border-dashed border-line py-4">
          <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-x-3 text-mono-sm text-ink-soft"><span>รายการ</span><span>จำนวน</span><span className="text-right">จำนวนเงิน</span></div>
          <div className="space-y-2 text-body-sm">
            {(items ?? []).map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-x-3"><span className="text-ink">{item.product_name}</span><span className="font-mono text-ink-soft">{item.quantity}</span><span className="text-right font-mono text-ink">฿{formatBahtFromDb(item.line_total)}</span></div>)}
          </div>
        </section>

        <section className="space-y-1.5 pt-4 text-body-sm">
          {sale.status === "voided" && <div className="mb-4 rounded-xl border border-danger/30 p-3 text-ink">บิลนี้ถูกคืนเงินแล้ว · {sale.void_reason}{sale.voided_at && <p className="mt-1 text-xs">{new Date(sale.voided_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p>}</div>}
          <div className="flex justify-between text-ink-soft"><span>รวมสินค้า</span><span>฿{formatBahtFromDb(sale.subtotal)}</span></div>
          {Number(sale.discount_amount) > 0 && <div className="flex justify-between text-ink-soft"><span>ส่วนลด</span><span>-฿{formatBahtFromDb(sale.discount_amount)}</span></div>}
          <div className="flex justify-between border-t border-line pt-3 font-display text-body-lg font-bold text-ink"><span>รวมทั้งสิ้น</span><span>฿{formatBahtFromDb(sale.total_amount)}</span></div>
          <div className="flex justify-between pt-2 text-ink-soft"><span>ชำระโดย</span><span>{PAYMENT_METHOD_LABEL[payment?.method ?? ""] ?? "-"}</span></div>
          {sale.cash_received !== null && <div className="flex justify-between text-ink-soft"><span>รับเงินสด</span><span>฿{formatBahtFromDb(sale.cash_received)}</span></div>}
          {sale.change_amount !== null && <div className="flex justify-between text-ink-soft"><span>เงินทอน</span><span>฿{formatBahtFromDb(sale.change_amount)}</span></div>}
          {payment?.reference && <p className="pt-2 text-ink-soft">อ้างอิงชำระ: {payment.reference}</p>}
          {sale.note && <p className="pt-3 text-ink-soft">หมายเหตุ: {sale.note}</p>}
        </section>
        <footer className="mt-6 border-t border-dashed border-line pt-4 text-center text-mono-sm text-ink-soft">ขอบคุณที่ใช้บริการ</footer>
      </article>
    </main>
  );
}
