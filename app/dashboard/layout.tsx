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
} from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "การจอง", icon: CalendarDays },
  { href: "/dashboard/schedule", label: "ตารางสนาม", icon: CalendarClock },
  { href: "/dashboard/checkin", label: "เช็คอิน", icon: ScanLine },
  { href: "/dashboard/guest-passes", label: "บัตรชั่วคราว", icon: TicketCheck },
  { href: "/dashboard/payments", label: "ตรวจสลิป", icon: ReceiptText },
  { href: "/dashboard/refunds", label: "คืนเงิน", icon: RotateCcw },
  { href: "/dashboard/courts", label: "สนาม", icon: LayoutGrid },
  { href: "/dashboard/packages", label: "แพ็กเกจ", icon: Package },
  { href: "/dashboard/members", label: "สมาชิก", icon: Users },
  { href: "/dashboard/branches", label: "สาขา", icon: Building },
  { href: "/dashboard/staff", label: "พนักงาน", icon: UserCog },
  { href: "/dashboard/coupons", label: "ส่วนลด", icon: Ticket },
  { href: "/dashboard/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/dashboard/analytics", label: "วิเคราะห์", icon: LineChart },
  { href: "/dashboard/media", label: "คลังสื่อ", icon: ImageIcon },
  { href: "/dashboard/notifications", label: "แจ้งเตือน", icon: Bell },
  { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText },
  { href: "/dashboard/settings", label: "ตั้งค่า", icon: Settings },
  { href: "/dashboard/subscription", label: "แพลน", icon: CreditCard },
];

import { getStaffContext } from "@/lib/auth";
import { ShareBookingLink } from "@/components/ui/ShareBookingLink";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getStaffContext();
  return (
    <div className="flex min-h-screen bg-surface/50 pb-16 md:pb-0">
      {/* Sidebar (Desktop) */}
      <aside className="hidden sticky top-0 md:flex h-screen w-64 flex-col border-r border-line bg-surface px-4 py-6">
        <div className="mb-8 px-2">
          <span className="font-display text-2xl font-bold text-brand">
            SportHub
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
        {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => (
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
