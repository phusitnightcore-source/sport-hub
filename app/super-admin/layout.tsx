import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformBellData } from "@/lib/notify/bell-data";
import { SuperAdminNav, type SuperAdminNavItem } from "@/components/super-admin/SuperAdminNav";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = createAdminClient();
  const bell = await getPlatformBellData(admin);

  // Check pending coach applications
  const { count: pendingCoachesCount } = await admin
    .from("coach_profiles")
    .select("id", { count: "exact", head: true })
    .eq("approval_status", "pending");

  const navItems: SuperAdminNavItem[] = [
    { href: "/super-admin", label: "ภาพรวมระบบ", iconName: "LayoutDashboard" },
    { href: "/super-admin/tenants", label: "สนามทั้งหมด", iconName: "Building2" },
    { href: "/super-admin/coaches", label: "โค้ช & อนุมัติ", iconName: "GraduationCap", badge: pendingCoachesCount },
    { href: "/super-admin/organizers", label: "Organizer Membership", iconName: "BadgeCheck" },
    { href: "/super-admin/groups", label: "ก๊วนกีฬา", iconName: "Users" },
    { href: "/super-admin/tournaments", label: "การแข่งขัน", iconName: "Trophy" },
    { href: "/super-admin/plans", label: "แพลน & สิทธิ์", iconName: "SlidersHorizontal" },
    { href: "/super-admin/traffic", label: "การเข้าชม", iconName: "TrendingUp" },
    { href: "/super-admin/blog", label: "บทความ", iconName: "Newspaper" },
    { href: "/super-admin/banners", label: "แบนเนอร์", iconName: "Megaphone" },
  ];

  return (
    <div className="flex min-h-screen bg-surface/50 pb-16 md:pb-0">
      {/* Sidebar (Desktop) */}
      <aside className="hidden sticky top-0 md:flex h-screen w-64 flex-col border-r border-line bg-surface px-4 py-6 shadow-xs">
        <div className="mb-6 px-3 flex items-center justify-between">
          <Link href="/super-admin" className="font-display text-2xl font-bold text-brand hover:opacity-90 transition-opacity">
            SportHub <span className="text-body-sm font-bold text-ink-soft">Admin</span>
          </Link>
        </div>

        {/* Super Admin Navigation */}
        <SuperAdminNav items={navItems} />

        <div className="mt-auto pt-4 border-t border-line/60 px-2">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
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
            <span className="hidden md:inline font-bold">Super Admin</span>
            <div className="md:hidden">
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 no-scrollbar">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-line bg-surface/95 px-2 backdrop-blur-lg md:hidden overflow-x-auto no-scrollbar">
        {navItems.slice(0, 5).map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-1 text-ink-soft hover:text-brand px-2 py-1"
          >
            <span className="text-[11px] font-bold truncate max-w-[60px]">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
