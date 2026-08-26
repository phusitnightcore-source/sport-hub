"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Activity,
  LayoutDashboard,
  Search,
  GraduationCap,
  Users,
  Trophy,
  BarChart3,
  BookOpen,
  Receipt,
  Building,
  UserCheck,
  ChevronRight,
  Sparkles,
  PhoneCall,
  LogIn,
  UserPlus,
  Compass,
  CalendarDays
} from "lucide-react";
import { Button } from "./Button";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";

type PublicNavClientProps = {
  home: { href: string; label: string } | null;
  userEmail?: string | null;
};

const NAV_SECTIONS = [
  {
    title: "บริการหลัก",
    items: [
      {
        href: "/discover",
        label: "ค้นหาและจองสนาม",
        icon: Search,
        badge: "ยอดนิยม",
        color: "text-brand bg-brand-soft",
      },
      {
        href: "/coaches",
        label: "หาโค้ช & เทรนเนอร์",
        icon: GraduationCap,
        badge: null,
        color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
      },
      {
        href: "/groups",
        label: "ก๊วนกีฬา & หาเพื่อนเล่น",
        icon: Users,
        badge: "กำลังฮิต",
        color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
      },
      {
        href: "/tournaments",
        label: "ทัวร์นาเมนต์ & แข่งขัน",
        icon: Trophy,
        badge: null,
        color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30",
      },
    ],
  },
  {
    title: "คอมมูนิตี้ & บริการ",
    items: [
      {
        href: "/leaderboard",
        label: "ตารางอันดับ (Leaderboard)",
        icon: BarChart3,
        badge: null,
        color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30",
      },
      {
        href: "/track",
        label: "ตรวจสอบการจอง",
        icon: Receipt,
        badge: null,
        color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30",
      },
      {
        href: "/blog",
        label: "บทความ & ทริคกีฬา",
        icon: BookOpen,
        badge: null,
        color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30",
      },
    ],
  },
  {
    title: "สำหรับธุรกิจ & พาร์ทเนอร์",
    items: [
      {
        href: "/business",
        label: "ระบบบริหารสนามกีฬา",
        icon: Building,
        badge: "สำหรับสนาม",
        color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
      },
      {
        href: "/me/coach/apply",
        label: "สมัครเป็นโค้ชพาร์ทเนอร์",
        icon: UserCheck,
        badge: null,
        color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30",
      },
    ],
  },
];

