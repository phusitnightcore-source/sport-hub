'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/badminton/supabase/client';
import { Icon } from '@iconify/react';
import type { Notification } from '@/types/badminton';

interface NotificationBellProps {
    userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        if (!userId) return;

        // 1. Fetch initial unread notifications
        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                setNotifications(data as Notification[]);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        };

        fetchNotifications();

        // 2. Subscribe to realtime changes
        const channel = supabase.channel(`notifications_${userId}_${Math.random()}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev].slice(0, 20));
                    setUnreadCount(prev => prev + 1);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const updatedNotif = payload.new as Notification;
                    setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
                    if (updatedNotif.is_read) {
                        setUnreadCount(prev => Math.max(0, prev - 1));
                    }
                }
            )
            .subscribe();

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [userId, supabase]);

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.is_read) {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            // Mark as read in DB
            await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
        }

        if (notif.link_url) {
            setIsOpen(false);
            router.push(notif.link_url);
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'match_start': return 'solar:whistle-linear'; // no exact whistle icon, substitute if needed
            case 'payment_reminder': return 'solar:wallet-linear';
            case 'achievement': return 'solar:medal-star-linear';
            default: return 'solar:bell-bing-linear';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all relative outline-none"
                style={{
                    background: isOpen ? 'var(--gray-100)' : 'transparent',
                    color: isOpen ? 'var(--gray-900)' : 'var(--gray-600)'
                }}
                onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--gray-50)'; }}
                onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
            >
                <Icon icon="solar:bell-bing-outline" width={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div 
                    className="absolute right-0 top-full mt-2 lg:bottom-full lg:top-auto lg:mb-2 lg:mt-0 lg:-left-48 lg:right-auto w-80 rounded-2xl shadow-xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 lg:slide-in-from-bottom-2"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: 'var(--background)', borderColor: 'var(--card-border)' }}>
                        <span className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>การแจ้งเตือน</span>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-[11px] font-bold text-orange-500 hover:underline"
                            >
                                อ่านทั้งหมด
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center" style={{ color: 'var(--muted)' }}>
                                <Icon icon="solar:ghost-linear" width={40} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-medium">ไม่มีการแจ้งเตือน</p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y" style={{ borderColor: 'var(--card-border)' }}>
                                {notifications.map((notif) => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`flex gap-3 p-4 text-left transition-colors hover:bg-orange-500/10 ${!notif.is_read ? 'bg-orange-500/5' : ''}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-orange-500/10 text-orange-500' : 'bg-[var(--gray-100)] text-[var(--muted)]'}`}>
                                            <Icon icon={getIconForType(notif.type)} width={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className={`text-sm ${!notif.is_read ? 'font-extrabold' : 'font-semibold'}`} style={{ color: 'var(--foreground)' }}>
                                                    {notif.title}
                                                </p>
                                                {!notif.is_read && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />}
                                            </div>
                                            <p className="text-xs font-medium leading-relaxed tracking-tight line-clamp-2" style={{ color: 'var(--muted)' }}>
                                                {notif.body}
                                            </p>
                                            <span className="text-[10px] font-medium opacity-60 mt-2 block" style={{ color: 'var(--muted)' }}>
                                                {new Date(notif.created_at).toLocaleString('th-TH')}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="px-4 py-3 border-t text-center" style={{ background: 'var(--background)', borderColor: 'var(--card-border)' }}>
                        <Link href="/badminton-group/dashboard/notifications" className="text-xs font-bold text-orange-500 hover:underline">
                            ดูทั้งหมด
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
