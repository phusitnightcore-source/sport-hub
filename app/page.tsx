import Link from "next/link";
import {
  Search,
  MapPin,
  CalendarDays,
  GraduationCap,
  Users,
  Trophy,
  ArrowRight,
  Sparkles,
  Dumbbell,
  Building,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Star,
  Clock,
  QrCode,
  CreditCard,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  Activity,
  PhoneCall,
} from "lucide-react";
import { PublicNav } from "@/components/ui/PublicNav";
import { Button } from "@/components/ui/Button";

import { LandingHeroSearch } from "@/components/landing/LandingHeroSearch";

export const metadata = {
  title: "SportHub | แพลตฟอร์มจองสนามกีฬา หาโค้ช และก๊วนกีฬาครบวงจรอันดับ 1",
  description: "ค้นหาและจองสนามกีฬา หาโค้ชผู้เชี่ยวชาญ เข้าร่วมก๊วนเล่นกีฬา และแข่งขันลีกทัวร์นาเมนต์ทั่วประเทศ ครบจบในที่เดียว",
};

const POPULAR_SPORTS = [
  { id: "badminton", name: "แบดมินตัน", icon: "🏸", venues: "120+ สนาม", color: "from-blue-500/10 via-brand-soft to-surface border-blue-200 dark:border-blue-900/50" },
  { id: "football", name: "ฟุตบอล / ฟุตซอล", icon: "⚽", venues: "85+ สนาม", color: "from-emerald-500/10 via-emerald-50 to-surface border-emerald-200 dark:border-emerald-900/50 dark:via-emerald-950/20" },
  { id: "tennis", name: "เทนนิส & พิกเคิลบอล", icon: "🎾", venues: "45+ สนาม", color: "from-amber-500/10 via-amber-50 to-surface border-amber-200 dark:border-amber-900/50 dark:via-amber-950/20" },
  { id: "basketball", name: "บาสเกตบอล", icon: "🏀", venues: "35+ สนาม", color: "from-orange-500/10 via-orange-50 to-surface border-orange-200 dark:border-orange-900/50 dark:via-orange-950/20" },
  { id: "fitness", name: "ฟิตเนส & ยิม", icon: "💪", venues: "90+ แห่ง", color: "from-purple-500/10 via-purple-50 to-surface border-purple-200 dark:border-purple-900/50 dark:via-purple-950/20" },
  { id: "golf", name: "กอล์ฟ & ซิมูเลเตอร์", icon: "⛳", venues: "25+ แห่ง", color: "from-green-500/10 via-green-50 to-surface border-green-200 dark:border-green-900/50 dark:via-green-950/20" },
  { id: "tabletennis", name: "ปิงปอง", icon: "🏓", venues: "30+ สนาม", color: "from-rose-500/10 via-rose-50 to-surface border-rose-200 dark:border-rose-900/50 dark:via-rose-950/20" },
  { id: "swimming", name: "ว่ายน้ำ", icon: "🏊", venues: "40+ สระ", color: "from-cyan-500/10 via-cyan-50 to-surface border-cyan-200 dark:border-cyan-900/50 dark:via-cyan-950/20" },
];

const TRUST_METRICS = [
  { label: "สนามกีฬามาตรฐาน", value: "500+", unit: "แห่ง", icon: Building },
  { label: "โค้ชมืออาชีพรับรอง", value: "1,200+", unit: "คน", icon: GraduationCap },
  { label: "สมาชิกนักกีฬาใช้งาน", value: "80,000+", unit: "คน", icon: Users },
  { label: "คะแนนความพึงพอใจ", value: "4.9/5", unit: "จาก 15,000+ รีวิว", icon: Star },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "ค้นหาสนามหรือบริการ",
    desc: "เลือกประเภทกีฬา ทำเลใกล้คุณ หรือค้นหาโค้ชและก๊วนที่เปิดรับตามเวลาที่คุณสะดวก",
    icon: Search,
  },
  {
    step: "02",
    title: "จองเวลา & ชำระเงินง่าย",
    desc: "ดูตารางว่างแบบ Real-time และชำระเงินสะดวกผ่าน PromptPay หรือบัตรเครดิต รับการยืนยันทันที",
    icon: CreditCard,
  },
  {
    step: "03",
    title: "สแกน QR Code เข้าเล่น",
    desc: "รับตั๋ว QR Code ดิจิทัลผ่านมือถือ สแกนเช็คอินที่หน้าสนามได้ทันที ไม่ต้องรอคิว",
    icon: QrCode,
  },
];

