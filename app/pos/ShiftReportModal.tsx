"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { CounterDialog } from "@/components/ui/CounterDialog";
import type { CounterReport } from "@/lib/pos/types";
import { getShiftReport } from "./actions";

const baht = (n: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const names = { cash: "เงินสด", transfer: "โอนเงิน", card: "บัตร", other: "อื่น ๆ" };
export function ShiftReportModal({ shiftId, onClose }: { shiftId: string; onClose: () => void }) {
  const [report, setReport] = useState<CounterReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    getShiftReport(shiftId).then(r => { if (live) { if (r.error) setError(r.error); else setReport(r.data ?? null); } })
      .catch(() => { if (live) setError("โหลดรายงานไม่สำเร็จ กรุณาปิดแล้วเปิดอีกครั้ง"); });
    return () => { live = false; };
  }, [shiftId]);
  function download() {
    if (!report) return;
    const rows = [
      ["รายการ", "จำนวน", "ยอดบาท"],
      ["ยอดขายสุทธิ", "", report.totalRevenue],
      ["เงินตั้งต้น", "", report.shift.starting_cash],
      ["เงินสดเข้า/ออกสุทธิ", "", report.cashMovementTotal],
      ["เงินสดที่ควรมี", "", report.expectedCash],
      ...Object.entries(report.salesByMethod).map(([m, amount]) => [names[m as keyof typeof names], "", amount]),
      ...report.soldItems.map(i => [i.name, i.quantity, i.revenue]),
    ];
    // Escape formula-like user-authored names as well as quotes.
    const cell = (value: unknown) => {
      let s = String(value);
      if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(r => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "pos-shift-" + shiftId + ".csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <CounterDialog title="รายงานสรุปกะ" onClose={onClose}>
    {error ? <p role="alert" className="rounded-xl bg-danger/10 p-4">{error}</p> : !report ? <p role="status" className="py-12 text-center text-ink-soft">กำลังโหลดรายงาน…</p> : <>
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{new Date(report.shift.opened_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</span><span className="rounded-full bg-brand-soft px-3 py-1">{report.shift.status === "open" ? "กะเปิดอยู่" : "ปิดกะแล้ว"}</span></div>
      <div className="rounded-2xl bg-brand-soft p-5"><p className="text-sm">ยอดขายสุทธิหลังคืนเงิน</p><p className="mt-2 text-3xl font-bold">฿{baht(report.totalRevenue)}</p></div>
      <dl className="space-y-3 text-sm">{Object.entries(report.salesByMethod).map(([m, n]) => <div className="flex justify-between" key={m}><dt>{names[m as keyof typeof names]}</dt><dd className="font-bold">฿{baht(n)}</dd></div>)}</dl>
      <dl className="space-y-3 border-t border-line pt-4 text-sm">
        <div className="flex justify-between"><dt>เงินตั้งต้น</dt><dd>฿{baht(report.shift.starting_cash)}</dd></div>
        <div className="flex justify-between"><dt>เงินเข้า / ออกสุทธิ</dt><dd>฿{baht(report.cashMovementTotal)}</dd></div>
        <div className="flex justify-between font-bold"><dt>เงินสดที่ควรมี</dt><dd>฿{baht(report.expectedCash)}</dd></div>
        {report.shift.status === "closed" && <><div className="flex justify-between"><dt>เงินสดนับจริง</dt><dd>฿{baht(report.shift.actual_closing_cash ?? 0)}</dd></div><div className="flex justify-between"><dt>ขาด / เกิน</dt><dd>฿{baht((report.shift.actual_closing_cash ?? 0) - (report.shift.expected_closing_cash ?? 0))}</dd></div></>}
      </dl>
      <section className="space-y-3 border-t border-line pt-4"><h3 className="font-bold">สินค้าขายสุทธิ</h3><p className="text-xs text-ink-soft">ยอดสินค้าแสดงก่อนส่วนลดทั้งบิล</p>{report.soldItems.map((i, index) => <div key={index} className="flex justify-between gap-3 text-sm"><span>{i.name} × {i.quantity}</span><span className="shrink-0">฿{baht(i.revenue)}</span></div>)}{!report.soldItems.length && <p className="text-sm text-ink-soft">ยังไม่มียอดขาย</p>}</section>
      {!!report.cashMovements.length && <section className="space-y-3 border-t border-line pt-4"><h3 className="font-bold">ประวัติเงินเข้า / ออก</h3>{report.cashMovements.map((m,i) => <div key={i} className="flex justify-between gap-4 text-sm"><span>{m.reason}</span><span>฿{baht(m.amount)}</span></div>)}</section>}
      <button onClick={download} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line p-3 text-sm font-semibold hover:bg-brand-soft"><Download size={18}/>ดาวน์โหลดรายงาน CSV</button>
    </>}
  </CounterDialog>;
}
