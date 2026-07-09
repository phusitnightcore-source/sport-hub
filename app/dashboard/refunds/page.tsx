import { redirect } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { formatBahtFromDb } from "@/lib/money";
import { ListRowCard, LeadingIcon } from "@/components/ui/ListRowCard";
import { RefundConfirm } from "./RefundConfirm";

// Pending Refund List (§9.4, §9.6) — รายการปฏิเสธสลิปที่ยังไม่ได้โอนคืน
export default async function RefundsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: refunds } = await supabase
    .from("payments")
    .select(
      "id, amount, sender_name, reject_reason, verified_at, bookings(booking_code, user_name, user_phone)",
    )
    .eq("refund_status", "awaiting_refund")
    .order("verified_at", { ascending: true });

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        รอคืนเงิน
      </h1>
      <p className="text-body-sm text-ink-soft">
        โอนคืนผ่านแอปธนาคารภายใน 24 ชั่วโมง แล้วกดยืนยันพร้อมแนบหลักฐาน
      </p>
      <div className="flex flex-col gap-3">
        {(refunds ?? []).map((p) => (
          <ListRowCard
            key={p.id}
            leading={
              <LeadingIcon>
                <RotateCcw aria-hidden />
              </LeadingIcon>
            }
            title={`${p.bookings?.user_name ?? "-"} · ฿${formatBahtFromDb(p.amount)}`}
            subtitle={`${p.bookings?.user_phone ?? ""} · เหตุผล: ${p.reject_reason ?? "-"}`}
            trailing={<RefundConfirm paymentId={p.id} />}
          >
            <span className="font-mono text-mono-sm text-ink-soft">
              {p.bookings?.booking_code}
            </span>
          </ListRowCard>
        ))}
        {(refunds ?? []).length === 0 && (
          <div className="card-floating flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <RotateCcw aria-hidden className="h-6 w-6" />
            </span>
            <p className="text-body text-ink">ไม่มีรายการรอคืนเงิน</p>
          </div>
        )}
      </div>
    </main>
  );
}
