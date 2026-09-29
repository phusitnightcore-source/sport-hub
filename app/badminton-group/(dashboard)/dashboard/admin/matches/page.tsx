import { createClient } from '@/lib/badminton/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Event } from '@/types/badminton';
import { Icon } from '@iconify/react';

export default async function AdminMatchesLandingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
    if (profile?.role !== 'venue_admin') redirect('/badminton-group/dashboard');

    const { data: events } = await supabase.from('events').select('*').eq('status', 'open').order('event_date', { ascending: false });

    return (
        <div className="animate-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>จัดแมตช์</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>เลือกก๊วนที่ต้องการจัดแมตช์</p>
            </div>

            {(events || []).length === 0 ? (
                <div className="card text-center" style={{ padding: '48px 24px' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--card-elevated)' }}>
                        <Icon icon="solar:calendar-linear" width={24} style={{ color: 'var(--muted)' }} />
                    </div>
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>ไม่มีก๊วนที่เปิดอยู่</h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>สร้างก๊วนใหม่ก่อนเริ่มจัดแมตช์</p>
                    <Link href="/badminton-group/dashboard/admin/events/create" className="btn btn-primary">สร้างก๊วนใหม่</Link>
                </div>
            ) : (
                <div className="space-y-2">
                    {(events as Event[]).map((event) => (
                        <Link key={event.id} href={`/badminton-group/dashboard/admin/matches/${event.id}`}
                            className="card flex items-center justify-between transition-all hover:border-blue-500" style={{ padding: '16px 20px', display: 'flex' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(22,163,74,0.12)' }}>
                                    <Icon icon="solar:calendar-linear" width={20} style={{ color: 'var(--success)' }} />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                                        {new Date(event.event_date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{event.shuttlecock_brand} · ฿{event.shuttlecock_price}/ลูก</p>
                                </div>
                            </div>
                            <Icon icon="solar:arrow-right-linear" width={18} className="text-blue-600 dark:text-blue-400" />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
