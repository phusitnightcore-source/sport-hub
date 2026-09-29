"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookingHistory, updateAttendance, rescheduleBooking } from "./actions";
import type { Json } from "@/lib/supabase/types";

export function BookingOperations({id,attendance,confirmed,canManage}:{id:string;attendance:string;confirmed:boolean;canManage:boolean}) {
  const router = useRouter();
  const [pending,startTransition] = useTransition();
  const [message,setMessage] = useState("");
  const [history,setHistory] = useState<Json>();
  const labels:Record<string,string> = {not_arrived:"ยังไม่มาถึง",checked_in:"เช็กอินแล้ว",completed:"ใช้งานเสร็จแล้ว",no_show:"ไม่มาตามนัด"};
  const button="min-h-11 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-brand-soft";
  return <section className="space-y-3 rounded-2xl border border-line p-4">
    <h3 className="font-semibold">การใช้งานสนาม · {labels[attendance] ?? attendance}</h3>
    {confirmed && canManage && !["completed","no_show"].includes(attendance) && <form action={form => startTransition(async () => {
      setMessage("");
      try { const result=await updateAttendance(id,String(form.get("status")),String(form.get("reason")));setMessage(result.error ?? "บันทึกสถานะแล้ว");if (!result.error) {setHistory(undefined);router.refresh();} }
      catch {setMessage("การเชื่อมต่อขัดข้อง กรุณาอัปเดตข้อมูลก่อนลองใหม่");}
    })}>
      <fieldset disabled={pending} className="space-y-3">
        <p className="text-xs text-ink/70">เช็กอินได้ในวันจองก่อนหมดเวลา ส่วนไม่มาตามนัดบันทึกได้หลังหมดเวลาจอง โดยไม่เปลี่ยนยอดเงิน</p>
        <select name="status" aria-label="สถานะการใช้งานใหม่" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3">
          {attendance === "not_arrived" ? <><option value="checked_in">เช็กอินเข้สนาม</option><option value="no_show">ไม่มาตามนัด</option></> : <option value="completed">จบการใช้งาน</option>}
        </select>
        <input name="reason" required minLength={2} maxLength={500} aria-label="หมายเหตุการเปลี่ยนสถานะ" placeholder="หมายเหตุ เช่น ลูกค้ามาถึงครบแล้ว" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3"/>
        <button className={button} type="submit">{pending ? "กำลังบันทึก…" : "ยืนยันสถานะ"}</button>
      </fieldset>
    </form>}
    {confirmed && canManage && attendance === "not_arrived" && <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer py-2 font-semibold">เลื่อนวันและเวลา</summary><p className="my-3 text-xs text-ink/70">คงสนามเดิม จำนวนชั่วโมงและราคาเดิม ระบบตรวจเวลาว่างและนโยบายก่อนบันทึก หากราคาเปลี่ยนให้สร้างการจองใหม่และจัดการคืนเงินเดิม</p><form action={form => startTransition(async () => {setMessage("");try {const result=await rescheduleBooking(id,String(form.get("date")),String(form.get("start")),String(form.get("reason")));setMessage(result.error ?? "เลื่อนสำเร็จ ดูรายการได้ในวันที่ใหม่");if (!result.error) router.refresh();} catch {setMessage("เชื่อมต่อไม่สำเร็จ กรุณาอัปเดตข้อมูลก่อนลองใหม่");}})}><fieldset disabled={pending} className="grid gap-3"><label className="text-sm">วันใหม่<input name="date" type="date" required className={button+" block w-full"}/></label><label className="text-sm">เวลาเริ่มใหม่<input name="start" type="time" required className={button+" block w-full"}/></label><input name="reason" required minLength={2} maxLength={500} placeholder="เหตุผลการเลื่อน" aria-label="เหตุผลการเลื่อน" className={button}/><button className={button}>ยืนยันเลื่อนการจอง</button></fieldset></form></details>}
    <button className={button} disabled={pending} onClick={() => startTransition(async () => {try {const result=await bookingHistory(id);setMessage(result.error ?? "");setHistory(result.data);} catch {setMessage("โหลดประวัติไม่สำเร็จ");}})}>ดูประวัติการจัดการล่าสุด</button>
    {message && <p role="status" className="text-sm">{message}</p>}
    {Array.isArray(history) && <ol className="space-y-2 text-sm">{history.length===0 && <li className="text-ink/70">ยังไม่มีประวัติหลังเปิดใช้ระบบนี้</li>}{history.map((entry,i) => {
      if (!entry || typeof entry!=="object" || Array.isArray(entry)) return null;
      const detail=entry.detail && typeof entry.detail==="object" && !Array.isArray(entry.detail) ? entry.detail : {};
      return <li key={i} className="rounded-xl bg-brand-soft p-3"><p>{entry.action === "attendance" ? labels[String(detail.after)] : entry.action === "cancel" ? "ยกเลิกการจอง" : entry.action === "reschedule" ? `เลื่อนจาก ${detail.old_date} ${detail.old_start} → ${detail.date} ${detail.start}` : "ตรวจสอบการชำระเงิน"}</p>{typeof detail.reason === "string" && <p className="mt-1 break-words">{detail.reason}</p>}<p className="mt-1 text-xs text-ink/70">{new Date(String(entry.created_at)).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})}</p></li>;
    })}</ol>}
  </section>;
}
