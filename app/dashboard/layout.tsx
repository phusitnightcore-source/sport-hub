import Link from "next/link";
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
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getStaffContext, hasPermission } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { ShareBookingLink } from "@/components/ui/ShareBookingLink";
import { PageTransition } from "@/components/ui/PageTransition";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { getTenantBellData } from "@/lib/notify/bell-data";
import { DashboardNav, type NavGroup } from "@/components/ui/DashboardNav";
import { DashboardMobileNav, type MobileNavItem } from "@/components/ui/DashboardMobileNav";

type LockFeature = "analytics" | "member_system" | "guest_pass" | "broadcast";

type NavItemConfig = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  feature?: LockFeature;
};

const NAV_GROUPS: { title: string; items: NavItemConfig[] }[] = [
  {
    title: "ดำเนินงาน",
    items: [
      { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
      { href: "/dashboard/bookings", label: "การจอง", icon: CalendarDays, permission: "view_bookings_own" },
      { href: "/dashboard/schedule", label: "ตารางสนาม", icon: CalendarClock, permission: "view_bookings_own" },
      { href: "/dashboard/waitlist", label: "คิวรอ", icon: ListChecks, permission: "view_bookings_own" },
      { href: "/dashboard/checkin", label: "เช็คอิน", icon: ScanLine, permission: "checkin_member" },
      { href: "/dashboard/guest-passes", label: "บัตรชั่วคราว", icon: TicketCheck, permission: "issue_guest_pass", feature: "guest_pass" },
      { href: "/dashboard/payments", label: "ตรวจสลิป", icon: ReceiptText, permission: "verify_slip" },
      { href: "/dashboard/refunds", label: "คืนเงิน", icon: RotateCcw, permission: "confirm_refund" },
      { href: "/pos", label: "POS หน้าร้าน", icon: ShoppingCart, permission: "use_pos" },
      { href: "/dashboard/inventory", label: "คลังสินค้า", icon: Boxes, permission: "manage_inventory" },
      { href: "/dashboard/notifications", label: "แจ้งเตือน", icon: Bell },
    ],
  },
  {
    title: "สมาชิก & การตลาด",
    items: [
      { href: "/dashboard/members", label: "สมาชิก", icon: Users, permission: "add_member", feature: "member_system" },
      { href: "/dashboard/packages", label: "แพ็กเกจ", icon: Package, permission: "manage_package", feature: "member_system" },
      { href: "/dashboard/broadcast", label: "Broadcast", icon: Megaphone, permission: "broadcast", feature: "broadcast" },
      { href: "/dashboard/coupons", label: "ส่วนลด", icon: Ticket, permission: "manage_coupon" },
      { href: "/dashboard/media", label: "คลังสื่อ", icon: ImageIcon, permission: "manage_settings" },
    ],
  },
  {
    title: "รายงาน & วิเคราะห์",
    items: [
      { href: "/dashboard/reports", label: "รายงาน & ยอดขาย", icon: BarChart3, permission: "view_revenue" },
      { href: "/dashboard/analytics", label: "วิเคราะห์ธุรกิจ", icon: LineChart, permission: "view_revenue", feature: "analytics" },
    ],
  },
  {
    title: "ตั้งค่าระบบ",
    items: [
      { href: "/dashboard/courts", label: "สนาม", icon: LayoutGrid, permission: "manage_court" },
      { href: "/dashboard/branches", label: "สาขา", icon: Building, permission: "manage_branch" },
      { href: "/dashboard/staff", label: "พนักงาน", icon: UserCog, permission: "manage_staff" },
      { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText, permission: "view_audit" },
      { href: "/dashboard/settings", label: "ตั้งค่า", icon: Settings, permission: "manage_settings" },
      { href: "/dashboard/subscription", label: "แพลน", icon: CreditCard, permission: "manage_settings" },
    ],
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getStaffContext();
  const admin = createAdminClient();
  const entitlements = ctx
    ? (await getTenantEntitlements(admin, ctx.tenantId)).entitlements
    : null;
  const bell = ctx ? await getTenantBellData(admin, ctx.tenantId) : null;
  const isLocked = (feature?: LockFeature) =>
    Boolean(feature && entitlements && !entitlements[feature]);

  const canAccess = (item: NavItemConfig) =>
    !item.permission || (ctx != null && hasPermission(ctx, item.permission));

  const visibleNavGroups: NavGroup[] = NAV_GROUPS.map((g) => ({
    title: g.title,
    items: g.items.filter(canAccess).map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      isLocked: isLocked(item.feature),
    })),
  })).filter((g) => g.items.length > 0);

  const mobileNavItems: MobileNavItem[] = visibleNavGroups
    .flatMap((g) => g.items)
    .slice(0, 5);

  return (
    <div className="flex min-h-screen bg-surface/50 pb-16 md:pb-0">
      {/* Sidebar (Desktop) */}
      <aside className="hidden sticky top-0 md:flex h-screen w-64 flex-col border-r border-line bg-surface px-4 py-6 shadow-xs">
        <div className="mb-6 px-3 flex items-center justify-between">
          <Link href="/dashboard" className="font-display text-2xl font-bold text-brand hover:opacity-90 transition-opacity">
            SportHub
          </Link>
        </div>

        {/* Navigation with Active Route State & Hidden Scrollbar */}
        <DashboardNav groups={visibleNavGroups} />

        <div className="mt-auto pt-4 border-t border-line/60 px-2">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-surface/80 px-4 md:px-8 backdrop-blur-md">
          <div className="md:hidden font-display text-lg font-bold text-brand">
            SportHub
          </div>
          <div className="hidden flex-1 md:block max-w-md">
            <GlobalSearch />
          </div>
          <div className="flex items-center justify-end gap-3 text-body-sm text-ink-soft">
            {ctx?.tenantId && <ShareBookingLink tenantId={ctx.tenantId} />}
            {ctx && bell && (
              <NotificationBell
                mode="tenant"
                tenantId={ctx.tenantId}
                initialItems={bell.items}
                initialUnread={bell.unread}
                soundMap={bell.soundMap}
                href="/dashboard/notifications"
              />
            )}
            <ThemeToggle />
            <span className="hidden md:inline font-medium">Dashboard</span>
            <div className="md:hidden">
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 no-scrollbar">
          <div className="mx-auto max-w-6xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation with Active State */}
      <DashboardMobileNav items={mobileNavItems} />
    </div>
  );
}
