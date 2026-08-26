"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  SlidersHorizontal,
  TrendingUp,
  Newspaper,
  Megaphone,
  GraduationCap,
  Users,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  SlidersHorizontal,
  TrendingUp,
  Newspaper,
  Megaphone,
  GraduationCap,
  Users,
  Trophy,
};

export type SuperAdminNavItem = {
  href: string;
  label: string;
  iconName: string;
  badge?: number | null;
};

export function SuperAdminNav({ items }: { items: SuperAdminNavItem[] }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/super-admin") {
      return pathname === "/super-admin";
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto no-scrollbar pr-1">
      {items.map(({ href, label, iconName, badge }) => {
        const active = isActive(href);
        const Icon = ICON_MAP[iconName] ?? LayoutDashboard;

        return (
          <Link
            key={href}
            href={href}
            className={`group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-body-sm font-semibold transition-all duration-fast ${
              active
                ? "bg-brand text-white shadow-md shadow-brand/25 ring-1 ring-brand/30"
                : "text-ink-soft hover:bg-brand-soft/60 hover:text-brand"
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <Icon
                aria-hidden
                className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                  active ? "text-white" : "text-ink-soft group-hover:text-brand"
                }`}
              />
              <span className="truncate">{label}</span>
            </div>

            {badge != null && badge > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  active ? "bg-white text-brand" : "bg-warning text-white"
                }`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
