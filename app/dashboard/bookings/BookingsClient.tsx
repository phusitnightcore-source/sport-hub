"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, Clock3, Copy, ExternalLink, Phone, RefreshCw, Search, ShoppingCart, SlidersHorizontal, ReceiptText } from "lucide-react";
import { CounterDialog } from "@/components/ui/CounterDialog";
import { StatusPill } from "@/components/ui/StatusPill";
import { BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/booking/status";
import { shiftBookingDate } from "@/lib/booking/dates";
import { formatBahtFromDb } from "@/lib/money";
import { BookingOperations } from "./BookingOperations";

export type BookingItem = {
  id:string; code:string; name:string; phone:string; date:string; start:string; end:string; amount:number; status:BookingStatus; attendance:string;
  branchId:string; courtId:string; courtName:string; source:"staff"|"online"; note:string|null; createdAt:string; paymentId:string|null;
  coach:{name:string;service:string;status:string}|null;
};
type Filters = { date:string; branch:string; court:string; status:string; source:string; q:string; page:number };
type Props = { bookings:BookingItem[]; branches:{id:string;name:string}[]; courts:{id:string;name:string;branch_id:string}[];
  filters:Filters; today:string; total:number; loadFailed:boolean; permissions:{create:boolean;verify:boolean;pos:boolean;refund:boolean} };
const field = "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand";
const button = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50";
const primary = button + " !bg-brand-soft !border-brand/30";
const thaiDate = (date:string) => new Date(date+"T12:00:00+07:00").toLocaleDateString("th-TH",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Bangkok"});

export function BookingsClient({bookings,branches,courts,filters,today,total,loadFailed,permissions}:Props) {
  const router = useRouter();
  const [pending,startTransition] = useTransition();
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [copyStatus,setCopyStatus] = useState("");
  const selected = bookings.find(b => b.id === selectedId);
  function navigate(patch:Partial<Filters>) {
    const params = new URLSearchParams();
    Object.entries({...filters,page:1,...patch}).forEach(([key,value]) => {
      if (value !== "all" && value !== "" && !(key === "page" && value === 1)) params.set(key,String(value));
    });
    startTransition(() => router.push("/dashboard/bookings?"+params,{scroll:false}));
  }
  const branchName = (id:string) => branches.find(b => b.id === id)?.name ?? "สาขา";
  const details = (b:BookingItem) => { setCopyStatus(""); setSelectedId(b.id); };
  const pill = (b:BookingItem) => <StatusPill tone={BOOKING_STATUS_LABEL[b.status].tone}>{BOOKING_STATUS_LABEL[b.status].label}</StatusPill>;
  function action(b:BookingItem) {
    if (b.status === "awaiting_verification" && permissions.verify && b.paymentId) return <Link className={primary} href={"/dashboard/payments/"+b.paymentId}><ReceiptText size={16}/>ตรวจสลิป</Link>;
    if (b.status === "pending_payment" && permissions.pos) return <Link className={primary} href={"/pos?booking="+b.code+"&branch="+b.branchId}><ShoppingCart size={16}/>รับชำระ</Link>;
    if (b.status === "awaiting_refund" && permissions.refund) return <Link className={primary} href="/dashboard/refunds">จัดการคืนเงิน</Link>;
    return <button className={button} onClick={() => details(b)}>รายละเอียด<ArrowRight size={16}/></button>;
  }
  return <main className="space-y-6 text-ink" aria-busy={pending}>
    <header className="overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="mb-3 text-xs font-semibold tracking-widest text-brand">BOOKING DESK</p><h1 className="text-3xl font-bold tracking-tight">ทุกการจอง จัดการได้ที่นี่</h1><p className="mt-3 text-sm text-ink/70">ตรวจคิวลูกค้า ดูสถานะ และจัดการงานหน้าสนามในที่เดียว</p></div>
        <div className="flex flex-wrap gap-2"><Link className={button} href={"/dashboard/schedule?date="+filters.date+(filters.branch !== "all" ? "&branch="+filters.branch : "")}><CalendarDays size={18}/>ตารางสนาม</Link>{permissions.create && <Link className={primary} href={"/dashboard/bookings/new?date="+filters.date}><CalendarPlus size={18}/>จองให้ลูกค้า</Link>}</div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{[
        {key:"awaiting_verification",title:"ตรวจสลิป",sub:"เปิดรายการที่รอการยืนยัน",icon:ReceiptText},
        {key:"pending_payment",title:"รอชำระเงิน",sub:"ติดตามการรับชำระของลูกค้า",icon:Clock3},
        {key:"confirmed",title:"ยืนยันแล้ว",sub:"เตรียมสนามสำหรับลูกค้า",icon:CheckCircle2},
      ].map(item => <button key={item.key} disabled={pending} className={"flex items-center gap-4 rounded-2xl border p-4 text-left transition hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand "+(filters.status === item.key ? "border-brand bg-brand-soft" : "border-line bg-surface")} onClick={() => navigate({status:filters.status === item.key ? "all" : item.key})}><span className="rounded-xl bg-brand-soft p-3 text-brand"><item.icon size={22}/></span><span><span className="block font-semibold">{item.title}</span><span className="mt-1 block text-xs text-ink/70">{item.sub}</span></span></button>)}</div>
    </header>
    <section className="space-y-5 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs text-ink/70">วันที่ใช้งานสนาม</p><h2 className="mt-1 font-bold">{thaiDate(filters.date)}</h2></div>
        <div className="flex flex-wrap items-center gap-2"><button aria-label="วันก่อนหน้า" disabled={pending} className={button} onClick={() => navigate({date:shiftBookingDate(filters.date,-1)})}><ArrowLeft size={16}/></button><button disabled={pending} className={button} onClick={() => navigate({date:today})}>วันนี้</button><input type="date" aria-label="วันที่จอง" className={field+" !w-auto"} value={filters.date} disabled={pending} onChange={e => e.target.value && navigate({date:e.target.value})}/><button aria-label="วันถัดไป" disabled={pending} className={button} onClick={() => navigate({date:shiftBookingDate(filters.date,1)})}><ArrowRight size={16}/></button></div>
      </div>
      <form className="flex gap-2" onSubmit={e => {e.preventDefault();navigate({q:String(new FormData(e.currentTarget).get("q") ?? "")});}}><div className="relative flex-1"><Search size={19} className="absolute left-4 top-4 text-ink/60"/><input key={filters.q} name="q" aria-label="ค้นหาการจอง" maxLength={80} defaultValue={filters.q} placeholder="ค้นหาชื่อ เบอร์โทร หรือรหัสจอง" className={field+" pl-12"}/></div><button disabled={pending} className={primary}>ค้นหา</button></form>
      <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-xs text-ink/70"><span>สาขา</span><select className={field} value={filters.branch} onChange={e => navigate({branch:e.target.value,court:"all"})}><option value="all">ทุกสาขาที่ดูแล</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="space-y-2 text-xs text-ink/70"><span>สนาม</span><select className={field} value={filters.court} onChange={e => navigate({court:e.target.value})}><option value="all">ทุกสนาม</option>{courts.filter(c => filters.branch === "all" || c.branch_id === filters.branch).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="space-y-2 text-xs text-ink/70"><span>สถานะ</span><select className={field} value={filters.status} onChange={e => navigate({status:e.target.value})}><option value="all">ทุกสถานะ</option>{Object.entries(BOOKING_STATUS_LABEL).map(([key,s]) => <option key={key} value={key}>{s.label}</option>)}</select></label>
        <label className="space-y-2 text-xs text-ink/70"><span>ช่องทางจอง</span><select className={field} value={filters.source} onChange={e => navigate({source:e.target.value})}><option value="all">ทุกช่องทาง</option><option value="online">ลูกค้าจองเอง</option><option value="staff">เจ้าหน้าที่สร้าง</option></select></label>
      </fieldset>
    </section>
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{loadFailed ? "ข้อมูลยังไม่พร้อม" : total.toLocaleString("th-TH")+" รายการตามตัวกรอง"}</h2><div className="flex gap-2"><button disabled={pending} className={button} onClick={() => navigate({branch:"all",court:"all",status:"all",source:"all",q:""})}><SlidersHorizontal size={15}/>ล้างตัวกรอง</button><button disabled={pending} className={button} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={15} className={pending ? "animate-spin" : ""}/>อัปเดต</button></div></div>
      {pending && <p role="status" className="text-sm text-ink/70">กำลังโหลดรายการ…</p>}
      {loadFailed ? <div role="alert" className="rounded-2xl border border-warning/40 bg-surface p-8"><h3 className="font-bold">โหลดข้อมูลไม่ครบ</h3><p className="mt-2 text-sm">กดอัปเดตเพื่อลองอีกครั้ง หากยังไม่สำเร็จให้ตรวจการเชื่อมต่อ</p></div>
        : !bookings.length ? <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-14 text-center"><CalendarDays size={36} className="mx-auto text-brand"/><h3 className="mt-4 text-lg font-semibold">ไม่พบการจองที่ตรงกับตัวกรอง</h3><p className="mt-2 text-sm text-ink/70">ลองเปลี่ยนวัน ล้างคำค้น หรือเลือกสถานะอื่น</p></div>
        : bookings.map(b => <article key={b.id} className="rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand/40">
          <div className="flex flex-wrap items-center justify-between gap-5"><button className="flex min-w-0 flex-1 items-start gap-4 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={() => details(b)}>
            <div className="shrink-0 rounded-2xl bg-brand-soft px-4 py-3 text-center"><strong className="block font-mono text-lg">{b.start}</strong><span className="text-xs text-ink/70">ถึง {b.end}</span></div>
            <div className="min-w-0"><p className="text-xs text-ink/70">{branchName(b.branchId)} · {b.courtName}</p><h3 className="mt-1 truncate text-base font-bold">{b.name}</h3><p className="mt-2 text-xs text-ink/70">{b.phone} · <span className="font-mono">#{b.code}</span></p><div className="mt-2 flex flex-wrap gap-2"><span className="inline-flex rounded-lg bg-brand-soft px-2 py-1 text-xs">{b.source === "online" ? "ลูกค้าจองเอง" : "เจ้าหน้าที่สร้าง"}</span>{b.coach&&<span className="inline-flex rounded-lg bg-purple-500/10 px-2 py-1 text-xs text-purple-700 dark:text-purple-300">โค้ช {b.coach.name} · {b.coach.status}</span>}</div></div>
          </button><div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-line pt-4 sm:w-auto sm:border-0 sm:pt-0"><div className="space-y-2 text-right"><p className="font-bold">฿{formatBahtFromDb(b.amount)}</p>{pill(b)}</div>{action(b)}</div></div>
        </article>)}
      {!loadFailed && total > 40 && <nav aria-label="หน้ารายการจอง" className="flex items-center justify-between pt-3"><button className={button} disabled={pending || filters.page <= 1} onClick={() => navigate({page:filters.page-1})}><ArrowLeft size={16}/>ก่อนหน้า</button><span className="text-sm text-ink/70">หน้า {filters.page} / {Math.ceil(total/40)}</span><button className={button} disabled={pending || filters.page*40 >= total} onClick={() => navigate({page:filters.page+1})}>ถัดไป<ArrowRight size={16}/></button></nav>}
    </section>
    {selected && <CounterDialog title="รายละเอียดการจอง" onClose={() => setSelectedId(null)}>
      <div className="flex items-center justify-between gap-3">{pill(selected)}<span className="font-mono text-sm">#{selected.code}</span></div>
      <div className="rounded-2xl bg-brand-soft p-5"><p className="text-sm">{branchName(selected.branchId)}</p><h3 className="mt-1 text-xl font-bold">{selected.courtName}</h3><p className="mt-3 text-sm">{thaiDate(selected.date)}</p><p className="mt-1 font-mono text-2xl font-bold">{selected.start}–{selected.end}</p></div>
      <div className="space-y-3 text-sm"><p className="font-semibold">{selected.name}</p><a className="flex items-center gap-2 text-brand underline underline-offset-4" href={"tel:"+selected.phone}><Phone size={17}/>{selected.phone}</a><div className="flex justify-between border-t border-line pt-4"><span>ยอดการจอง</span><strong className="text-xl">฿{formatBahtFromDb(selected.amount)}</strong></div>{selected.note && <p className="whitespace-pre-wrap rounded-xl border border-line p-3">หมายเหตุ: {selected.note}</p>}<p className="text-xs text-ink/70">{selected.source === "online" ? "ลูกค้าจองเอง" : "เจ้าหน้าที่สร้าง"} · สร้าง {new Date(selected.createdAt).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})}</p></div>
      {selected.coach&&<div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm"><p className="font-semibold">นัดสอนกับโค้ช {selected.coach.name}</p><p className="mt-1 text-ink/70">{selected.coach.service} · สถานะ {selected.coach.status}</p><p className="mt-2 text-xs">ค่าสอนแยกจากค่าคอร์ท เจ้าของสนามเห็นข้อมูลเพื่อจัดคิวเท่านั้น</p></div>}
      <div className="grid gap-2 sm:grid-cols-2"><Link href={"/booking/"+selected.code} target="_blank" rel="noopener noreferrer" className={button}><ExternalLink size={16}/>หน้าการจองลูกค้า</Link><button className={button} onClick={async () => {try {await navigator.clipboard.writeText(window.location.origin+"/booking/"+selected.code);setCopyStatus("คัดลอกลิงก์แล้ว");} catch {setCopyStatus("คัดลอกไม่สำเร็จ เปิดหน้าการจองเพื่อคัดลอกลิงก์ได้");}}}><Copy size={16}/>คัดลอกลิงก์</button>{selected.paymentId && permissions.verify && <Link className={primary} href={"/dashboard/payments/"+selected.paymentId}><ReceiptText size={16}/>ตรวจสลิปนี้</Link>}{permissions.pos && <Link className={primary} href={"/pos?booking="+selected.code+"&branch="+selected.branchId}><ShoppingCart size={16}/>เปิดใน POS</Link>}</div>
      <BookingOperations key={selected.id} id={selected.id} attendance={selected.attendance} confirmed={selected.status === "confirmed"} canManage={permissions.create}/>
      {copyStatus && <p role="status" className="text-sm">{copyStatus}</p>}
    </CounterDialog>}
  </main>;
}
