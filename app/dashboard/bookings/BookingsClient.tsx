"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Search,
  CheckCircle2,
  ReceiptText,
  ScanLine,
  ShoppingCart,
  Phone,
  Clock,
  Filter,
  ArrowRight,
  User,
  CalendarPlus,
  RotateCcw,
} from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { formatBahtFromDb } from "@/lib/money";

export type BookingItem = {
  id: string;
  booking_code: string;
  user_name: string | null;
  user_phone: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: string;
  courts: { name: string } | null;
};

type BookingsClientProps = {
  bookings: BookingItem[];
  currentDate: string;
};

export function BookingsClient({ bookings, currentDate }: BookingsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        b.booking_code.toLowerCase().includes(q) ||
        (b.user_name && b.user_name.toLowerCase().includes(q)) ||
        (b.user_phone && b.user_phone.includes(q)) ||
        (b.courts?.name && b.courts.name.toLowerCase().includes(q));

      return matchStatus && matchQuery;
    });
  }, [bookings, searchQuery, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: bookings.length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      awaiting: bookings.filter((b) => b.status === "awaiting_verification").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  function changeDate(daysOffset: number) {
    const current = new Date(currentDate);
    current.setDate(current.getDate() + daysOffset);
    const newDateStr = current.toISOString().slice(0, 10);
    router.push(`/dashboard/bookings?date=${newDateStr}`);
  }

  return (
    <div className="space-y-6">
      {/* 1. Date Switcher & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeDate(-1)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-body-sm font-semibold text-ink-soft hover:bg-brand-soft hover:text-brand transition-colors"
          >
            ← วันก่อนหน้า
          </button>
          <button
            type="button"
            onClick={() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              router.push(`/dashboard/bookings?date=${todayStr}`);
            }}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-body-sm font-bold text-ink hover:bg-brand-soft hover:text-brand transition-colors"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => changeDate(1)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-body-sm font-semibold text-ink-soft hover:bg-brand-soft hover:text-brand transition-colors"
          >
            วันถัดไป →
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const dateInput = form.elements.namedItem("date") as HTMLInputElement;
              if (dateInput?.value) {
                router.push(`/dashboard/bookings?date=${dateInput.value}`);
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="date"
              name="date"
              defaultValue={currentDate}
              onChange={(e) => {
                if (e.target.value) {
                  router.push(`/dashboard/bookings?date=${e.target.value}`);
                }
              }}
              className="rounded-xl border border-line bg-surface px-3.5 py-2 text-body-sm font-semibold text-ink shadow-xs outline-none focus:border-brand cursor-pointer"
            />
          </form>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/bookings/new">
            <Button size="sm" className="rounded-xl font-bold shadow-xs">
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              + จองให้ลูกค้า
            </Button>
          </Link>
          <Link href="/dashboard/schedule">
            <Button variant="secondary" size="sm" className="rounded-xl font-semibold border-line bg-surface">
              <CalendarDays className="mr-1.5 h-4 w-4 text-brand" />
              ดูตารางสนาม
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Search & Status Filter Pills */}
      <div className="card-floating flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between border border-line">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, รหัสจอง หรือสนาม..."
            className="w-full rounded-xl border border-line bg-surface py-2 pl-10 pr-4 text-body-sm text-ink shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-xl px-3 py-1.5 text-body-sm font-bold transition-all ${
              statusFilter === "all"
                ? "bg-brand text-white shadow-xs"
                : "bg-surface text-ink-soft border border-line hover:bg-brand-soft/40 hover:text-brand"
            }`}
          >
            ทั้งหมด ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("confirmed")}
            className={`rounded-xl px-3 py-1.5 text-body-sm font-bold transition-all ${
              statusFilter === "confirmed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-surface text-ink-soft border border-line hover:bg-emerald-50 hover:text-emerald-600"
            }`}
          >
            ยืนยันแล้ว ({counts.confirmed})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("awaiting_verification")}
            className={`rounded-xl px-3 py-1.5 text-body-sm font-bold transition-all ${
              statusFilter === "awaiting_verification"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-surface text-ink-soft border border-line hover:bg-amber-50 hover:text-amber-600"
            }`}
          >
            รอตรวจสลิป ({counts.awaiting})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("cancelled")}
            className={`rounded-xl px-3 py-1.5 text-body-sm font-bold transition-all ${
              statusFilter === "cancelled"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-surface text-ink-soft border border-line hover:bg-rose-50 hover:text-rose-600"
            }`}
          >
            ยกเลิก ({counts.cancelled})
          </button>
        </div>
      </div>

      {/* 3. Bookings List Grid / Cards */}
      {filteredBookings.length === 0 ? (
        <div className="card-floating flex flex-col items-center gap-3 p-12 text-center border border-line">
          <CalendarDays className="h-10 w-10 text-ink-soft/40" />
          <h3 className="font-display text-body-lg font-bold text-ink">ไม่พบรายการจอง</h3>
          <p className="text-body-sm text-ink-soft max-w-sm">
            {searchQuery
              ? `ไม่พบรายการที่ตรงกับ "${searchQuery}"`
              : "ยังไม่มีรายการจองในวันที่เลือก"}
          </p>
          <Link href="/dashboard/bookings/new" className="mt-2">
            <Button size="sm" className="rounded-xl">
              + สร้างการจองใหม่
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const isConfirmed = b.status === "confirmed";
            const isAwaiting = b.status === "awaiting_verification";
            const isCancelled = b.status === "cancelled";

            const tone: "success" | "warning" | "danger" | "brand" = isConfirmed
              ? "success"
              : isAwaiting
              ? "warning"
              : isCancelled
              ? "danger"
              : "brand";

            const label = isConfirmed
              ? "ยืนยันแล้ว"
              : isAwaiting
              ? "รอตรวจสลิป"
              : isCancelled
              ? "ยกเลิกแล้ว"
              : b.status;

            return (
              <div
                key={b.id}
                className="card-floating flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-brand/40 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Time, Court & Customer info */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand font-mono font-bold text-body-sm shadow-xs">
                    {b.start_time.slice(0, 5)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-surface border border-line px-2.5 py-0.5 text-[12px] font-bold text-brand">
                        {b.courts?.name || "คอร์ทกีฬา"}
                      </span>
                      <span className="font-mono text-body-sm font-bold text-ink">
                        {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                      </span>
                      <span className="font-mono text-[11px] text-ink-soft">
                        #{b.booking_code}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-body-sm text-ink">
                      <span className="font-bold">{b.user_name || "ลูกค้าหน้าเคาน์เตอร์"}</span>
                      {b.user_phone && (
                        <span className="flex items-center gap-1 text-[12px] text-ink-soft">
                          <Phone className="h-3 w-3" />
                          {b.user_phone}
                        </span>
                      )}
                      <span className="font-mono font-bold text-brand">
                        ฿{formatBahtFromDb(b.total_price)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill & Connected Quick Actions */}
                <div className="flex flex-wrap items-center gap-2.5 sm:justify-end border-t border-line/60 pt-3 sm:border-t-0 sm:pt-0">
                  <StatusPill tone={tone}>{label}</StatusPill>

                  {/* 1. If Awaiting Slip -> Quick Link to Payments */}
                  {isAwaiting && (
                    <Link href="/dashboard/payments">
                      <Button size="sm" variant="secondary" className="rounded-xl font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                        <ReceiptText className="mr-1 h-3.5 w-3.5" />
                        ตรวจสลิป
                      </Button>
                    </Link>
                  )}

                  {/* 2. If Confirmed -> Quick Check-in Button */}
                  {isConfirmed && (
                    <Link href={`/dashboard/checkin`}>
                      <Button size="sm" variant="secondary" className="rounded-xl font-semibold border-line bg-surface">
                        <ScanLine className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                        เช็คอิน
                      </Button>
                    </Link>
                  )}

                  {/* 3. Link to POS for customer sales */}
                  <Link href="/pos">
                    <Button size="sm" variant="secondary" className="rounded-xl font-semibold border-line bg-surface" title="ขายสินค้าให้ลูกค้านี้">
                      <ShoppingCart className="h-3.5 w-3.5 text-purple-600" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
