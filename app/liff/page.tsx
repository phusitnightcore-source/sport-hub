"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Loader2, IdCard } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { BookingRow, type BookingRowData } from "@/components/ui/BookingRow";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

type Liff = {
  init: (c: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: () => void;
  getIDToken: () => string | null;
};
type LiffWindow = Window & { liff?: Liff };
type Member = { name: string; memberNumber: string; endDate: string | null; status: string; venue: string };
type View = "loading" | "unconfigured" | "error" | "nomember" | "ready";

export default function LiffPage() {
  const [view, setView] = useState<View>(LIFF_ID ? "loading" : "unconfigured");
  const [member, setMember] = useState<Member | null>(null);
  const [bookings, setBookings] = useState<BookingRowData[]>([]);

  async function init() {
    const w = window as LiffWindow;
    if (!LIFF_ID || !w.liff) {
      setView("unconfigured");
      return;
    }
    try {
      await w.liff.init({ liffId: LIFF_ID });
      if (!w.liff.isLoggedIn()) {
        w.liff.login();
        return;
      }
      const idToken = w.liff.getIDToken();
      const res = await fetch("/api/liff/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const json = await res.json();
      if (!json.ok) return setView("error");
      if (!json.member) return setView("nomember");
      setMember(json.member);
      setBookings(json.bookings ?? []);
      setView("ready");
    } catch {
      setView("error");
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-8">
      {LIFF_ID && (
        <Script
          src="https://static.line-scdn.net/liff/edge/2/sdk.js"
          strategy="afterInteractive"
          onLoad={init}
        />
      )}

      {view === "loading" && (
        <div className="flex flex-col items-center gap-3 py-20 text-ink-soft">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-body-sm">กำลังโหลด…</p>
        </div>
      )}

      {view === "unconfigured" && (
        <div className="card-floating p-8 text-center text-body-sm text-ink-soft">
          ยังไม่ได้ตั้งค่า LIFF — ตั้ง NEXT_PUBLIC_LIFF_ID + LINE_LOGIN_CHANNEL_ID ก่อน
        </div>
      )}

      {view === "error" && (
        <div className="card-floating p-8 text-center text-body-sm text-danger">
          เกิดข้อผิดพลาด กรุณาลองใหม่
        </div>
      )}

      {view === "nomember" && (
        <div className="card-floating flex flex-col items-center gap-3 p-8 text-center">
          <IdCard className="h-10 w-10 text-ink-soft" />
          <p className="text-body-sm text-ink-soft">
            ยังไม่พบบัญชีสมาชิกที่ผูกกับ LINE นี้ — พิมพ์เบอร์ที่สมัครใน LINE OA ของสนามเพื่อผูกบัญชี
          </p>
        </div>
      )}

      {view === "ready" && member && (
        <div className="flex flex-col gap-5">
          <div className="card-floating flex flex-col gap-2 bg-gradient-to-br from-brand to-brand-dark p-5 text-white">
            <span className="text-body-sm text-white/80">{member.venue}</span>
            <span className="font-display text-display-md font-bold">{member.name}</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-mono-sm text-white/90">{member.memberNumber}</span>
              <StatusPill tone={member.status === "active" ? "success" : "warning"}>
                {member.status === "active" ? "ใช้งานอยู่" : member.status}
              </StatusPill>
            </div>
            {member.endDate && (
              <span className="text-body-sm text-white/80">หมดอายุ {member.endDate}</span>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-display text-body-lg font-semibold text-ink">การจองของฉัน</h2>
            {bookings.length === 0 ? (
              <p className="text-body-sm text-ink-soft">ยังไม่มีการจอง</p>
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.map((b) => (
                  <BookingRow key={b.code} booking={b} />
                ))}
              </div>
            )}
          </div>

          <Link href="/me/bookings" className="text-center text-body-sm text-brand hover:underline">
            เปิดในเว็บ
          </Link>
        </div>
      )}
    </div>
  );
}
