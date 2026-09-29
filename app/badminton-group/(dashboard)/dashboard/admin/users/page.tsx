'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/badminton/supabase/client';
import type { Profile } from '@/types/badminton';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/badminton/ConfirmProvider';
import CustomSelect, { SelectOption } from '@/components/badminton/CustomSelect';
import RankBadge from '@/components/badminton/RankBadge';
import { truncateName } from '@/lib/badminton/string-utils';


const SKILL_LEVELS = ['เปาะแปะ', 'BG', 'N', 'S', 'P-', 'P', 'P+', 'C', 'B', 'A'];

const ROLE_OPTIONS: SelectOption[] = [
    { value: 'user', label: 'User - สมาชิกทั่วไป', icon: 'solar:user-linear', description: 'สามารถเข้าถึงระบบทั่วไปและจัดการโปรไฟล์ตนเองได้' },
    { value: 'venue_admin', label: 'Admin - ผู้ดูแลระบบ', icon: 'solar:shield-user-bold', description: 'สามารถจัดการสมาชิก แมตช์ และการเงินได้ทั้งหมด' },
];

function formatAbsenceReason(
    reason: string, 
    allClosedEvents: { id: string; event_date: string }[], 
    userRegistrations: Set<string>
) {
    if (!reason?.startsWith('absence_penalty:')) {
        return 'หักแต้มสะสมเนื่องจากขาดเล่นก๊วน 🏸';
    }
    const eventId = reason.split(':')[1];
    const targetEventIdx = allClosedEvents.findIndex(e => e.id === eventId);
    if (targetEventIdx === -1) {
        return 'หักแต้มสะสมเนื่องจากขาดเล่นก๊วน 🏸';
    }

    // Walk backward to calculate consecutive misses up to targetEvent
    const missedDates: string[] = [];
    for (let i = targetEventIdx; i >= 0; i--) {
        const ev = allClosedEvents[i];
        if (!userRegistrations.has(ev.id)) {
            const dateStr = new Date(ev.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            missedDates.push(dateStr);
        } else {
            break;
        }
    }
    const targetEvent = allClosedEvents[targetEventIdx];
    const targetEventDate = new Date(targetEvent.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    return `ขาดเล่นก๊วนติดต่อกัน ${missedDates.length} ครั้ง หักวันที่ ${targetEventDate} 🏸`;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'venue_admin' | 'user'>('all');
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [updating, setUpdating] = useState(false);

    // User Detail Modal State
    const [selectedUserDetail, setSelectedUserDetail] = useState<Profile | null>(null);
    const [userDetailStats, setUserDetailStats] = useState({ totalGames: 0, wins: 0, losses: 0, totalPoints: 0 });
    const [userDetailBadges, setUserDetailBadges] = useState({ badge_win_streak: false, badge_marathon: false, badge_patron: false });
    const [userDetailHistory, setUserDetailHistory] = useState<any[]>([]);
    const [userDetailMMRHistory, setUserDetailMMRHistory] = useState<any[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [allClosedEvents, setAllClosedEvents] = useState<{ id: string; event_date: string }[]>([]);
    const [userDetailRegistrations, setUserDetailRegistrations] = useState<Set<string>>(new Set());

    const confirm = useConfirm();

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        // Check if user is admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/login';
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'venue_admin') {
            toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = '/badminton-group/dashboard';
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('ไม่สามารถโหลดข้อมูลสมาชิกได้');
        } else {
            setUsers(data as Profile[]);
        }

        // Fetch all closed events
        const { data: closedEvents } = await supabase
            .from('events')
            .select('id, event_date')
            .eq('status', 'closed')
            .order('event_date', { ascending: true });
        if (closedEvents) setAllClosedEvents(closedEvents);

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter(user => {
        if (user.is_guest) return false;

        const matchesSearch =
            user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    const handleDeleteUser = async (user: Profile) => {
        const ok = await confirm({
            title: 'ลบสมาชิก?',
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบ ${user.display_name}? การลบนี้จะมีผลเฉพาะในโปรไฟล์ของระบบ แต่บัญชี Auth จะยังคงอยู่`,
            type: 'danger',
            confirmText: 'ลบสมาชิก'
        });

        if (!ok) return;

        const supabase = createClient();
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);

        if (error) {
            toast.error('ลบสมาชิกไม่สำเร็จ: ' + error.message);
        } else {
            toast.success('ลบสมาชิกเรียบร้อย');
            fetchUsers();
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setUpdating(true);
        const supabase = createClient();
        const { error } = await supabase
            .from('profiles')
            .update({
                display_name: editingUser.display_name,
                role: editingUser.role,
                skill_level: editingUser.skill_level
            })
            .eq('id', editingUser.id);

        setUpdating(false);
        if (error) {
            toast.error('อัปเดตไม่สำเร็จ: ' + error.message);
        } else {
            toast.success('อัปเดตข้อมูลสมาชิกเรียบร้อย');
            setEditingUser(null);
            fetchUsers();
        }
    };

    const fetchUserDetails = async (user: Profile) => {
        setLoadingDetail(true);
        setSelectedUserDetail(user);
        const supabase = createClient();

        try {
            // Fetch stats
            const { data: myMatches } = await supabase.from('match_players').select('*, matches(*)').eq('user_id', user.id);
            if (myMatches) {
                const finished = myMatches.filter((mp: any) => mp.matches?.status === 'finished');
                const wins = finished.filter((mp: any) =>
                    mp.team === 'A' ? mp.matches.team_a_score > mp.matches.team_b_score : mp.matches.team_b_score > mp.matches.team_a_score
                );
                const totalPoints = finished.reduce((sum: number, mp: any) =>
                    sum + (mp.team === 'A' ? mp.matches.team_a_score : mp.matches.team_b_score), 0
                );
                setUserDetailStats({ totalGames: finished.length, wins: wins.length, losses: finished.length - wins.length, totalPoints });
            }

            // Fetch history
            const { data: historyData } = await supabase.from('view_user_billing_history').select('*').eq('user_id', user.id).order('event_date', { ascending: false }).limit(10);
            if (historyData) setUserDetailHistory(historyData);

            // Fetch badges
            const { data: badgeData } = await supabase.from('view_user_badges').select('*').eq('user_id', user.id).maybeSingle();
            if (badgeData) setUserDetailBadges(badgeData);

            // Fetch MMR history
            const { data: mmrData } = await supabase.from('view_mmr_history').select('*').eq('user_id', user.id).order('change_date', { ascending: false }).limit(10);
            if (mmrData) setUserDetailMMRHistory(mmrData);

            // Fetch registrations for target user
            const { data: regsData } = await supabase
                .from('event_players')
                .select('event_id')
                .eq('user_id', user.id);
            if (regsData) {
                setUserDetailRegistrations(new Set(regsData.map((r: any) => r.event_id)));
            }
        } catch (err) {
            console.error('Error fetching user details:', err);
            toast.error('ไม่สามารถโหลดข้อมูลสถิติได้');
        } finally {
            setLoadingDetail(false);
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <>
            <div className="animate-in pb-10">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                                <Icon icon="solar:users-group-rounded-bold-duotone" width={22} />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">จัดการหน้าสมาชิก</h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">จัดการรายชื่อ บทบาท และระดับฝีมือของสมาชิกทั้งหมด</p>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 group hover:border-blue-100 transition-colors shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Icon icon="solar:users-group-rounded-bold-duotone" width={22} />
                            </div>
                            <div className="pr-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">ทั้งหมด</p>
                                <p className="text-xl font-black text-gray-900 leading-none">{users.length}</p>
                            </div>
                        </div>

                        <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 group hover:border-orange-100 transition-colors shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                <Icon icon="solar:shield-user-bold-duotone" width={22} />
                            </div>
                            <div className="pr-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">ผู้ดูแล</p>
                                <p className="text-xl font-black text-gray-900 leading-none">{users.filter(u => u.role === 'venue_admin').length}</p>
                            </div>
                        </div>

                        <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 group hover:border-emerald-100 transition-colors shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <Icon icon="solar:user-bold-duotone" width={22} />
                            </div>
                            <div className="pr-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">สมาชิก</p>
                                <p className="text-xl font-black text-gray-900 leading-none">{users.filter(u => u.role === 'user' && !u.is_guest).length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm flex">
                            <button
                                onClick={() => setRoleFilter('all')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${roleFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                ทั้งหมด
                            </button>
                            <button
                                onClick={() => setRoleFilter('venue_admin')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${roleFilter === 'venue_admin' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-orange-500'}`}
                            >
                                แอดมิน
                            </button>
                            <button
                                onClick={() => setRoleFilter('user')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${roleFilter === 'user' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-blue-500'}`}
                            >
                                สมาชิก
                            </button>
                        </div>
                    </div>

                    <div className="relative flex-1 max-w-md">
                        <Icon icon="solar:magnifer-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" width={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาตามชื่อ หรืออีเมล..."
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--foreground)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* User List Card */}
                <div className="card shadow-sm overflow-hidden p-0 border border-[var(--card-border)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[var(--card-elevated)] border-b border-[var(--card-border)]">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">รูป/บทบาท</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">ชื่อผู้ใช้</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Rank/MMR</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] text-center">ระดับฝีมือ</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--card-border)]">
                                {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-blue-500/5 transition-colors cursor-pointer group/row"
                                        onClick={() => fetchUserDetails(user)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[var(--card-elevated)] flex items-center justify-center text-sm font-bold text-[var(--muted)] shrink-0 border-2 border-[var(--card-border)] shadow-sm overflow-hidden">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.display_name?.charAt(0).toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${user.role === 'venue_admin' ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5 min-w-[120px]">
                                                <p className="text-sm font-bold text-[var(--foreground)]">{truncateName(user.display_name, 16)}</p>
                                                <p className="text-[10px] font-medium text-[var(--muted)] truncate max-w-[150px]">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <RankBadge mmr={user.mmr || 1000} size="sm" />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--card-elevated)] text-[var(--foreground)] border border-[var(--card-border)]">
                                                {user.skill_level || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingUser(user); }}
                                                    className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 transition-colors"
                                                    title="แก้ไข"
                                                >
                                                    <Icon icon="solar:pen-bold" width={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteUser(user); }}
                                                    className="p-2 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition-colors"
                                                    title="ลบ"
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" width={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Icon icon="solar:users-group-rounded-linear" className="text-[var(--muted)] opacity-30" width={48} />
                                                <p className="text-sm font-bold text-[var(--muted)]">ไม่พบสมาชิกตามเงื่อนไขที่ค้นหา</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Modal Overlay */}
            {editingUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setEditingUser(null)} />
                    <div className="relative w-full max-w-md bg-[var(--card-bg)] text-[var(--foreground)] rounded-3xl shadow-2xl border border-[var(--card-border)] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--card-bg)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Icon icon="solar:user-id-bold" width={22} />
                                </div>
                                <h3 className="font-black text-[var(--foreground)] tracking-tight">แก้ไขข้อมูลสมาชิก</h3>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 rounded-full hover:bg-[var(--card-elevated)] text-[var(--muted)] transition-colors">
                                <Icon icon="solar:close-circle-bold" width={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateUser} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)] ml-1">ชื่อที่แสดง (Display Name)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--foreground)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                    value={editingUser.display_name}
                                    onChange={(e) => setEditingUser({ ...editingUser, display_name: e.target.value })}
                                />
                            </div>

                            <CustomSelect
                                label="บทบาท (Role)"
                                value={editingUser.role}
                                onChangeAction={(val) => setEditingUser({ ...editingUser, role: val as any })}
                                options={ROLE_OPTIONS}
                                icon="solar:shield-check-bold"
                            />

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)] ml-1">ระดับฝีมือ</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {SKILL_LEVELS.map((lvl) => (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => setEditingUser({ ...editingUser, skill_level: lvl as any })}
                                            className={`py-2.5 rounded-xl text-[11px] font-black transition-all border-2 ${editingUser.skill_level === lvl
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                : 'bg-[var(--card-elevated)] text-[var(--muted)] border-[var(--card-border)] hover:border-blue-500 hover:text-blue-500'
                                                }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="btn btn-primary flex-1 shadow-md disabled:opacity-50"
                                >
                                    {updating ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="btn btn-secondary flex-1"
                                    disabled={updating}
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Detail Modal */}
            {selectedUserDetail && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setSelectedUserDetail(null)} />
                    <div className="relative w-full max-w-xl bg-[var(--card-bg)] text-[var(--foreground)] rounded-[32px] shadow-2xl border border-[var(--card-border)] overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header bg-gradient */}
                        <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 p-6 relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />
                            <button
                                onClick={() => setSelectedUserDetail(null)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-all z-20"
                            >
                                <Icon icon="solar:close-circle-bold" width={24} />
                            </button>

                            <div className="flex items-start gap-6 relative z-10 pt-2">
                                <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-2xl border-2 border-white/20 overflow-hidden shrink-0">
                                    {selectedUserDetail.avatar_url ? (
                                        <img src={selectedUserDetail.avatar_url} alt={selectedUserDetail.display_name} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedUserDetail.display_name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-2xl font-black text-white leading-tight mb-1">{truncateName(selectedUserDetail.display_name, 20)}</h2>
                                    <p className="text-slate-300 text-sm font-medium mb-3">{selectedUserDetail.full_name || 'ชื่อ-นามสกุลจริงไม่ระบุ'}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${selectedUserDetail.role === 'venue_admin' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-white/10 text-slate-300 border-white/10'}`}>
                                            {selectedUserDetail.role === 'venue_admin' ? 'ผู้ดูแลระบบ' : 'ผู้เล่นทั่วไป'}
                                        </span>
                                        {selectedUserDetail.skill_level && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                                                ระดับ {selectedUserDetail.skill_level}
                                            </span>
                                        )}
                                        <RankBadge mmr={selectedUserDetail.mmr || 1000} size="sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Badges row in header */}
                            <div className="flex flex-wrap gap-2 mt-5 relative z-10 pt-3 border-t border-white/10">
                                {userDetailBadges.badge_win_streak && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider">
                                        <Icon icon="solar:fire-bold" width={14} /> ชนะต่อเนื่อง
                                    </div>
                                )}
                                {userDetailBadges.badge_marathon && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
                                        <Icon icon="solar:shuttlecock-bold" width={14} /> เล่นครบ 100+
                                    </div>
                                )}
                                {userDetailBadges.badge_patron && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                                        <Icon icon="solar:wallet-money-bold" width={14} /> สายเปย์
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Scrollable Area */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                            {loadingDetail ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <div className="spinner" />
                                    <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">กำลังโหลดสถิติ...</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'เกม', value: userDetailStats.totalGames, icon: 'solar:gamepad-bold-duotone', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                            { label: 'ชนะ', value: userDetailStats.wins, icon: 'solar:cup-star-bold-duotone', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                            { label: 'แพ้', value: userDetailStats.losses, icon: 'solar:sad-circle-bold-duotone', color: 'text-rose-500', bg: 'bg-rose-500/10' },
                                            { label: 'Win Rate', value: `${userDetailStats.totalGames > 0 ? Math.round((userDetailStats.wins / userDetailStats.totalGames) * 100) : 0}%`, icon: 'solar:graph-up-bold-duotone', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                                            { label: 'แต้ม', value: userDetailStats.totalPoints, icon: 'solar:star-bold-duotone', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                                        ].map((stat, i) => (
                                            <div key={i} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--card-elevated)] border border-[var(--card-border)] shadow-sm transition-all hover:border-blue-500">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 shadow-sm ${stat.bg} ${stat.color}`}>
                                                    <Icon icon={stat.icon} width={18} />
                                                </div>
                                                <p className="text-base font-black text-[var(--foreground)] leading-none mb-1">{stat.value}</p>
                                                <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Contact Info */}
                                    <div className="bg-[var(--card-elevated)] rounded-3xl p-5 border border-[var(--card-border)] shadow-sm space-y-4">
                                        <h3 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest px-1">ข้อมูลติดต่อ</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <Icon icon="solar:letter-bold-duotone" width={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider leading-none mb-1">อีเมล</p>
                                                    <p className="text-xs font-bold text-[var(--foreground)] truncate">{selectedUserDetail.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <Icon icon="solar:phone-bold-duotone" width={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider leading-none mb-1">เบอร์โทรศัพท์</p>
                                                    <p className="text-xs font-bold text-[var(--foreground)] truncate">{selectedUserDetail.phone || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MMR History */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 px-1">
                                            <Icon icon="solar:history-bold" width={16} className="text-[var(--muted)]" />
                                            <h3 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">ประวัติอันดับ (Rating History)</h3>
                                        </div>
                                        <div className="bg-[var(--card-elevated)] rounded-3xl border border-[var(--card-border)] shadow-sm overflow-hidden divide-y divide-[var(--card-border)]">
                                            {userDetailMMRHistory.length > 0 ? userDetailMMRHistory.map((h, i) => (
                                                <div key={i} className="p-4 flex items-center justify-between hover:bg-blue-500/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${h.change > 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : h.change < 0 ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-slate-500/15 text-[var(--muted)]'}`}>
                                                            <Icon icon={h.change > 0 ? 'solar:trending-up-bold' : h.change < 0 ? 'solar:trending-down-bold' : 'solar:minus-circle-bold'} width={16} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[11px] font-black text-[var(--foreground)]">{h.change > 0 ? '+' : ''}{h.change} แต้ม</p>
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                                    h.reason?.startsWith('absence_penalty:')
                                                                        ? 'bg-rose-600 text-white'
                                                                        : h.change > 0 ? 'bg-emerald-500 text-white' : h.change < 0 ? 'bg-rose-500 text-white' : 'bg-gray-400 text-white'
                                                                }`}>
                                                                    {h.reason?.startsWith('absence_penalty:') ? 'ขาดก๊วน' : h.result}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] font-medium text-[var(--muted)]">
                                                                {h.reason?.startsWith('absence_penalty:') 
                                                                    ? formatAbsenceReason(h.reason, allClosedEvents, userDetailRegistrations) 
                                                                    : (h.event_name || 'Match') + ` • ${new Date(h.change_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-[var(--foreground)]">{h.new_mmr}</p>
                                                        <p className="text-[8px] font-bold text-[var(--muted)] uppercase tracking-widest">Rating</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-8 text-center">
                                                    <p className="text-[10px] font-bold text-[var(--muted)]">ยังไม่มีประวัติอันดับ</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Billing History */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">ประวัติการชำระเงินล่าสุด</h3>
                                        </div>
                                        <div className="bg-[var(--card-elevated)] rounded-3xl border border-[var(--card-border)] shadow-sm overflow-hidden divide-y divide-[var(--card-border)]">
                                            {userDetailHistory.length > 0 ? userDetailHistory.map((item, i) => (
                                                <div key={i} className="p-4 flex items-center justify-between hover:bg-blue-500/5 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-xs font-bold text-[var(--foreground)] truncate">{item.event_name || 'ก๊วนทั่วไป'}</p>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${item.payment_status === 'paid' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-orange-500/15 text-orange-600 dark:text-orange-400'}`}>
                                                                {item.payment_status === 'paid' ? 'จ่ายแล้ว' : 'ค้างชำระ'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] font-medium text-[var(--muted)]">
                                                            {new Date(item.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} • {item.games_played} เกม
                                                        </p>
                                                    </div>
                                                    <div className="text-right pl-4">
                                                        <p className="text-sm font-black text-[var(--foreground)]">฿{Number(item.total_amount).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-10 text-center">
                                                    <Icon icon="solar:history-linear" width={32} className="mx-auto text-[var(--muted)] opacity-30 mb-2" />
                                                    <p className="text-xs font-bold text-[var(--muted)]">ยังไม่มีข้อมูลการเล่น</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 bg-[var(--card-elevated)] border-t border-[var(--card-border)] flex items-center justify-center">
                            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em]">Badminton Group Management System</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
