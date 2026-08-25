"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, type LucideIcon } from "lucide-react";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isLocked?: boolean;
};

export function DashboardMobileNav({ items }: { items: MobileNavItem[] }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-line bg-surface/95 px-2 backdrop-blur-lg md:hidden">
      {items.map(({ href, label, icon: Icon, isLocked }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-colors ${
              active ? "text-brand font-bold" : "text-ink-soft hover:text-brand font-medium"
            }`}
          >
            <div className="relative">
              <Icon aria-hidden className={`h-5 w-5 ${active ? "text-brand" : "text-ink-soft"}`} />
              {isLocked && (
                <Lock aria-hidden className="absolute -right-2 -top-1 h-3 w-3 text-ink-soft/70" />
              )}
            </div>
            <span className="text-[10px] truncate max-w-[60px]">{label}</span>
            {active && (
              <span
                aria-hidden
                className="absolute bottom-1 h-1 w-4 rounded-full bg-brand"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
