"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ReceiptText,
  RotateCcw,
  CreditCard,
  Package,
  Users,
  Building,
  UserCog,
  Ticket,
  CalendarClock,
  LayoutGrid,
  ScanLine,
  BarChart3,
  LineChart,
  Bell,
  ScrollText,
  Image as ImageIcon,
  Settings,
  TicketCheck,
  Lock,
  Megaphone,
  ListChecks,
  ShoppingCart,
  Boxes,
  Sparkles,
  Trophy,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarDays,
  ReceiptText,
  RotateCcw,
  CreditCard,
  Package,
  Users,
  Building,
  UserCog,
  Ticket,
  CalendarClock,
  LayoutGrid,
  ScanLine,
  BarChart3,
  LineChart,
  Bell,
  ScrollText,
  ImageIcon,
  Settings,
  TicketCheck,
  Megaphone,
  ListChecks,
  ShoppingCart,
  Boxes,
  Sparkles,
  Trophy,
};

export type NavItem = {
  href: string;
  label: string;
  iconName: string;
  isLocked?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export function DashboardNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar pr-1">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-3.5 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft/70">
            {group.title}
          </p>
          {group.items.map(({ href, label, iconName, isLocked }) => {
            const active = isActive(href);
            const Icon = ICON_MAP[iconName] ?? HelpCircle;
            return (
              <Link
                key={href}
                href={href}
                className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-body-sm font-semibold transition-all duration-fast ${
                  active
                    ? "bg-brand text-white shadow-md shadow-brand/25 ring-1 ring-brand/30"
                    : "text-ink-soft hover:bg-brand-soft/60 hover:text-brand"
                }`}
              >
                <Icon
                  aria-hidden
                  className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                    active ? "text-white" : "text-ink-soft group-hover:text-brand"
                  }`}
                />
                <span className="flex-1 truncate">{label}</span>
                {isLocked && (
                  <Lock
                    aria-label="ต้องอัปเกรดแพลน"
                    className={`h-3.5 w-3.5 shrink-0 ${active ? "text-white/80" : "text-ink-soft/70"}`}
                  />
                )}
                {active && (
                  <span
                    aria-hidden
                    className="absolute right-2 h-1.5 w-1.5 rounded-full bg-white animate-pulse"
                  />
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