export function PublicNavClient({ home, userEmail }: PublicNavClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line/60 bg-surface/80 backdrop-blur-xl shadow-xs transition-colors">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Logo & Hamburger Trigger */}
          <div className="flex items-center gap-3">
            {/* Hamburger Button (Mobile / Tablet only, hidden on large screens) */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex lg:hidden h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface/80 text-ink shadow-xs transition-all hover:border-brand/40 hover:bg-brand-soft hover:text-brand active:scale-95 cursor-pointer"
              aria-label="เปิดเมนูนำทาง"
              aria-expanded={isOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2.5 group py-1">
              <Image
                src="/light.png"
                alt="SportHub Logo"
                width={36}
                height={36}
                className="h-8 sm:h-9 w-auto object-contain dark:hidden [data-theme=dark]_&]:hidden block transition-transform group-hover:scale-105"
                priority
              />
              <Image
                src="/Dark.png"
                alt="SportHub Logo"
                width={36}
                height={36}
                className="h-8 sm:h-9 w-auto object-contain hidden dark:block [data-theme=dark]_&:block transition-transform group-hover:scale-105"
                priority
              />
              <div className="flex flex-col">
                <span className="font-display text-xl font-extrabold tracking-tight text-ink leading-none">
                  Sport<span className="text-brand">Hub</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 mt-0.5">
                  Ecosystem
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Quick Discover Links for Desktop */}
          <nav className="hidden items-center gap-1.5 rounded-full border border-line bg-surface/70 p-1.5 shadow-xs lg:flex">
            <Link
              href="/discover"
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-body-sm font-semibold transition-all ${
                pathname === "/discover"
                  ? "bg-brand text-white shadow-xs"
                  : "text-ink-soft hover:bg-brand-soft/60 hover:text-ink"
              }`}
            >
              <Search className="h-4 w-4" />
              <span>จองสนาม</span>
            </Link>
            <Link
              href="/coaches"
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-body-sm font-semibold transition-all ${
                pathname === "/coaches"
                  ? "bg-brand text-white shadow-xs"
                  : "text-ink-soft hover:bg-brand-soft/60 hover:text-ink"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>หาโค้ช</span>
            </Link>
            <Link
              href="/groups"
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-body-sm font-semibold transition-all ${
                pathname === "/groups"
                  ? "bg-brand text-white shadow-xs"
                  : "text-ink-soft hover:bg-brand-soft/60 hover:text-ink"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>ก๊วนกีฬา</span>
            </Link>
            <Link
              href="/tournaments"
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-body-sm font-semibold transition-all ${
                pathname === "/tournaments"
                  ? "bg-brand text-white shadow-xs"
                  : "text-ink-soft hover:bg-brand-soft/60 hover:text-ink"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>การแข่งขัน</span>
            </Link>
          </nav>

          {/* Right: Actions & Theme Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />

            {home ? (
              <div className="flex items-center gap-2">
                <Link href={home.href}>
                  <Button variant="primary" size="sm" className="rounded-xl px-4 py-2 font-bold shadow-xs">
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    <span>{home.label}</span>
                  </Button>
                </Link>
                <div className="hidden sm:block">
                  <LogoutButton />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="secondary" size="sm" className="rounded-xl px-3.5 py-2 font-semibold">
                    <LogIn className="mr-1.5 h-4 w-4 text-brand" />
                    <span>เข้าสู่ระบบ</span>
                  </Button>
                </Link>
                <Link href="/signup" className="hidden sm:block">
                  <Button variant="primary" size="sm" className="rounded-xl px-4 py-2 font-bold shadow-xs shadow-brand/20">
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    <span>สมัครสมาชิก</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================= */}
      {/* FULL-SCREEN HAMBURGER DRAWER OVERLAY */}
      {/* ========================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in-0 duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-ink/60 backdrop-blur-md transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-out Menu Panel */}
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-surface p-6 shadow-2xl transition-transform animate-in slide-in-from-left duration-300 no-scrollbar sm:p-8 border-r border-line">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-line pb-5">
              <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5">
                <Image
                  src="/light.png"
                  alt="SportHub Logo"
                  width={36}
                  height={36}
                  className="h-8 w-auto object-contain dark:hidden [data-theme=dark]_&]:hidden block"
                />
                <Image
                  src="/Dark.png"
                  alt="SportHub Logo"
                  width={36}
                  height={36}
                  className="h-8 w-auto object-contain hidden dark:block [data-theme=dark]_&:block"
                />
                <div className="flex flex-col">
                  <span className="font-display text-xl font-extrabold text-ink leading-none">
                    Sport<span className="text-brand">Hub</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 mt-0.5">
                    All-in-one Platform
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-surface text-ink-soft hover:bg-brand-soft hover:text-ink transition-colors cursor-pointer"
                aria-label="ปิดเมนู"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Profile / Login Banner inside Drawer */}
            <div className="mt-5 rounded-2xl border border-line bg-surface/60 p-4 shadow-xs">
              {home ? (
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand">เข้าสู่ระบบแล้ว</p>
                    <p className="truncate font-display text-body font-bold text-ink">{userEmail || "ผู้ใช้งาน SportHub"}</p>
                  </div>
                  <Link href={home.href} onClick={() => setIsOpen(false)}>
                    <Button size="sm" className="rounded-xl">
                      {home.label}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-body-sm font-bold text-ink">ยังไม่ได้เข้าสู่ระบบ?</p>
                    <p className="text-[12px] text-ink-soft">ล็อกอินเพื่อจองสนามและสะสมแต้ม</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/login" onClick={() => setIsOpen(false)} className="flex-1 sm:flex-initial">
                      <Button variant="secondary" size="sm" className="w-full rounded-xl">
                        เข้าสู่ระบบ
                      </Button>
                    </Link>
                    <Link href="/signup" onClick={() => setIsOpen(false)} className="flex-1 sm:flex-initial">
                      <Button size="sm" className="w-full rounded-xl">
                        สมัครสมาชิก
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Categorized Menu Links (Concise and easy to use for Mobile) */}
            <div className="mt-6 flex-1 space-y-5">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="space-y-2">
                  <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft/70">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`group flex items-center justify-between rounded-2xl border px-3.5 py-2.5 transition-all ${
                            active
                              ? "border-brand bg-brand-soft/60 ring-1 ring-brand/30 shadow-xs"
                              : "border-transparent bg-surface/50 hover:border-line hover:bg-surface hover:shadow-xs active:bg-brand-soft/30"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color} transition-transform group-hover:scale-105`}
                            >
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <p
                                className={`truncate font-display text-body-sm font-bold ${
                                  active ? "text-brand" : "text-ink group-hover:text-brand"
                                }`}
                              >
                                {item.label}
                              </p>
                              {item.badge && (
                                <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand shrink-0">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft/40 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="mt-6 border-t border-line pt-4 flex items-center justify-between text-body-sm text-ink-soft">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <span className="text-[12px]">สลับธีม Dark/Light</span>
              </div>
              {home && <LogoutButton />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
