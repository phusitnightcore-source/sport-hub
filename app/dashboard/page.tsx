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
  ShoppingCart,
  Boxes,
  Users,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Building,
  TrendingUp,
  LayoutGrid,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { bangkokToday, bangkokTodayLong } from "@/lib/api";
import { toSatang, formatBaht } from "@/lib/money";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";

const QUICK_ACTIONS = [
  { href: "/dashboard/bookings/new", label: "จองหน้าเคาน์เตอร์", icon: CalendarPlus, desc: "ล็อคคอร์ทและออกใบจอง", color: "text-brand bg-brand-soft" },
  { href: "/dashboard/schedule", label: "ตารางสนาม", icon: CalendarDays, desc: "ดูตารางคอร์ทรายวัน", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
  { href: "/dashboard/checkin", label: "เช็คอิน QR", icon: ScanLine, desc: "สแกนตั๋ว & บัตรสมาชิก", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
  { href: "/dashboard/payments", label: "ตรวจสลิปโอน", icon: ReceiptText, desc: "ตรวจยอดเงินโอนเข้า", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
  { href: "/pos", label: "POS หน้าร้าน", icon: ShoppingCart, desc: "ขายสินค้า & จัดการกะ", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
  { href: "/dashboard/inventory", label: "คลังสินค้า", icon: Boxes, desc: "ตรวจเช็ค & เติมสต็อก", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30" },
  { href: "/dashboard/members/new", label: "เพิ่มสมาชิก", icon: UserPlus, desc: "สมัคร & ออกแพ็กเกจ", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30" },
  { href: "/dashboard/reports", label: "รายงาน & ยอดขาย", icon: LineChart, desc: "สรุปรายได้และวิเคราะห์", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
];

export default async function DashboardPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const today = bangkokToday();

  // Parallel data fetching for comprehensive dashboard
  const [
    bookingsTodayRes,
    revenueRowsRes,
    awaitingSlipsRes,
    pendingRefundsRes,
    posSalesRes,
    inventoryRowsRes,
    productsRes,
    activeShiftsRes,
    recentBookingsRes,
    recentSalesRes,
    courtsRes,
    checkinsTodayRes,
  ] = await Promise.all([
    // 1. Bookings today count & list
    supabase
      .from("bookings")
      .select("id, status")
      .eq("tenant_id", ctx.tenantId)
      .eq("booking_date", today),
    // 2. Confirmed court booking revenue today
    supabase
      .from("bookings")
      .select("total_price")
      .eq("tenant_id", ctx.tenantId)
      .eq("booking_date", today)
      .eq("status", "confirmed"),
    // 3. Awaiting slip verification payments
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "awaiting_verification"),
    // 4. Pending refunds
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("refund_status", "awaiting_refund"),
    // 5. Completed POS sales today
    supabase
      .from("sales")
      .select("id, total_amount, booking_charge, completed_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "completed")
      .gte("completed_at", `${today}T00:00:00+07:00`)
      .lt("completed_at", `${today}T23:59:59.999+07:00`),
    // 6. Inventory levels
    supabase
      .from("inventory")
      .select("product_id, quantity, products(name, unit)"),
    // 7. Active products with stock tracking
    supabase
      .from("products")
      .select("id, name, low_stock_threshold, track_stock")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_active", true),
    // 8. Active open POS shifts
    supabase
      .from("pos_shifts")
      .select("id, opened_at, starting_cash, branch_id, branches(name)")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "open"),
    // 9. Recent upcoming bookings today (up to 6)
    supabase
      .from("bookings")
      .select("id, booking_code, start_time, end_time, court_id, status, user_name, user_phone, total_price, courts(name)")
      .eq("tenant_id", ctx.tenantId)
      .eq("booking_date", today)
      .order("start_time", { ascending: true })
      .limit(6),
    // 10. Recent POS sales today (up to 5)
    supabase
      .from("sales")
      .select("id, receipt_number, total_amount, completed_at, pos_payments(method, amount)")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5),
    // 11. Courts in tenant
    supabase
      .from("courts")
      .select("id, name, is_active, branch_id, branches(name)")
      .eq("tenant_id", ctx.tenantId)
      .order("name", { ascending: true }),
    // 12. Checkins passed today
    supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("result", "passed")
      .gte("checked_in_at", `${today}T00:00:00+07:00`),
  ]);

  // Calculations
  const allBookingsToday = bookingsTodayRes.data ?? [];
  const confirmedBookingsCount = allBookingsToday.filter((b) => b.status === "confirmed").length;
  const totalBookingsTodayCount = allBookingsToday.length;

  const courtRevenueSatang = (revenueRowsRes.data ?? []).reduce(
    (sum, r) => sum + toSatang(r.total_price),
    0
  );

  const posSalesList = posSalesRes.data ?? [];
  const posRevenueSatang = posSalesList.reduce(
    (sum, sale) => sum + toSatang(sale.total_amount) - toSatang(sale.booking_charge),
    0
  );
  const posSalesCount = posSalesList.length;

  const totalRevenueSatang = courtRevenueSatang + posRevenueSatang;

  const slipsCount = awaitingSlipsRes.count ?? 0;
  const refundsCount = pendingRefundsRes.count ?? 0;
  const checkinsCount = checkinsTodayRes.count ?? 0;

  // Low stock calculation
  const productThreshold = new Map(
    (productsRes.data ?? []).map((product) => [
      product.id,
      { threshold: product.low_stock_threshold, track: product.track_stock, name: product.name },
    ])
  );

  const lowStockItems = (inventoryRowsRes.data ?? []).filter((row) => {
    const product = productThreshold.get(row.product_id);
    return product?.track && row.quantity <= (product.threshold ?? 5);
  });
  const lowStockCount = lowStockItems.length;

  const openShifts = activeShiftsRes.data ?? [];
  const recentBookings = recentBookingsRes.data ?? [];
  const recentSales = recentSalesRes.data ?? [];
  const courts = courtsRes.data ?? [];

  // Urgent tasks
  const urgentAlerts = [
    {
      show: slipsCount > 0,
      href: "/dashboard/payments",
      icon: ReceiptText,
      tone: "warning" as const,
      title: "สลิปรอตรวจสอบ",
      desc: `${slipsCount} รายการ รออนุมัติการชำระเงิน`,
      badge: `${slipsCount} สลิป`,
      btnText: "ไปตรวจสลิป",
    },
    {
      show: refundsCount > 0,
      href: "/dashboard/refunds",
      icon: RotateCcw,
      tone: "danger" as const,
      title: "รายการรอคืนเงิน",
      desc: `${refundsCount} รายการ รอดำเนินการโอนเงินคืน`,
      badge: `${refundsCount} รายการ`,
      btnText: "จัดการคืนเงิน",
    },
    {
      show: lowStockCount > 0,
      href: "/dashboard/inventory",
      icon: Boxes,
      tone: "warning" as const,
      title: "สินค้าใกล้หมดสต็อก",
      desc: `${lowStockCount} รายการ ถึงจุดสั่งซื้อขั้นต่ำ`,
      badge: `${lowStockCount} สินค้า`,
      btnText: "เช็คสต็อก",
    },
    {
      show: openShifts.length > 0,
      href: "/pos",
      icon: ShoppingCart,
      tone: "brand" as const,
      title: "กะแคชเชียร์กำลังเปิดอยู่",
      desc: `กะสาขา: ${openShifts.map((s) => (s.branches as { name?: string } | null)?.name ?? "สาขาหลัก").join(", ")}`,
      badge: `${openShifts.length} กะ`,
      btnText: "เข้าสู่ POS",
    },
  ].filter((a) => a.show);

  return (
    <main className="flex flex-col gap-8 pb-12">
      {/* ========================================================================= */}
      {/* 1. HEADER & LIVE CONTEXT BAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
              ภาพรวมศูนย์กีฬา
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold text-brand shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              ระบบพร้อมใช้งาน
            </span>
          </div>
          <p className="flex items-center gap-2 text-body-sm text-ink-soft">
            <Clock className="h-4 w-4 text-brand" />
            <span className="font-medium">{bangkokTodayLong()}</span>
          </p>
        </div>

        {/* Quick Action Top Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dashboard/bookings/new">
            <Button size="sm" className="rounded-xl font-bold shadow-xs">
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              จองคอร์ทใหม่
            </Button>
          </Link>
          <Link href="/pos">
            <Button variant="secondary" size="sm" className="rounded-xl font-bold border-line bg-surface">
              <ShoppingCart className="mr-1.5 h-4 w-4 text-purple-600" />
              POS หน้าร้าน
            </Button>
          </Link>
          <Link href="/dashboard/checkin">
            <Button variant="secondary" size="sm" className="rounded-xl font-bold border-line bg-surface">
              <ScanLine className="mr-1.5 h-4 w-4 text-emerald-600" />
              เช็คอิน QR
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP 4 KEY PERFORMANCE METRICS (KPI GRID) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Revenue Today */}
        <div className="card-floating relative overflow-hidden p-5 flex flex-col justify-between border border-line">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">รายได้รวมวันนี้</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="my-2">
            <p className="font-display text-3xl font-extrabold text-ink">
              ฿{formatBaht(totalRevenueSatang)}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-line/60 text-[11px] font-medium text-ink-soft">
            <span>สนาม: ฿{formatBaht(courtRevenueSatang)}</span>
            <span>•</span>
            <span>POS: ฿{formatBaht(posRevenueSatang)}</span>
          </div>
        </div>

        {/* Metric 2: Bookings Today */}
        <div className="card-floating relative overflow-hidden p-5 flex flex-col justify-between border border-line">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">ยอดจองสนามวันนี้</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <p className="font-display text-3xl font-extrabold text-ink">
              {totalBookingsTodayCount}
            </p>
            <span className="text-body-sm text-ink-soft">รายการ</span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-line/60 text-[11px] font-medium text-ink-soft">
            <span className="text-emerald-600 font-bold">ยืนยันแล้ว {confirmedBookingsCount}</span>
            <span>•</span>
            <span>รอดำเนินการ {totalBookingsTodayCount - confirmedBookingsCount}</span>
          </div>
        </div>

        {/* Metric 3: POS Sales */}
        <div className="card-floating relative overflow-hidden p-5 flex flex-col justify-between border border-line">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">ยอดขาย POS หน้าร้าน</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <p className="font-display text-3xl font-extrabold text-ink">
              ฿{formatBaht(posRevenueSatang)}
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-line/60 text-[11px] font-medium text-ink-soft">
            <span>จำนวน {posSalesCount} ใบเสร็จ</span>
            <span className="text-brand font-bold">กะเปิดอยู่ {openShifts.length}</span>
          </div>
        </div>

        {/* Metric 4: Check-in & Activity */}
        <div className="card-floating relative overflow-hidden p-5 flex flex-col justify-between border border-line">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">การเช็คอินเข้าสนาม</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <ScanLine className="h-5 w-5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <p className="font-display text-3xl font-extrabold text-ink">
              {checkinsCount}
            </p>
            <span className="text-body-sm text-ink-soft">คนวันนี้</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-line/60 text-[11px] font-medium text-ink-soft">
            <span>สนามทั้งหมด {courts.length} คอร์ท</span>
            <span className="text-emerald-600 font-bold">พร้อมให้บริการ</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. URGENT ACTIONS / ATTENTION REQUIRED */}
      {/* ========================================================================= */}
      {urgentAlerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-body-lg font-bold text-ink flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span>งานที่ต้องดำเนินการทันที</span>
            </h2>
            <span className="text-[11px] font-semibold text-ink-soft">{urgentAlerts.length} รายการที่ต้องจัดการ</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {urgentAlerts.map((alert, i) => {
              const Icon = alert.icon;
              const isDanger = alert.tone === "danger";
              const isWarning = alert.tone === "warning";

              return (
                <Link
                  key={i}
                  href={alert.href}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    isDanger
                      ? "border-danger/30 bg-danger/5 hover:border-danger"
                      : isWarning
                      ? "border-warning/30 bg-warning/5 hover:border-warning"
                      : "border-brand/30 bg-brand-soft/40 hover:border-brand"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isDanger
                          ? "bg-danger/20 text-danger"
                          : isWarning
                          ? "bg-warning/20 text-warning"
                          : "bg-brand text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isDanger
                          ? "bg-danger text-white"
                          : isWarning
                          ? "bg-warning text-white"
                          : "bg-brand text-white"
                      }`}
                    >
                      {alert.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-body-sm font-bold text-ink">{alert.title}</h3>
                    <p className="text-[12px] text-ink-soft line-clamp-1">{alert.desc}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-line/60 text-[11px] font-bold text-brand group-hover:underline">
                    <span>{alert.btnText}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. TODAY'S UPCOMING BOOKINGS & RECENT SALES SPLIT VIEW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Upcoming Court Bookings Today */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-body-lg font-bold text-ink flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand" />
              <span>คิวจองสนามวันนี้</span>
            </h2>
            <Link
              href="/dashboard/bookings"
              className="text-body-sm font-bold text-brand hover:underline inline-flex items-center gap-1"
            >
              <span>ดูทั้งหมด ({totalBookingsTodayCount})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card-floating overflow-hidden rounded-2xl border border-line bg-surface">
            {recentBookings.length === 0 ? (
              <div className="p-10 text-center text-ink-soft">
                <CalendarDays className="mx-auto h-8 w-8 text-ink-soft/40 mb-2" />
                <p className="font-medium text-body-sm">ยังไม่มีรายการจองสนามในวันนี้</p>
                <Link href="/dashboard/bookings/new" className="mt-3 inline-block">
                  <Button size="sm" variant="secondary" className="rounded-xl">
                    + จองคอร์ททันที
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-body-sm">
                  <thead className="border-b border-line bg-surface/60 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    <tr>
                      <th className="px-4 py-3">เวลา</th>
                      <th className="px-4 py-3">สนาม / คอร์ท</th>
                      <th className="px-4 py-3">ผู้จอง</th>
                      <th className="px-4 py-3 text-right">ยอดเงิน</th>
                      <th className="px-4 py-3 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recentBookings.map((b) => {
                      const courtName = (b.courts as { name?: string } | null)?.name ?? "คอร์ท";
                      const statusTone: "success" | "warning" | "danger" | "brand" =
                        b.status === "confirmed"
                          ? "success"
                          : b.status === "awaiting_verification"
                          ? "warning"
                          : b.status === "cancelled"
                          ? "danger"
                          : "brand";

                      const statusLabel =
                        b.status === "confirmed"
                          ? "ยืนยันแล้ว"
                          : b.status === "awaiting_verification"
                          ? "รอตรวจสลิป"
                          : b.status === "cancelled"
                          ? "ยกเลิก"
                          : b.status;

                      return (
                        <tr key={b.id} className="hover:bg-brand-soft/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-ink whitespace-nowrap">
                            {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                          </td>
                          <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                            <span className="rounded-lg bg-surface border border-line px-2 py-0.5 text-[12px] font-semibold text-brand">
                              {courtName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink">
                            <p className="font-semibold truncate max-w-[140px]">{b.user_name || "ลูกค้าหน้าเคาน์เตอร์"}</p>
                            {b.user_phone && <p className="text-[11px] text-ink-soft">{b.user_phone}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-ink whitespace-nowrap">
                            ฿{formatBaht(toSatang(b.total_price))}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Right 1 Col: Recent POS Sales & Shift Status */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-body-lg font-bold text-ink flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-purple-600" />
              <span>บิลขาย POS ล่าสุด</span>
            </h2>
            <Link
              href="/pos"
              className="text-body-sm font-bold text-brand hover:underline inline-flex items-center gap-1"
            >
              <span>เปิด POS</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card-floating rounded-2xl border border-line bg-surface p-4 space-y-3">
            {recentSales.length === 0 ? (
              <div className="py-8 text-center text-ink-soft">
                <ShoppingCart className="mx-auto h-7 w-7 text-ink-soft/40 mb-2" />
                <p className="text-body-sm">ยังไม่มีบิลขาย POS วันนี้</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSales.map((sale) => {
                  const payments = (sale.pos_payments as { method?: string }[] | null) ?? [];
                  const paymentMethodName = payments[0]?.method === "promptpay" ? "PromptPay" : "เงินสด";

                  return (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-surface/60 border border-line hover:border-brand/30 transition-all"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-mono text-body-sm font-bold text-ink truncate">
                          {sale.receipt_number}
                        </p>
                        <p className="text-[11px] text-ink-soft">
                          {new Date(sale.completed_at).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {paymentMethodName}
                        </p>
                      </div>
                      <span className="font-mono text-body-sm font-bold text-purple-600 shrink-0">
                        ฿{formatBaht(toSatang(sale.total_amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Shift Status */}
            <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[12px]">
              <span className="text-ink-soft">กะที่เปิดใช้งาน:</span>
              <span className="font-bold text-ink">
                {openShifts.length > 0 ? `${openShifts.length} กะที่ทำงานอยู่` : "ไม่มีกะเปิด"}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 5. QUICK ACTIONS HUB (ศูนย์รวมทางลัดการทำงาน) */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <h2 className="font-display text-body-lg font-bold text-ink flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <span>ศูนย์รวมเมนูลัดประจำวัน (Quick Hub)</span>
        </h2>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-8">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="card-floating group flex flex-col items-center justify-center p-4 text-center border border-line transition-all duration-base hover:-translate-y-1 hover:border-brand/50 hover:shadow-md"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.color} mb-2.5 transition-transform group-hover:scale-110 shadow-xs`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-display text-body-sm font-bold text-ink group-hover:text-brand transition-colors truncate w-full">
                  {action.label}
                </span>
                <span className="mt-0.5 text-[10px] text-ink-soft line-clamp-1 w-full">
                  {action.desc}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
