import Link from "next/link";
import { redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { formatBahtFromDb } from "@/lib/money";
import { ListRowCard, LeadingIcon } from "@/components/ui/ListRowCard";
import { StatusPill } from "@/components/ui/StatusPill";

// คิวสลิปรอตรวจ (§9.6) — เรียงเก่าสุดก่อนเพื่อไม่ให้ลูกค้ารอนาน
export default async function PaymentsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount, sender_name, submitted_at, bookings(booking_code, user_name, booking_date, start_time, end_time, courts(name)), members(first_name, last_name, member_number), packages(name)",
    )
    .eq("status", "awaiting_verification")
    .order("submitted_at", { ascending: true });

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        สลิปรอตรวจ
      </h1>
      <div className="flex flex-col gap-3">
        {(payments ?? []).map((p) => (
          <Link key={p.id} href={`/dashboard/payments/${p.id}`}>
            <ListRowCard
              leading={
                <LeadingIcon>
                  <ReceiptText aria-hidden />
                </LeadingIcon>
              }
              title={
                p.bookings
                  ? `${p.bookings.user_name} · ${p.bookings.courts?.name ?? ""}`
                  : `${p.members?.first_name ?? ""} ${p.members?.last_name ?? ""} · ค่าสมาชิก ${p.packages?.name ?? ""}`
              }
              subtitle={`ผู้โอน: ${p.sender_name ?? "-"} · แนบเมื่อ ${new Date(p.submitted_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`}
              trailing={
                <StatusPill tone="warning">
                  ฿{formatBahtFromDb(p.amount)}
                </StatusPill>
              }
            >
              <span className="font-mono text-mono-sm text-ink-soft">
                {p.bookings?.booking_code ?? p.members?.member_number}
              </span>
            </ListRowCard>
          </Link>
        ))}
        {(payments ?? []).length === 0 && (
          <div className="card-floating flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <ReceiptText aria-hidden className="h-6 w-6" />
            </span>
            <p className="text-body text-ink">ไม่มีสลิปรอตรวจ</p>
          </div>
        )}
      </div>
    </main>
  );
}
