import Link from "next/link";
import {
  Activity,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  Zap,
  Trophy,
  Users,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  ScanLine,
  TrendingUp,
  QrCode,
  Sparkles,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "จองสนามอัจฉริยะ",
    desc: "เลือกสล็อตเวลาแบบเรียลไทม์ กันจองซ้อนอัตโนมัติที่ระดับฐานข้อมูล",
  },
  {
    icon: Dumbbell,
    title: "สมาชิกฟิตเนสครบวงจร",
    desc: "แพ็กเกจ ต่ออายุ แช่แข็ง และประวัติสมาชิก จบในที่เดียว",
  },
  {
    icon: QrCode,
    title: "รับเงินผ่าน PromptPay",
    desc: "สร้าง QR อัตโนมัติ ลูกค้าแนบสลิป ยืนยันแล้วออกใบเสร็จให้ทันที",
  },
  {
    icon: ScanLine,
    title: "เช็คอินไร้สัมผัส",
    desc: "สแกนบัตรสมาชิกดิจิทัล นับจำนวนคนในสนามแบบสดทุกสาขา",
  },
  {
    icon: TrendingUp,
    title: "รายงาน & วิเคราะห์",
    desc: "รายได้ ชั่วโมงพีค สนามยอดนิยม เห็นภาพธุรกิจในแดชบอร์ดเดียว",
  },
  {
    icon: ShieldCheck,
    title: "ปลอดภัย & แยกร้าน",
    desc: "ข้อมูลแต่ละสนามแยกขาดด้วย Row Level Security รองรับ PDPA",
  },
];

const STATS = [
  { value: "500+", label: "สนาม & ฟิตเนส" },
  { value: "50K+", label: "การจองต่อเดือน" },
  { value: "0", label: "การจองซ้อนทับ" },
  { value: "99.9%", label: "เวลาให้บริการ" },
];

