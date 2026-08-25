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
} from "lucide-react";
import { PublicNav } from "@/components/ui/PublicNav";

export const metadata = {
  title: "SportHub | ระบบจองสนามกีฬา หาโค้ช และก๊วนกีฬาครบวงจร",
  description: "SportHub - ค้นหาสนามกีฬา จองเวลาเรียนกับโค้ช เข้าร่วมก๊วน และแข่งขันกีฬาทั่วประเทศ แพลตฟอร์มที่ตอบโจทย์ทุกไลฟ์สไตล์การออกกำลังกายของคุณ",
};

const MAIN_CATEGORIES = [
  { id: "badminton", name: "แบดมินตัน", icon: "🏸", color: "from-brand-soft to-white" },
  { id: "football", name: "ฟุตบอล", icon: "⚽", color: "from-success/20 to-white" },
  { id: "tennis", name: "เทนนิส", icon: "🎾", color: "from-warning/20 to-white" },
  { id: "basketball", name: "บาสเกตบอล", icon: "🏀", color: "from-danger/20 to-white" },
  { id: "fitness", name: "ฟิตเนส", icon: "💪", color: "from-ink-soft/20 to-white" },
  { id: "golf", name: "กอล์ฟ", icon: "⛳", color: "from-success/30 to-white" },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-surface">
      {/* Background elements */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-[500px] w-[500px] rounded-full bg-brand/10 blur-[100px] animate-blob" />
        <div className="absolute right-[-10rem] top-40 h-[400px] w-[400px] rounded-full bg-warning/10 blur-[80px] animate-float-slow" />
      </div>

      <PublicNav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-24 text-center">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-body-sm font-medium text-brand-dark mb-6">
            <Sparkles className="h-4 w-4" />
            Sport Ecosystem ที่ใหญ่ที่สุดในไทย
          </span>
          
          <h1 className="animate-fade-up font-display text-display-lg font-bold leading-tight text-ink sm:text-display-xl max-w-4xl mx-auto" style={{ animationDelay: "100ms" }}>
            เชื่อมต่อคุณกับ{" "}
            <span className="bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent">
              ทุกประสบการณ์กีฬา
            </span>
          </h1>
          
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-body-lg text-ink-soft" style={{ animationDelay: "200ms" }}>
            ค้นหาและจองสนามกีฬา หาโค้ชเพื่อพัฒนาทักษะ เข้าร่วมก๊วนเล่นกีฬา และท้าประลองในการแข่งขัน ครบจบในที่เดียว
          </p>

          {/* Main Search Bar */}
          <div className="animate-fade-up mx-auto mt-10 max-w-3xl" style={{ animationDelay: "300ms" }}>
            <form action="/discover" className="flex flex-col sm:flex-row shadow-lg rounded-radius-md overflow-hidden ring-1 ring-inset ring-line bg-white focus-within:ring-2 focus-within:ring-brand">
              <div className="flex flex-1 items-center px-4 py-3 sm:py-4">
                <Search className="h-5 w-5 text-ink-soft shrink-0" />
                <input 
                  type="text" 
                  name="q"
                  placeholder="ค้นหาชื่อสนาม, กีฬา, หรือสถานที่..." 
                  className="w-full border-none bg-transparent px-3 text-body outline-none placeholder:text-ink-soft"
                />
              </div>
              <div className="flex items-center border-t sm:border-t-0 sm:border-l border-line px-4 py-3 sm:py-4 bg-surface-soft min-w-[200px]">
                <MapPin className="h-5 w-5 text-ink-soft shrink-0" />
                <select className="w-full border-none bg-transparent px-2 text-body outline-none cursor-pointer">
                  <option value="">ใกล้ฉัน (เปิด GPS)</option>
                  <option value="bkk">กรุงเทพมหานคร</option>
                  <option value="cm">เชียงใหม่</option>
                  <option value="pky">ภูเก็ต</option>
                </select>
              </div>
              <button type="submit" className="bg-brand px-8 py-4 font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto w-full">
                ค้นหา
              </button>
            </form>
          </div>
        </section>

        {/* Explore Categories */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-display-md font-semibold text-ink">กีฬายอดนิยม</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {MAIN_CATEGORIES.map((cat) => (
              <Link 
                key={cat.id} 
                href={`/discover?sport=${cat.id}`}
                className={`flex flex-col items-center justify-center p-6 rounded-radius-md bg-gradient-to-br ${cat.color} ring-1 ring-inset ring-line/50 transition-transform hover:-translate-y-1 hover:shadow-md`}
              >
                <span className="text-4xl mb-3">{cat.icon}</span>
                <span className="font-medium text-ink">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-display-md font-semibold text-ink text-center mb-12">ประสบการณ์ที่ SportHub มอบให้คุณ</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Find Courts */}
            <Link href="/discover" className="group relative overflow-hidden rounded-radius-lg bg-surface p-8 ring-1 ring-inset ring-line transition-all hover:ring-brand hover:shadow-lg">
              <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-brand/10 transition-transform group-hover:scale-150" />
              <Dumbbell className="mb-4 h-10 w-10 text-brand" />
              <h3 className="mb-2 font-display text-display-sm font-semibold text-ink group-hover:text-brand">จองสนามกีฬา</h3>
              <p className="mb-6 text-body text-ink-soft">ค้นหาสนามกีฬาและฟิตเนสใกล้บ้าน เช็คตารางว่างและจองออนไลน์ได้ตลอด 24 ชั่วโมง ไม่ต้องโทรเช็ค</p>
              <div className="inline-flex items-center gap-2 font-semibold text-brand">
                เริ่มค้นหาสนาม <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Find Coaches */}
            <Link href="/coaches" className="group relative overflow-hidden rounded-radius-lg bg-surface p-8 ring-1 ring-inset ring-line transition-all hover:ring-warning hover:shadow-lg">
              <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-warning/10 transition-transform group-hover:scale-150" />
              <GraduationCap className="mb-4 h-10 w-10 text-warning-dark" />
              <h3 className="mb-2 font-display text-display-sm font-semibold text-ink group-hover:text-warning-dark">หาโค้ชสอนกีฬา</h3>
              <p className="mb-6 text-body text-ink-soft">ค้นหาโค้ชมืออาชีพที่มีใบรับรอง อ่านรีวิวจากนักเรียนจริง และจองเวลาเรียนเพื่อพัฒนาทักษะของคุณ</p>
              <div className="inline-flex items-center gap-2 font-semibold text-warning-dark">
                ดูโปรไฟล์โค้ช <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Groups */}
            <Link href="/groups" className="group relative overflow-hidden rounded-radius-lg bg-surface p-8 ring-1 ring-inset ring-line transition-all hover:ring-success hover:shadow-lg">
              <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-success/10 transition-transform group-hover:scale-150" />
              <Users className="mb-4 h-10 w-10 text-success-dark" />
              <h3 className="mb-2 font-display text-display-sm font-semibold text-ink group-hover:text-success-dark">หาก๊วนเล่นกีฬา</h3>
              <p className="mb-6 text-body text-ink-soft">ไม่มีเพื่อนเล่น? เข้าร่วมก๊วนที่เปิดรับ หรือสร้างก๊วนของคุณเองเพื่อหาเพื่อนใหม่และหารค่าสนาม</p>
              <div className="inline-flex items-center gap-2 font-semibold text-success-dark">
                ค้นหาก๊วน <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Tournaments */}
            <Link href="/tournaments" className="group relative overflow-hidden rounded-radius-lg bg-surface p-8 ring-1 ring-inset ring-line transition-all hover:ring-danger hover:shadow-lg">
              <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-danger/10 transition-transform group-hover:scale-150" />
              <Trophy className="mb-4 h-10 w-10 text-danger-dark" />
              <h3 className="mb-2 font-display text-display-sm font-semibold text-ink group-hover:text-danger-dark">ทัวร์นาเมนต์ & แข่งขัน</h3>
              <p className="mb-6 text-body text-ink-soft">ค้นหาการแข่งขันกีฬาสมัครเล่นใกล้คุณ ลงสมัครทีม สะสมคะแนน Elo และก้าวขึ้นสู่ Leaderboard</p>
              <div className="inline-flex items-center gap-2 font-semibold text-danger-dark">
                ดูการแข่งขัน <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </section>

        {/* Business CTA */}
        <section className="mx-auto max-w-5xl px-6 py-16 mb-10">
          <div className="card-floating relative overflow-hidden bg-gradient-to-br from-ink to-ink-soft p-10 sm:p-14 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
            
            <div className="relative z-10 max-w-xl text-white">
              <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start">
                <Building className="h-6 w-6 text-brand-soft" />
                <span className="font-semibold text-brand-soft uppercase tracking-wider text-sm">สำหรับธุรกิจ</span>
              </div>
              <h2 className="font-display text-display-md font-bold mb-4">คุณเป็นเจ้าของสนามกีฬาใช่หรือไม่?</h2>
              <p className="text-body-lg text-white/80">
                เปลี่ยนสนามของคุณให้เป็นระบบดิจิทัล จัดการการจอง รับเงินอัตโนมัติ และเข้าถึงลูกค้าหลายหมื่นคนบน SportHub
              </p>
            </div>
            
            <div className="relative z-10 shrink-0">
              <Link 
                href="/business" 
                className="inline-flex items-center justify-center gap-2 rounded-radius-sm bg-brand px-8 py-4 text-body font-bold text-white transition-colors hover:bg-brand-dark shadow-lg shadow-brand/30"
              >
                ดูระบบสำหรับเจ้าของสนาม
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-line bg-surface py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-brand rounded-md p-1.5">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-body-lg font-bold text-ink">SportHub</span>
            </Link>
            <p className="text-body-sm text-ink-soft">
              Sport Ecosystem ที่ครบวงจรที่สุด เชื่อมต่อผู้เล่น โค้ช และสนามกีฬาไว้ด้วยกัน
            </p>
          </div>
          
          <div className="flex gap-16">
            <div>
              <h3 className="font-semibold text-ink mb-4">สำหรับนักกีฬา</h3>
              <ul className="space-y-2 text-body-sm text-ink-soft">
                <li><Link href="/discover" className="hover:text-brand">ค้นหาสนาม</Link></li>
                <li><Link href="/coaches" className="hover:text-brand">หาโค้ช</Link></li>
                <li><Link href="/groups" className="hover:text-brand">ก๊วนกีฬา</Link></li>
                <li><Link href="/tournaments" className="hover:text-brand">การแข่งขัน</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-ink mb-4">สำหรับธุรกิจ</h3>
              <ul className="space-y-2 text-body-sm text-ink-soft">
                <li><Link href="/business" className="hover:text-brand">ระบบจัดการสนาม</Link></li>
                <li><Link href="/me/coach/apply" className="hover:text-brand">สมัครเป็นโค้ช</Link></li>
                <li><Link href="/contact" className="hover:text-brand">ติดต่อทีมงาน</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 mt-12 pt-8 border-t border-line text-center text-body-sm text-ink-soft">
          &copy; {new Date().getFullYear()} SportHub. สงวนลิขสิทธิ์.
        </div>
      </footer>
    </div>
  );
}
