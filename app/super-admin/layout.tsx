import Link from "next/link";
import { LayoutDashboard, Building2, SlidersHorizontal, TrendingUp, Newspaper, Megaphone } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformBellData } from "@/lib/notify/bell-data";

const NAV_ITEMS = [
  { href: "/super-admin", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/super-admin/tenants", label: "สนามทั้งหมด", icon: Building2 },
  { href: "/super-admin/plans", label: "แพลน & สิทธิ์", icon: SlidersHorizontal },
  { href: "/super-admin/traffic", label: "การเข้าชม", icon: TrendingUp },
  { href: "/super-admin/blog", label: "บทความ", icon: Newspaper },
  { href: "/super-admin/banners", label: "แบนเนอร์", icon: Megaphone },
];

// Shell ฝั่งทีม SportHub (super_admin)
export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bell = await getPlatformBellData(createAdminClient());
  return (
    <div className="flex min-h-screen bg-surface/50 pb-16 md:pb-0">
      <aside className="hidden sticky top-0 md:flex h-screen w-64 flex-col border-r border-line bg-surface px-4 py-6">
        <div className="mb-8 px-2">
          <span className="font-display text-2xl font-bold text-brand">
            SportHub <span className="text-body-sm font-normal text-ink-soft">Admin</span>
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-medium text-ink-soft transition-colors duration-fast hover:bg-brand-soft hover:text-brand"
            >
              <Icon aria-hidden className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-surface/80 px-4 md:px-8 backdrop-blur-md">
          <div className="md:hidden font-display text-lg font-bold text-brand">
            SportHub <span className="text-body-sm font-normal text-ink-soft">Admin</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3 text-body-sm text-ink-soft">
            <NotificationBell
              mode="platform"
              initialItems={bell.items}
              initialUnread={bell.unread}
              href="/super-admin"
            />
            <ThemeToggle />
            <span className="hidden md:inline">Super Admin</span>
            <div className="md:hidden">
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-line bg-surface px-2 md:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-1 text-ink-soft hover:text-brand"
          >
            <Icon aria-hidden className="h-5 w-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
