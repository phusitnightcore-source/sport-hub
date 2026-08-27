import { createClient } from '@/lib/badminton/supabase/server';
import type { Event } from '@/types/badminton';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import DashboardPaymentStatus from '@/components/badminton/DashboardPaymentStatus';
import { billedShuttleCount } from '@/lib/badminton/utils/billing';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user!.id).single();

    // Find the latest open event, or the absolute latest event
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('status', { ascending: false }) // 'open' before 'closed'
        .order('event_date', { ascending: false })
        .limit(1);

    const todayEvent = events?.[0] || null;
    const today = todayEvent?.event_date || new Date().toLocaleDateString('en-CA');

    let playerCount = 0;
    let myPlayer = null;
    let todayBillAmount = 0;
    let myMatchCount = 0;
    let todayShuttles = 0;

    if (todayEvent) {
        const { count } = await supabase
            .from('event_players').select('*', { count: 'exact', head: true }).eq('event_id', todayEvent.id);
        playerCount = count || 0;

        const { data } = await supabase
            .from('event_players').select('*').eq('event_id', todayEvent.id).eq('user_id', user!.id).maybeSingle();
        myPlayer = data;

        if (myPlayer) {
            try {
                // Get match count
                const { count: matchCount } = await supabase
                    .from('match_players')
                    .select('*, matches!inner(*)', { count: 'exact', head: true })
                    .eq('user_id', user!.id)
                    .eq('matches.event_id', todayEvent.id)
                    .in('matches.status', ['playing', 'finished']);
                myMatchCount = matchCount || 0;

                const { data: summary } = await supabase.from('view_billing_summary')
                    .select('*')
                    .eq('event_date', today)
                    .eq('user_id', user!.id)
                    .maybeSingle();

                if (summary) {
                    todayBillAmount = summary.total_cost || summary.total_amount || summary.amount || summary.cost || 0;
                    todayShuttles = summary.total_shuttlecocks || 0;
                } else {
                    const { data: todayMatches } = await supabase.from('match_players').select('*, matches!inner(*)').eq('user_id', user!.id).eq('matches.event_id', todayEvent.id).in('matches.status', ['finished', 'playing']);
                    let totalShuttles = 0;
                    todayMatches?.forEach((mp: any) => {
                        // เกมที่เล่นแล้วนับอย่างน้อย 1 ลูก (เบิกเพิ่มนับตามจริง)
                        totalShuttles += billedShuttleCount(mp.matches?.shuttlecock_numbers);
                    });
                    todayShuttles = totalShuttles;
                    todayBillAmount = todayEvent.entry_fee + (todayEvent.shuttlecock_price * totalShuttles) + (myPlayer.additional_cost || 0) - (myPlayer.discount || 0);
                    todayBillAmount = Math.max(0, todayBillAmount);
                }
            } catch (e) {
                console.error('Error fetching billing info:', e);
            }
        }
    }

    const event = todayEvent as Event | null;

    return (
        <div className="animate-in grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Content (8 Columns) */}
            <div className="col-span-1 lg:col-span-8">
                {/* Today's Event */}
                {event ? (
                    <div className="card h-full flex flex-col mb-6 lg:mb-0 relative overflow-hidden" style={{ padding: '32px' }}>
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/10 to-transparent rounded-bl-full pointer-events-none" />

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: event.status === 'open' ? 'var(--success)' : 'var(--muted)' }} />
                                    <span className="text-sm font-bold tracking-wide uppercase" style={{ color: event.status === 'open' ? 'var(--success)' : 'var(--muted)' }}>
                                        {event.status === 'open' ? 'ก๊วนเปิดอยู่' : 'ก๊วนปิดแล้ว'}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--foreground)' }}>
                                    {new Date(event.event_date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h2>
                            </div>

                            {/* Personalized Status Badge */}
                            {myPlayer ? (
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">สถานะของคุณ</span>
                                    <div className="flex flex-wrap justify-end gap-2 max-w-[280px]">
                                        {todayBillAmount > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm bg-blue-600 text-white">
                                                <Icon icon="solar:bill-list-bold" width={16} /> ยอดรวม ฿{todayBillAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </div>
                                        )}
                                        {myPlayer.is_checked_in ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm bg-emerald-600 text-white">
                                                <Icon icon="solar:check-read-bold" width={16} /> เช็คอินแล้ว
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm" style={{ background: 'var(--card-elevated)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
                                                <Icon icon="solar:user-rounded-bold" width={16} /> เข้าร่วมก๊วนแล้ว
                                            </div>
                                        )}
                                        {myPlayer.payment_status === 'paid' ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm" style={{ background: 'rgba(22,163,74,0.15)', color: 'var(--success)' }}>
                                                <Icon icon="solar:wallet-money-bold" width={16} /> จ่ายแล้ว
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                                                <Icon icon="solar:wallet-money-linear" width={16} /> รอชำระ
                                            </div>
                                        )}
                                    </div>
                                    {todayBillAmount > 0 && (
                                        <p className="text-[11px] text-right leading-snug max-w-[280px]" style={{ color: 'var(--muted)' }}>
                                            ค่าสนาม ฿{event.entry_fee} + ค่าลูก {todayShuttles}×฿{event.shuttlecock_price}
                                            {(myPlayer.additional_cost || 0) > 0 ? ` + เพิ่ม ฿${myPlayer.additional_cost}` : ''}
                                            {(myPlayer.discount || 0) > 0 ? ` − ลด ฿${myPlayer.discount}` : ''}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm" style={{ background: 'var(--card-elevated)', color: 'var(--muted)' }}>
                                    <Icon icon="solar:info-circle-bold" width={16} /> ยังไม่ได้เข้าร่วม
                                </div>
                            )}
                        </div>

                        {/* Rich Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="flex flex-col gap-1 p-4 rounded-2xl" style={{ background: 'var(--card-elevated)' }}>
                                <Icon icon="solar:clock-circle-bold" width={24} className="text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-semibold mt-2" style={{ color: 'var(--muted)' }}>เวลาเล่น</span>
                                <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                                    {event.start_time?.slice(0, 5) || '19:00'} - {event.end_time?.slice(0, 5) || '23:00'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 p-4 rounded-2xl" style={{ background: 'var(--card-elevated)' }}>
                                <Icon icon="solar:map-point-wave-bold" width={24} style={{ color: '#3b82f6' }} />
                                <span className="text-xs font-semibold mt-2" style={{ color: 'var(--muted)' }}>คอร์ท</span>
                                <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                                    {event.courts?.length ? event.courts.join(', ') : '-'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 p-4 rounded-2xl" style={{ background: 'var(--card-elevated)' }}>
                                <Icon icon="solar:tag-bold" width={24} style={{ color: '#10b981' }} />
                                <span className="text-xs font-semibold mt-2" style={{ color: 'var(--muted)' }}>ค่าสนาม / ลูก</span>
                                <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                                    ฿{event.entry_fee} / ฿{event.shuttlecock_price}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 p-4 rounded-2xl" style={{ background: 'var(--card-elevated)' }}>
                                <Icon icon="solar:users-group-two-rounded-bold" width={24} style={{ color: '#8b5cf6' }} />
                                <span className="text-xs font-semibold mt-2" style={{ color: 'var(--muted)' }}>ยอดผู้เล่น</span>
                                <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                                    {playerCount} คน
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 p-4 rounded-2xl" style={{ background: 'var(--card-elevated)' }}>
                                <Icon icon="solar:medal-ribbon-bold" width={24} style={{ color: '#f59e0b' }} />
                                <span className="text-xs font-semibold mt-2" style={{ color: 'var(--muted)' }}>แมตช์ที่เล่นไป</span>
                                <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                                    {myMatchCount} เกม
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-auto relative z-10">
                            <Link href="/badminton-group/dashboard/live" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                                <Icon icon="solar:monitor-smartphone-linear" width={20} />
                                ดูกระดานคิว
                            </Link>
                            {profile?.role === 'venue_admin' && (
                                <Link href={`/badminton-group/dashboard/admin/events/${event.id}`} className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                                    <Icon icon="solar:calendar-linear" width={20} />
                                    จัดการก๊วน
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="card text-center h-full flex flex-col items-center justify-center mb-6 lg:mb-0" style={{ padding: '48px 24px' }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--card-elevated)' }}>
                            <Icon icon="solar:calendar-linear" width={24} style={{ color: 'var(--muted)' }} />
                        </div>
                        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>ยังไม่มีการสร้างก๊วน</h2>
                        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                            {profile?.role === 'venue_admin' ? 'เริ่มสร้างก๊วนใหม่เพื่อจัดการแมตช์ได้เลย' : 'รอผู้จัดสร้างก๊วนก่อนนะ'}
                        </p>
                        {profile?.role === 'venue_admin' && (
                            <Link href="/badminton-group/dashboard/admin/events/create" className="btn btn-primary">
                                <Icon icon="solar:add-circle-linear" width={18} />
                                สร้างก๊วนใหม่
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Sidebar (4 Columns) */}
            <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
                {/* Profile Card */}
                <div className="card overflow-hidden border-none shadow-sm" style={{ padding: 0 }}>
                    <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg bg-blue-600 text-white border-2 border-white/20">
                                {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-black text-white truncate max-w-[200px]">{profile?.display_name}</h2>
                                <p className="text-sm font-medium text-slate-300 truncate max-w-[200px]">{profile?.full_name || 'ไม่ได้ระบุชื่อจริง'}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/15 text-white border border-white/20">
                                        {profile?.role === 'venue_admin' ? 'ผู้จัดก๊วน' : 'ผู้เล่น'}
                                    </span>
                                    {profile?.skill_level && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                                            {profile.skill_level}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: '24px' }}>
                    <h2 className="text-base font-bold mb-4" style={{ color: 'var(--foreground)' }}>เมนูลัด</h2>
                    <div className="flex flex-col gap-3">
                        {[
                            { href:'/badminton-group/dashboard/live', icon: 'solar:monitor-smartphone-linear', title: 'กระดานคิว', desc: 'ดูคิวแมตช์แบบเรียลไทม์' },
                            { href:'/badminton-group/dashboard/leaderboard', icon: 'solar:cup-star-linear', title: 'จัดอันดับ', desc: 'ดูอันดับสถิติผู้เล่น' },
                            { href:'/badminton-group/dashboard/profile', icon: 'solar:user-circle-linear', title: 'โปรไฟล์', desc: 'ข้อมูลส่วนตัวและบิล' },
                        ].map((item, i) => (
                            <Link key={i} href={item.href} className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-[var(--card-elevated)] border border-transparent hover:border-[var(--card-border)] group">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--card-elevated)' }}>
                                    <Icon icon={item.icon} width={20} style={{ color: 'var(--muted)' }} className="group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>{item.title}</h3>
                                    <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{item.desc}</p>
                                </div>
                                <Icon icon="solar:alt-arrow-right-linear" width={16} style={{ color: 'var(--muted)' }} className="opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Payment Status — Admin Only */}
                {profile?.role === 'venue_admin' && (
                    <DashboardPaymentStatus />
                )}
            </div>
        </div>
    );
}
