import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Activity, Calendar, CreditCard, Dumbbell } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-line bg-surface/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-brand" />
          <span className="font-display text-body-lg font-bold text-brand">
            SportHub
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="secondary">เข้าสู่ระบบ</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary">สมัครใช้งาน</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="flex flex-col items-center justify-center gap-6 py-24 text-center px-6">
          <h1 className="font-display text-display-xl font-bold tracking-tight text-ink sm:text-7xl">
            จัดการสนามกีฬาและฟิตเนส<br />
            <span className="text-brand">ง่ายกว่าที่เคย</span>
          </h1>
          <p className="max-w-2xl text-body-lg text-ink-soft">
            ระบบจองสนามกีฬาและจัดการสมาชิกฟิตเนสครบวงจร
            รองรับระบบชำระเงินอัตโนมัติ และการเช็คอินแบบไร้สัมผัส
          </p>
          <div className="mt-4 flex gap-4">
            <Link href="/signup">
              <Button variant="primary" size="lg">เริ่มต้นใช้งานฟรี</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">ดูเดโม่ระบบ</Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-12 text-center font-display text-display-md font-semibold text-ink">
            ฟีเจอร์หลักของเรา
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
            <div className="card-floating flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="font-display text-body-lg font-bold text-ink">ระบบจองสนามกีฬา</h3>
              <p className="text-body-sm text-ink-soft">
                จัดการสล็อตเวลาและป้องกันการจองซ้อนทับอัตโนมัติ
              </p>
            </div>
            <div className="card-floating flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Dumbbell className="h-6 w-6" />
              </div>
              <h3 className="font-display text-body-lg font-bold text-ink">ระบบสมาชิกฟิตเนส</h3>
              <p className="text-body-sm text-ink-soft">
                จัดการแพ็กเกจ ต่ออายุ และประวัติสมาชิกแบบครบวงจร
              </p>
            </div>
            <div className="card-floating flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="font-display text-body-lg font-bold text-ink">รับชำระเงินง่ายดาย</h3>
              <p className="text-body-sm text-ink-soft">
                รองรับการชำระเงินผ่าน QR PromptPay และอัปโหลดสลิป
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-line py-8 text-center text-body-sm text-ink-soft">
        <p>&copy; {new Date().getFullYear()} SportHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
