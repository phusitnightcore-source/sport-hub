"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Lock,
  Calendar,
  Filter,
  TrendingUp,
  Store,
  CreditCard,
  Banknote,
  WalletCards,
  Users,
  CalendarDays,
  ShoppingCart,
  Layers,
  ChevronDown,
  Sparkles,
  Check,
  Package,
  Activity,
  DollarSign,
  Receipt,
  RotateCcw,
  ArrowRight,
  BarChart3,
  CalendarRange,
  History,
  FileText,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShiftReportModal } from "@/app/pos/ShiftReportModal";

type Branch = { id: string; name: string };
type Court = { id: string; name: string; branch_id: string };

export type ReportPayment = {
  id: string;
  branch_id: string | null;
  amount: number;
  method: string;
  booking_id: string | null;
  member_id: string | null;
  verified_at: string;
};

export type ReportPosSale = {
  id: string;
  branch_id: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  completed_at: string;
  receipt_number: string;
  customer_name: string | null;
  method: string;
};

export type ReportBooking = {
  id: string;
  court_id: string;
  branch_id: string;
  booking_date: string;
  total_price: number;
  status: string;
  created_at: string;
  payment_method: string;
};

export type ReportMember = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type TopProductItem = {
  name: string;
  quantity: number;
  revenue: number;
  branch_id: string;
};

export type ReportShift = {
  id: string;
  branch_id: string;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  status: "open" | "closed";
  starting_cash: number;
  actual_closing_cash: number | null;
  expected_closing_cash: number | null;
  notes: string | null;
};

export type DailyRevenueRow = {
  dateKey: string;
  dateDisplay: string;
  dayOfWeek: string;
  bookingRevenue: number;
  memberRevenue: number;
  posRevenue: number;
  totalRevenue: number;
  bookingCount: number;
  posOrderCount: number;
};

type ReportsClientProps = {
  branches: Branch[];
  courts: Court[];
  payments: ReportPayment[];
  posSales: ReportPosSale[];
  bookings: ReportBooking[];
  members: ReportMember[];
  topProducts: TopProductItem[];
  shifts: ReportShift[];
  entitlements: { export_reports: boolean };
  currentMonthStr: string;
};

