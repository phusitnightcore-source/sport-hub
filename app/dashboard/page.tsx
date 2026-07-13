import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarPlus,
  ScanLine,
  UserPlus,
  TicketCheck,
  LineChart,
  ReceiptText,
  RotateCcw,
  ArrowRight,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { bangkokToday, bangkokTodayLong } from "@/lib/api";
import { toSatang, formatBaht } from "@/lib/money";
import { StatCard } from "@/components/ui/StatCard";

const QUICK_ACTIONS = [
  { href: "/dashboard/bookings/new", label: "จองหน้าเคาน์เตอร์", icon: CalendarPlus },
  { href: "/dashboard/checkin", label: "เช็คอิน", icon: ScanLine },
  { href: "/dashboard/members/new", label: "เพิ่มสมาชิก", icon: UserPlus },
  { href: "/dashboard/guest-passes", label: "ออกบัตรชั่วคราว", icon: TicketCheck },
  { href: "/dashboard/analytics", label: "ดูการวิเคราะห์", icon: LineChart },
  { href: "/dashboard/reports", label: "รายงาน", icon: ReceiptText },
];

// ภาพรวมวันนี้ (SCOPE §7.2 / §21 Dashboard KPI)
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
  const slips = awaitingSlips.count ?? 0;
  const refunds = pendingRefunds.count ?? 0;

  const tasks = [
    {
      show: slips > 0,
      href: "/dashboard/payments",
      icon: ReceiptText,
      tone: "warning" as const,
      label: "สลิปรอตรวจสอบ",
      count: slips,
    },
    {
      show: refunds > 0,
      href: "/dashboard/refunds",
      icon: RotateCcw,
      tone: "danger" as const,
      label: "รายการรอคืนเงิน",
      count: refunds,
    },
  ].filter((t) => t.show);

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display-md font-semibold text-ink">
          ภาพรวมวันนี้
        </h1>
        <p className="flex items-center gap-1.5 text-body-sm text-ink-soft">
          <Clock className="h-4 w-4" />
          {bangkokTodayLong()}
        </p>
      </div>

      <StatCard
        stats={[
          { label: "ยอดจองวันนี้", value: bookingsToday.count ?? 0, unit: "รายการ" },
          { label: "รายได้ยืนยันแล้ววันนี้", value: `฿${formatBaht(revenueSatang)}` },
          { label: "สลิปรอตรวจ", value: slips, unit: "รายการ" },
          { label: "รอคืนเงิน", value: refunds, unit: "รายการ" },
        ]}
      />

      {/* งานที่ต้องทำ */}
      {tasks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-body-lg font-semibold text-ink">
            งานที่ต้องทำ
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {tasks.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="card-floating group flex items-center gap-4 p-5 transition-all duration-base hover:-translate-y-0.5 hover:shadow-lg"
              >
                <span
                  className={
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full " +
                    (t.tone === "danger"
                      ? "bg-danger/10 text-danger"
                      : "bg-warning/10 text-warning")
                  }
                >
                  <t.icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="font-display text-display-md font-bold text-ink">
                    {t.count}
                  </p>
                  <p className="text-body-sm text-ink-soft">{t.label}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-ink-soft transition-transform duration-fast group-hover:translate-x-1 group-hover:text-brand" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ทางลัด */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-body-lg font-semibold text-ink">ทางลัด</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="card-floating group flex flex-col items-center gap-3 p-5 text-center transition-all duration-base hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand transition-colors duration-fast group-hover:bg-brand group-hover:text-white">
                <a.icon className="h-6 w-6" />
              </span>
              <span className="text-body-sm font-medium text-ink">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
