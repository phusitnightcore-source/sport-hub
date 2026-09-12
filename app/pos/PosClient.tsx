"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Banknote, Check, Coffee, CreditCard, History, LayoutGrid, Minus, Package, Pause, Plus, Receipt, Search, ShoppingBag, ShoppingCart, Store, Trash2, Wallet, Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CounterDialog } from "@/components/ui/CounterDialog";
import { cartTotals, cashChange } from "@/lib/pos/money";
import type { CounterReport, DailySummary } from "@/lib/pos/types";
import { completePosSale, openShift, closeShift, recordCashMovement, refundPosSale, getShiftReport } from "./actions";
import { ShiftReportModal } from "./ShiftReportModal";

export type PosProduct = {
  id: string; name: string; sku: string | null; barcode?: string | null; category?: string;
  type: "product" | "rental" | "service"; sellingPrice: number; trackStock: boolean;
  lowStockThreshold?: number; stockByBranch: Record<string, number>;
};
export type ShiftHistoryItem = {
  id: string; branch_id: string; opened_by: string | null; closed_by: string | null;
  opened_at: string; closed_at: string | null; status: "open" | "closed"; starting_cash: number;
  actual_closing_cash: number | null; expected_closing_cash: number | null; notes: string | null;
};
export type SaleHistoryItem = {
  id: string; receipt_number: string; sale_number: string; customer_name: string | null;
  customer_phone: string | null; total_amount: number; discount_amount: number; subtotal: number;
  completed_at: string; branch_id: string; shift_id: string | null; payment_method?: string;
  status?: "completed" | "voided";
};
type Branch = { id: string; name: string };
type Shift = { id: string; branch_id: string; opened_at: string; starting_cash: number };
type Method = "cash" | "transfer" | "card" | "other";
type Draft = { cart: Record<string, number>; customerName: string; customerPhone: string; bookingCode: string; note: string; discount: string; percent: boolean };
const blank = (): Draft => ({ cart: {}, customerName: "", customerPhone: "", bookingCode: "", note: "", discount: "", percent: false });
const methods = [
  { key: "cash", name: "เงินสด", icon: Banknote }, { key: "transfer", name: "โอนเงิน", icon: Wallet },
  { key: "card", name: "บัตร", icon: CreditCard }, { key: "other", name: "อื่น ๆ", icon: Receipt },
] as const;
const baht = (n: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const date = (s: string) => new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });
const field = "w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm text-ink outline-none focus:border-brand";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-brand-soft disabled:opacity-40";
const primary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-40";
function Label({ title, children }: { title: string; children: ReactNode }) { return <label className="block space-y-2 text-sm font-medium"><span>{title}</span>{children}</label>; }
function ProductIcon({ product }: { product: PosProduct }) {
  const Icon = /อาหาร|เครื่องดื่ม|ขนม|กาแฟ/.test(product.category ?? "") ? Coffee : product.type === "rental" ? Wrench : product.type === "service" ? Receipt : Package;
  return <Icon size={30} strokeWidth={1.5}/>;
}

