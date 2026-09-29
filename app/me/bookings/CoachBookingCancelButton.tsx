"use client";
import {useState,useTransition} from "react";
import {cancelMyCoachBooking} from "./actions";
export function CoachBookingCancelButton({id}:{id:string}) {
  const [pending,startTransition]=useTransition();const [message,setMessage]=useState("");
  return <div className="mt-3"><button disabled={pending} className="rounded-xl border border-danger/30 px-3 py-2 text-xs font-semibold text-danger disabled:opacity-50" onClick={()=>{const reason=window.prompt("เหตุผลที่ยกเลิกนัดโค้ช")??"";if(!reason)return;startTransition(async()=>{try{const result=await cancelMyCoachBooking(id,reason);setMessage(result.error??"ยกเลิกนัดโค้ชแล้ว รายการสนามยังคงอยู่");}catch{setMessage("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");}});}}>{pending?"กำลังยกเลิก…":"ยกเลิกนัดโค้ช"}</button>{message&&<p role="status" className="mt-2 text-xs text-ink-soft">{message}</p>}</div>;
}
