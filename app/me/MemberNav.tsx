"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Trophy,
  UserRound,
  GraduationCap,
  Sparkles,
  Compass,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationBell, type BellItem } from "@/components/ui/NotificationBell";
import { cn } from "@/lib/utils";

const CORE_PLAYER_LINKS = [
  { href: "/me", label: "หน้าหลัก", icon: LayoutDashboard, exact: true },
  { href: "/me/bookings", label: "การจอง", icon: CalendarDays },
  { href: "/groups", label: "ก๊วนกีฬา", icon: Users },
  { href: "/tournaments", label: "การแข่งขัน", icon: Trophy },
  { href: "/leaderboard", label: "อันดับ", icon: Sparkles },
  { href: "/me/profile", label: "โปรไฟล์", icon: UserRound },
];

const COACH_LINKS = [
  { href: "/me/coach", label: "ระบบโค้ช", icon: GraduationCap },
];

export function MemberNav({
  name,
  recipientIds,
  bellItems,
  bellUnread,
  roles = ["player"],
}: {
  name: string;
  recipientIds: string[];
  bellItems: BellItem[];
  bellUnread: number;
  roles?: string[];
}) {
  const pathname = usePathname();
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isCoach = roles.includes("coach");
  const desktopLinks = isCoach
    ? [...CORE_PLAYER_LINKS, ...COACH_LINKS]
    : CORE_PLAYER_LINKS;

  // Bottom nav items for mobile (5 key tabs)
  const mobileNavItems = [
    { href: "/me", label: "หน้าหลัก", icon: LayoutDashboard, exact: true },
    { href: "/me/bookings", label: "การจอง", icon: CalendarDays },
    { href: "/groups", label: "ก๊วน", icon: Users },
    { href: "/tournaments", label: "แข่ง", icon: Trophy },
    { href: "/me/profile", label: "โปรไฟล์", icon: UserRound },
  ];

  return (
    <>
      {/* Top Header for Desktop & Mobile Branding (Full Width) */}
      <header className="sticky top-0 z-40 w-full border-b border-line/60 bg-surface/80 backdrop-blur-xl transition-colors">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-8 lg:px-12">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/me" className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-xs transition-transform group-hover:scale-105">
                <span className="font-display text-base font-extrabold">S</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-body-lg font-bold tracking-tight text-ink">
                  Sport<span className="text-brand">Hub</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Player Hub
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden items-center gap-1 lg:flex">
              {desktopLinks.map((l) => {
                const active = isActive(l.href, (l as any).exact);
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-body-sm font-semibold transition-all duration-200",
                      active
                        ? "bg-brand-soft text-brand shadow-xs"
                        : "text-ink-soft hover:bg-surface-raised hover:text-ink"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-brand" : "text-ink-soft")} />
                    <span>{l.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Discover CTA on Desktop */}
            <Link
              href="/discover"
              className="hidden items-center gap-1.5 rounded-xl bg-surface-raised border border-line px-3 py-1.5 text-body-sm font-bold text-ink transition-all hover:border-brand hover:text-brand sm:flex"
            >
              <Compass className="h-4 w-4 text-brand" />
              <span>ค้นหาสนาม</span>
            </Link>

            <NotificationBell
              mode="self"
              recipientIds={recipientIds}
              initialItems={bellItems}
              initialUnread={bellUnread}
              href="/me/notifications"
            />

            <ThemeToggle />

            {/* User Avatar Chip */}
            <Link
              href="/me/profile"
              className="flex items-center gap-2 rounded-full p-0.5 transition-transform hover:scale-105"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand/20 to-brand-soft font-display text-body-sm font-bold text-brand ring-2 ring-brand/30"
                title={name}
              >
                {initial}
              </span>
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Bar (Full Width Edge-to-Edge) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-50 flex h-16 w-full items-center justify-around border-t border-line/80 bg-surface/95 px-2 shadow-2xl backdrop-blur-xl md:hidden"
      >
        {mobileNavItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center py-1 transition-all",
                active ? "text-brand" : "text-ink-soft hover:text-ink"
              )}
            >
              {active && (
                <span className="absolute -top-1.5 h-1 w-6 rounded-full bg-brand" />
              )}
              <Icon className={cn("h-5 w-5", active ? "text-brand" : "text-ink-soft")} />
              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-tight",
                  active ? "font-bold text-brand" : "font-medium text-ink-soft"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
