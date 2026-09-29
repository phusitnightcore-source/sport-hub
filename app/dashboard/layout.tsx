import Link from "next/link";
import Image from "next/image";
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
import { cookies } from "next/headers";
import { BranchSwitcher } from "@/components/ui/BranchSwitcher";
import { DashboardMobileNav, type MobileNavItem } from "@/components/ui/DashboardMobileNav";

type LockFeature = "analytics" | "member_system" | "guest_pass" | "broadcast";

type NavItemConfig = {
  href: string;
  label: string;
  iconName: string;
  permission?: Permission;
  feature?: LockFeature;
  ownerOnly?: boolean;
};

const NAV_GROUPS: { title: string; items: NavItemConfig[] }[] = [
  {
    title: "ดำเนินงาน",
    items: [
      { href: "/dashboard", label: "ภาพรวม", iconName: "LayoutDashboard" },
      { href: "/dashboard/bookings", label: "การจอง", iconName: "CalendarDays", permission: "view_bookings_own" },
      { href: "/dashboard/schedule", label: "ตารางสนาม", iconName: "CalendarClock", permission: "view_bookings_own" },
      { href: "/dashboard/group-sessions", label: "ระบบก๊วนแบดมินตัน", iconName: "Sparkles", ownerOnly: true },
      { href: "/dashboard/waitlist", label: "คิวรอ", iconName: "ListChecks", permission: "view_bookings_own" },
      { href: "/dashboard/checkin", label: "เช็คอิน", iconName: "ScanLine", permission: "checkin_member" },
      { href: "/dashboard/guest-passes", label: "บัตรชั่วคราว", iconName: "TicketCheck", permission: "issue_guest_pass", feature: "guest_pass" },
      { href: "/dashboard/payments", label: "ตรวจสลิป", iconName: "ReceiptText", permission: "verify_slip" },
      { href: "/dashboard/refunds", label: "คืนเงิน", iconName: "RotateCcw", permission: "confirm_refund" },
      { href: "/pos", label: "POS หน้าร้าน", iconName: "ShoppingCart", permission: "use_pos" },
      { href: "/dashboard/inventory", label: "คลังสินค้า", iconName: "Boxes", permission: "manage_inventory" },
      { href: "/dashboard/notifications", label: "แจ้งเตือน", iconName: "Bell" },
    ],
  },
  {
    title: "สมาชิก & การตลาด",
    items: [
      { href: "/dashboard/tournaments", label: "การแข่งขัน", iconName: "Trophy", ownerOnly: true },
      { href: "/dashboard/members", label: "สมาชิก", iconName: "Users", permission: "add_member", feature: "member_system" },
      { href: "/dashboard/packages", label: "แพ็กเกจ", iconName: "Package", permission: "manage_package", feature: "member_system" },
      { href: "/dashboard/broadcast", label: "Broadcast", iconName: "Megaphone", permission: "broadcast", feature: "broadcast" },
      { href: "/dashboard/coupons", label: "ส่วนลด", iconName: "Ticket", permission: "manage_coupon" },
      { href: "/dashboard/media", label: "คลังสื่อ", iconName: "ImageIcon", permission: "manage_settings" },
    ],
  },
  {
    title: "รายงาน & วิเคราะห์",
    items: [
      { href: "/dashboard/reports", label: "รายงาน & ยอดขาย", iconName: "BarChart3", permission: "view_revenue" },
      { href: "/dashboard/analytics", label: "วิเคราะห์ธุรกิจ", iconName: "LineChart", permission: "view_revenue", feature: "analytics" },
    ],
  },
  {
    title: "ตั้งค่าระบบ",
    items: [
      { href: "/dashboard/courts", label: "สนาม", iconName: "LayoutGrid", permission: "manage_court" },
      { href: "/dashboard/branches", label: "สาขา", iconName: "Building", permission: "manage_branch" },
      { href: "/dashboard/staff", label: "พนักงาน", iconName: "UserCog", permission: "manage_staff" },
      { href: "/dashboard/audit", label: "Audit Log", iconName: "ScrollText", permission: "view_audit" },
      { href: "/dashboard/settings", label: "ตั้งค่า", iconName: "Settings", permission: "manage_settings" },
      { href: "/dashboard/subscription", label: "แพลน", iconName: "CreditCard", permission: "manage_settings" },
    ],
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getStaffContext();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;
  const admin = createAdminClient();

  const [{ entitlements }, bell, branchesRes] = await Promise.all([
    ctx
      ? getTenantEntitlements(admin, ctx.tenantId)
      : Promise.resolve({ entitlements: null }),
    ctx ? getTenantBellData(admin, ctx.tenantId) : Promise.resolve(null),
    ctx
      ? (admin as any).from("branches").select("id, name").eq("tenant_id", ctx.tenantId)
      : Promise.resolve({ data: [] }),
  ]);
  const branches = (branchesRes?.data ?? []) as { id: string; name: string }[];
  const isLocked = (feature?: LockFeature) =>
    Boolean(feature && entitlements && !entitlements[feature]);

  const canAccess = (item: NavItemConfig) =>
    (!item.ownerOnly || ctx?.role === "venue_admin") &&
    (!item.permission || (ctx != null && hasPermission(ctx, item.permission)));

  const visibleNavGroups: NavGroup[] = NAV_GROUPS.map((g) => ({
    title: g.title,
    items: g.items.filter(canAccess).map((item) => ({
      href: item.href,
      label: item.label,
      iconName: item.iconName,
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
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <Image
              src="/light.png"
              alt="SportHub Logo"
              width={34}
              height={34}
              className="h-8 w-auto object-contain dark:hidden [data-theme=dark]_&]:hidden block"
              priority
            />
            <Image
              src="/Dark.png"
              alt="SportHub Logo"
              width={34}
              height={34}
              className="h-8 w-auto object-contain hidden dark:block [data-theme=dark]_&:block"
              priority
            />
            <span className="font-display text-xl font-bold tracking-tight text-brand">
              SportHub
            </span>
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
          <div className="md:hidden flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/light.png"
                alt="SportHub Logo"
                width={28}
                height={28}
                className="h-7 w-auto object-contain dark:hidden [data-theme=dark]_&]:hidden block"
                priority
              />
              <Image
                src="/Dark.png"
                alt="SportHub Logo"
                width={28}
                height={28}
                className="h-7 w-auto object-contain hidden dark:block [data-theme=dark]_&:block"
                priority
              />
              <span className="font-display text-lg font-bold text-brand">
                SportHub
              </span>
            </Link>
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
            <BranchSwitcher branches={branches} activeBranchId={activeBranchId} />
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
