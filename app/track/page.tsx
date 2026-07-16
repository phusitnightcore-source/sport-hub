import Link from "next/link";
import { PublicNav } from "@/components/ui/PublicNav";
import { TrackClient } from "./TrackClient";

// หน้าเช็คการจองสำหรับผู้ใช้ทั่วไป (guest) — ยืนยันด้วยเบอร์ + รหัสจอง
export const metadata = {
  title: "เช็คการจอง — SportHub",
};

export default function TrackPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />

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
