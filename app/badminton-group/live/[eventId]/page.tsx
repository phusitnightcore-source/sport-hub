'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/badminton/supabase/client';
import type { Event, EventPlayer, Match, Profile } from '@/types/badminton';
import { Icon } from '@iconify/react';
import { useParams } from 'next/navigation';
import { truncateName } from '@/lib/badminton/string-utils';


import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function PublicLiveBoardPage() {
    const params = useParams();
    const eventId = params.eventId as string;
    const [event, setEvent] = useState<Event | null>(null);
    const [players, setPlayers] = useState<EventPlayer[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTvMode, setIsTvMode] = useState(false);

    useEffect(() => {
        const handleFsChange = () => {
            setIsTvMode(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleTvMode = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsTvMode(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
            setIsTvMode(false);
        }
    };

    const loadData = useCallback(async (id: string) => {
        const supabase = createClient();
        const [eventRes, playersRes, matchesRes] = await Promise.all([
            supabase.from('events').select('*').eq('id', id).single(),
            supabase.from('event_players').select('*, profiles(*)').eq('event_id', id).order('created_at'),
            supabase.from('matches').select('*, match_players(*, profiles(*))').eq('event_id', id).order('created_at', { ascending: true }),
        ]);

        if (eventRes.data) setEvent(eventRes.data as Event);
        if (playersRes.data) setPlayers(playersRes.data as EventPlayer[]);
        if (matchesRes.data) setMatches(matchesRes.data as Match[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (eventId) {
            loadData(eventId);

            const supabase = createClient();
            const matchChannel = supabase.channel(`public-matches-${eventId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `event_id=eq.${eventId}` }, () => loadData(eventId))
                .subscribe();

            const playerChannel = supabase.channel(`public-players-${eventId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'event_players', filter: `event_id=eq.${eventId}` }, () => loadData(eventId))
                .subscribe();

            return () => {
                supabase.removeChannel(matchChannel);
                supabase.removeChannel(playerChannel);
            };
        }
    }, [eventId, loadData]);

    const statusCfg: any = {
        waiting: { label: 'รอกดเริ่ม', badge: 'badge-muted' },
        playing: { label: 'กำลังแข่ง', badge: 'badge-warning' },
        finished: { label: 'จบแล้ว', badge: 'badge-success' },
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6 text-center">
                <div className="space-y-4">
                    <div className="spinner mx-auto" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 animate-pulse">กำลังโหลดบอร์ดสด...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6 text-center">
                <div className="card max-w-sm p-8 shadow-xl">
                    <Icon icon="solar:shield-warning-bold-duotone" width={64} className="mx-auto text-blue-500 mb-4" />
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">ไม่พบงานนี้</h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ก๊วนที่คุณพยายามเข้าถึงอาจถูกลบหรือไม่มีอยู่จริง</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] pb-20">
            {/* Header */}
            <header className="bg-white dark:bg-[#1b2540] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 shadow-xs">
                <div className="w-full px-4 sm:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/badminton-group/dashboard" className="flex items-center">
                            <Image src="/light.png" alt="SportHub Logo" width={110} height={32} className="h-8 w-auto object-contain dark:hidden [data-theme=dark]_&]:hidden block" priority />
                            <Image src="/Dark.png" alt="SportHub Logo" width={110} height={32} className="h-8 w-auto object-contain hidden dark:block [data-theme=dark]_&:block" priority />
                        </Link>
                        <div>
                            <h1 className="text-lg font-black tracking-tight text-gray-900 dark:text-white leading-tight">𝗦𝗽𝗼𝗿𝘁𝗛𝘂𝗯 𝗚𝗿𝗼𝘂𝗽</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">วันที่ {new Date(event.event_date).toLocaleDateString('th-TH')}</span>
                                <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600">•</span>
                                <span className="flex items-center gap-1 text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Live Board
                                </span>
                                <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600">•</span>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{players.filter(p => p.is_checked_in).length} ผู้เล่นมาแล้ว</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTvMode}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isTvMode
                                    ? "bg-orange-500 text-white shadow-sm ring-2 ring-orange-400"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                            title="สลับโหมดจอทีวีสำหรับแขวนผนังสนาม"
                        >
                            <Icon icon={isTvMode ? "solar:minimize-square-3-bold" : "solar:tv-bold"} width={16} />
                            <span>{isTvMode ? "ออกจากจอทีวี" : "📺 จอทีวี (TV Mode)"}</span>
                        </button>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className={`${isTvMode ? "w-full max-w-[1800px] px-6 sm:px-10 py-8" : "max-w-4xl mx-auto px-4 py-6"} space-y-6 transition-all duration-300`}>
                {/* Active Matches */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-5 rounded-full bg-orange-500" />
                        <h2 className={`font-black uppercase tracking-wider text-gray-900 dark:text-white ${isTvMode ? "text-lg" : "text-sm"}`}>
                            คิวสนาม (Active Matches)
                        </h2>
                    </div>

                    {matches.length === 0 ? (
                        <div className="card text-center py-12 bg-white/50 border-dashed">
                            <Icon icon="solar:sort-horizontal-linear" width={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-sm font-bold text-gray-400">ยังไม่มีการเพิ่มแมตช์</p>
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${isTvMode ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2"}`}>
                            {matches.filter(m => m.status !== 'finished').map((match, i) => (
                                <MatchCard key={match.id} match={match} index={i} statusCfg={statusCfg} isTvMode={isTvMode} />
                            ))}
                            {/* If no active matches, show a placeholder if we have finished matches */}
                            {matches.filter(m => m.status !== 'finished').length === 0 && matches.length > 0 && (
                                <div className="col-span-full card text-center py-10 bg-white/50 border-dashed">
                                    <Icon icon="solar:sleeping-circle-linear" width={40} className="mx-auto text-gray-300 mb-3" />
                                    <p className="text-sm font-bold text-gray-400">แมตช์ที่จัดไว้จบหมดแล้ว</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Finished Matches (Simplified) */}
                {matches.filter(m => m.status === 'finished').length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-5 rounded-full bg-gray-400" />
                            <h2 className="text-sm font-black uppercase tracking-wider text-gray-400">จบไปแล้ว</h2>
                        </div>
                        <div className="space-y-3 opacity-80">
                            {matches.filter(m => m.status === 'finished').reverse().slice(0, 10).map((match, i) => (
                                <MatchCard key={match.id} match={match} statusCfg={statusCfg} simplified />
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

function MatchCard({ match, index, statusCfg, simplified = false, isTvMode = false }: { match: Match, index?: number, statusCfg: any, simplified?: boolean, isTvMode?: boolean }) {
    const tA = match.match_players?.filter(mp => mp.team === 'A') || [];
    const tB = match.match_players?.filter(mp => mp.team === 'B') || [];
    const aWon = match.status === 'finished' && match.team_a_score > match.team_b_score;
    const bWon = match.status === 'finished' && match.team_b_score > match.team_a_score;

    if (simplified) {
        return (
            <div className="card p-3 shadow-sm flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black p-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">คอร์ท {match.court_number}</span>
                        <div className="flex items-center gap-1 min-w-0 truncate">
                            <span className={`text-[11px] font-bold truncate ${aWon ? 'text-orange-600' : 'text-gray-600 dark:text-gray-300'}`}>
                                {tA.map(mp => truncateName((mp.profiles as unknown as Profile)?.display_name || 'ไม่ทราบชื่อ', 12)).join(' + ')}
                            </span>
                            <span className="text-[9px] font-bold text-gray-300 italic">vs</span>
                            <span className={`text-[11px] font-bold truncate ${bWon ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                                {tB.map(mp => truncateName((mp.profiles as unknown as Profile)?.display_name || 'ไม่ทราบชื่อ', 12)).join(' + ')}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 font-bold text-xs text-gray-700 dark:text-gray-200">
                        {match.team_a_score} - {match.team_b_score}
                    </div>
                </div>
            </div>
        );
    }

    const cfg = statusCfg[match.status];

    return (
        <div className={`card overflow-hidden shadow-md border-0 transition-transform ${match.status === 'playing' ? 'ring-2 ring-orange-500 scale-[1.02]' : ''}`}>
            {match.status === 'playing' && (
                <div className={`bg-orange-500 text-white font-black uppercase tracking-[0.2em] py-1 text-center animate-pulse ${isTvMode ? 'text-xs py-1.5' : 'text-[9px]'}`}>
                    กำลังแข่ง (LIVE)
                </div>
            )}
            <div className={isTvMode ? 'p-6 space-y-4' : 'p-4'}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className={`font-black bg-gray-900 dark:bg-black text-white rounded shadow-sm ${isTvMode ? 'text-sm px-3 py-1' : 'text-[10px] px-2 py-0.5'}`}>
                            คอร์ท {match.court_number}
                        </span>
                        <span className={`font-bold rounded ${cfg.badge} ${isTvMode ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'}`}>
                            {cfg.label}
                        </span>
                    </div>
                    {match.shuttlecock_numbers && match.shuttlecock_numbers.length > 0 && (
                        <div className="flex items-center gap-1">
                            {match.shuttlecock_numbers.map((num, idx) => (
                                <span key={idx} className={`rounded flex items-center justify-center font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 ${isTvMode ? 'w-7 h-7 text-xs' : 'w-5 h-5 text-[10px]'}`}>
                                    {num}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    {/* Team A */}
                    <div className={`space-y-1.5 ${aWon ? 'bg-orange-50 dark:bg-orange-950/20 p-2 rounded-xl border border-orange-200 dark:border-orange-800' : ''}`}>
                        {tA.map((mp, idx) => {
                            const prof = mp.profiles as unknown as Profile;
                            return (
                                <div key={idx} className="flex flex-col">
                                    <span className={`font-black truncate ${isTvMode ? 'text-base sm:text-lg' : 'text-xs'} ${aWon ? 'text-orange-900 dark:text-orange-300' : 'text-gray-900 dark:text-white'}`}>
                                        {truncateName(prof?.display_name || 'ไม่ทราบชื่อ', 14)}
                                    </span>
                                    {prof?.skill_level && (
                                        <span className={`font-bold ${isTvMode ? 'text-[11px]' : 'text-[9px]'} ${aWon ? 'text-orange-500' : 'text-gray-400'}`}>
                                            {prof.skill_level}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 2 - tA.length) }).map((_, idx) => (
                            <div key={`empty-A-${idx}`} className="flex flex-col">
                                <span className={`font-black truncate text-gray-400 italic opacity-50 ${isTvMode ? 'text-base' : 'text-xs'}`}>
                                    (ผู้เล่นขาจร)
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Result / VS */}
                    <div className={`text-center rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 ${isTvMode ? 'px-4 py-2' : 'px-2 py-1'}`}>
                        {match.status === 'finished' ? (
                            <span className={`font-black text-gray-900 dark:text-white ${isTvMode ? 'text-lg sm:text-xl' : 'text-sm'}`}>
                                {match.team_a_score}-{match.team_b_score}
                            </span>
                        ) : (
                            <span className={`font-black text-gray-300 dark:text-gray-600 italic ${isTvMode ? 'text-sm' : 'text-[10px]'}`}>
                                VS
                            </span>
                        )}
                    </div>

                    {/* Team B */}
                    <div className={`space-y-1 text-right ${bWon ? 'bg-blue-50 p-2 rounded-xl border border-blue-100' : ''}`}>
                        {tB.map((mp, idx) => {
                            const prof = mp.profiles as unknown as Profile;
                            return (
                                <div key={idx} className="flex flex-col items-end">
                                    <span className={`text-xs font-black truncate ${bWon ? 'text-blue-900' : 'text-gray-900'}`}>{truncateName(prof?.display_name || 'ไม่ทราบชื่อ', 14)}</span>
                                    {prof?.skill_level && (
                                        <span className={`text-[10px] font-bold ${bWon ? 'text-blue-500' : 'text-gray-400'}`}>{prof.skill_level}</span>
                                    )}
                                </div>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 2 - tB.length) }).map((_, idx) => (
                            <div key={`empty-B-${idx}`} className="flex flex-col items-end">
                                <span className="text-xs font-black truncate text-gray-400 italic opacity-50">(ผู้เล่นขาจร)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
