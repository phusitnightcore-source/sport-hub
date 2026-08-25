"use client";

import { useEffect, useState } from "react";
import {
  X,
  FileText,
  Banknote,
  WalletCards,
  CreditCard,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getShiftReport } from "./actions";

function baht(value: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

type ShiftReportProps = {
  shiftId: string;
  onClose: () => void;
};

export function ShiftReportModal({ shiftId, onClose }: ShiftReportProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      const res = await getShiftReport(shiftId);
      if (res.error) {
        setError(res.error);
      } else {
        setReport(res.data);
      }
      setLoading(false);
    }
    fetchReport();
  }, [shiftId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-in fade-in-0">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-body-lg font-bold text-ink">รายงานสรุปยอดกะปัจจุบัน</h2>
              <p className="text-mono-sm text-ink-soft">สรุปยอดขายแบบเรียลไทม์ในกะนี้</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-brand-soft hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-line border-t-brand" />
              <p className="text-body-sm text-ink-soft">กำลังคำนวณข้อมูลยอดขาย...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-center text-body-sm font-semibold text-danger">
              {error}
            </div>
          ) : !report ? (
            <p className="py-20 text-center text-body-sm text-ink-soft">ไม่พบข้อมูลรายงาน</p>
          ) : (
            <>
              {/* Shift Timing info */}
              <div className="flex items-center justify-between rounded-2xl border border-line bg-surface/60 px-4 py-3 text-body-sm text-ink-soft">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand" />
                  <span>เวลาเปิดกะ:</span>
                  <span className="font-mono font-bold text-ink">
                    {new Date(report.shift.opened_at).toLocaleString("th-TH", {
                      timeZone: "Asia/Bangkok",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-success" />
                  <span className="font-semibold text-success">กะกำลังเปิดอยู่</span>
                </div>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
                  <p className="text-body-sm font-medium text-ink-soft">ยอดขายรวม</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-brand">฿{baht(report.totalRevenue)}</p>
                </div>
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
                  <p className="text-body-sm font-medium text-ink-soft">เงินทอนเริ่มต้น</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-ink">
                    ฿{baht(report.shift.starting_cash)}
                  </p>
                </div>
                <div className="rounded-2xl border border-success/30 bg-success/10 p-4 shadow-xs">
                  <p className="text-body-sm font-medium text-success">เงินสดควรมีในลิ้นชัก</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-success">
                    ฿{baht(report.expectedCash)}
                  </p>
                </div>
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
                  <p className="text-body-sm font-medium text-ink-soft">สินค้าขายแล้ว</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-ink">
                    {report.soldItems.reduce((acc: number, item: any) => acc + item.quantity, 0)}{" "}
                    <span className="text-body-sm font-normal text-ink-soft">ชิ้น</span>
                  </p>
                </div>
              </div>

              {/* Sales By Payment Method */}
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3">
                <h3 className="font-display text-body font-bold text-ink">ยอดขายแยกตามวิธีชำระเงิน</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex items-center justify-between rounded-xl border border-line bg-surface/50 p-3">
                    <div className="flex items-center gap-2 font-medium text-ink">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                        <Banknote className="h-4 w-4" />
                      </div>
                      <span>เงินสด</span>
                    </div>
                    <span className="font-mono text-body font-bold text-ink">
                      ฿{baht(report.salesByMethod.cash)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-line bg-surface/50 p-3">
                    <div className="flex items-center gap-2 font-medium text-ink">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <WalletCards className="h-4 w-4" />
                      </div>
                      <span>โอนเงิน / QR</span>
                    </div>
                    <span className="font-mono text-body font-bold text-ink">
                      ฿{baht(report.salesByMethod.transfer)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-line bg-surface/50 p-3">
                    <div className="flex items-center gap-2 font-medium text-ink">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/12 text-warning">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <span>บัตรเครดิต</span>
                    </div>
                    <span className="font-mono text-body font-bold text-ink">
                      ฿{baht(report.salesByMethod.card)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Sold Breakdown Table */}
              <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
                <div className="border-b border-line bg-surface px-5 py-3 font-display text-body font-bold text-ink">
                  รายการสินค้าที่ขายได้ ({report.soldItems.length} รายการ)
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-body-sm">
                    <thead className="border-b border-line bg-surface/60 text-[12px] font-semibold text-ink-soft">
                      <tr>
                        <th className="px-5 py-3">ชื่อสินค้า / บริการ</th>
                        <th className="px-4 py-3 text-right">จำนวนที่ขาย</th>
                        <th className="px-5 py-3 text-right">ยอดรวม (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {report.soldItems.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-brand-soft/20 transition-colors">
                          <td className="px-5 py-3 font-semibold text-ink">{item.name}</td>
                          <td className="px-4 py-3 text-right font-mono text-ink-soft">{item.quantity}</td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-brand">
                            ฿{baht(item.revenue)}
                          </td>
                        </tr>
                      ))}
                      {report.soldItems.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-5 py-8 text-center text-ink-soft">
                            ยังไม่มีรายการขายสินค้าในกะนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-line bg-surface px-6 py-3.5">
          <Button variant="secondary" className="rounded-xl px-6" onClick={onClose}>
            ปิดหน้ารายงาน
          </Button>
        </div>
      </div>
    </div>
  );
}
