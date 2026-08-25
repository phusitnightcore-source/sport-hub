"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  WalletCards,
  LogOut,
  FileText,
  X,
  Trash2,
  Tag,
  User,
  Phone,
  QrCode,
  Layers,
  Store,
  Sparkles,
  ArrowRight,
  Receipt,
  RotateCcw,
  ChevronDown,
  Check,
  AlertTriangle,
  History,
  TrendingUp,
  Clock,
  ArrowLeft,
  Calendar,
  ExternalLink,
  PackageOpen,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { completePosSale, openShift, closeShift } from "./actions";
import { ShiftReportModal } from "./ShiftReportModal";

export type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  type: "product" | "rental" | "service";
  sellingPrice: number;
  trackStock: boolean;
  stockByBranch: Record<string, number>;
};

export type ShiftHistoryItem = {
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

export type SaleHistoryItem = {
  id: string;
  receipt_number: string;
  sale_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  discount_amount: number;
  subtotal: number;
  completed_at: string;
  branch_id: string;
  shift_id: string | null;
  payment_method?: string;
};

type Branch = { id: string; name: string };
type PaymentMethod = "cash" | "transfer" | "card" | "other";
type Shift = { id: string; branch_id: string; opened_at: string; starting_cash: number };

const PAYMENT_OPTIONS: { key: PaymentMethod; label: string; sub: string; icon: typeof Banknote }[] = [
  { key: "cash", label: "เงินสด", sub: "Cash", icon: Banknote },
  { key: "transfer", label: "โอนเงิน / QR", sub: "PromptPay", icon: WalletCards },
  { key: "card", label: "บัตรเครดิต", sub: "Credit Card", icon: CreditCard },
  { key: "other", label: "อื่น ๆ", sub: "Other", icon: Tag },
];

const QUICK_STARTING_CASH = [500, 1000, 2000, 3000, 5000];
const QUICK_DISCOUNTS = [20, 50, 100];

function baht(value: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

const CATEGORIES = [
  { key: "all", label: "ทั้งหมด", icon: Layers },
  { key: "product", label: "สินค้า / เครื่องดื่ม", icon: Package },
  { key: "rental", label: "อุปกรณ์เช่า", icon: Tag },
  { key: "service", label: "บริการ / คอร์ส", icon: Sparkles },
] as const;

export function PosClient({
  branches,
  products,
  activeShifts,
  pastShifts,
  pastSales,
}: {
  branches: Branch[];
  products: PosProduct[];
  activeShifts: Shift[];
  pastShifts: ShiftHistoryItem[];
  pastSales: SaleHistoryItem[];
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [viewMode, setViewMode] = useState<"hub" | "register">("hub");
  const [hubTab, setHubTab] = useState<"shifts" | "sales">("shifts");

  // Register State
  const [cart, setCart] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "product" | "rental" | "service">("all");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [discount, setDiscount] = useState("0");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Dropdown State
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Modals State
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [selectedReportShiftId, setSelectedReportShiftId] = useState<string | null>(null);
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);

  // Shift Management State
  const [startingCash, setStartingCash] = useState("1000");
  const [actualCash, setActualCash] = useState("");
  const [shiftNote, setShiftNote] = useState("");

  const activeShift = activeShifts.find((s) => s.branch_id === branchId);
  const currentBranch = branches.find((b) => b.id === branchId) ?? branches[0];
  const branchNames = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  // Daily Summary Stats Calculation
  const todayStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todaySales = pastSales.filter(
      (s) => new Date(s.completed_at).toDateString() === todayStr && s.branch_id === branchId
    );
    const totalRev = todaySales.reduce((acc, s) => acc + s.total_amount, 0);
    const cashRev = todaySales
      .filter((s) => s.payment_method === "cash")
      .reduce((acc, s) => acc + s.total_amount, 0);
    const transferRev = todaySales
      .filter((s) => s.payment_method === "transfer" || s.payment_method === "card")
      .reduce((acc, s) => acc + s.total_amount, 0);
    return {
      count: todaySales.length,
      totalRev,
      cashRev,
      transferRev,
    };
  }, [pastSales, branchId]);

  // Filtered History
  const filteredShifts = useMemo(() => {
    return pastShifts.filter((s) => s.branch_id === branchId);
  }, [pastShifts, branchId]);

  const filteredSales = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return pastSales.filter((s) => {
      const matchBranch = s.branch_id === branchId;
      const matchSearch =
        !q ||
        s.receipt_number.toLowerCase().includes(q) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q));
      return matchBranch && matchSearch;
    });
  }, [pastSales, branchId, historySearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categoryCounts = useMemo(() => {
    return {
      all: products.length,
      product: products.filter((p) => p.type === "product").length,
      rental: products.filter((p) => p.type === "rental").length,
      service: products.filter((p) => p.type === "service").length,
    };
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchCategory = selectedCategory === "all" || product.type === selectedCategory;
      const matchSearch =
        !normalized || `${product.name} ${product.sku ?? ""}`.toLocaleLowerCase().includes(normalized);
      return matchCategory && matchSearch;
    });
  }, [products, query, selectedCategory]);

  const items = products
    .filter((product) => cart[product.id])
    .map((product) => ({ product, quantity: cart[product.id] }));

  const subtotal = items.reduce((total, item) => total + item.product.sellingPrice * item.quantity, 0);
  const discountAmount = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - discountAmount);
  const totalItemsCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

  function stockFor(product: PosProduct) {
    return product.stockByBranch[branchId] ?? 0;
  }

  function updateQuantity(product: PosProduct, change: number) {
    setError(null);
    setCart((current) => {
      const nextQuantity = (current[product.id] ?? 0) + change;
      if (product.trackStock && nextQuantity > stockFor(product)) return current;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[product.id];
        return next;
      }
      return { ...current, [product.id]: nextQuantity };
    });
  }

  function handleRequestClearCart() {
    if (items.length === 0) return;
    setShowClearCartModal(true);
  }

  function confirmClearCart() {
    setCart({});
    setDiscount("0");
    setCustomerName("");
    setCustomerPhone("");
    setBookingCode("");
    setNote("");
    setError(null);
    setShowClearCartModal(false);
  }

  function handleRequestBranchChange(targetId: string) {
    if (targetId === branchId) {
      setIsBranchDropdownOpen(false);
      return;
    }
    if (items.length > 0) {
      setPendingBranchId(targetId);
      setIsBranchDropdownOpen(false);
      return;
    }
    setBranchId(targetId);
    setCart({});
    setError(null);
    setIsBranchDropdownOpen(false);
  }

  function confirmSwitchBranch() {
    if (pendingBranchId) {
      setBranchId(pendingBranchId);
      setCart({});
      setError(null);
      setPendingBranchId(null);
    }
  }

  function handleRequestExit() {
    if (items.length > 0 && viewMode === "register") {
      setShowExitModal(true);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleOpenShift(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const amount = Number(startingCash);
    if (isNaN(amount) || amount < 0) {
      setError("จำนวนเงินเริ่มต้นไม่ถูกต้อง");
      setBusy(false);
      return;
    }
    const res = await openShift(branchId, amount);
    if (res.error) {
      setError(res.error);
    } else {
      setStartingCash("");
      setShowOpenShiftModal(false);
      setViewMode("register");
      router.refresh();
    }
    setBusy(false);
  }

  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault();
    if (!activeShift) return;
    setBusy(true);
    setError(null);
    const amount = Number(actualCash);
    if (isNaN(amount) || amount < 0) {
      setError("จำนวนเงินสดที่นับได้ไม่ถูกต้อง");
      setBusy(false);
      return;
    }
    const res = await closeShift(activeShift.id, amount, shiftNote);
    if (res.error) {
      setError(res.error);
    } else {
      setShowCloseShiftModal(false);
      setActualCash("");
      setShiftNote("");
      setViewMode("hub");
      router.refresh();
    }
    setBusy(false);
  }

  async function checkout() {
    if (!activeShift) {
      setError("กรุณาเปิดกะก่อนทำการขาย");
      return;
    }
    if (items.length === 0) return;
    if (discountAmount > subtotal) {
      setError("ส่วนลดต้องไม่เกินยอดรวมสินค้า");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await completePosSale({
      branchId,
      shiftId: activeShift.id,
      items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      paymentMethod,
      customerName,
      customerPhone,
      bookingCode,
      discountAmount,
      note,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/pos/${result.saleId}/receipt`);
    router.refresh();
  }

  // ==========================================
  // VIEW 1: POS HUB / MAIN LANDING PAGE
  // ==========================================
  if (viewMode === "hub") {
    return (
      <div className="flex min-h-screen flex-col bg-surface/30">
        {/* Top Hub Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-body-lg font-bold text-ink">SportHub POS Hub</h1>
              <p className="text-mono-sm text-ink-soft">ศูนย์ควบคุมจุดขาย รายงานย้อนหลัง และเปิด-ปิดกะ</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Custom Branch Selector */}
            <div className="relative" ref={branchDropdownRef}>
              <button
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-body-sm font-semibold text-ink shadow-xs hover:border-brand/40 transition-colors"
              >
                <Store className="h-4 w-4 text-brand" />
                <span>{currentBranch?.name}</span>
                <ChevronDown className={`h-4 w-4 text-ink-soft transition-transform ${isBranchDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isBranchDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                  <p className="px-3 py-1.5 text-[11px] font-bold text-ink-soft uppercase tracking-wider">สลับสาขา</p>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleRequestBranchChange(b.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-body-sm font-medium transition-colors ${
                        b.id === branchId
                          ? "bg-brand-soft text-brand font-bold"
                          : "text-ink hover:bg-surface/80"
                      }`}
                    >
                      <span>{b.name}</span>
                      {b.id === branchId && <Check className="h-4 w-4 text-brand" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/dashboard/inventory"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-body-sm font-medium text-ink-soft hover:bg-brand-soft hover:text-brand transition-colors"
            >
              <PackageOpen className="h-4 w-4" /> สต็อกสินค้า
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-body-sm font-medium text-ink-soft hover:bg-brand-soft hover:text-brand transition-colors"
            >
              <LogOut className="h-4 w-4" /> Dashboard
            </Link>
          </div>
        </header>

        {/* Main Hub Content */}
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
          {/* 1. HERO SHIFT ACTION CARD */}
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  {activeShift ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-mono-sm font-bold text-success">
                      <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      กะกำลังเปิดอยู่
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-mono-sm font-semibold text-ink-soft">
                      <span className="h-2 w-2 rounded-full bg-ink-soft/40" />
                      กะปิดอยู่ (ยังไม่เปิดกะ)
                    </span>
                  )}
                  <span className="text-body-sm text-ink-soft">สาขา: <strong className="text-ink">{currentBranch?.name}</strong></span>
                </div>

                <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                  {activeShift ? "ระบบขายหน้าร้านพร้อมใช้งาน" : "เริ่มต้นเปิดกะการขายเพื่อคิดเงิน"}
                </h2>

                <p className="text-body-sm text-ink-soft max-w-xl">
                  {activeShift
                    ? `เปิดกะเมื่อ ${new Date(activeShift.opened_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. · เงินทอนเริ่มต้น ฿${baht(activeShift.starting_cash)}`
                    : "บันทึกยอดเงินทอนเริ่มต้นในลิ้นชัก เพื่อเปิดกะการขายและออกใบเสร็จ"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {activeShift ? (
                  <>
                    <Button
                      onClick={() => setViewMode("register")}
                      size="lg"
                      className="rounded-2xl px-6 py-3.5 text-body-lg font-bold shadow-md shadow-brand/20"
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      เข้าสู่หน้าคิดเงิน (Cash Register)
                    </Button>

                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => setSelectedReportShiftId(activeShift.id)}
                      className="rounded-2xl"
                    >
                      <FileText className="mr-2 h-4 w-4 text-brand" />
                      ดูสรุปยอดกะ
                    </Button>

                    <Button
                      variant="danger"
                      size="lg"
                      onClick={() => setShowCloseShiftModal(true)}
                      className="rounded-2xl"
                    >
                      ปิดกะ
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      setStartingCash("1000");
                      setError(null);
                      setShowOpenShiftModal(true);
                    }}
                    size="lg"
                    className="rounded-2xl px-7 py-4 text-body-lg font-bold shadow-md shadow-brand/20"
                  >
                    <Banknote className="mr-2 h-5 w-5" />
                    เปิดกะการขายใหม่ (Open Shift)
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 2. TODAY'S QUICK METRICS */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card-floating p-5">
              <div className="flex items-center justify-between text-ink-soft">
                <span className="text-body-sm font-semibold">ยอดขายวันนี้</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
                ฿{baht(todayStats.totalRev)}
              </p>
              <p className="mt-1 text-[12px] text-ink-soft">{todayStats.count} รายการบิลสำเร็จ</p>
            </div>

            <div className="card-floating p-5">
              <div className="flex items-center justify-between text-ink-soft">
                <span className="text-body-sm font-semibold">ยอดเงินสด (วันนี้)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Banknote className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-success sm:text-3xl">
                ฿{baht(todayStats.cashRev)}
              </p>
              <p className="mt-1 text-[12px] text-ink-soft">เงินสดรับชำระ</p>
            </div>

            <div className="card-floating p-5">
              <div className="flex items-center justify-between text-ink-soft">
                <span className="text-body-sm font-semibold">ยอดโอน / บัตร (วันนี้)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <WalletCards className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-brand sm:text-3xl">
                ฿{baht(todayStats.transferRev)}
              </p>
              <p className="mt-1 text-[12px] text-ink-soft">QR Code & บัตรเครดิต</p>
            </div>

            <div className="card-floating p-5">
              <div className="flex items-center justify-between text-ink-soft">
                <span className="text-body-sm font-semibold">สินค้าพร้อมขาย</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/12 text-warning">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
                {products.length} <span className="text-body-sm font-normal text-ink-soft">รายการ</span>
              </p>
              <p className="mt-1 text-[12px] text-ink-soft">ในระบบสาขานี้</p>
            </div>
          </div>

          {/* 3. HISTORICAL REPORTS & AUDIT LOGS TABS */}
          <div className="card-floating overflow-hidden p-0">
            {/* Tabs Header */}
            <div className="flex flex-col border-b border-line bg-surface px-6 py-4 sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHubTab("shifts")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all ${
                    hubTab === "shifts"
                      ? "bg-brand text-white shadow-sm"
                      : "text-ink-soft hover:bg-brand-soft/30 hover:text-ink"
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>ประวัติกะการขายย้อนหลัง</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${hubTab === "shifts" ? "bg-white/20 text-white" : "bg-surface border border-line"}`}>
                    {filteredShifts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHubTab("sales")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all ${
                    hubTab === "sales"
                      ? "bg-brand text-white shadow-sm"
                      : "text-ink-soft hover:bg-brand-soft/30 hover:text-ink"
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  <span>ประวัติรายการขาย & ใบเสร็จ</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${hubTab === "sales" ? "bg-white/20 text-white" : "bg-surface border border-line"}`}>
                    {filteredSales.length}
                  </span>
                </button>
              </div>

              {hubTab === "sales" && (
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="ค้นหาเลขที่ใบเสร็จ / ลูกค้า"
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-body-sm text-ink outline-none focus:border-brand"
                  />
                </div>
              )}
            </div>

            {/* TAB CONTENT 1: SHIFTS HISTORY */}
            {hubTab === "shifts" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body-sm">
                  <thead className="border-b border-line bg-surface/70 text-[12px] font-semibold text-ink-soft">
                    <tr>
                      <th className="px-6 py-3.5">เวลาเปิดกะ</th>
                      <th className="px-4 py-3.5">เวลาปิดกะ</th>
                      <th className="px-4 py-3.5 text-right">เงินทอนเริ่ม</th>
                      <th className="px-4 py-3.5 text-right">เงินสดที่ควรมี</th>
                      <th className="px-4 py-3.5 text-right">เงินสดที่นับได้</th>
                      <th className="px-4 py-3.5 text-right">ส่วนต่าง</th>
                      <th className="px-4 py-3.5 text-center">สถานะ</th>
                      <th className="px-6 py-3.5 text-right">รายงาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filteredShifts.map((shift) => {
                      const diff =
                        shift.actual_closing_cash !== null && shift.expected_closing_cash !== null
                          ? shift.actual_closing_cash - shift.expected_closing_cash
                          : null;
                      return (
                        <tr key={shift.id} className="hover:bg-brand-soft/20 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-ink">
                            {new Date(shift.opened_at).toLocaleString("th-TH", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-4 py-4 font-mono text-ink-soft">
                            {shift.closed_at
                              ? new Date(shift.closed_at).toLocaleString("th-TH", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })
                              : "— (เปิดอยู่)"}
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-ink">
                            ฿{baht(shift.starting_cash)}
                          </td>
                          <td className="px-4 py-4 text-right font-mono font-medium text-ink">
                            {shift.expected_closing_cash !== null ? `฿${baht(shift.expected_closing_cash)}` : "—"}
                          </td>
                          <td className="px-4 py-4 text-right font-mono font-bold text-ink">
                            {shift.actual_closing_cash !== null ? `฿${baht(shift.actual_closing_cash)}` : "—"}
                          </td>
                          <td className="px-4 py-4 text-right font-mono font-semibold">
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
                              className="rounded-xl"
                              onClick={() => setSelectedReportShiftId(shift.id)}
                            >
                              <FileText className="mr-1 h-3.5 w-3.5 text-brand" />
                              ดูรายงาน
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredShifts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-body-sm text-ink-soft">
                          ยังไม่มีประวัติกะการขายในสาขานี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 2: SALES & RECEIPTS HISTORY */}
            {hubTab === "sales" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body-sm">
                  <thead className="border-b border-line bg-surface/70 text-[12px] font-semibold text-ink-soft">
                    <tr>
                      <th className="px-6 py-3.5 font-bold">เลขที่ใบเสร็จ</th>
                      <th className="px-4 py-3.5 font-bold">ลูกค้า</th>
                      <th className="px-4 py-3.5 font-bold">ช่องทางชำระ</th>
                      <th className="px-4 py-3.5 text-right font-bold">ยอดสุทธิ</th>
                      <th className="px-4 py-3.5 font-bold">วันที่-เวลา</th>
                      <th className="px-6 py-3.5 text-right font-bold">ใบเสร็จ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-brand-soft/20 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-bold text-ink">
                          {sale.receipt_number}
                        </td>
                        <td className="px-4 py-3.5 text-ink-soft">
                          {sale.customer_name || "ลูกค้าหน้าร้าน"}
                          {sale.customer_phone ? ` · ${sale.customer_phone}` : ""}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              sale.payment_method === "cash"
                                ? "pill-success"
                                : sale.payment_method === "card"
                                ? "pill-warning"
                                : "pill-brand"
                            }`}
                          >
                            {sale.payment_method === "cash"
                              ? "เงินสด"
                              : sale.payment_method === "card"
                              ? "บัตรเครดิต"
                              : "โอนเงิน / QR"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-brand">
                          ฿{baht(sale.total_amount)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[12px] text-ink-soft">
                          {new Date(sale.completed_at).toLocaleString("th-TH", {
                            timeZone: "Asia/Bangkok",
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href={`/pos/${sale.id}/receipt`}
                            className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink hover:border-brand hover:text-brand transition-colors"
                          >
                            <span>พิมพ์ใบเสร็จ</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {filteredSales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-body-sm text-ink-soft">
                          ไม่พบรายการขายที่ตรงกับการค้นหา
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* OPEN SHIFT MODAL */}
        {showOpenShiftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-in fade-in-0">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
              <div className="bg-brand px-8 py-6 text-center text-white">
                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
                  <Banknote className="h-7 w-7 text-white" />
                </div>
                <h2 className="font-display text-xl font-bold">เปิดกะการขายใหม่</h2>
                <p className="mt-1 text-body-sm text-white/90">
                  สาขา: <span className="font-bold">{currentBranch?.name}</span>
                </p>
              </div>

              <form onSubmit={handleOpenShift} className="p-6 space-y-5">
                <div>
                  <label className="mb-2 block text-body-sm font-semibold text-ink">
                    ยอดเงินทอนเริ่มต้นในลิ้นชัก (Starting Cash)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-xl font-bold text-ink-soft">
                      ฿
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={startingCash}
                      onChange={(e) => setStartingCash(e.target.value)}
                      className="w-full rounded-2xl border-2 border-line bg-surface py-3.5 pl-11 pr-4 font-mono text-2xl font-bold text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                      placeholder="0"
                      autoFocus
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {QUICK_STARTING_CASH.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setStartingCash(String(amount))}
                        className={`rounded-xl border px-3 py-1.5 text-mono-sm font-semibold transition-all ${
                          startingCash === String(amount)
                            ? "border-brand bg-brand-soft text-brand-dark ring-2 ring-brand/30"
                            : "border-line bg-surface text-ink-soft hover:border-brand/40 hover:text-ink"
                        }`}
                      >
                        +฿{baht(amount)}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center text-body-sm font-medium text-danger">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 rounded-xl"
                    onClick={() => setShowOpenShiftModal(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button type="submit" className="flex-1 rounded-xl shadow-md" disabled={busy}>
                    {busy ? "กำลังเปิดกะ..." : "ยืนยันและเปิดกะ"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CLOSE SHIFT MODAL */}
        {showCloseShiftModal && activeShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-in fade-in-0">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger/10 text-danger">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">ปิดกะการขาย (สิ้นวัน)</h2>
                    <p className="text-mono-sm text-ink-soft">สรุปยอดและส่งมอบเงินสด</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCloseShiftModal(false)}
                  className="rounded-full p-1.5 text-ink-soft hover:bg-brand-soft hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-4">
                <div className="rounded-2xl border border-brand/20 bg-brand-soft p-4">
                  <p className="text-body-sm text-ink-soft">ยอดเงินทอนเริ่มต้นในกะ</p>
                  <p className="font-mono text-2xl font-bold text-brand">฿{baht(activeShift.starting_cash)}</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-body-sm font-semibold text-ink">
                    ยอดเงินสดจริงในลิ้นชักที่นับได้ (รวมเงินทอน)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-display text-lg font-bold text-ink-soft">
                      ฿
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface py-3 pl-9 pr-4 font-mono text-xl font-bold text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-colors"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-body-sm font-semibold text-ink">
                    หมายเหตุ (ถ้ามียอดขาด/เกิน)
                  </label>
                  <textarea
                    rows={2}
                    value={shiftNote}
                    onChange={(e) => setShiftNote(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface p-3 text-body-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-colors resize-none"
                    placeholder="เช่น เงินสดเกิน 20 บาท หรือ บันทึกเหตุผล"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center text-body-sm font-medium text-danger">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 rounded-xl"
                    onClick={() => setShowCloseShiftModal(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    className="flex-1 rounded-xl shadow-md"
                    disabled={busy}
                  >
                    {busy ? "กำลังปิดกะ..." : "ยืนยันปิดกะ"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SHIFT REPORT MODAL */}
        {selectedReportShiftId && (
          <ShiftReportModal shiftId={selectedReportShiftId} onClose={() => setSelectedReportShiftId(null)} />
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: CASH REGISTER MODE (คิดเงินเต็มจอ)
  // ==========================================
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface/30">
      {/* 1. TOP HEADER BAR */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-5 shadow-xs z-10">
        {/* Left: Back to Hub & Branch dropdown */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setViewMode("hub")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-body-sm font-semibold text-ink-soft hover:bg-brand-soft hover:text-brand transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>หน้าหลัก POS</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-display text-body-lg font-bold text-ink">แคชเชียร์คิดเงิน</span>
            <div className="h-4 w-px bg-line" />
            {/* Branch dropdown */}
            <div className="relative" ref={branchDropdownRef}>
              <button
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-body-sm font-semibold text-ink shadow-xs hover:border-brand/40 transition-colors"
              >
                <Store className="h-4 w-4 text-brand" />
                <span>{currentBranch?.name}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-ink-soft transition-transform ${isBranchDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isBranchDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                  <p className="px-3 py-1.5 text-[11px] font-bold text-ink-soft uppercase tracking-wider">สลับสาขา</p>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleRequestBranchChange(b.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-body-sm font-medium transition-colors ${
                        b.id === branchId
                          ? "bg-brand-soft text-brand font-bold"
                          : "text-ink hover:bg-surface/80"
                      }`}
                    >
                      <span>{b.name}</span>
                      {b.id === branchId && <Check className="h-4 w-4 text-brand" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Shift Status & Action Controls */}
        <div className="flex items-center gap-3">
          {/* Active Shift badge */}
          {activeShift && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-1.5 text-mono-sm text-success font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
              </span>
              <span>กะเปิดอยู่</span>
              <span className="text-ink-soft">
                ({new Date(activeShift.opened_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })})
              </span>
            </div>
          )}

          {activeShift && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedReportShiftId(activeShift.id)}
              className="flex items-center gap-1.5 rounded-xl border-line font-medium"
            >
              <FileText className="h-4 w-4 text-brand" />
              <span className="hidden md:inline">รายงานกะ</span>
            </Button>
          )}

          {activeShift && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCloseShiftModal(true)}
              className="rounded-xl font-medium"
            >
              ปิดกะการขาย
            </Button>
          )}
        </div>
      </header>

      {/* 2. WORKSPACE AREA: 2 Distinct Panels (Left Catalog & Right Cart) */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: Product Catalog */}
        <section className="flex flex-1 flex-col overflow-hidden border-r border-line p-5">
          {/* Search & Category Filter Bar */}
          <div className="mb-4 space-y-3 shrink-0">
            {/* Search Input Box */}
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อสินค้า, รหัส SKU หรือ สแกนบาร์โค้ด..."
                className="w-full rounded-2xl border border-line bg-surface py-3 pl-12 pr-10 text-body font-medium text-ink shadow-xs outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-soft hover:bg-brand-soft hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = selectedCategory === cat.key;
                const count = categoryCounts[cat.key];
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-semibold transition-all ${
                      active
                        ? "bg-brand text-white shadow-sm ring-2 ring-brand/20"
                        : "border border-line bg-surface text-ink-soft hover:border-brand/40 hover:bg-brand-soft/20 hover:text-ink"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-white" : "text-brand"}`} />
                    <span>{cat.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                        active ? "bg-white/30 text-white" : "bg-brand-soft text-brand-dark"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Cards Grid Area */}
          <div className="flex-1 overflow-y-auto pr-1">
            {products.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-surface p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Package className="h-8 w-8" />
                </div>
                <p className="font-display text-body-lg font-bold text-ink">ยังไม่มีสินค้าในระบบ</p>
                <p className="text-body-sm text-ink-soft">
                  เพิ่มสินค้าและกำหนดราคาได้ที่เมนูคลังสินค้า
                </p>
                <Link href="/dashboard/inventory">
                  <Button variant="secondary" size="sm" className="mt-2">
                    ไปยังคลังสินค้า
                  </Button>
                </Link>
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="font-display text-body font-semibold text-ink">ไม่พบรายการที่ค้นหา</p>
                <p className="text-body-sm text-ink-soft">ลองค้นหาด้วยคำอื่น หรือกดเคลียร์ตัวกรอง</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setSelectedCategory("all");
                  }}
                  className="mt-2"
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" /> ล้างการค้นหา
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visibleProducts.map((product) => {
                  const stock = stockFor(product);
                  const inCart = cart[product.id] ?? 0;
                  const soldOut = product.trackStock && stock <= 0;
                  const isLowStock = product.trackStock && stock > 0 && stock <= 5;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => updateQuantity(product, 1)}
                      disabled={soldOut}
                      className={`group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl border bg-surface p-4 text-left shadow-xs transition-all ${
                        soldOut
                          ? "cursor-not-allowed border-line/60 bg-surface/40 opacity-50"
                          : inCart > 0
                          ? "border-brand bg-brand-soft/20 shadow-sm ring-2 ring-brand/30"
                          : "border-line hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md active:translate-y-0"
                      }`}
                    >
                      {/* Cart Quantity Circle Badge */}
                      {inCart > 0 && (
                        <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand font-mono text-mono-sm font-bold text-white shadow-sm animate-in zoom-in-50">
                          {inCart}
                        </div>
                      )}

                      {/* Header info */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                              product.type === "product"
                                ? "pill-brand"
                                : product.type === "rental"
                                ? "pill-warning"
                                : "pill-success"
                            }`}
                          >
                            {product.type === "product"
                              ? "สินค้า"
                              : product.type === "rental"
                              ? "เช่า"
                              : "บริการ"}
                          </span>
                          {product.sku && (
                            <span className="truncate font-mono text-[10px] text-ink-soft">
                              {product.sku}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1.5 line-clamp-2 font-display text-body-sm font-bold leading-snug text-ink group-hover:text-brand">
                          {product.name}
                        </h3>
                      </div>

                      {/* Price & Stock info */}
                      <div className="border-t border-line/60 pt-2">
                        <div className="font-display text-body-lg font-bold text-ink">
                          ฿{baht(product.sellingPrice)}
                        </div>

                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                          {product.trackStock ? (
                            soldOut ? (
                              <span className="font-bold text-danger">● สินค้าหมด</span>
                            ) : isLowStock ? (
                              <span className="font-semibold text-warning">● เหลือ {stock} ชิ้น</span>
                            ) : (
                              <span className="font-medium text-success">● เหลือ {stock}</span>
                            )
                          ) : (
                            <span className="font-medium text-ink-soft">● พร้อมขาย</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Cart & Checkout Sidebar */}
        <aside className="flex w-[420px] shrink-0 flex-col bg-surface shadow-md">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-body-lg font-bold text-ink">รายการสั่งซื้อ</h2>
                <p className="text-[12px] text-ink-soft">{totalItemsCount} ชิ้นในตะกร้า</p>
              </div>
            </div>

            {items.length > 0 && (
              <button
                type="button"
                onClick={handleRequestClearCart}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-mono-sm font-medium text-ink-soft hover:bg-danger/10 hover:text-danger transition-colors"
                title="ล้างตะกร้าสินค้า"
              >
                <Trash2 className="h-4 w-4" />
                <span>ล้าง</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-surface/30">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-ink-soft/40 shadow-xs border border-line">
                  <Receipt className="h-8 w-8" />
                </div>
                <p className="font-display text-body font-semibold text-ink">ยังไม่มีสินค้าในรายการ</p>
                <p className="mt-1 text-body-sm text-ink-soft">
                  แตะเลือกสินค้าจากเมนูทางซ้ายเพื่อเริ่มคิดเงิน
                </p>
              </div>
            ) : (
              items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-xs transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-body-sm font-bold text-ink">
                      {product.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-mono-sm font-semibold text-brand">
                        ฿{baht(product.sellingPrice)}
                      </span>
                      <span className="text-[11px] text-ink-soft">/ ชิ้น</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-surface/80 p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-ink shadow-xs transition-transform active:scale-90 hover:bg-brand-soft hover:text-brand"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center font-mono text-body-sm font-bold text-ink">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product, 1)}
                      disabled={product.trackStock && quantity >= stockFor(product)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-ink shadow-xs transition-transform active:scale-90 hover:bg-brand-soft hover:text-brand disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="w-20 text-right font-mono font-bold text-ink">
                    ฿{baht(product.sellingPrice * quantity)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Controls Area */}
          <div className="border-t border-line bg-surface p-5 space-y-4">
            {/* Optional Customer info & Discount */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    placeholder="ชื่อลูกค้า (ถ้ามี)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-body-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                </div>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    placeholder="เบอร์โทร"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-body-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="ส่วนลด ฿"
                    value={discount === "0" ? "" : discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-body-sm font-semibold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                </div>
                <div className="relative">
                  <QrCode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    placeholder="รหัสจองสนาม"
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 font-mono text-body-sm uppercase text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                </div>
              </div>

              {/* Quick discount chips */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-ink-soft">ส่วนลดด่วน:</span>
                {QUICK_DISCOUNTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiscount(String(d))}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-all ${
                      discount === String(d)
                        ? "bg-brand text-white"
                        : "bg-brand-soft text-brand-dark hover:bg-brand hover:text-white"
                    }`}
                  >
                    -฿{d}
                  </button>
                ))}
                {discountAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscount("0")}
                    className="text-[11px] text-danger hover:underline ml-auto"
                  >
                    ลบส่วนลด
                  </button>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <p className="mb-2 text-mono-sm font-bold text-ink">วิธีรับชำระเงิน</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = paymentMethod === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setPaymentMethod(option.key)}
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                        selected
                          ? "border-brand bg-brand-soft text-brand-dark ring-2 ring-brand/30 shadow-xs"
                          : "border-line bg-surface text-ink-soft hover:border-brand/40 hover:bg-brand-soft/20 hover:text-ink"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          selected ? "bg-brand text-white" : "bg-surface text-ink-soft border border-line"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-bold text-ink">{option.label}</p>
                        <p className="text-[10px] text-ink-soft">{option.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-2 rounded-2xl bg-surface/80 p-3.5 border border-line">
              <div className="flex justify-between text-body-sm text-ink-soft">
                <span>ยอดรวมสินค้า ({totalItemsCount} ชิ้น)</span>
                <span className="font-mono font-medium text-ink">฿{baht(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-body-sm text-danger font-medium">
                  <span>ส่วนลด</span>
                  <span className="font-mono">-฿{baht(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-2">
                <span className="font-display text-body-lg font-bold text-ink">ยอดสุทธิ</span>
                <span className="font-mono text-2xl font-bold text-brand">฿{baht(total)}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center text-body-sm font-medium text-danger">
                {error}
              </div>
            )}

            {/* Main Checkout Action Button */}
            <Button
              onClick={checkout}
              disabled={busy || items.length === 0}
              size="lg"
              className="w-full py-4 text-body-lg font-bold shadow-md transition-transform active:scale-[0.99]"
            >
              {busy ? "กำลังประมวลผล..." : `รับชำระเงิน ฿${baht(total)}`}
            </Button>
          </div>
        </aside>
      </div>

      {/* CONFIRMATION DIALOG 1: Clear Cart */}
      {showClearCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-danger/10 text-danger shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-body-lg font-bold text-ink">ยืนยันล้างตะกร้า?</h3>
                <p className="text-body-sm text-ink-soft">รายการสินค้า {totalItemsCount} ชิ้นจะถูกลบออก</p>
              </div>
            </div>
            <p className="text-body-sm text-ink-soft">
              คุณต้องการยกเลิกรายการสินค้าที่เลือกไว้ทั้งหมดและเริ่มทำรายการใหม่หรือไม่?
            </p>
            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 rounded-xl"
                onClick={() => setShowClearCartModal(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1 rounded-xl shadow-sm"
                onClick={confirmClearCart}
              >
                ยืนยันล้าง
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG 2: Switch Branch with Non-empty Cart */}
      {pendingBranchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/12 text-warning shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-body-lg font-bold text-ink">ยืนยันสลับสาขา?</h3>
                <p className="text-body-sm text-ink-soft">มีรายการค้างอยู่ในตะกร้า</p>
              </div>
            </div>
            <p className="text-body-sm text-ink-soft">
              การสลับไปสาขา <span className="font-bold text-ink">{branches.find(b => b.id === pendingBranchId)?.name}</span> จะทำการรีเซ็ตตะกร้าสินค้าปัจจุบัน เนื่องจากสต็อกและราคาแยกตามสาขา
            </p>
            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 rounded-xl"
                onClick={() => setPendingBranchId(null)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1 rounded-xl shadow-sm"
                onClick={confirmSwitchBranch}
              >
                สลับสาขา
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG 3: Exit POS with Non-empty Cart */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/12 text-warning shrink-0">
                <LogOut className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-body-lg font-bold text-ink">ออกจากหน้า POS?</h3>
                <p className="text-body-sm text-ink-soft">มีรายการสินค้า {totalItemsCount} ชิ้น</p>
              </div>
            </div>
            <p className="text-body-sm text-ink-soft">
              คุณมีรายการสินค้าค้างอยู่ในตะกร้า หากออกจากหน้านี้ รายการที่ยังไม่คิดเงินจะถูกยกเลิก
            </p>
            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 rounded-xl"
                onClick={() => setShowExitModal(false)}
              >
                อยู่หน้านี้ต่อ
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1 rounded-xl shadow-sm"
                onClick={() => router.push("/dashboard")}
              >
                ออกจาก POS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG 4: Close Shift Modal */}
      {showCloseShiftModal && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger/10 text-danger">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">ปิดกะการขาย (สิ้นวัน)</h2>
                  <p className="text-mono-sm text-ink-soft">สรุปยอดและส่งมอบเงินสด</p>
                </div>
              </div>
              <button
                onClick={() => setShowCloseShiftModal(false)}
                className="rounded-full p-1.5 text-ink-soft hover:bg-brand-soft hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="rounded-2xl border border-brand/20 bg-brand-soft p-4">
                <p className="text-body-sm text-ink-soft">ยอดเงินทอนเริ่มต้นในกะ</p>
                <p className="font-mono text-2xl font-bold text-brand">฿{baht(activeShift.starting_cash)}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-body-sm font-semibold text-ink">
                  ยอดเงินสดจริงในลิ้นชักที่นับได้ (รวมเงินทอน)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-display text-lg font-bold text-ink-soft">
                    ฿
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface py-3 pl-9 pr-4 font-mono text-xl font-bold text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-colors"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-body-sm font-semibold text-ink">
                  หมายเหตุ (ถ้ามียอดขาด/เกิน)
                </label>
                <textarea
                  rows={2}
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-3 text-body-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-colors resize-none"
                  placeholder="เช่น เงินสดเกิน 20 บาท หรือ บันทึกเหตุผล"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center text-body-sm font-medium text-danger">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 rounded-xl"
                  onClick={() => setShowCloseShiftModal(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1 rounded-xl shadow-md"
                  disabled={busy}
                >
                  {busy ? "กำลังปิดกะ..." : "ยืนยันปิดกะ"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHIFT REPORT MODAL */}
      {selectedReportShiftId && (
        <ShiftReportModal shiftId={selectedReportShiftId} onClose={() => setSelectedReportShiftId(null)} />
      )}
    </div>
  );
}