export function PosClient({ branches, products, activeShifts, pastShifts, pastSales, dailySummary = [], canRefund = false, canInventory = false, ready = true }: {
  branches: Branch[]; products: PosProduct[]; activeShifts: Shift[]; pastShifts: ShiftHistoryItem[]; pastSales: SaleHistoryItem[];
  dailySummary?: DailySummary[]; canRefund?: boolean; canInventory?: boolean; ready?: boolean;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [tab, setTab] = useState<"sell" | "sales" | "shifts">("sell");
  const [draft, setDraft] = useState<Draft>(blank);
  const [held, setHeld] = useState<{ id: string; branchId: string; draft: Draft; time: string }[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [typeFilter, setTypeFilter] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [modal, setModal] = useState<null | "open" | "close" | "pay" | "hold" | "clear" | "cash" | "refund" | "success">(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [closeReport, setCloseReport] = useState<CounterReport | null>(null);
  const [saleToRefund, setSaleToRefund] = useState<SaleHistoryItem | null>(null);
  const [lastSale, setLastSale] = useState<{ id: string; receipt: string; change: number } | null>(null);
  const [method, setMethod] = useState<Method>("cash");
  const [received, setReceived] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const request = useRef<Parameters<typeof completePosSale>[0] | null>(null);
  const operationLock = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const cashRequest = useRef<string | null>(null);
  const active = activeShifts.find(s => s.branch_id === branchId);
  const summary = dailySummary.find(s => s.branch_id === branchId);
  const items = useMemo(() => products.filter(p => draft.cart[p.id]).map(product => ({ product, quantity: draft.cart[product.id] })), [products, draft.cart]);
  let totals = { subtotal: 0, discount: 0, total: 0 };
  let totalError = "";
  try { totals = cartTotals(items.map(i => ({ price: i.product.sellingPrice, quantity: i.quantity })), Number(draft.discount) || 0, draft.percent); }
  catch { totalError = "ส่วนลดไม่ถูกต้อง ต้องไม่เกินยอดสินค้า"; }
  const stockError = items.some(i => i.product.trackStock && i.quantity > (i.product.stockByBranch[branchId] ?? 0)) || Object.keys(draft.cart).some(id => !products.some(p => p.id === id));
  const categories = ["ทั้งหมด", ...Array.from(new Set(products.map(p => p.category || "ทั่วไป"))).sort()];
  const visible = products.filter(p => (category === "ทั้งหมด" || (p.category || "ทั่วไป") === category)
    && (typeFilter === "all" || p.type === typeFilter)
    && (!availableOnly || !p.trackStock || (p.stockByBranch[branchId] ?? 0) > 0)
    && (!query.trim() || [p.name, p.sku, p.barcode, p.category].join(" ").toLowerCase().includes(query.trim().toLowerCase())));
  const branchHolds = held.filter(h => h.branchId === branchId);
  const sales = pastSales.filter(s => s.branch_id === branchId
    && (historyStatus === "all" || (s.status ?? "completed") === historyStatus)
    && [s.receipt_number, s.sale_number, s.customer_name, s.customer_phone].join(" ").toLowerCase().includes(historyQuery.toLowerCase()));
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const patchDraft = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (Object.keys(draft.cart).length || held.length || uncertain) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft.cart, held.length, uncertain]);

  function add(p: PosProduct, change: number) {
    if (busy || uncertain) return;
    const quantity = (draft.cart[p.id] ?? 0) + change;
    if (quantity > 100 || (p.trackStock && quantity > (p.stockByBranch[branchId] ?? 0))) { setError("จำนวนเกินสต็อกหรือเกิน 100 ต่อรายการ"); return; }
    setError("");
    const cart = { ...draft.cart };
    if (quantity <= 0) delete cart[p.id]; else cart[p.id] = quantity;
    patchDraft({ cart });
  }
  function open(kind: typeof modal) { setError(""); setModal(kind); }
  async function run(action: () => Promise<void>) {
    if (operationLock.current) return;
    operationLock.current = true; setBusy(true); setError("");
    try { await action(); } catch { setError("การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง"); }
    finally { operationLock.current = false; setBusy(false); }
  }
  function hold() {
    if (!items.length || held.length >= 20) { setError("พักได้สูงสุด 20 บิลต่อหน้าต่าง"); return; }
    setHeld(h => [...h, { id: crypto.randomUUID(), branchId, draft, time: new Date().toISOString() }]);
    setDraft(blank()); setNotice("พักบิลแล้ว เรียกคืนได้จากปุ่มพักบิล"); setModal(null);
  }
  function startPayment() {
    if (!active || !items.length || totalError || stockError || !ready) return;
    setReceived(""); setReference(""); setConfirmed(false); request.current = null; setUncertain(false); open("pay");
  }
  async function checkout() {
    if (!active) return;
    await run(async () => {
      let change = 0;
      try { if (method === "cash") change = cashChange(totals.total, Number(received)); } catch { setError("เงินสดที่รับไม่เพียงพอ"); return; }
      if (!confirmed) { setError("กรุณายืนยันว่าได้รับเงินแล้ว"); return; }
      request.current ??= {
        branchId, shiftId: active.id, checkoutKey: crypto.randomUUID(),
        items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        paymentMethod: method, expectedTotal: totals.total, cashReceived: method === "cash" ? Number(received) : null,
        paymentConfirmed: true, paymentReference: reference, customerName: draft.customerName, customerPhone: draft.customerPhone,
        bookingCode: draft.bookingCode, note: draft.note, discountAmount: totals.discount,
      };
      setUncertain(true);
      try {
        const result = await completePosSale(request.current);
        if (result.error) {
          if (!("retrySafe" in result) || result.retrySafe) { setUncertain(false); request.current = null; }
          setError(result.error); return;
        }
        setLastSale({ id: result.saleId!, receipt: result.receiptNumber!, change });
        setDraft(blank()); request.current = null; setUncertain(false); setModal("success"); router.refresh();
      } catch { setError("ยังยืนยันผลการขายไม่ได้ กดลองรายการเดิมอีกครั้งเพื่อป้องกันบิลซ้ำ"); }
    });
  }
  async function prepareClose() {
    if (!active) return;
    if (items.length || branchHolds.length) { setError("จัดการบิลปัจจุบันและบิลพักของสาขานี้ก่อนปิดกะ"); return; }
    await run(async () => {
      const result = await getShiftReport(active.id);
      if (result.error || !result.data) { setError(result.error ?? "โหลดรายงานไม่สำเร็จ"); return; }
      setCloseReport(result.data); open("close");
    });
  }
  const modalError = error && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-ink">{error}</p>;

  return <main className="min-h-dvh bg-surface/30 text-ink">
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3"><Link href="/dashboard" aria-label="กลับแดชบอร์ด" className={secondary}><ArrowLeft size={18}/></Link><div className="rounded-2xl bg-brand-soft p-3 text-brand"><Store size={24}/></div><div><p className="text-xs font-semibold tracking-widest text-ink-soft">SPORTHUB / COUNTER</p><h1 className="text-xl font-bold">ขายหน้าสนาม</h1></div></div>
        <div className="flex flex-wrap items-center gap-2"><select aria-label="เลือกสาขา" className={field + " w-auto"} disabled={busy || uncertain} value={branchId} onChange={e => { if (items.length) { setError("พักบิลหรือล้างบิลก่อนเปลี่ยนสาขา"); return; } setBranchId(e.target.value); setDraft(blank()); setError(""); }} >{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><ThemeToggle/>{canInventory && <Link href="/dashboard/inventory" className={secondary}><Package size={16}/>สินค้าและสต็อก</Link>}</div>
      </div>
    </header>
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 md:px-8">
      {!ready && <div role="alert" className="rounded-2xl border border-warning/40 bg-surface p-5"><p className="font-bold">ยังไม่พร้อมรับชำระ</p><p className="mt-1 text-sm">โหลดข้อมูล POS ไม่ครบ กรุณาให้ผู้ดูแลตรวจสอบการเชื่อมต่อและอัปเดตระบบก่อนเริ่มขาย</p></div>}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-5"><span className={"rounded-full px-3 py-2 text-sm font-bold " + (active ? "bg-success/10 text-ink" : "bg-warning/10 text-ink")}>{active ? "● กะเปิดอยู่" : "○ ยังไม่เปิดกะ"}</span><div><p className="text-xs text-ink-soft">ยอดขายวันนี้ · เวลาไทย</p><p className="text-xl font-bold tabular-nums">{ready ? "฿" + baht(Number(summary?.revenue ?? 0)) : "—"} <span className="text-xs font-normal text-ink-soft">/ {summary?.sale_count ?? 0} บิล</span></p></div>{active && <p className="hidden text-sm text-ink-soft xl:block">เปิด {date(active.opened_at)} · เงินตั้งต้น ฿{baht(Number(active.starting_cash))}</p>}</div>
        <div className="flex flex-wrap gap-2">{active ? <><button className={secondary} disabled={busy} onClick={() => setReportId(active.id)}>สรุปกะ</button><button className={secondary} disabled={busy || !ready} onClick={() => { cashRequest.current = crypto.randomUUID(); open("cash"); }}>เงินเข้า / ออก</button><button className={secondary} disabled={busy || !ready} onClick={() => void prepareClose()}>ปิดกะ</button></> : <button className={primary} disabled={!ready || busy} onClick={() => open("open")}><Plus size={18}/>เปิดกะขาย</button>}</div>
      </section>
      {notice && <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-ink">{notice}</p>}
      {error && !modal && modalError}
      <nav className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-2xl bg-surface p-1 shadow-sm">{([{ key: "sell", label: "เคาน์เตอร์", icon: LayoutGrid }, { key: "sales", label: "ประวัติบิล", icon: Receipt }, { key: "shifts", label: "ประวัติกะ", icon: History }] as const).map(t => <button key={t.key} className={"flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold " + (tab === t.key ? "bg-brand-soft text-brand" : "text-ink-soft")} onClick={() => setTab(t.key)}><t.icon size={17}/>{t.label}</button>)}</div><button onClick={() => open("hold")} className={secondary}><Pause size={16}/>บิลพัก {branchHolds.length}</button></nav>

      {tab === "sell" && <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-1 shadow-sm"><Search size={20} className="text-ink-soft"/><input ref={searchRef} aria-label="ค้นหาหรือสแกนบาร์โค้ด" className="min-h-14 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="ค้นหาสินค้า ชื่อ SKU หรือสแกนบาร์โค้ดแล้ว Enter" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const p = products.find(p => p.barcode === query.trim() || p.sku === query.trim()); if (p) { add(p, 1); setQuery(""); } else setError("ไม่พบรหัสสินค้านี้"); } }}/>{query && <button className="p-2 text-sm" onClick={() => setQuery("")}>ล้าง</button>}</div>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="หมวดสินค้า">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={"shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium " + (category === c ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink")}>{c}</button>)}</div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-ink-soft">{visible.length} รายการ · แตะสินค้าเพื่อเพิ่มในบิล</p><div className="flex gap-3"><select aria-label="ประเภทสินค้า" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-line bg-surface p-2"><option value="all">ทุกประเภท</option><option value="product">สินค้าขาย</option><option value="rental">ค่าเช่า</option><option value="service">บริการ</option></select><label className="flex items-center gap-2"><input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)}/>พร้อมขาย</label></div></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{visible.map(p => {
            const stock = p.stockByBranch[branchId] ?? 0;
            const soldOut = p.trackStock && stock <= (draft.cart[p.id] ?? 0);
            return <button key={p.id} onClick={() => add(p, 1)} disabled={busy || soldOut} className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:border-brand hover:shadow-md disabled:opacity-50">
              <div className="mb-4 flex h-24 items-center justify-center rounded-xl bg-brand-soft text-brand"><ProductIcon product={p}/></div>
              {draft.cart[p.id] > 0 && <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">{draft.cart[p.id]}</span>}
              <p className="mb-1 truncate text-xs text-ink-soft">{p.category || "ทั่วไป"} · {p.type === "rental" ? "ค่าเช่า" : p.type === "service" ? "บริการ" : "สินค้า"}</p>
              <h3 className="min-h-10 text-sm font-semibold leading-5">{p.name}</h3>
              <div className="mt-3 flex items-center justify-between gap-1"><span className="font-bold tabular-nums">฿{baht(p.sellingPrice)}</span><span className="rounded-lg bg-brand-soft p-1.5 text-brand"><Plus size={16}/></span></div>
              <p className={"mt-2 text-xs " + (p.trackStock && stock <= (p.lowStockThreshold ?? 0) ? "font-semibold text-danger" : "text-ink-soft")}>{p.trackStock ? "คงเหลือ " + stock : "ไม่จำกัดสต็อก"}</p>
            </button>;
          })}</div>
          {!visible.length && <div className="rounded-2xl bg-surface p-12 text-center"><ShoppingBag className="mx-auto mb-4 text-brand" size={40}/><h3 className="font-bold">ยังไม่มีสินค้าที่ตรงกับการค้นหา</h3><p className="mt-2 text-sm text-ink-soft">เพิ่มอาหาร เครื่องดื่ม อุปกรณ์กีฬา หรือบริการได้ในคลังสินค้า</p>{canInventory && <Link className={secondary + " mt-5"} href="/dashboard/inventory">เพิ่มสินค้า</Link>}</div>}
        </section>
        <aside className="overflow-hidden rounded-3xl border border-line bg-surface shadow-md lg:sticky lg:top-4">
          <div className="flex items-center justify-between border-b border-line p-5"><div className="flex items-center gap-3"><ShoppingCart size={21} className="text-brand"/><h2 className="font-bold">บิลปัจจุบัน <span className="text-ink-soft">({count})</span></h2></div><button aria-label="ล้างบิล" disabled={!items.length || busy} className="rounded-lg p-2 text-ink-soft hover:bg-danger/10" onClick={() => open("clear")}><Trash2 size={18}/></button></div>
          <div className="max-h-80 overflow-y-auto px-5">{items.length ? items.map(({ product: p, quantity }) => <div key={p.id} className="border-b border-line py-4"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{p.name}</p><p className="shrink-0 text-sm font-bold tabular-nums">฿{baht(p.sellingPrice * quantity)}</p></div><div className="mt-3 flex items-center justify-between"><span className="text-xs text-ink-soft">฿{baht(p.sellingPrice)} / หน่วย</span><div className="flex items-center gap-3"><button className="rounded-lg border border-line p-2" aria-label={"ลด " + p.name} onClick={() => add(p, -1)}><Minus size={14}/></button><span className="min-w-5 text-center text-sm">{quantity}</span><button className="rounded-lg border border-line p-2" aria-label={"เพิ่ม " + p.name} onClick={() => add(p, 1)}><Plus size={14}/></button></div></div></div>) : <div className="py-12 text-center"><ShoppingCart className="mx-auto mb-3 text-ink-soft" size={32}/><p className="text-sm text-ink-soft">เลือกสินค้าด้านซ้ายเพื่อเริ่มบิล</p></div>}</div>
          <div className="space-y-4 p-5">
            <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer text-sm font-semibold">ลูกค้า / รหัสจอง / หมายเหตุ {draft.customerName && "· " + draft.customerName}</summary><div className="mt-4 space-y-3"><Label title="ชื่อลูกค้า"><input className={field} maxLength={120} value={draft.customerName} onChange={e => patchDraft({ customerName: e.target.value })}/></Label><Label title="เบอร์โทร"><input className={field} type="tel" maxLength={30} value={draft.customerPhone} onChange={e => patchDraft({ customerPhone: e.target.value })}/></Label><Label title="รหัสจองสนาม (8 ตัว)"><input className={field} maxLength={8} value={draft.bookingCode} onChange={e => patchDraft({ bookingCode: e.target.value.toUpperCase() })}/></Label><p className="text-xs text-ink-soft">เชื่อมอ้างอิงการจอง ไม่รวมค่าจองสนามในบิลนี้</p><Label title="หมายเหตุ เช่น ไม่หวาน / ไม่ใส่น้ำแข็ง"><textarea className={field} maxLength={500} value={draft.note} onChange={e => patchDraft({ note: e.target.value })}/></Label></div></details>
            <div className="flex items-center gap-2"><label htmlFor="pos-discount" className="flex-1 text-sm">ส่วนลดทั้งบิล</label><input id="pos-discount" type="number" min="0" step="0.01" value={draft.discount} onChange={e => patchDraft({ discount: e.target.value })} placeholder="0" className={field + " max-w-24 text-right"}/><select aria-label="รูปแบบส่วนลด" className={field + " max-w-20"} value={draft.percent ? "percent" : "baht"} onChange={e => patchDraft({ percent: e.target.value === "percent" })}><option value="baht">บาท</option><option value="percent">%</option></select></div>
            <div className="space-y-2 border-t border-dashed border-line pt-4"><div className="flex justify-between text-sm text-ink-soft"><span>รวมสินค้า</span><span>฿{baht(totals.subtotal)}</span></div><div className="flex justify-between text-sm text-ink-soft"><span>ส่วนลด</span><span>−฿{baht(totals.discount)}</span></div><div className="flex items-center justify-between pt-2"><span className="font-semibold">ยอดชำระ</span><strong className="text-3xl tabular-nums">฿{baht(totals.total)}</strong></div></div>
            {(totalError || stockError) && <p role="alert" className="text-sm text-danger">{totalError || "สต็อกเปลี่ยนหรือสินค้าปิดขาย กรุณาตรวจรายการใหม่"}</p>}
            <button className={primary + " w-full"} disabled={!active || !ready || !items.length || !!totalError || stockError || busy} onClick={startPayment}>{active ? "ไปชำระเงิน" : "เปิดกะก่อนรับชำระ"}<ArrowRight size={18}/></button>
            <button className={secondary + " w-full"} disabled={!items.length || busy} onClick={hold}><Pause size={16}/>พักบิลนี้</button>
          </div>
        </aside>
      </div>}

      {tab === "sales" && <section className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">ประวัติการขาย</h2><p className="mt-1 text-xs text-ink-soft">100 บิลล่าสุดของสาขาที่คุณมีสิทธิ์ · ยอดวันนี้ด้านบนคำนวณครบทั้งวัน</p></div><div className="flex gap-2"><input aria-label="ค้นหาประวัติบิล" placeholder="เลขบิล / ลูกค้า / โทร" className={field} value={historyQuery} onChange={e => setHistoryQuery(e.target.value)}/><select aria-label="สถานะบิล" className={field} value={historyStatus} onChange={e => setHistoryStatus(e.target.value)}><option value="all">ทุกสถานะ</option><option value="completed">ชำระแล้ว</option><option value="voided">คืนเงินแล้ว</option></select></div></div>
        {!sales.length && <p className="py-12 text-center text-ink-soft">ไม่พบบิลในรายการล่าสุด</p>}
        {sales.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line p-4"><div><p className="font-mono text-sm font-bold">{s.receipt_number}</p><p className="mt-1 text-xs text-ink-soft">{s.customer_name || "ลูกค้าหน้าสนาม"} · {date(s.completed_at)} · {methods.find(m => m.key === s.payment_method)?.name ?? "อื่น ๆ"}</p></div><div className="flex flex-wrap items-center gap-3"><div className="text-right"><p className="font-bold">฿{baht(s.total_amount)}</p><p className="text-xs text-ink-soft">{s.status === "voided" ? "คืนเงินแล้ว" : "ชำระแล้ว"}</p></div><Link href={"/pos/" + s.id + "/receipt"} className={secondary}>ใบเสร็จ</Link>{canRefund && active?.id === s.shift_id && s.status !== "voided" && <button className={secondary} onClick={() => { setSaleToRefund(s); open("refund"); }}>คืนเงิน</button>}</div></div>)}
      </section>}

      {tab === "shifts" && <section className="space-y-3 rounded-3xl bg-surface p-5 shadow-sm"><h2 className="font-bold">ประวัติกะ · 30 กะล่าสุด</h2>{pastShifts.filter(s => s.branch_id === branchId).map(s => <button key={s.id} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4 text-left hover:bg-brand-soft" onClick={() => setReportId(s.id)}><div><p className="text-sm font-semibold">{date(s.opened_at)}</p><p className="mt-1 text-xs text-ink-soft">{s.status === "open" ? "กะยังเปิดอยู่" : "ปิด " + date(s.closed_at!)}</p></div><div className="text-right"><p className="text-sm">เงินตั้งต้น ฿{baht(s.starting_cash)}</p>{s.status === "closed" && <p className="text-sm">เงินขาด / เกิน ฿{baht((s.actual_closing_cash ?? 0) - (s.expected_closing_cash ?? 0))}</p>}</div><ArrowRight size={18}/></button>)}{!pastShifts.some(s => s.branch_id === branchId) && <p className="py-10 text-center text-ink-soft">ยังไม่มีประวัติกะ</p>}</section>}
    </div>

    {modal && <CounterDialog title={{ open: "เปิดกะขาย", close: "ตรวจนับและปิดกะ", pay: "รับชำระเงิน", hold: "บิลที่พักไว้", clear: "ล้างบิลปัจจุบัน", cash: "เงินสดเข้า / ออกลิ้นชัก", refund: "คืนเงินเต็มบิล", success: "รับชำระสำเร็จ" }[modal]} busy={busy || uncertain} onClose={() => setModal(null)}>
      {modal === "pay" && <>
        <div className="rounded-2xl bg-brand-soft p-6 text-center"><p className="text-sm text-ink-soft">ยอดที่ต้องรับชำระ · {count} ชิ้น</p><p className="mt-2 text-4xl font-bold">฿{baht(totals.total)}</p></div>
        <fieldset disabled={busy || uncertain} className="space-y-4">
          <div className="grid grid-cols-4 gap-2">{methods.map(m => <button key={m.key} onClick={() => { setMethod(m.key); setConfirmed(false); }} className={"flex flex-col items-center gap-2 rounded-xl border py-3 text-xs " + (method === m.key ? "border-brand bg-brand-soft font-bold text-brand" : "border-line")}><m.icon size={22}/>{m.name}</button>)}</div>
          {method === "cash" ? <><Label title="รับเงินสด (บาท)"><input className={field + " text-xl"} type="number" min={totals.total} step="0.01" value={received} onChange={e => setReceived(e.target.value)}/></Label><div className="flex flex-wrap gap-2">{Array.from(new Set([totals.total, ...[100, 500, 1000].filter(n => n >= totals.total)])).map(n => <button key={n} onClick={() => setReceived(String(n))} className={secondary}>{n === totals.total ? "พอดี" : "฿" + baht(n)}</button>)}</div><div className="flex justify-between rounded-xl bg-success/10 p-4 font-bold"><span>เงินทอน</span><span>฿{baht(Math.max(0, Number(received) - totals.total))}</span></div></> : <><p className="rounded-xl bg-warning/10 p-3 text-sm">ตรวจสอบยอดเข้าบัญชีหรือผลบนเครื่องรูดบัตรก่อนยืนยัน ระบบนี้บันทึกการรับชำระด้วยพนักงาน</p><Label title="เลขอ้างอิงรายการ (ถ้ามี)"><input className={field} maxLength={120} value={reference} onChange={e => setReference(e.target.value)}/></Label></>}
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>ตรวจสอบและได้รับเงินครบแล้ว</label>
        </fieldset>
        {modalError}<button className={primary + " w-full"} disabled={busy || !confirmed || (method === "cash" && (received === "" || Number(received) < totals.total))} onClick={() => void checkout()}>{busy ? "กำลังบันทึก…" : uncertain ? "ลองยืนยันรายการเดิมอีกครั้ง" : "ยืนยันรับชำระ"}</button>
      </>}
      {modal === "success" && lastSale && <div className="space-y-5 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success"><Check size={32}/></span><p className="font-mono font-bold">{lastSale.receipt}</p><p className="text-2xl font-bold">เงินทอน ฿{baht(lastSale.change)}</p><Link className={secondary + " w-full"} href={"/pos/" + lastSale.id + "/receipt"}><Receipt size={18}/>เปิด / พิมพ์ใบเสร็จ</Link><button className={primary + " w-full"} onClick={() => { setModal(null); searchRef.current?.focus(); }}>ขายบิลถัดไป</button></div>}
      {modal === "open" && <form className="space-y-4" onSubmit={e => { e.preventDefault(); const amount = Number(new FormData(e.currentTarget).get("amount")); void run(async () => { const r = await openShift(branchId, amount); if (r.error) setError(r.error); else { setModal(null); router.refresh(); } }); }}><p className="text-sm text-ink-soft">นับเงินทอนเริ่มต้นในลิ้นชัก สาขา {branches.find(b => b.id === branchId)?.name}</p><Label title="เงินทอนเริ่มต้น"><input autoFocus className={field} name="amount" type="number" min="0" max="1000000" step="0.01" required defaultValue="1000"/></Label>{modalError}<button className={primary + " w-full"} disabled={busy}>เปิดกะและเริ่มขาย</button></form>}
      {modal === "close" && active && closeReport && <form className="space-y-4" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { const r = await closeShift(active.id, Number(f.get("amount")), String(f.get("reason"))); if (r.error) setError(r.error); else { setModal(null); router.refresh(); } }); }}><div className="rounded-xl bg-brand-soft p-4"><p className="text-sm">เงินสดที่ควรมี</p><p className="text-3xl font-bold">฿{baht(closeReport.expectedCash)}</p><p className="mt-2 text-xs">รวมเงินตั้งต้น ยอดขายเงินสดสุทธิ และเงินเข้า / ออกแล้ว</p></div><Label title="เงินสดที่นับได้จริง"><input autoFocus className={field} required name="amount" type="number" min="0" step="0.01"/></Label><Label title="หมายเหตุ (ต้องระบุเมื่อยอดไม่ตรง)"><textarea name="reason" className={field} maxLength={500}/></Label>{modalError}<button className={primary + " w-full"} disabled={busy}>ยืนยันปิดกะ</button></form>}
      {modal === "cash" && active && <form className="space-y-4" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { const r = await recordCashMovement({ shiftId: active.id, amount: Number(f.get("amount")) * Number(f.get("direction")), reason: String(f.get("reason")), requestId: cashRequest.current! }); if (r.error) setError(r.error); else { setModal(null); setNotice("บันทึกเงินสดเข้า / ออกแล้ว"); router.refresh(); } }); }}><Label title="ประเภทรายการ"><select className={field} name="direction"><option value="1">นำเงินเข้าลิ้นชัก</option><option value="-1">นำเงินออกจากลิ้นชัก</option></select></Label><Label title="จำนวนเงิน"><input className={field} name="amount" type="number" min="0.01" step="0.01" max="1000000" required/></Label><Label title="เหตุผล"><input className={field} name="reason" maxLength={500} required placeholder="เช่น เติมเงินทอน / ฝากเงินสด"/></Label>{modalError}<button className={primary + " w-full"} disabled={busy}>บันทึกเงินสด</button></form>}
      {modal === "refund" && saleToRefund && <form className="space-y-4" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { const r = await refundPosSale({ saleId: saleToRefund.id, reason: String(f.get("reason")), restock: f.get("restock") === "on", confirmed: f.get("confirmed") === "on" }); if (r.error) setError(r.error); else { setModal(null); setNotice("บันทึกคืนเงินแล้ว"); router.refresh(); } }); }}><p className="text-sm">{saleToRefund.receipt_number} · คืนเต็มจำนวน <strong>฿{baht(saleToRefund.total_amount)}</strong></p><p className="rounded-xl bg-warning/10 p-3 text-sm">คืนเงินผ่านช่องทางเดิมให้ลูกค้าก่อนบันทึก หน้านี้ไม่สั่งคืนเงินผ่านธนาคาร คืนได้เฉพาะกะเดิมที่ยังเปิดอยู่</p><Label title="เหตุผลคืนเงิน"><textarea className={field} name="reason" required maxLength={500}/></Label><label className="flex items-start gap-2 text-sm"><input name="restock" type="checkbox"/>คืนสินค้าทั้งบิลกลับสต็อก (เฉพาะของที่พร้อมขายต่อ)</label><label className="flex items-start gap-2 text-sm"><input name="confirmed" type="checkbox" required/>ยืนยันว่าได้คืนเงินเต็มจำนวนให้ลูกค้าแล้ว</label>{modalError}<button className={primary + " w-full"} disabled={busy}>บันทึกคืนเงิน</button></form>}
      {modal === "clear" && <><p className="text-sm">ล้างสินค้า ส่วนลด และข้อมูลลูกค้าในบิลที่ยังไม่ได้ชำระนี้?</p><button className={primary + " w-full"} onClick={() => { setDraft(blank()); setModal(null); }}>ยืนยันล้างบิล</button></>}
      {modal === "hold" && <><p className="rounded-xl bg-brand-soft p-3 text-sm">บิลพักเก็บเฉพาะในหน้าต่างนี้ รีเฟรชหรือปิดหน้าต่างแล้วจะหาย และยังไม่จองสต็อก</p>{branchHolds.map(h => <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-4" key={h.id}><div><p className="text-sm font-bold">{h.draft.customerName || "ลูกค้าหน้าสนาม"}</p><p className="text-xs text-ink-soft">{date(h.time)} · {Object.values(h.draft.cart).reduce((a,b) => a+b,0)} ชิ้น</p></div><button className={secondary} onClick={() => { if (items.length) { setError("พักหรือล้างบิลปัจจุบันก่อนเรียกคืน"); return; } setDraft(h.draft); setHeld(all => all.filter(x => x.id !== h.id)); setModal(null); setTab("sell"); }}>เรียกคืน</button></div>)}{!branchHolds.length && <p className="py-8 text-center text-ink-soft">ยังไม่มีบิลพักในสาขานี้</p>}{modalError}</>}
    </CounterDialog>}
    {reportId && <ShiftReportModal shiftId={reportId} onClose={() => setReportId(null)}/>}
  </main>;
}
