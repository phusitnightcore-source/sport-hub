import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { bangkokToday } from "@/lib/api";
import { toSatang, formatBaht } from "@/lib/money";
import { StatCard } from "@/components/ui/StatCard";

// ภาพรวมวันนี้ (SCOPE §7.2 Dashboard) — อ่านผ่าน session client ตาม RLS ปกติ
export default async function DashboardPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const today = bangkokToday();

  const [bookingsToday, revenueRows, awaitingSlips, pendingRefunds] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("booking_date", today)
        .in("status", ["awaiting_verification", "confirmed"]),
      supabase
        .from("bookings")
        .select("total_price")
        .eq("booking_date", today)
        .eq("status", "confirmed"),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "awaiting_verification"),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("refund_status", "awaiting_refund"),
    ]);

  const revenueSatang = (revenueRows.data ?? []).reduce(
    (sum, r) => sum + toSatang(r.total_price),
    0,
  );

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        ภาพรวมวันนี้
      </h1>
      <StatCard
        stats={[
          { label: "ยอดจองวันนี้", value: bookingsToday.count ?? 0, unit: "รายการ" },
          {
            label: "รายได้ยืนยันแล้ววันนี้",
            value: `฿${formatBaht(revenueSatang)}`,
          },
          {
            label: "สลิปรอตรวจ",
            value: awaitingSlips.count ?? 0,
            unit: "รายการ",
          },
          {
            label: "รอคืนเงิน",
            value: pendingRefunds.count ?? 0,
            unit: "รายการ",
          },
        ]}
      />
      <p className="text-body-sm text-ink-soft">
        เลือกเมนูด้านซ้ายเพื่อจัดการการจอง ตรวจสลิป หรือยืนยันการคืนเงิน
      </p>
    </main>
  );
}
