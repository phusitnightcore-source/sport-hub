"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, UserRound, Newspaper, GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationBell, type BellItem } from "@/components/ui/NotificationBell";
import { cn } from "@/lib/utils";

const PLAYER_LINKS = [
  { href: "/me/bookings", label: "การจองของฉัน", icon: CalendarDays },
  { href: "/me/profile", label: "โปรไฟล์", icon: UserRound },
  { href: "/me/blog", label: "บทความ", icon: Newspaper },
];

const COACH_LINKS = [
  { href: "/me/coach", label: "จัดการโค้ช", icon: GraduationCap },
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
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isCoach = roles.includes("coach");
  const links = isCoach ? [...PLAYER_LINKS, ...COACH_LINKS] : PLAYER_LINKS;

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-surface/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link href="/me/bookings" className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-brand" />
          <span className="font-display text-body-lg font-bold text-ink">SportHub</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-body-sm font-medium transition-colors",
                isActive(l.href) ? "text-brand" : "text-ink-soft hover:text-brand",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell
            mode="self"
            recipientIds={recipientIds}
            initialItems={bellItems}
            initialUnread={bellUnread}
            href="/me/notifications"
          />
          <ThemeToggle />
          <span
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-brand-soft font-display text-body-sm font-semibold text-brand sm:flex"
            title={name}
            aria-hidden
          >
            {initial}
          </span>
          <LogoutButton />
        </div>
      </div>

      <nav className="flex items-center justify-around border-t border-line/60 py-2 md:hidden">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors",
                isActive(l.href) ? "text-brand" : "text-ink-soft hover:text-brand",
              )}
            >
              <Icon className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
