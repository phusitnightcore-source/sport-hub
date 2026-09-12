'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/badminton/supabase/client';
import { useConfirm } from './ConfirmProvider';
import NotificationBell from './NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Profile } from '@/types/badminton';
import { Icon } from '@iconify/react';

interface NavbarProps {
    profile: Profile;
}

const userMenuItems = [
    { href:'/badminton-group/dashboard', label: 'หน้าหลัก', icon: 'solar:home-2-linear' },
    { href:'/badminton-group/dashboard/live', label: 'กระดานคิว', icon: 'solar:monitor-smartphone-linear' },
    { href:'/badminton-group/dashboard/leaderboard', label: 'จัดอันดับ', icon: 'solar:cup-star-linear' },
    { href:'/badminton-group/dashboard/achievements', label: 'ความสำเร็จ', icon: 'solar:medal-star-linear' },
    { href:'/badminton-group/dashboard/profile', label: 'โปรไฟล์', icon: 'solar:user-circle-linear' },
];

const adminMenuItems = [
    { href:'/badminton-group/dashboard/admin/events', label: 'จัดการก๊วน', icon: 'solar:calendar-linear' },
    { href:'/badminton-group/dashboard/admin/matches', label: 'จัดแมตช์', icon: 'solar:sort-horizontal-linear' },
    { href:'/badminton-group/dashboard/admin/billing', label: 'จัดการเงิน', icon: 'solar:wallet-linear' },
    { href:'/badminton-group/dashboard/admin/users', label: 'จัดการสมาชิก', icon: 'solar:users-group-rounded-linear' },
    { href:'/badminton-group/dashboard/admin/absences', label: 'ประวัติการเข้าก๊วน', icon: 'solar:calendar-date-linear' },
    { href:'/badminton-group/dashboard/admin/rank-reset', label: 'รีแรงค์', icon: 'solar:restart-linear' },
    { href:'/badminton-group/dashboard/admin/logs', label: 'บันทึกกิจกรรม', icon: 'solar:clipboard-list-linear' },
    { href:'/badminton-group/dashboard/history', label: 'ประวัติก๊วน', icon: 'solar:clock-circle-linear' },
];

