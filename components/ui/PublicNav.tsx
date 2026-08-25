import Link from "next/link";
import { Activity, LayoutDashboard } from "lucide-react";
import { Button } from "./Button";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

// ทางลัดเมนูสาธารณะ — ใช้ร่วมกันทุกหน้า public (landing / blog / track)
const LINKS = [
  { href: "/discover", label: "ค้นหาสนาม" },
  { href: "/coaches", label: "หาโค้ช" },
  { href: "/groups", label: "ก๊วน" },
  { href: "/tournaments", label: "แข่งขัน" },
  { href: "/leaderboard", label: "อันดับ" },
  { href: "/blog", label: "บทความ" },
  { href: "/track", label: "เช็คการจอง" },
];

// พื้นที่หลักของแต่ละ role (mirror proxy.ts ROLE_HOME) — ปุ่ม "พื้นที่ของฉัน" พาไปถูกที่
const ROLE_HOME: Record<string, { href: string; label: string }> = {
  super_admin: { href: "/super-admin", label: "ผู้ดูแลระบบ" },
  venue_admin: { href: "/dashboard", label: "แดชบอร์ด" },
  staff: { href: "/dashboard", label: "แดชบอร์ด" },
  member: { href: "/me", label: "พื้นที่ของฉัน" },
};

export async function PublicNav() {
  // ตรวจสถานะล็อกอิน → สลับปุ่มขวาบน (login/สมัคร ↔ พื้นที่ของฉัน/ออกจากระบบ)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let home: { href: string; label: string } | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    home = ROLE_HOME[profile?.role ?? "member"] ?? ROLE_HOME.member;
  }

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
          {home ? (
            <>
              <Link href={home.href}>
                <Button variant="secondary" size="sm">
                  <LayoutDashboard className="h-4 w-4" />
                  {home.label}
                </Button>
              </Link>
              <div className="hidden sm:block">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="secondary" size="sm">เข้าสู่ระบบ</Button>
              </Link>
              <Link href="/signup" className="hidden sm:block">
                <Button variant="primary" size="sm">สมัคร</Button>
              </Link>
            </>
          )}
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
