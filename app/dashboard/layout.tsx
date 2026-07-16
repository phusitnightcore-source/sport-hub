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
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getStaffContext, hasPermission } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { ShareBookingLink } from "@/components/ui/ShareBookingLink";

type LockFeature = "analytics" | "member_system" | "guest_pass" | "broadcast";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** ต้องมีสิทธิ์นี้ (RBAC §26) ถึงจะเห็นเมนู — ไม่ระบุ = เห็นได้ทุก role ที่เข้า dashboard */
  permission?: Permission;
  /** ถ้าแพลนปัจจุบันไม่รองรับ → เมนูยังโชว์แต่ขึ้น 🔒 ชวนอัปเกรด */
  feature?: LockFeature;
};

// เมนูจัดเป็นหมวด — กรองตาม role/permission ของผู้ใช้ แล้วค่อยล็อกตามแพลน (§26 + entitlements)
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "ดำเนินงาน",
    items: [
      { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
      { href: "/dashboard/bookings", label: "การจอง", icon: CalendarDays, permission: "view_bookings_own" },
      { href: "/dashboard/schedule", label: "ตารางสนาม", icon: CalendarClock, permission: "view_bookings_own" },
      { href: "/dashboard/checkin", label: "เช็คอิน", icon: ScanLine, permission: "checkin_member" },
      { href: "/dashboard/guest-passes", label: "บัตรชั่วคราว", icon: TicketCheck, permission: "issue_guest_pass", feature: "guest_pass" },
      { href: "/dashboard/payments", label: "ตรวจสลิป", icon: ReceiptText, permission: "verify_slip" },
      { href: "/dashboard/refunds", label: "คืนเงิน", icon: RotateCcw, permission: "confirm_refund" },
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
    title: "รายงาน",
    items: [
      { href: "/dashboard/reports", label: "รายงาน", icon: BarChart3, permission: "view_revenue" },
      { href: "/dashboard/analytics", label: "วิเคราะห์", icon: LineChart, permission: "view_revenue", feature: "analytics" },
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
  const entitlements = ctx
    ? (await getTenantEntitlements(createAdminClient(), ctx.tenantId)).entitlements
    : null;
  const isLocked = (feature?: LockFeature) =>
    Boolean(feature && entitlements && !entitlements[feature]);

  // กรองเมนูตามสิทธิ์ของผู้ใช้ (venue_admin เห็นทุกอัน / staff เห็นเฉพาะที่มีสิทธิ์)
  const canAccess = (item: NavItem) =>
    !item.permission || (ctx != null && hasPermission(ctx, item.permission));
  const visibleGroups = NAV_GROUPS.map((g) => ({
    title: g.title,
    items: g.items.filter(canAccess),
  })).filter((g) => g.items.length > 0);
  const mobileItems = visibleGroups.flatMap((g) => g.items).slice(0, 5);
  return (
    <div className="flex min-h-screen bg-surface/50 pb-16 md:pb-0">
      {/* Sidebar (Desktop) */}
      <aside className="hidden sticky top-0 md:flex h-screen w-64 flex-col border-r border-line bg-surface px-4 py-6">
        <div className="mb-8 px-2">
          <span className="font-display text-2xl font-bold text-brand">
            SportHub
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {visibleGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60">
                {group.title}
              </p>
              {group.items.map(({ href, label, icon: Icon, feature }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-medium text-ink-soft transition-colors duration-fast hover:bg-brand-soft hover:text-brand"
                >
                  <Icon aria-hidden className="h-5 w-5" />
                  <span className="flex-1">{label}</span>
                  {isLocked(feature) && (
                    <Lock aria-label="ต้องอัปเกรดแพลน" className="h-3.5 w-3.5 text-ink-soft/70" />
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-surface/80 px-4 md:px-8 backdrop-blur-md">
          <div className="md:hidden font-display text-lg font-bold text-brand">
            SportHub
          </div>
          <div className="hidden flex-1 md:block">
            <GlobalSearch />
          </div>
          <div className="flex items-center justify-end gap-3 text-body-sm text-ink-soft">
            {ctx?.tenantId && <ShareBookingLink tenantId={ctx.tenantId} />}
            <ThemeToggle />
            <span className="hidden md:inline">Dashboard</span>
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
        {mobileItems.map(({ href, label, icon: Icon, feature }) => (
          <Link
            key={href}
            href={href}
            className="relative flex flex-col items-center justify-center gap-1 text-ink-soft hover:text-brand"
          >
            <Icon aria-hidden className="h-5 w-5" />
            {isLocked(feature) && (
              <Lock aria-hidden className="absolute right-1 top-0 h-3 w-3 text-ink-soft/70" />
            )}
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