export default function Navbar({ profile }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const confirm = useConfirm();
    const [mobileOpen, setMobileOpen] = useState(false);
    const isAdmin = profile.role === 'venue_admin' || profile.role === 'admin';

    // Keep the page behind the drawer still on mobile; this prevents accidental
    // scrolling while selecting a menu item without changing navigation behavior.
    useEffect(() => {
        if (!mobileOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [mobileOpen]);

    const handleLogout = async () => {
        const ok = await confirm({
            title: 'ออกจากระบบ?',
            message: 'คุณต้องการออกจากระบบใช่หรือไม่?',
            confirmText: 'ออกจากระบบ',
            type: 'danger'
        });

        if (!ok) return;

        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const isActive = (href: string) => {
        if (href === '/badminton-group/dashboard') return pathname === '/badminton-group/dashboard';
        return pathname.startsWith(href);
    };

    const renderNavItems = (items: typeof userMenuItems, closeMobile = false) => (
        items.map((item) => {
            const active = isActive(item.href);
            return (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile ? () => setMobileOpen(false) : undefined}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-bold transition-all mb-1 ${
                        active
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-black border border-blue-500/30 shadow-xs ring-1 ring-blue-500/20'
                            : 'text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Icon
                        icon={item.icon}
                        width={20}
                        className={active ? 'text-blue-600 dark:text-blue-400 shrink-0' : 'text-slate-400 dark:text-slate-400 shrink-0'}
                    />
                    <span className="truncate">{item.label}</span>
                </Link>
            );
        })
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className="badminton-nav-shell hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[260px] z-40 border-r"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
                {/* Logo */}
                <div className="flex items-center justify-between px-6 h-20 border-b" style={{ borderColor: 'var(--card-border)' }}>
                    <Link href="/badminton-group/dashboard" className="flex items-center gap-2">
                        <Image src="/light.png" alt="SportHub Logo" width={32} height={32} className="h-8 w-auto object-contain dark:hidden [data-theme=dark]_&]:hidden block" priority />
                        <Image src="/Dark.png" alt="SportHub Logo" width={32} height={32} className="h-8 w-auto object-contain hidden dark:block [data-theme=dark]_&:block" priority />
                        <span className="font-display text-lg font-bold tracking-tight text-brand">
                            SportHub
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Group
                        </span>
                    </Link>
                    <ThemeToggle />
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-5 px-3.5 overflow-y-auto">
                    <p className="px-3.5 text-[10px] font-extrabold uppercase tracking-widest mb-2 text-slate-400 dark:text-slate-400">
                        เมนูหลัก
                    </p>
                    {renderNavItems(userMenuItems)}

                    {isAdmin && (
                        <>
                            <div className="my-4 mx-3.5 h-px" style={{ background: 'var(--card-border)' }} />
                            <p className="px-3.5 text-[10px] font-extrabold uppercase tracking-widest mb-2 text-slate-400 dark:text-slate-400">
                                ผู้จัดก๊วน (Admin)
                            </p>
                            {renderNavItems(adminMenuItems)}
                        </>
                    )}
                </nav>

                {/* User Info + Logout */}
                <div className="px-5 py-5 border-t" style={{ background: 'var(--background)', borderColor: 'var(--card-border)' }}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 bg-blue-600 text-white"
                            >
                                {profile.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate" style={{ color: 'var(--foreground)' }}>
                                    {profile.display_name}
                                </p>
                                <p className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                                    {isAdmin ? 'ผู้จัดก๊วน' : 'ผู้เล่น'}
                                </p>
                            </div>
                        </div>
                        <NotificationBell userId={profile.id} />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-500/20 text-red-500 hover:bg-red-500/10"
                    >
                        <Icon icon="solar:logout-2-linear" width={16} />
                        ออกจากระบบ
                    </button>
                </div>
            </aside>

            {/* Mobile Top Bar */}
            <header
                className="badminton-nav-shell lg:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 border-b backdrop-blur-md"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
                <Link href="/badminton-group/dashboard" className="flex items-center gap-1.5">
                    <Image src="/light.png" alt="SportHub Logo" width={28} height={28} className="h-7 w-auto object-contain dark:hidden [data-theme=dark]_&]:hidden block" priority />
                    <Image src="/Dark.png" alt="SportHub Logo" width={28} height={28} className="h-7 w-auto object-contain hidden dark:block [data-theme=dark]_&:block" priority />
                    <span className="font-display text-base font-bold tracking-tight text-brand">
                        SportHub
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        Group
                    </span>
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <NotificationBell userId={profile.id} />
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-expanded={mobileOpen}
                        aria-controls="badminton-mobile-navigation"
                        aria-label={mobileOpen ? 'ปิดเมนูการใช้งาน' : 'เปิดเมนูการใช้งาน'}
                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors border"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                    >
                        <Icon icon={mobileOpen ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} width={22} />
                    </button>
                </div>
            </header>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-[60]" onClick={() => setMobileOpen(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="absolute right-0 top-0 bottom-0 w-[300px] animate-in flex flex-col justify-between"
                        style={{ background: 'var(--card-bg)' }}
                        onClick={(e) => e.stopPropagation()}
                        id="badminton-mobile-navigation"
                        role="dialog"
                        aria-modal="true"
                        aria-label="เมนูการใช้งาน"
                    >
                        <div>
                            <div className="flex items-center justify-between px-6 h-16 border-b" style={{ borderColor: 'var(--card-border)' }}>
                                <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>เมนูการใช้งาน</span>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                                    style={{ color: 'var(--muted)' }}
                                >
                                    <Icon icon="solar:close-circle-linear" width={20} />
                                </button>
                            </div>

                            <nav className="py-5 px-3.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                                <p className="px-3.5 text-[10px] font-extrabold uppercase tracking-widest mb-2 text-slate-400 dark:text-slate-400">
                                    เมนูหลัก
                                </p>
                                {renderNavItems(userMenuItems, true)}
                                {isAdmin && (
                                    <>
                                        <div className="my-4 mx-3.5 h-px" style={{ background: 'var(--card-border)' }} />
                                        <p className="px-3.5 text-[10px] font-extrabold uppercase tracking-widest mb-2 text-slate-400 dark:text-slate-400">
                                            ผู้จัดก๊วน (Admin)
                                        </p>
                                        {renderNavItems(adminMenuItems, true)}
                                    </>
                                )}
                            </nav>
                        </div>

                        <div className="px-6 py-5 border-t" style={{ background: 'var(--background)', borderColor: 'var(--card-border)' }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm bg-blue-600 text-white">
                                    {profile.display_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate" style={{ color: 'var(--foreground)' }}>{profile.display_name}</p>
                                    <p className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>{isAdmin ? 'ผู้จัดก๊วน' : 'ผู้เล่น'}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-500/20 text-red-500 hover:bg-red-500/10"
                            >
                                <Icon icon="solar:logout-2-linear" width={16} />
                                ออกจากระบบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