const STEPS = [
  { icon: MapPin, title: "สมัคร & ตั้งค่าสนาม", desc: "เพิ่มสาขา คอร์ท และแพ็กเกจใน 5 นาที" },
  { icon: Zap, title: "แชร์ลิงก์จอง", desc: "ลูกค้าจองเองผ่านลิงก์ ไม่ต้องโทรจอง" },
  { icon: Trophy, title: "โตแบบวัดผลได้", desc: "ดูรายได้และสถิติเรียลไทม์ทุกวัน" },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {/* ---- Decorative background blobs ---- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-3xl animate-blob" />
        <div className="absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-brand-dark/15 blur-3xl animate-float-slow" />
        <div className="absolute bottom-24 left-1/3 h-72 w-72 rounded-full bg-success/10 blur-3xl animate-float" />
      </div>

      {/* ---- Header ---- */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-line/60 bg-surface/70 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-sm">
            <Activity className="h-5 w-5" />
            <span className="absolute inset-0 rounded-full bg-brand/40 animate-pulse-ring" />
          </span>
          <span className="font-display text-body-lg font-bold text-ink">SportHub</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="secondary" size="sm">เข้าสู่ระบบ</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">สมัครใช้งาน</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ---- Hero ---- */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col gap-6">
            <span
              className="animate-fade-up inline-flex w-fit items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-body-sm font-medium text-brand-dark shadow-sm"
              style={{ animationDelay: "0ms" }}
            >
              <Sparkles className="h-4 w-4" />
              แพลตฟอร์มจัดการสนามกีฬา #1 ของไทย
            </span>

            <h1
              className="animate-fade-up font-display text-display-lg font-bold leading-tight tracking-tight text-ink sm:text-display-xl"
              style={{ animationDelay: "80ms" }}
            >
              เปลี่ยนสนามกีฬาของคุณ<br />
              ให้{" "}
              <span className="bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent">
                จองเต็มทุกสล็อต
              </span>
            </h1>

            <p
              className="animate-fade-up max-w-lg text-body-lg text-ink-soft"
              style={{ animationDelay: "160ms" }}
            >
              ระบบจองสนาม สมาชิกฟิตเนส รับชำระเงิน และเช็คอิน ครบในที่เดียว —
              ตั้งค่าเสร็จใน 5 นาที เริ่มรับจองออนไลน์ได้ทันที
            </p>

            <div
              className="animate-fade-up flex flex-wrap gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <Link href="/signup">
                <Button variant="primary" size="lg" className="group">
                  เริ่มต้นใช้งานฟรี
                  <ArrowRight className="h-5 w-5 transition-transform duration-fast group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">ดูเดโม่ระบบ</Button>
              </Link>
            </div>

            <div
              className="animate-fade-up flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-ink-soft"
              style={{ animationDelay: "320ms" }}
            >
              {["ไม่ต้องใช้บัตรเครดิต", "ทดลองฟรี 30 วัน", "ยกเลิกได้ทุกเมื่อ"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Hero visual — floating product collage */}
          <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
            {/* การ์ดหลัก: มินิ Live Slot Grid */}
            <div className="card-floating relative z-10 mx-auto max-w-sm rotate-[-2deg] p-5 shadow-lg animate-float">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display font-semibold text-ink">คอร์ท A · วันนี้</span>
                <span className="pill-success rounded-full px-3 py-1 text-body-sm font-medium">
                  ว่าง 4 ช่วง
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  "open", "booked", "open", "peak",
                  "booked", "open", "blocked", "open",
                  "open", "peak", "booked", "open",
                ].map((s, i) => (
                  <div
                    key={i}
                    className={
                      "flex h-10 items-center justify-center rounded-sm text-mono-sm font-medium " +
                      (s === "booked"
                        ? "bg-success text-white"
                        : s === "blocked"
                          ? "slot-hatch bg-line text-ink-soft"
                          : "bg-brand-soft text-brand") +
                      (i === 2 ? " animate-slot-breathe" : "")
                    }
                  >
                    {s === "peak" ? "🔥" : s === "booked" ? "" : "•"}
                  </div>
                ))}
              </div>
            </div>

            {/* การ์ดลอย: บัตรสมาชิก */}
            <div className="card-floating absolute -left-2 top-2 z-20 flex w-52 items-center gap-3 p-3 shadow-md animate-float-slow sm:-left-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-body-sm font-semibold text-ink">สมาชิกใหม่</p>
                <p className="font-mono text-mono-sm text-ink-soft">+128 เดือนนี้</p>
              </div>
            </div>

            {/* การ์ดลอย: ชำระเงินสำเร็จ */}
            <div
              className="card-floating absolute -bottom-4 right-0 z-20 flex w-56 items-center gap-3 p-3 shadow-md animate-float sm:right-[-1.5rem]"
              style={{ animationDelay: "1.2s" }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-body-sm font-semibold text-ink">รับชำระแล้ว</p>
                <p className="font-mono text-mono-sm text-ink-soft">฿1,200 · PromptPay</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Stats band ---- */}
        <section className="mx-auto max-w-6xl px-6 py-6">
          <div className="card-floating grid grid-cols-2 gap-6 p-8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center">
                <span className="font-display text-display-md font-bold text-brand">
                  {s.value}
                </span>
                <span className="text-body-sm text-ink-soft">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Features ---- */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="font-display text-display-md font-semibold text-ink">
              ทุกอย่างที่สนามคุณต้องใช้
            </h2>
            <p className="mt-2 text-body text-ink-soft">
              เครื่องมือครบชุด ออกแบบมาเพื่อธุรกิจกีฬาโดยเฉพาะ
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card-floating group flex flex-col gap-4 p-7 transition-all duration-base hover:-translate-y-1.5 hover:shadow-lg"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand transition-colors duration-fast group-hover:bg-brand group-hover:text-white">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="font-display text-body-lg font-bold text-ink">{f.title}</h3>
                <p className="text-body-sm text-ink-soft">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- How it works ---- */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-12 text-center">
            <h2 className="font-display text-display-md font-semibold text-ink">
              เริ่มใช้งานใน 3 ขั้นตอน
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center gap-3 text-center">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-md">
                  <s.icon className="h-7 w-7" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface font-display text-body-sm font-bold text-brand shadow-sm">
                    {i + 1}
                  </span>
                </span>
                <h3 className="font-display text-body-lg font-bold text-ink">{s.title}</h3>
                <p className="max-w-xs text-body-sm text-ink-soft">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- CTA ---- */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-brand to-brand-dark p-10 text-center shadow-lg animate-gradient-pan sm:p-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/30 blur-2xl animate-float" />
              <div className="absolute -bottom-10 left-10 h-40 w-40 rounded-full bg-white/20 blur-2xl animate-float-slow" />
            </div>
            <div className="relative flex flex-col items-center gap-5">
              <Trophy className="h-12 w-12 text-white" />
              <h2 className="max-w-2xl font-display text-display-md font-bold text-white sm:text-display-lg">
                พร้อมให้สนามของคุณจองเต็มทุกวันหรือยัง?
              </h2>
              <p className="max-w-xl text-body-lg text-white/85">
                เข้าร่วมกับสนามกีฬาและฟิตเนสทั่วไทยที่ใช้ SportHub เพิ่มยอดจอง
              </p>
              <Link href="/signup" className="mt-2">
                <Button variant="secondary" size="lg" className="group">
                  เริ่มต้นฟรีวันนี้
                  <ArrowRight className="h-5 w-5 transition-transform duration-fast group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ---- Footer ---- */}
      <footer className="mt-auto border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand" />
            <span className="font-display font-bold text-ink">SportHub</span>
          </div>
          <p className="text-body-sm text-ink-soft">
            แพลตฟอร์มจัดการสนามกีฬาและฟิตเนสครบวงจรสำหรับธุรกิจไทย
          </p>
          <p className="text-body-sm text-ink-soft">
            &copy; {new Date().getFullYear()} SportHub. สงวนลิขสิทธิ์.
          </p>
        </div>
      </footer>
    </div>
  );
}