const FAQS = [
  {
    q: "จองสนามกีฬาผ่าน SportHub มีค่าธรรมเนียมเพิ่มเติมหรือไม่?",
    a: "ไม่มีค่าธรรมเนียมแอบแฝง ราคาที่แสดงเป็นราคามาตรฐานตรงจากสนาม และคุณยังสามารถใช้โค้ดส่วนลดเพื่อประหยัดได้เพิ่มขึ้น",
  },
  {
    q: "หากต้องการยกเลิกหรือเลื่อนเวลาจอง สามารถทำได้อย่างไร?",
    a: "คุณสามารถจัดการการจองได้จากหน้า 'ตรวจสอบการจอง' หรือ 'พื้นที่ของฉัน' ตามเงื่อนไขการยกเลิกของแต่ละสนาม",
  },
  {
    q: "หากเป็นเจ้าของสนาม ต้องการนำสนามเข้าระบบต้องทำอย่างไร?",
    a: "สามารถสมัครผ่านเมนู 'สำหรับธุรกิจ' ทีมงานจะติดต่อกลับเพื่อตั้งค่าระบบ Venue Suite และเปิดรับจองออนไลน์ได้ภายใน 24 ชม.",
  },
  {
    q: "การชำระเงินรองรับช่องทางใดบ้าง?",
    a: "รองรับการสแกน QR PromptPay พร้อมระบบตรวจสลิปอัตโนมัติ, บัตรเครดิต/เดบิต และการชำระเงินสดที่หน้าเคาน์เตอร์ POS",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-surface transition-colors">
      {/* Dynamic Background Glow Blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[550px] w-[550px] rounded-full bg-brand/12 blur-[120px]" />
        <div className="absolute right-[-12rem] top-48 h-[450px] w-[450px] rounded-full bg-warning/10 blur-[100px]" />
        <div className="absolute left-1/3 top-[800px] h-[500px] w-[500px] rounded-full bg-success/8 blur-[120px]" />
      </div>

      {/* Public Navigation with Hamburger Menu */}
      <PublicNav />

      <main className="flex-1 space-y-24 pb-20">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION */}
        {/* ========================================================================= */}
        <section className="relative mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8 sm:pt-20 text-center">
          {/* Glowing Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-body-sm font-bold text-brand shadow-xs">
            <Sparkles className="h-4 w-4 text-brand animate-pulse" />
            <span>Sport Ecosystem อันดับ 1 ในไทย · ครบวงจรที่สุด</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl max-w-4xl mx-auto leading-tight">
            เชื่อมต่อคุณกับ{" "}
            <span className="bg-gradient-to-r from-brand via-brand-dark to-brand bg-clip-text text-transparent">
              ทุกประสบการณ์กีฬา
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-body-lg text-ink-soft sm:text-xl">
            ค้นหาและจองสนามกีฬาทั่วประเทศ หาโค้ชเพื่อพัฒนาทักษะ เข้าร่วมก๊วนเล่นกีฬา และท้าประลองในลีกทัวร์นาเมนต์ ครบจบในที่เดียว
          </p>

          {/* Interactive Search & Quick Access Hub */}
          <LandingHeroSearch />

          {/* Social Proof Trust Bar */}
          <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
            {TRUST_METRICS.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="card-floating flex flex-col items-center p-5 text-center transition-transform hover:-translate-y-1"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
                    {m.value}
                  </p>
                  <p className="mt-0.5 text-body-sm font-semibold text-ink">{m.label}</p>
                  <p className="text-[11px] text-ink-soft">{m.unit}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. POPULAR SPORTS CATEGORIES */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                ประเภทกีฬายอดนิยม
              </h2>
              <p className="mt-1 text-body-sm text-ink-soft">
                เลือกประเภทกีฬาที่คุณชื่นชอบเพื่อดูสนามและกิจกรรมทั้งหมด
              </p>
            </div>
            <Link
              href="/discover"
              className="inline-flex items-center gap-1 text-body-sm font-bold text-brand hover:underline"
            >
              <span>ดูกีฬาทั้งหมด</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {POPULAR_SPORTS.map((sport) => (
              <Link
                key={sport.id}
                href={`/discover?sport=${sport.id}`}
                className={`group relative flex flex-col items-center justify-center rounded-3xl border bg-gradient-to-b ${sport.color} p-5 text-center shadow-xs transition-all duration-base hover:-translate-y-1.5 hover:shadow-md active:translate-y-0`}
              >
                <span className="text-4xl transition-transform duration-base group-hover:scale-125 mb-2">
                  {sport.icon}
                </span>
                <span className="font-display text-body-sm font-bold text-ink group-hover:text-brand transition-colors line-clamp-1">
                  {sport.name}
                </span>
                <span className="mt-1 text-[11px] font-medium text-ink-soft">
                  {sport.venues}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. CORE 4 PILLARS SHOWCASE */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[12px] font-bold uppercase tracking-wider text-brand">
              ประสบการณ์ครบวงจร
            </span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
              ทุกสิ่งที่คุณต้องการสำหรับชีวิตนักกีฬา
            </h2>
            <p className="mt-3 text-body text-ink-soft">
              ไม่ว่าคุณจะเป็นผู้เล่นมือใหม่ นักกีฬาสมัครเล่น หรือโค้ชมืออาชีพ SportHub มีเครื่องมือที่ตอบโจทย์คุณ
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 1. Court Booking */}
            <div className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-8 shadow-sm transition-all hover:border-brand/50 hover:shadow-xl">
              <div className="absolute right-0 top-0 -mr-12 -mt-12 h-44 w-44 rounded-full bg-brand/10 blur-2xl transition-transform group-hover:scale-150" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-sm mb-6">
                <Dumbbell className="h-7 w-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-ink group-hover:text-brand transition-colors">
                จองสนามกีฬาออนไลน์ 24 ชม.
              </h3>
              <p className="mt-3 text-body text-ink-soft leading-relaxed">
                เช็คตารางว่างแบบ Real-time ของสนามแบดมินตัน ฟุตบอล เทนนิส และอื่นๆ ทั่วประเทศ จองและยืนยันสิทธิ์ทันที ไม่ต้องโทรเช็คให้เสียเวลา
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-mono-sm font-semibold">
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ ล็อคคอร์ทแม่นยำ</span>
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ สแกน QR เช็คอิน</span>
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ รองรับระบบไฟอัตโนมัติ</span>
              </div>
              <Link
                href="/discover"
                className="mt-8 inline-flex items-center gap-2 font-display text-body font-bold text-brand group-hover:underline"
              >
                <span>เริ่มค้นหาสนามกีฬา</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* 2. Find Coaches */}
            <div className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-8 shadow-sm transition-all hover:border-amber-500/50 hover:shadow-xl">
              <div className="absolute right-0 top-0 -mr-12 -mt-12 h-44 w-44 rounded-full bg-amber-500/10 blur-2xl transition-transform group-hover:scale-150" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 shadow-sm mb-6">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-ink group-hover:text-amber-600 transition-colors">
                หาโค้ช & เทรนเนอร์มืออาชีพ
              </h3>
              <p className="mt-3 text-body text-ink-soft leading-relaxed">
                พัฒนาทักษะของคุณกับโค้ชที่มีใบรับรอง อ่านรีวิวจากนักเรียนจริง ดูคลิปตัวอย่างการสอน และจองตารางเรียนตัวต่อตัวหรือเป็นกลุ่มได้อย่างสะดวก
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-mono-sm font-semibold">
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ ตรวจสอบประวัติโค้ช</span>
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ รีวิวจริง 100%</span>
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ เลือกสถานที่เรียนได้</span>
              </div>
              <Link
                href="/coaches"
                className="mt-8 inline-flex items-center gap-2 font-display text-body font-bold text-amber-600 group-hover:underline"
              >
                <span>ดูโปรไฟล์โค้ชทั้งหมด</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* 3. Community Groups */}
            <div className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-8 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-xl">
              <div className="absolute right-0 top-0 -mr-12 -mt-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-2xl transition-transform group-hover:scale-150" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 shadow-sm mb-6">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-ink group-hover:text-emerald-600 transition-colors">
                หาก๊วนกีฬา & ชวนเพื่อนเล่น
              </h3>
              <p className="mt-3 text-body text-ink-soft leading-relaxed">
                ไม่มีเพื่อนเล่น หรือขาดคนในทีม? เข้าร่วมก๊วนที่เปิดรับตามระดับฝีมือของคุณ หรือสร้างก๊วนใหม่เพื่อหารค่าสนามและสร้างมิตรภาพใหม่ๆ
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-mono-sm font-semibold">
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ แบ่งตามระดับทักษะ</span>
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ ระบบหารค่าสนาม</span>
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ แชทพูดคุยในก๊วน</span>
              </div>
              <Link
                href="/groups"
                className="mt-8 inline-flex items-center gap-2 font-display text-body font-bold text-emerald-600 group-hover:underline"
              >
                <span>ค้นหาก๊วนที่เปิดรับ</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* 4. Tournaments */}
            <div className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-8 shadow-sm transition-all hover:border-rose-500/50 hover:shadow-xl">
              <div className="absolute right-0 top-0 -mr-12 -mt-12 h-44 w-44 rounded-full bg-rose-500/10 blur-2xl transition-transform group-hover:scale-150" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 shadow-sm mb-6">
                <Trophy className="h-7 w-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-ink group-hover:text-rose-600 transition-colors">
                ทัวร์นาเมนต์ & แข่งขันลีก
              </h3>
              <p className="mt-3 text-body text-ink-soft leading-relaxed">
                ค้นหาการแข่งขันกีฬาสมัครเล่นใกล้บ้าน ลงสมัครทีม ติดตามสายการแข่งขัน (Tournament Brackets) สะสมคะแนน Elo และก้าวขึ้นสู่ตาราง Leaderboard
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-mono-sm font-semibold">
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ สายแข่งอัตโนมัติ</span>
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ ระบบ Elo Rating</span>
                <span className="rounded-lg bg-surface border border-line px-3 py-1 text-ink">✓ ชิงเงินรางวัล & ถ้วย</span>
              </div>
              <Link
                href="/tournaments"
                className="mt-8 inline-flex items-center gap-2 font-display text-body font-bold text-rose-600 group-hover:underline"
              >
                <span>ดูตารางการแข่งขัน</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. HOW IT WORKS */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-line bg-gradient-to-b from-brand-soft/40 via-surface to-surface p-8 sm:p-14">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-[12px] font-bold uppercase tracking-wider text-brand">
                เริ่มต้นใช้งานง่ายๆ
              </span>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
                จองและออกกำลังกายได้ใน 3 ขั้นตอน
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {HOW_IT_WORKS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-surface/80 border border-line/60 shadow-xs"
                  >
                    <span className="absolute -top-4 font-display text-4xl font-extrabold text-brand/20">
                      {step.step}
                    </span>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/25">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-display text-body-lg font-bold text-ink">{step.title}</h3>
                    <p className="mt-2 text-body-sm text-ink-soft leading-relaxed">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. BUSINESS PARTNER CTA */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-slate-900 to-ink p-8 sm:p-14 text-white shadow-2xl">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-warning/20 blur-3xl" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-mono-sm font-bold text-brand-soft backdrop-blur-md">
                  <Building className="h-4 w-4" />
                  <span>SportHub Venue Suite สำหรับเจ้าของสนาม</span>
                </div>
                <h2 className="font-display text-3xl font-extrabold sm:text-4xl leading-tight">
                  ยกระดับสนามกีฬาของคุณสู่ระบบดิจิทัลแบบครบวงจร
                </h2>
                <p className="text-body-lg text-white/80 leading-relaxed">
                  จัดการตารางสนาม รับจองออนไลน์ 24 ชม. ระบบ POS ขายสินค้าหน้าร้าน ควบคุมไฟสนามอัตโนมัติ และตรวจสลิปทันใจ เพิ่มรายได้และลดต้นทุนแรงงาน
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 text-body-sm font-semibold text-white/90">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span>ระบบจองและชำระเงินอัตโนมัติ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span>POS แคชเชียร์ & คลังสินค้า</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span>รายงานยอดขาย & กะรายวัน</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span>ระบบสมาชิก & สแกนเช็คอิน</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-3">
                <Link
                  href="/business"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-4 font-display text-body-lg font-bold text-white shadow-lg shadow-brand/40 transition-all hover:bg-brand-dark hover:scale-105"
                >
                  <span>ดูรายละเอียดระบบสนาม</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-3.5 font-display text-body-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>ปรึกษาทีมงานผู้เชี่ยวชาญ</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. FAQS SECTION */}
        {/* ========================================================================= */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              คำถามที่พบบ่อย (FAQ)
            </h2>
            <p className="mt-1 text-body-sm text-ink-soft">
              ข้อสงสัยเกี่ยวกับการจอง การหาโค้ช และการใช้งานระบบ
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="card-floating p-6 space-y-2 border border-line"
              >
                <h3 className="font-display text-body-lg font-bold text-ink flex items-start gap-2.5">
                  <HelpCircle className="h-5 w-5 text-brand shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-body-sm text-ink-soft pl-7 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 7. COMPREHENSIVE FOOTER */}
      {/* ========================================================================= */}
      <footer className="mt-auto border-t border-line bg-surface pt-16 pb-12 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-5 lg:gap-12 pb-12 border-b border-line">
            {/* Brand column */}
            <div className="md:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/25">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="font-display text-2xl font-extrabold text-ink">
                  Sport<span className="text-brand">Hub</span>
                </span>
              </Link>
              <p className="text-body-sm text-ink-soft leading-relaxed max-w-sm">
                แพลตฟอร์ม Sport Ecosystem ครบวงจรที่สุดในไทย เชื่อมต่อผู้เล่น โค้ช และสนามกีฬาเข้าด้วยกันอย่างไร้รอยต่อ
              </p>
              <div className="flex items-center gap-3 text-body-sm font-semibold text-ink">
                <span>⚡ ออกกำลังกายง่ายขึ้นทุกวัน</span>
              </div>
            </div>

            {/* Column 1: นักกีฬา */}
            <div className="space-y-3">
              <h4 className="font-display text-body-sm font-bold text-ink uppercase tracking-wider">สำหรับนักกีฬา</h4>
              <ul className="space-y-2 text-body-sm text-ink-soft font-medium">
                <li><Link href="/discover" className="hover:text-brand transition-colors">ค้นหาและจองสนาม</Link></li>
                <li><Link href="/coaches" className="hover:text-brand transition-colors">หาโค้ชสอนกีฬา</Link></li>
                <li><Link href="/groups" className="hover:text-brand transition-colors">หาก๊วนเล่นกีฬา</Link></li>
                <li><Link href="/tournaments" className="hover:text-brand transition-colors">การแข่งขันลีก</Link></li>
                <li><Link href="/leaderboard" className="hover:text-brand transition-colors">ตารางคะแนน Leaderboard</Link></li>
              </ul>
            </div>

            {/* Column 2: ธุรกิจ & โค้ช */}
            <div className="space-y-3">
              <h4 className="font-display text-body-sm font-bold text-ink uppercase tracking-wider">สำหรับธุรกิจ</h4>
              <ul className="space-y-2 text-body-sm text-ink-soft font-medium">
                <li><Link href="/business" className="hover:text-brand transition-colors">ระบบจัดการสนามกีฬา</Link></li>
                <li><Link href="/me/coach/apply" className="hover:text-brand transition-colors">สมัครเป็นโค้ชพาร์ทเนอร์</Link></li>
                <li><Link href="/pos" className="hover:text-brand transition-colors">ระบบ POS แคชเชียร์</Link></li>
                <li><Link href="/dashboard" className="hover:text-brand transition-colors">เข้าสู่แดชบอร์ดเจ้าของ</Link></li>
              </ul>
            </div>

            {/* Column 3: ข้อมูล & ช่วยเหลือ */}
            <div className="space-y-3">
              <h4 className="font-display text-body-sm font-bold text-ink uppercase tracking-wider">ช่วยเหลือ & ข้อมูล</h4>
              <ul className="space-y-2 text-body-sm text-ink-soft font-medium">
                <li><Link href="/track" className="hover:text-brand transition-colors">ตรวจสอบรหัสการจอง</Link></li>
                <li><Link href="/blog" className="hover:text-brand transition-colors">บทความ & สาระกีฬา</Link></li>
                <li><Link href="/contact" className="hover:text-brand transition-colors">ติดต่อเรา</Link></li>
                <li><Link href="/privacy" className="hover:text-brand transition-colors">นโยบายความเป็นส่วนตัว</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center text-[12px] text-ink-soft">
            <p>&copy; {new Date().getFullYear()} SportHub Platform. สงวนลิขสิทธิ์ทุกประการ.</p>
            <p>Made with ❤️ for Thai Sports Community</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
