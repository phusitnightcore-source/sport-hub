import Link from "next/link";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const BULLETS = [
  "ตั้งค่าเสร็จใน 5 นาที เริ่มรับจองได้ทันที",
  "รับจองออนไลน์ + รับชำระ QR PromptPay 24 ชม.",
  "ทดลองฟรี 14 วัน ไม่ต้องใช้บัตรเครดิต",
];
const SPORTS = ["🏸", "⚽", "🎾", "🏀", "🏐", "🏓"];

// Shell หน้า auth (login/signup) — ซ้ายแผงแบรนด์สปอร์ต, ขวาฟอร์ม (รองรับ dark mode)
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* ซ้าย: แผงแบรนด์ (ซ่อนบนจอเล็ก) */}
      <aside className="animate-gradient-pan relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand to-brand-dark p-12 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-8 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-blob" />
          <div className="absolute -bottom-10 right-0 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        </div>

        <Link href="/" className="relative flex w-fit items-center gap-2">
          <Image
            src="/Dark.png"
            alt="SportHub Logo"
            width={130}
            height={38}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>

        <div className="relative flex flex-col gap-7">
          <div className="flex flex-wrap gap-3">
            {SPORTS.map((s, i) => (
              <span
                key={i}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl shadow-lg backdrop-blur animate-float"
                style={{ animationDelay: `${i * 0.35}s` }}
              >
                {s}
              </span>
            ))}
          </div>
          <h2 className="font-display text-display-lg font-bold leading-tight">
            เปลี่ยนสนามของคุณ
            <br />
            ให้จองเต็มทุกสล็อต
          </h2>
          <ul className="flex flex-col gap-2.5">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-white/90">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-body-sm text-white/70">
          แพลตฟอร์มจัดการสนามกีฬาและฟิตเนสครบวงจร
        </p>
      </aside>

      {/* ขวา: ฟอร์ม */}
      <main className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <Link href="/" className="mb-8 flex items-center justify-center lg:hidden">
          <Image
            src="/light.png"
            alt="SportHub Logo"
            width={120}
            height={34}
            className="h-8 w-auto object-contain dark:hidden [data-theme=dark]_&]:hidden block"
            priority
          />
          <Image
            src="/Dark.png"
            alt="SportHub Logo"
            width={120}
            height={34}
            className="h-8 w-auto object-contain hidden dark:block [data-theme=dark]_&:block"
            priority
          />
        </Link>

        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="font-display text-display-md font-bold text-ink">{title}</h1>
            <p className="mt-1 text-body-sm text-ink-soft">{subtitle}</p>
          </div>
          {children}
          <div className="mt-6 text-center text-body-sm text-ink-soft">{footer}</div>
        </div>
      </main>
    </div>
  );
}
