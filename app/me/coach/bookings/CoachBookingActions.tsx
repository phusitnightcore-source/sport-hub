"use client";
import {useState,useTransition} from "react";
import {Check,X,Play,Flag} from "lucide-react";
import {advanceCoachBooking,respondCoachBooking} from "./actions";

export function CoachBookingActions({id,status}:{id:string;status:string}) {
  const [pending,startTransition]=useTransition();const [message,setMessage]=useState("");
  const run=(action:string,note="")=>startTransition(async()=>{setMessage("");try {const result=action==="start"||action==="complete" ? await advanceCoachBooking(id,action) : await respondCoachBooking(id,action,note);setMessage(result.error??"บันทึกแล้ว");} catch {setMessage("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");}});
  const cls="flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50";
  if (status==="requested") return <div className="space-y-2"><button disabled={pending} onClick={()=>run("accept")} className={cls+" bg-success text-white"}><Check size={16}/>ตอบรับ</button><button disabled={pending} onClick={()=>{const reason=window.prompt("เหตุผลที่ปฏิเสธ (ไม่บังคับ)")??"";run("reject",reason);}} className={cls+" border border-line text-danger"}><X size={16}/>ปฏิเสธ</button>{message&&<p role="status" className="text-xs">{message}</p>}</div>;
  if (status==="accepted"||status==="confirmed") return <div><button disabled={pending} onClick={()=>run("start")} className={cls+" bg-brand text-white"}><Play size={16}/>เริ่มสอน</button>{message&&<p role="status" className="mt-2 text-xs">{message}</p>}</div>;
  if (status==="in_progress") return <div><button disabled={pending} onClick={()=>run("complete")} className={cls+" bg-success text-white"}><Flag size={16}/>จบการสอน</button>{message&&<p role="status" className="mt-2 text-xs">{message}</p>}</div>;
  return null;
}
