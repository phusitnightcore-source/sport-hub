"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import {
  findMemberForCheckin,
  processCheckin,
  processBookingCheckin,
  type CheckinQueryType,
  type UnifiedCheckinResult,
} from "./actions";
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  User,
  CalendarDays,
  Clock,
  ReceiptText,
  CreditCard,
  Building,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatBaht, toSatang } from "@/lib/money";

export function CheckinClient({ branches }: { branches: { id: string; name: string }[] }) {
  const [activeTab, setActiveTab] = useState<CheckinQueryType>("qr");
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UnifiedCheckinResult | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<"idle" | "success" | "error">("idle");
  const [checkinMessage, setCheckinMessage] = useState("");

  const qrInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the QR input when switching to QR tab
  useEffect(() => {
    if (activeTab === "qr" && qrInputRef.current) {
      qrInputRef.current.focus();
    }
    const timeout = setTimeout(() => {
      setResult(null);
      setCheckinStatus("idle");
      setQuery("");
    }, 0);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setCheckinStatus("idle");
    setResult(null);

    const res = await findMemberForCheckin(query, activeTab);

    if (res.success && (res.member || res.booking)) {
      setResult(res);
    } else {
      setCheckinStatus("error");
      setCheckinMessage(res.error || "ไม่พบข้อมูลสมาชิกหรือรหัสการจอง");
    }

    setLoading(false);
    if (activeTab === "qr") {
      setQuery("");
      if (qrInputRef.current) qrInputRef.current.focus();
    }
  }

  async function handleConfirmCheckin() {
    if (!branchId) return;

    setLoading(true);

    if (result?.targetType === "member" && result.member) {
      const res = await processCheckin(result.member.id, branchId);
      if (res.success) {
        setCheckinStatus("success");
        setCheckinMessage("เช็คอินสมาชิกสำเร็จ!");
        setTimeout(() => {
          setResult(null);
          setCheckinStatus("idle");
          if (activeTab === "qr" && qrInputRef.current) qrInputRef.current.focus();
        }, 3000);
      } else {
        setCheckinStatus("error");
        setCheckinMessage(res.error || "เกิดข้อผิดพลาดในการเช็คอิน");
      }
    } else if (result?.targetType === "booking" && result.booking) {
      const res = await processBookingCheckin(result.booking.id, branchId);
      if (res.success) {
        setCheckinStatus("success");
        setCheckinMessage("เช็คอินเข้าใช้สนามสำเร็จ!");
        setTimeout(() => {
          setResult(null);
          setCheckinStatus("idle");
          if (activeTab === "qr" && qrInputRef.current) qrInputRef.current.focus();
        }, 3000);
      } else {
        setCheckinStatus("error");
        setCheckinMessage(res.error || "เกิดข้อผิดพลาดในการเช็คอินการจอง");
      }
    }

    setLoading(false);
  }

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }));

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left Column: Input & Search Form */}
      <div className="card-floating flex flex-col p-6 lg:w-1/3 border border-line">
        {branches.length > 1 && (
          <div className="mb-5 z-30">
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              เลือกสาขาที่เช็คอิน
            </label>
            <Select
              name="branchId"
              options={branchOptions}
              value={branchId}
              onChange={(val) => setBranchId(val)}
            />
          </div>
        )}

        {/* Tab switcher */}
        <div className="mb-6 flex rounded-2xl border border-line bg-surface/60 p-1.5">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-body-sm font-bold transition-all ${
              activeTab === "qr"
                ? "bg-brand text-white shadow-xs"
                : "text-ink-soft hover:text-ink hover:bg-brand-soft/40"
            }`}
            onClick={() => setActiveTab("qr")}
          >
            <QrCode className="h-4 w-4" />
            <span>สแกน QR Code</span>
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-body-sm font-bold transition-all ${
              activeTab === "phone"
                ? "bg-brand text-white shadow-xs"
                : "text-ink-soft hover:text-ink hover:bg-brand-soft/40"
            }`}
            onClick={() => setActiveTab("phone")}
          >
            <Search className="h-4 w-4" />
            <span>เบอร์โทร / รหัสจอง</span>
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          {activeTab === "qr" ? (
            <div className="space-y-2">
              <label className="text-body-sm font-semibold text-ink">
                สแกน QR Code (ตั๋วการจอง หรือ บัตรสมาชิก)
              </label>
              <div className="relative">
                <input
                  ref={qrInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="คลิกที่นี่แล้วยิงสแกนเนอร์..."
                  className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-4 text-body text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-mono"
                  autoFocus
                />
                <QrCode className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand" />
              </div>
              <p className="text-[11px] text-ink-soft">
                รองรับเครื่องยิงบาร์โค้ด USB/Bluetooth หรือกล้อง
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-body-sm font-semibold text-ink">
                ค้นหาด้วยเบอร์โทร หรือรหัสการจอง
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="เช่น 0812345678 หรือ BK-2026..."
                  className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-4 text-body text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full rounded-2xl font-bold py-3">
            {loading ? "กำลังตรวจสอบ..." : "ค้นหาข้อมูล"}
          </Button>
        </form>
      </div>

      {/* Right Column: Results & Confirmation Card */}
      <div className="card-floating flex flex-1 flex-col p-6 min-h-[350px] border border-line">
        <h2 className="mb-4 font-display text-body-lg font-bold text-ink">
          ผลการตรวจสอบและยืนยันเช็คอิน
        </h2>

        {/* 1. Success message banner */}
        {checkinStatus === "success" && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold">{checkinMessage}</h3>
              <p className="text-body-sm text-emerald-700 dark:text-emerald-300">
                ระบบได้บันทึกการเข้าใช้บริการเรียบร้อยแล้ว
              </p>
            </div>
          </div>
        )}

        {/* 2. Error message banner */}
        {checkinStatus === "error" && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 p-4 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
            <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="font-bold">ไม่สามารถเช็คอินได้</h3>
              <p className="text-body-sm text-rose-700 dark:text-rose-300">{checkinMessage}</p>
            </div>
          </div>
        )}

        {/* 3. Render Member Result */}
        {result?.targetType === "member" && result.member && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand font-bold text-xl shadow-xs">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand uppercase">
                      สมาชิก Member
                    </span>
                    <span className="font-mono text-body-sm text-ink-soft">
                      #{result.member.member_number}
                    </span>
                  </div>
                  <h3 className="font-display text-display-sm font-bold text-ink">
                    {result.member.first_name} {result.member.last_name || ""}
                  </h3>
                  <p className="text-body-sm text-ink-soft">{result.member.phone || "ไม่มีเบอร์โทร"}</p>
                </div>
              </div>

              <div>
                <StatusPill tone={result.isValid ? "success" : "danger"}>
                  {result.isValid ? "พร้อมใช้งาน" : result.failReason || "ไม่สามารถใช้สิทธิ์ได้"}
                </StatusPill>
              </div>
            </div>

            {/* Package details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl bg-surface/60 border border-line p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">แพ็กเกจสมาชิก</p>
                <p className="font-semibold text-ink text-body">
                  {result.member.packages?.name || "ไม่มีแพ็กเกจ"}
                </p>
                <p className="text-body-sm text-ink-soft">
                  ประเภท: {result.member.packages?.type === "session_based" ? "นับครั้ง" : "ระยะเวลา"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">สิทธิ์การใช้งาน</p>
                {result.member.packages?.type === "session_based" ? (
                  <p className="font-semibold text-ink text-body">
                    ใช้ไป {result.member.sessions_used} / {result.member.packages.sessions_limit} ครั้ง
                  </p>
                ) : (
                  <p className="font-semibold text-ink text-body">
                    หมดอายุ: {result.member.end_date ? new Date(result.member.end_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-2 flex gap-3">
              <Button
                variant={result.isValid ? "primary" : "secondary"}
                onClick={handleConfirmCheckin}
                disabled={loading || !result.isValid}
                className="flex-1 rounded-2xl font-bold py-3.5 shadow-md shadow-brand/20"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                ยืนยันเช็คอินสมาชิก
              </Button>
            </div>
          </div>
        )}

        {/* 4. Render Court Booking Result */}
        {result?.targetType === "booking" && result.booking && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 font-bold text-xl shadow-xs">
                  <CalendarDays className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/50 px-2 py-0.5 text-[10px] font-bold uppercase">
                      ตั๋วการจองสนาม Court Booking
                    </span>
                    <span className="font-mono text-body-sm font-bold text-brand">
                      {result.booking.booking_code}
                    </span>
                  </div>
                  <h3 className="font-display text-display-sm font-bold text-ink">
                    {result.booking.user_name || "ลูกค้าหน้าเคาน์เตอร์"}
                  </h3>
                  <p className="text-body-sm text-ink-soft">{result.booking.user_phone || "ไม่มีเบอร์โทร"}</p>
                </div>
              </div>

              <div>
                <StatusPill tone={result.isValid ? "success" : "warning"}>
                  {result.booking.status === "confirmed"
                    ? "ชำระเงินแล้ว"
                    : result.booking.status === "awaiting_verification"
                    ? "รอตรวจสลิป"
                    : result.booking.status}
                </StatusPill>
              </div>
            </div>

            {/* Booking Details Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-2xl bg-surface/60 border border-line p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">สนาม / คอร์ท</p>
                <p className="font-semibold text-ink text-body">
                  {(result.booking.courts as { name?: string } | null)?.name || "คอร์ทกีฬา"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">วันและเวลาที่จอง</p>
                <p className="font-semibold text-ink text-body">
                  {result.booking.start_time.slice(0, 5)} - {result.booking.end_time.slice(0, 5)}
                </p>
                <p className="text-[11px] text-ink-soft">{result.booking.booking_date}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">ยอดเงินค่าสนาม</p>
                <p className="font-mono font-bold text-brand text-body-lg">
                  ฿{formatBaht(toSatang(result.booking.total_price))}
                </p>
              </div>
            </div>

            {/* Quick action link to slip verification if awaiting */}
            {result.booking.status === "awaiting_verification" && (
              <div className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3.5 border border-amber-200 dark:border-amber-800 text-body-sm">
                <span className="text-amber-800 dark:text-amber-200 font-medium">
                  รายการนี้มีสลิปโอนเงินรอยืนยัน
                </span>
                <Link
                  href="/dashboard/payments"
                  className="inline-flex items-center gap-1 font-bold text-amber-700 hover:underline"
                >
                  <span>ไปตรวจสลิปทันที</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-2 flex gap-3">
              <Button
                variant={result.isValid ? "primary" : "secondary"}
                onClick={handleConfirmCheckin}
                disabled={loading || !result.isValid}
                className="flex-1 rounded-2xl font-bold py-3.5 shadow-md shadow-brand/20"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                ยืนยันเข้าใช้สนาม (Check-in)
              </Button>
            </div>
          </div>
        )}

        {/* 5. Idle placeholder state */}
        {!result && checkinStatus === "idle" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8 text-ink-soft">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft/50 text-brand">
              <QrCode className="h-8 w-8" />
            </div>
            <h3 className="font-display text-body-lg font-bold text-ink">
              พร้อมสแกน QR Code หรือค้นหา
            </h3>
            <p className="mt-1 max-w-sm text-body-sm text-ink-soft">
              ระบบรองรับการเช็คอินทั้ง **ตั๋วการจองสนาม** และ **บัตรสมาชิก (Member Pass)** ในช่องทางเดียว
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
