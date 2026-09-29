'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/badminton/supabase/client';
import { Icon } from '@iconify/react';
import { fetchPlayerStats, calculateAchievementProgress, AchievementProgress } from '@/lib/badminton/utils/achievement-utils';
import Link from 'next/link';

export default function AchievementsPage() {
    const [progress, setProgress] = useState<AchievementProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
                setUserName(profile?.display_name || 'ผู้เล่น');

                const stats = await fetchPlayerStats(user.id);
                const results = calculateAchievementProgress(stats);
                setProgress(results);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const categories = [
        { id: 'games', name: 'การเล่น (Games)', icon: 'solar:gamepad-old-bold', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
        { id: 'wins', name: 'ชัยชนะ (Wins)', icon: 'solar:cup-bold', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
        { id: 'attendance', name: 'ความสม่ำเสมอ (Attendance)', icon: 'solar:calendar-bold', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
        { id: 'payment', name: 'การเงิน (Payment)', icon: 'solar:wallet-bold', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
        { id: 'special', name: 'พิเศษ (Special)', icon: 'solar:star-bold', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40">
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <p className="mt-4 text-[var(--muted)] font-medium text-sm">กำลังโหลดความสำเร็จ...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in duration-700">
            {/* Clean Professional Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-8 border-b border-[var(--card-border)]">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Hall of Fame</span>
                    </div>
                    <h1 className="text-4xl font-black text-[var(--foreground)] tracking-tight">ความสำเร็จ</h1>
                    <p className="text-[var(--muted)] mt-1">ยินดีต้อนรับกลับมา, <span className="text-[var(--foreground)] font-bold">{userName}</span></p>
                </div>
                <Link href="/badminton-group/dashboard/profile" className="btn btn-secondary py-2.5 px-6 rounded-xl transition-colors flex items-center shadow-sm">
                    <Icon icon="solar:user-circle-bold" width={22} className="mr-2" />
                    โปรไฟล์
                </Link>
            </div>

            {categories.map(cat => {
                const catAchievements = progress.filter(p => p.achievement.category === cat.id);
                if (catAchievements.length === 0) return null;

                return (
                    <div key={cat.id} className="mb-16">
                        <div className="flex items-center gap-3 mb-8">
                            <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center shadow-sm`}>
                                <Icon icon={cat.icon} width={22} />
                            </div>
                            <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">{cat.name}</h2>
                            <div className="h-px flex-1 bg-[var(--card-border)] ml-2" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catAchievements.map(p => {
                                const currentTierData = p.currentTier > 0 ? p.achievement.tiers[p.currentTier - 1] : null;
                                const nextTierData = p.isMaxed ? null : p.achievement.tiers[p.currentTier];
                                const tierColor = currentTierData?.color || '#94a3b8';

                                return (
                                    <div key={p.achievement.id}
                                        className="card rounded-2xl p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm hover:shadow-md transition-all">

                                        <div className="flex gap-4 mb-6">
                                            {/* Minimal Icon Holder */}
                                            <div className="relative shrink-0">
                                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm bg-[var(--card-elevated)] border border-[var(--card-border)]"
                                                    style={p.currentTier > 0 ? {
                                                        backgroundColor: tierColor,
                                                        color: '#ffffff',
                                                        borderColor: 'transparent'
                                                    } : { color: 'var(--muted)' }}>
                                                    <Icon icon={currentTierData?.icon || p.achievement.icon} width={32} />
                                                </div>

                                                {/* Tier Badge */}
                                                {p.currentTier > 0 && (
                                                    <div className="absolute -top-1.5 -left-1.5 w-7 h-7 rounded-lg bg-[var(--card-bg)] shadow-md flex items-center justify-center text-sm border border-[var(--card-border)]">
                                                        {currentTierData?.badge}
                                                    </div>
                                                )}

                                                {/* Level Rank */}
                                                {p.currentTier > 0 && (
                                                    <div className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-lg bg-[var(--card-bg)] text-[10px] font-black text-[var(--foreground)] shadow-md border border-[var(--card-border)]">
                                                        LV.{p.currentTier}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 pt-1">
                                                <h3 className="text-base font-bold text-[var(--foreground)] mb-0.5 line-clamp-1">
                                                    {p.currentTier > 0 ? currentTierData?.label : p.achievement.name}
                                                </h3>
                                                <p className="text-[11px] text-[var(--muted)] font-medium leading-tight">
                                                    {p.achievement.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wider">
                                                <span className="text-[var(--muted)]">
                                                    {p.achievement.id === 'total_spent' ? '฿' : ''}{(p.currentValue || 0).toLocaleString()} / {nextTierData ? (p.achievement.id === 'total_spent' ? '฿' : '') + (nextTierData.target || 0).toLocaleString() : 'MAX'}
                                                </span>
                                                <span className={p.isMaxed ? 'text-emerald-500' : 'text-blue-600 dark:text-blue-400'}>
                                                    {Math.floor(p.percentToNext)}%
                                                </span>
                                            </div>

                                            <div className="h-2 w-full bg-[var(--card-elevated)] rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-1000 ease-out rounded-full ${p.isMaxed ? 'bg-emerald-500' : 'bg-blue-600 dark:bg-blue-500'}`}
                                                    style={{ width: `${p.percentToNext}%` }} />
                                            </div>

                                            {/* Footer Info */}
                                            {!p.isMaxed && nextTierData ? (
                                                <p className="text-[10px] text-[var(--muted)] font-medium">
                                                    ต้องการอีก <span className="text-[var(--foreground)] font-bold">{(nextTierData.target - p.currentValue).toLocaleString()}</span> เพื่อเป็น <span className="text-[var(--foreground)] font-bold">{nextTierData.label}</span>
                                                </p>
                                            ) : p.isMaxed ? (
                                                <div className="flex items-center gap-1.5 text-emerald-500">
                                                    <Icon icon="solar:check-circle-bold" width={14} />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">สูงสุดแล้ว</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