function baht(value: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

// Custom Reusable Dropdown Component
function CustomDropdown<T extends string>({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: T;
  onChange: (val: T) => void;
  options: { key: T; label: string; sub?: string }[];
  icon: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption = options.find((o) => o.key === value) ?? options[0];

  return (
    <div className="relative flex flex-col gap-1.5" ref={dropdownRef}>
      <span className="text-[12px] font-bold text-ink-soft uppercase tracking-wider">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-body-sm font-semibold text-ink shadow-xs transition-all hover:border-brand/40 hover:bg-surface/90 focus:border-brand focus:ring-4 focus:ring-brand/10"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="truncate">{currentOption?.label}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200 ${
            isOpen ? "rotate-180 text-brand" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full min-w-56 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95">
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.key === value;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onChange(opt.key);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-body-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-brand-soft text-brand font-bold"
                      : "text-ink hover:bg-surface/80 hover:text-brand"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate">{opt.label}</p>
                    {opt.sub && <p className="text-[10px] text-ink-soft">{opt.sub}</p>}
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-brand" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportsClient({
  branches,
  courts,
  payments,
  posSales,
  bookings,
  members,
  topProducts,
  shifts,
  entitlements,
  currentMonthStr,
}: ReportsClientProps) {
  // Filters State
  const [datePreset, setDatePreset] = useState<"today" | "7days" | "30days" | "thisMonth" | "lastMonth" | "all">("thisMonth");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedRevenueType, setSelectedRevenueType] = useState<"all" | "booking" | "member" | "pos">("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"all" | "cash" | "transfer" | "card">("all");

  // Shift Modal State
  const [selectedReportShiftId, setSelectedReportShiftId] = useState<string | null>(null);

  const courtNames = useMemo(() => new Map(courts.map((c) => [c.id, c.name])), [courts]);
  const branchNames = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  // Options for custom dropdowns
  const dateOptions = useMemo(
    () => [
      { key: "thisMonth", label: `เดือนนี้ (${currentMonthStr})` },
      { key: "today", label: "วันนี้" },
      { key: "7days", label: "7 วันล่าสุด" },
      { key: "30days", label: "30 วันล่าสุด" },
      { key: "lastMonth", label: "เดือนที่แล้ว" },
      { key: "all", label: "ทั้งหมด (All Time)" },
    ],
    [currentMonthStr]
  );

  const branchOptions = useMemo(
    () => [
      { key: "all", label: `ทุกสาขา (${branches.length} สาขา)` },
      ...branches.map((b) => ({ key: b.id, label: b.name })),
    ],
    [branches]
  );

  const revenueTypeOptions = useMemo(
    () => [
      { key: "all", label: "ทุกประเภทรายได้", sub: "ค่าจอง + สมาชิก + POS" },
      { key: "booking", label: "ค่าจองสนาม", sub: "Court Bookings" },
      { key: "member", label: "ค่าสมาชิกฟิตเนส", sub: "Memberships" },
      { key: "pos", label: "ยอดขายหน้าร้าน", sub: "POS Sales" },
    ],
    []
  );

  const paymentOptions = useMemo(
    () => [
      { key: "all", label: "ทุกช่องทางชำระเงิน" },
      { key: "transfer", label: "โอนเงิน / PromptPay", sub: "QR & Bank Transfer" },
      { key: "cash", label: "เงินสด (Cash)", sub: "หน้าร้าน" },
      { key: "card", label: "บัตรเครดิต", sub: "Credit Card" },
      { key: "other", label: "อื่น ๆ", sub: "Other" },
    ],
    []
  );

  // Calculate Date Ranges
  const activeDateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (customStartDate && customEndDate) {
      start = new Date(`${customStartDate}T00:00:00+07:00`);
      end = new Date(`${customEndDate}T23:59:59+07:00`);
      return { start, end };
    }

    switch (datePreset) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case "7days":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case "all":
        start = new Date(2020, 0, 1);
        break;
      case "thisMonth":
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const pDate = new Date(p.verified_at);
      const matchDate = pDate >= activeDateRange.start && pDate <= activeDateRange.end;
      const matchMethod = selectedPaymentMethod === "all" || p.method === selectedPaymentMethod;
      const matchType =
        selectedRevenueType === "all" ||
        (selectedRevenueType === "booking" && p.booking_id) ||
        (selectedRevenueType === "member" && p.member_id);
      const matchBranch = selectedBranchId === "all" || p.branch_id === selectedBranchId;
      return matchDate && matchMethod && matchType && matchBranch;
    });
  }, [payments, activeDateRange, selectedPaymentMethod, selectedRevenueType, selectedBranchId]);

  // Filtered POS Sales
  const filteredPosSales = useMemo(() => {
    if (selectedRevenueType === "booking" || selectedRevenueType === "member") return [];
    return posSales.filter((s) => {
      const sDate = new Date(s.completed_at);
      const matchDate = sDate >= activeDateRange.start && sDate <= activeDateRange.end;
      const matchBranch = selectedBranchId === "all" || s.branch_id === selectedBranchId;
      const matchMethod = selectedPaymentMethod === "all" || s.method === selectedPaymentMethod;
      return matchDate && matchBranch && matchMethod;
    });
  }, [posSales, activeDateRange, selectedBranchId, selectedPaymentMethod, selectedRevenueType]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bDate = new Date(b.created_at);
      const matchDate = bDate >= activeDateRange.start && bDate <= activeDateRange.end;
      const matchBranch = selectedBranchId === "all" || b.branch_id === selectedBranchId;
      const matchMethod = selectedPaymentMethod === "all" || b.payment_method === selectedPaymentMethod;
      return matchDate && matchBranch && matchMethod;
    });
  }, [bookings, activeDateRange, selectedBranchId, selectedPaymentMethod]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const mDate = new Date(m.created_at);
      return mDate >= activeDateRange.start && mDate <= activeDateRange.end;
    });
  }, [members, activeDateRange]);

  // Filtered Shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      const sDate = new Date(s.opened_at);
      const matchDate = sDate >= activeDateRange.start && sDate <= activeDateRange.end;
      const matchBranch = selectedBranchId === "all" || s.branch_id === selectedBranchId;
      return matchDate && matchBranch;
    });
  }, [shifts, activeDateRange, selectedBranchId]);

  // Aggregated Key Metrics
  const metrics = useMemo(() => {
    const bookingRev = filteredPayments
      .filter((p) => p.booking_id)
      .reduce((sum, p) => sum + p.amount, 0);

    const memberRev = filteredPayments
      .filter((p) => p.member_id)
      .reduce((sum, p) => sum + p.amount, 0);

    const posRev = filteredPosSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalRev = bookingRev + memberRev + posRev;

    const totalBookings = filteredBookings.length;
    const completedBookings = filteredBookings.filter((b) => b.status === "confirmed").length;
    const cancelledBookings = filteredBookings.filter((b) =>
      ["cancelled", "rejected", "refunded", "awaiting_refund"].includes(b.status)
    ).length;
    const cancelRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : "0";

    const newMembersCount = filteredMembers.length;
    const activeMembersCount = members.filter((m) => m.status === "active").length;
    const frozenMembersCount = members.filter((m) => m.status === "frozen").length;

    const posOrdersCount = filteredPosSales.length;
    const posAov = posOrdersCount > 0 ? posRev / posOrdersCount : 0;

    // Shift closing aggregation
    const closedShifts = filteredShifts.filter((s) => s.status === "closed");
    const totalClosingCash = closedShifts.reduce((sum, s) => sum + (s.actual_closing_cash ?? 0), 0);
    const totalExpectedCash = closedShifts.reduce((sum, s) => sum + (s.expected_closing_cash ?? 0), 0);
    const totalVariance = totalClosingCash - totalExpectedCash;

    return {
      totalRev,
      bookingRev,
      memberRev,
      posRev,
      totalBookings,
      completedBookings,
      cancelledBookings,
      cancelRate,
      newMembersCount,
      activeMembersCount,
      frozenMembersCount,
      posOrdersCount,
      posAov,
      closedShiftsCount: closedShifts.length,
      totalClosingCash,
      totalExpectedCash,
      totalVariance,
    };
  }, [filteredPayments, filteredPosSales, filteredBookings, filteredMembers, members, filteredShifts]);

  // DAILY REVENUE TIMELINE CALCULATION
  const dailyRevenueRows = useMemo(() => {
    const dayMap = new Map<string, DailyRevenueRow>();

    // 1. Process payments
    for (const p of filteredPayments) {
      if (!p.verified_at) continue;
      const d = new Date(p.verified_at);
      const dateKey = d.toISOString().slice(0, 10);
      const dateDisplay = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
      const dayOfWeek = d.toLocaleDateString("th-TH", { weekday: "short" });

      const curr = dayMap.get(dateKey) ?? {
        dateKey,
        dateDisplay,
        dayOfWeek,
        bookingRevenue: 0,
        memberRevenue: 0,
        posRevenue: 0,
        totalRevenue: 0,
        bookingCount: 0,
        posOrderCount: 0,
      };

      if (p.booking_id) {
        curr.bookingRevenue += p.amount;
        curr.bookingCount += 1;
      }
      if (p.member_id) {
        curr.memberRevenue += p.amount;
      }
      curr.totalRevenue += p.amount;
      dayMap.set(dateKey, curr);
    }

    // 2. Process POS Sales
    for (const s of filteredPosSales) {
      if (!s.completed_at) continue;
      const d = new Date(s.completed_at);
      const dateKey = d.toISOString().slice(0, 10);
      const dateDisplay = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
      const dayOfWeek = d.toLocaleDateString("th-TH", { weekday: "short" });

      const curr = dayMap.get(dateKey) ?? {
        dateKey,
        dateDisplay,
        dayOfWeek,
        bookingRevenue: 0,
        memberRevenue: 0,
        posRevenue: 0,
        totalRevenue: 0,
        bookingCount: 0,
        posOrderCount: 0,
      };

      curr.posRevenue += s.total_amount;
      curr.posOrderCount += 1;
      curr.totalRevenue += s.total_amount;
      dayMap.set(dateKey, curr);
    }

    // Sort by date descending (newest first)
    const sorted = [...dayMap.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    const maxDaily = sorted.reduce((max, r) => Math.max(max, r.totalRevenue), 1);

    return { list: sorted, maxDaily };
  }, [filteredPayments, filteredPosSales]);

  // Top Courts Ranking
  const topCourtsList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of filteredBookings) {
      if (["cancelled", "rejected"].includes(b.status)) continue;
      counts.set(b.court_id, (counts.get(b.court_id) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        id,
        name: courtNames.get(id) ?? "สนาม",
        count,
      }));
    const maxCount = sorted[0]?.count ?? 1;
    return { list: sorted, maxCount };
  }, [filteredBookings, courtNames]);

  // Top Selling Products
  const topProductsFiltered = useMemo(() => {
    return topProducts
      .filter((p) => selectedBranchId === "all" || p.branch_id === selectedBranchId)
      .slice(0, 5);
  }, [topProducts, selectedBranchId]);

  return (
    <main className="flex flex-col gap-8 pb-10">
      {/* 1. Header & Export Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-display-md font-bold text-ink">
            รายงานและสถิติภาพรวม
          </h1>
          <p className="mt-1 text-body-sm text-ink-soft">
            วิเคราะห์รายได้ ยอดขายรายวัน ยอดปิดกะ POS การจองสนาม สมาชิกฟิตเนส และยอดขายสินค้า
          </p>
        </div>

        {entitlements.export_reports ? (
          <div className="flex flex-wrap gap-2.5">
            {[
              { type: "bookings", label: "CSV การจอง", icon: CalendarDays },
              { type: "members", label: "CSV สมาชิก", icon: Users },
              { type: "payments", label: "CSV รายได้", icon: Banknote },
              { type: "sales", label: "CSV ยอดขาย POS", icon: ShoppingCart },
            ].map((x) => {
              const Icon = x.icon;
              return (
                <a
                  key={x.type}
                  href={`/api/admin/reports/export?type=${x.type}&month=${currentMonthStr}`}
                >
                  <Button size="sm" variant="secondary" className="rounded-xl px-3.5 py-2 shadow-xs">
                    <Icon className="mr-1.5 h-4 w-4 text-brand" />
                    {x.label}
                  </Button>
                </a>
              );
            })}
          </div>
        ) : (
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-soft px-4 py-2 text-body-sm font-semibold text-brand-dark transition-all hover:bg-brand hover:text-white"
          >
            <Lock className="h-4 w-4" />
            Export CSV — อัปเกรดแพลน
          </Link>
        )}
      </div>

      {/* 2. RICH FILTER BAR (Custom Dropdowns + Date Pickers) */}
      <div className="card-floating p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-body-lg font-bold text-ink">ตัวกรองรายงาน</h2>
              <p className="text-mono-sm text-ink-soft">เลือกช่วงเวลา สาขา และประเภทข้อมูลที่ต้องการดู</p>
            </div>
          </div>

          {(customStartDate || customEndDate || datePreset !== "thisMonth" || selectedBranchId !== "all" || selectedRevenueType !== "all" || selectedPaymentMethod !== "all") && (
            <button
              type="button"
              onClick={() => {
                setDatePreset("thisMonth");
                setCustomStartDate("");
                setCustomEndDate("");
                setSelectedBranchId("all");
                setSelectedRevenueType("all");
                setSelectedPaymentMethod("all");
              }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-body-sm font-semibold text-danger hover:bg-danger/10 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>รีเซ็ตตัวกรอง</span>
            </button>
          )}
        </div>

        {/* 4 Sleek Custom Dropdowns */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CustomDropdown
            label="ช่วงเวลา"
            value={datePreset}
            onChange={(val) => {
              setDatePreset(val as any);
              setCustomStartDate("");
              setCustomEndDate("");
            }}
            options={dateOptions}
            icon={Calendar}
          />

          <CustomDropdown
            label="สาขา"
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            options={branchOptions}
            icon={Store}
          />

          <CustomDropdown
            label="ประเภทรายได้"
            value={selectedRevenueType}
            onChange={(val) => setSelectedRevenueType(val as any)}
            options={revenueTypeOptions}
            icon={DollarSign}
          />

          <CustomDropdown
            label="ช่องทางชำระเงิน"
            value={selectedPaymentMethod}
            onChange={(val) => setSelectedPaymentMethod(val as any)}
            options={paymentOptions}
            icon={WalletCards}
          />
        </div>

        {/* Custom Date Range Picker */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-line/60">
          <span className="text-[12px] font-bold text-ink-soft uppercase tracking-wider">หรือระบุวันที่เอง:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3.5 py-2 text-body-sm font-semibold text-ink shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
            />
            <span className="text-body-sm font-semibold text-ink-soft">ถึง</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3.5 py-2 text-body-sm font-semibold text-ink shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
            />
          </div>
          {(customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setCustomStartDate("");
                setCustomEndDate("");
                setDatePreset("thisMonth");
              }}
              className="text-body-sm font-semibold text-danger hover:underline"
            >
              ยกเลิกกำหนดวันเอง
            </button>
          )}
        </div>
      </div>

      {/* 3. FINANCIAL REVENUE OVERVIEW CARDS */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Net Revenue Card */}
        <div className="card-floating bg-gradient-to-br from-brand/12 via-surface to-surface p-6 border-brand/30 shadow-md">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-body-sm font-bold text-brand">รายได้สุทธิรวม</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
            ฿{baht(metrics.totalRev)}
          </p>
          <p className="mt-1.5 text-[12px] font-medium text-ink-soft">รวมทุกหมวดหมู่ในช่วงเวลาที่เลือก</p>
        </div>

        {/* Booking Revenue */}
        <div className="card-floating p-6">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-body-sm font-semibold">รายได้ค่าจองสนาม</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">
            ฿{baht(metrics.bookingRev)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">{metrics.completedBookings} การจองที่สำเร็จ</p>
        </div>

        {/* Member Revenue */}
        <div className="card-floating p-6">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-body-sm font-semibold">รายได้ค่าสมาชิกฟิตเนส</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">
            ฿{baht(metrics.memberRev)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">สมาชิกใหม่ {metrics.newMembersCount} คน</p>
        </div>

        {/* POS Sales Revenue */}
        <div className="card-floating p-6">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-body-sm font-semibold">ยอดขายหน้าร้าน (POS)</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">
            ฿{baht(metrics.posRev)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">{metrics.posOrdersCount} บิล (เฉลี่ย ฿{baht(metrics.posAov)}/บิล)</p>
        </div>
      </div>

      {/* 4. DAILY SALES & REVENUE TIMELINE (ยอดขายรายวัน) */}
      <div className="card-floating overflow-hidden p-0 shadow-md">
        <div className="flex flex-col border-b border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-body-lg font-bold text-ink">ยอดขายและรายได้รายวัน (Daily Revenue)</h2>
              <p className="text-mono-sm text-ink-soft">
                สรุปยอดขายแยกตามรายวัน ({dailyRevenueRows.list.length} วันที่มีรายการ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-line bg-surface/70 px-3 py-1.5 font-mono text-[12px] font-bold text-ink">
              เฉลี่ย ฿{baht(dailyRevenueRows.list.length > 0 ? metrics.totalRev / dailyRevenueRows.list.length : 0)} / วัน
            </span>
          </div>
        </div>

        {dailyRevenueRows.list.length === 0 ? (
          <div className="p-12 text-center text-body-sm text-ink-soft">
            ไม่มีข้อมูลรายได้หรือยอดขายในช่วงเวลาที่เลือก
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="border-b border-line bg-surface/70 text-[12px] font-bold text-ink-soft">
                <tr>
                  <th className="px-6 py-4">วันที่</th>
                  <th className="px-4 py-4 text-right">ค่าจองสนาม</th>
                  <th className="px-4 py-4 text-right">ค่าสมาชิก</th>
                  <th className="px-4 py-4 text-right">ยอดขาย POS</th>
                  <th className="px-4 py-4 text-right">รวมรายวัน</th>
                  <th className="px-6 py-4 text-left w-48">สัดส่วนรายได้</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 font-mono">
                {dailyRevenueRows.list.map((row) => {
                  const percent = Math.max(8, (row.totalRevenue / dailyRevenueRows.maxDaily) * 100);
                  return (
                    <tr key={row.dateKey} className="hover:bg-brand-soft/20 transition-colors font-medium">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-block rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                            {row.dayOfWeek}
                          </span>
                          <span className="font-sans font-bold text-ink">{row.dateDisplay}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-ink">
                        {row.bookingRevenue > 0 ? `฿${baht(row.bookingRevenue)}` : "—"}
                      </td>
                      <td className="px-4 py-4 text-right text-purple-700">
                        {row.memberRevenue > 0 ? `฿${baht(row.memberRevenue)}` : "—"}
                      </td>
                      <td className="px-4 py-4 text-right text-emerald-700">
                        {row.posRevenue > 0 ? `฿${baht(row.posRevenue)}` : "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-brand text-body">
                        ฿{baht(row.totalRevenue)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface/80 border border-line">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand to-brand/70"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-sans text-ink-soft shrink-0">
                            {row.bookingCount + row.posOrderCount} รายการ
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-line bg-surface/90 font-mono font-bold text-ink">
                <tr>
                  <td className="px-6 py-4 font-sans text-body font-bold">รวมทั้งหมด ({dailyRevenueRows.list.length} วัน)</td>
                  <td className="px-4 py-4 text-right text-body">฿{baht(metrics.bookingRev)}</td>
                  <td className="px-4 py-4 text-right text-purple-700 text-body">฿{baht(metrics.memberRev)}</td>
                  <td className="px-4 py-4 text-right text-emerald-700 text-body">฿{baht(metrics.posRev)}</td>
                  <td className="px-4 py-4 text-right text-brand text-body-lg">฿{baht(metrics.totalRev)}</td>
                  <td className="px-6 py-4 font-sans text-[12px] text-ink-soft">สรุปยอดรวมสุทธิ</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 5. POS SHIFT CLOSING & CASH RECONCILIATION REPORT (รายงานยอดปิดกะ) */}
      <div className="card-floating overflow-hidden p-0 shadow-md">
        <div className="flex flex-col border-b border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-body-lg font-bold text-ink">รายงานยอดปิดกะการขาย (POS Shift Closings)</h2>
              <p className="text-mono-sm text-ink-soft">
                ตรวจเช็กกระทบยอดเงินสดในลิ้นชักและส่วนต่างขาด/เกิน ({filteredShifts.length} กะในช่วงเวลา)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-line bg-surface/70 px-3.5 py-1.5 text-[12px]">
              <span className="text-ink-soft">เงินสดปิดกะรวม: </span>
              <strong className="font-mono text-ink">฿{baht(metrics.totalClosingCash)}</strong>
            </div>
            <div className="rounded-xl border border-line bg-surface/70 px-3.5 py-1.5 text-[12px]">
              <span className="text-ink-soft">ส่วนต่างสุทธิ: </span>
              <strong
                className={`font-mono ${
                  metrics.totalVariance === 0
                    ? "text-success"
                    : metrics.totalVariance > 0
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {metrics.totalVariance > 0 ? "+" : ""}
                ฿{baht(metrics.totalVariance)}
              </strong>
            </div>
          </div>
        </div>

        {filteredShifts.length === 0 ? (
          <div className="p-12 text-center text-body-sm text-ink-soft">
            ยังไม่มีประวัติการเปิด-ปิดกะในช่วงเวลาและสาขาที่เลือก
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="border-b border-line bg-surface/70 text-[12px] font-bold text-ink-soft">
                <tr>
                  <th className="px-6 py-4">เวลาเปิดกะ</th>
                  <th className="px-4 py-4">เวลาปิดกะ</th>
                  <th className="px-4 py-4">สาขา</th>
                  <th className="px-4 py-4 text-right">เงินทอนเริ่ม</th>
                  <th className="px-4 py-4 text-right">เงินสดที่ควรมี</th>
                  <th className="px-4 py-4 text-right">เงินสดที่นับได้</th>
                  <th className="px-4 py-4 text-right">ส่วนต่าง</th>
                  <th className="px-4 py-4 text-center">สถานะ</th>
                  <th className="px-6 py-4 text-right">รายงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 font-mono">
                {filteredShifts.map((shift) => {
                  const diff =
                    shift.actual_closing_cash !== null && shift.expected_closing_cash !== null
                      ? shift.actual_closing_cash - shift.expected_closing_cash
                      : null;
                  return (
                    <tr key={shift.id} className="hover:bg-brand-soft/20 transition-colors font-medium">
                      <td className="px-6 py-4 font-sans text-ink font-semibold">
                        {new Date(shift.opened_at).toLocaleString("th-TH", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-4 font-sans text-ink-soft">
                        {shift.closed_at
                          ? new Date(shift.closed_at).toLocaleString("th-TH", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "— (เปิดอยู่)"}
                      </td>
                      <td className="px-4 py-4 font-sans text-ink">
                        {branchNames.get(shift.branch_id) ?? "สาขา"}
                      </td>
                      <td className="px-4 py-4 text-right text-ink">
                        ฿{baht(shift.starting_cash)}
                      </td>
                      <td className="px-4 py-4 text-right text-ink">
                        {shift.expected_closing_cash !== null ? `฿${baht(shift.expected_closing_cash)}` : "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-ink">
                        {shift.actual_closing_cash !== null ? `฿${baht(shift.actual_closing_cash)}` : "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {diff === null ? (
                          "—"
                        ) : diff === 0 ? (
                          <span className="text-success">พอดี</span>
                        ) : diff > 0 ? (
                          <span className="text-success">+฿{baht(diff)}</span>
                        ) : (
                          <span className="text-danger">-฿{baht(Math.abs(diff))}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {shift.status === "open" ? (
                          <span className="pill-success inline-block rounded-md px-2 py-0.5 text-[11px] font-bold">
                            เปิดอยู่
                          </span>
                        ) : (
                          <span className="inline-block rounded-md bg-surface border border-line px-2 py-0.5 text-[11px] text-ink-soft">
                            ปิดกะแล้ว
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl font-sans"
                          onClick={() => setSelectedReportShiftId(shift.id)}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5 text-brand" />
                          ดูรายงานกะ
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. OPERATIONAL KPI METRICS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card-floating p-5 text-center space-y-1">
          <p className="text-[12px] font-bold text-ink-soft uppercase tracking-wider">การจองทั้งหมด</p>
          <p className="font-mono text-2xl font-bold text-ink">{metrics.totalBookings}</p>
          <span className="text-[11px] text-ink-soft">รายการ</span>
        </div>

        <div className="card-floating p-5 text-center space-y-1">
          <p className="text-[12px] font-bold text-success uppercase tracking-wider">การจองสำเร็จ</p>
          <p className="font-mono text-2xl font-bold text-success">{metrics.completedBookings}</p>
          <span className="text-[11px] text-ink-soft">ยืนยันแล้ว</span>
        </div>

        <div className="card-floating p-5 text-center space-y-1">
          <p className="text-[12px] font-bold text-danger uppercase tracking-wider">ยกเลิก / ปฏิเสธ</p>
          <p className="font-mono text-2xl font-bold text-danger">{metrics.cancelledBookings}</p>
          <span className="text-[11px] text-danger font-bold">({metrics.cancelRate}%)</span>
        </div>

        <div className="card-floating p-5 text-center space-y-1">
          <p className="text-[12px] font-bold text-ink-soft uppercase tracking-wider">สมาชิก Active</p>
          <p className="font-mono text-2xl font-bold text-brand">{metrics.activeMembersCount}</p>
          <span className="text-[11px] text-ink-soft">คน</span>
        </div>

        <div className="card-floating p-5 text-center space-y-1">
          <p className="text-[12px] font-bold text-ink-soft uppercase tracking-wider">สมาชิก Frozen</p>
          <p className="font-mono text-2xl font-bold text-warning">{metrics.frozenMembersCount}</p>
          <span className="text-[11px] text-ink-soft">คน</span>
        </div>

        <div className="card-floating p-5 text-center space-y-1">
          <p className="text-[12px] font-bold text-ink-soft uppercase tracking-wider">บิลขาย POS</p>
          <p className="font-mono text-2xl font-bold text-ink">{metrics.posOrdersCount}</p>
          <span className="text-[11px] text-ink-soft">รายการ</span>
        </div>
      </div>

      {/* 7. POPULAR COURTS & TOP PRODUCTS (Visual Cards) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Courts Chart */}
        <div className="card-floating p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="font-display text-body-lg font-bold text-ink">สนามยอดนิยม (ตามจำนวนการจอง)</h2>
              <p className="text-mono-sm text-ink-soft">จัดอันดับ 5 สนามที่มีรอบจองมากที่สุด</p>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-mono-sm font-bold text-brand">5 อันดับแรก</span>
          </div>

          {topCourtsList.list.length === 0 ? (
            <p className="py-12 text-center text-body-sm text-ink-soft">ยังไม่มีข้อมูลการจองในช่วงเวลานี้</p>
          ) : (
            <div className="space-y-4">
              {topCourtsList.list.map((court, index) => {
                const percent = Math.max(10, (court.count / topCourtsList.maxCount) * 100);
                return (
                  <div key={court.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-body-sm font-bold">
                      <span className="text-ink">
                        <span className="mr-2 text-brand">#{index + 1}</span>
                        {court.name}
                      </span>
                      <span className="font-mono text-brand">{court.count} ครั้ง</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-surface/60 border border-line">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-brand/70 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="card-floating p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="font-display text-body-lg font-bold text-ink">สินค้าขายดีหน้าร้าน (Top POS)</h2>
              <p className="text-mono-sm text-ink-soft">จัดอันดับยอดขายสะสมตามจำนวนเงิน</p>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-mono-sm font-bold text-brand">Top Products</span>
          </div>

          {topProductsFiltered.length === 0 ? (
            <p className="py-12 text-center text-body-sm text-ink-soft">ยังไม่มีรายการขายสินค้าหน้าร้าน</p>
          ) : (
            <div className="divide-y divide-line/60">
              {topProductsFiltered.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3 hover:bg-brand-soft/10 transition-colors rounded-xl px-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-soft text-[12px] font-bold text-brand shadow-xs">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-ink">{p.name}</p>
                      <p className="text-[12px] text-ink-soft">ขายได้ {p.quantity} ชิ้น</p>
                    </div>
                  </div>
                  <span className="font-mono text-body-lg font-bold text-brand">฿{baht(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SHIFT REPORT DETAIL MODAL */}
      {selectedReportShiftId && (
        <ShiftReportModal
          shiftId={selectedReportShiftId}
          onClose={() => setSelectedReportShiftId(null)}
        />
      )}
    </main>
  );
}
