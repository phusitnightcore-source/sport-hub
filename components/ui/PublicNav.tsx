import Link from "next/link";
import { Activity } from "lucide-react";
import { Button } from "./Button";
import { ThemeToggle } from "./ThemeToggle";

// ทางลัดเมนูสาธารณะ — ใช้ร่วมกันทุกหน้า public (landing / blog / track)
const LINKS = [
  { href: "/blog", label: "บทความ" },
  { href: "/#compare", label: "ทำไมต้องใช้" },
  { href: "/#faq", label: "คำถามที่พบบ่อย" },
  { href: "/track", label: "เช็คการจอง" },
];

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-surface/70 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-brand" />
          <span className="font-display text-body-lg font-bold text-ink">SportHub</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-body-sm font-medium text-ink-soft transition-colors hover:text-brand"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="secondary" size="sm">เข้าสู่ระบบ</Button>
          </Link>
          <Link href="/signup" className="hidden sm:block">
            <Button variant="primary" size="sm">สมัคร</Button>
          </Link>
        </div>
      </div>

      {/* แถวทางลัดสำหรับจอเล็ก */}
      <nav className="flex items-center justify-center gap-6 border-t border-line/60 py-2 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-body-sm font-medium text-ink-soft transition-colors hover:text-brand"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
