import Link from "next/link";
import { Activity } from "lucide-react";
import { TrackClient } from "./TrackClient";

// หน้าเช็คการจองสำหรับผู้ใช้ทั่วไป (guest) — ยืนยันด้วยเบอร์ + รหัสจอง
export const metadata = {
  title: "เช็คการจอง — SportHub",
};

export default function TrackPage() {
  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-line/60 bg-surface/70 px-6 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-brand" />
          <span className="font-display text-body-lg font-bold text-ink">SportHub</span>
        </Link>
        <Link
          href="/login"
          className="text-body-sm font-medium text-ink-soft hover:text-brand"
        >
          เข้าสู่ระบบสมาชิก
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-6 py-12">
        <div className="mb-6">
          <h1 className="font-display text-display-md font-semibold text-ink">
            เช็คการจองของฉัน
          </h1>
          <p className="text-body-sm text-ink-soft">
            สำหรับผู้ที่จองแบบไม่ได้สมัครสมาชิก
          </p>
        </div>

        <TrackClient />

        <p className="mt-8 text-center text-body-sm text-ink-soft">
          เป็นสมาชิกอยู่แล้ว?{" "}
          <Link href="/me/bookings" className="font-medium text-brand hover:underline">
            ดูประวัติการจองในบัญชี
          </Link>
        </p>
      </main>
    </div>
  );
}
