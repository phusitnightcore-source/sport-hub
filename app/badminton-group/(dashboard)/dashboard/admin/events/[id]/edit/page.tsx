'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/badminton/supabase/client';
import type { Event } from '@/types/badminton';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Icon } from '@iconify/react';

const sortCourts = (courts: string[]) => {
    return [...courts].sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
};

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [eventId, setEventId] = useState('');
    const [form, setForm] = useState({
        event_date: '',
        shuttlecock_brand: '', shuttlecock_price: '', entry_fee: '',
        start_time: '19:00', end_time: '23:00',
    });
    const [availableCourts, setAvailableCourts] = useState<string[]>(['1', '2', '3', '4']);
    const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
    const [newCourtInput, setNewCourtInput] = useState('');

    useEffect(() => {
        params.then((p) => { setEventId(p.id); loadData(p.id); });
    }, [params]);

    const loadData = async (id: string) => {
        const supabase = createClient();
        const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
        if (error || !data) {
            toast.error('ไม่พบข้อมูลก๊วน');
            router.push('/badminton-group/dashboard/admin/events');
            return;
        }

        const ev = data as Event;
        if (ev.status !== 'open') {
            toast.error('ก๊วนนี้ปิดรับสมัครแล้ว ไม่สามารถแก้ไขได้');
            router.push(`/badminton-group/dashboard/admin/events/${id}`);
            return;
        }

        setForm({
            event_date: ev.event_date,
            shuttlecock_brand: ev.shuttlecock_brand,
            shuttlecock_price: ev.shuttlecock_price.toString(),
            entry_fee: ev.entry_fee.toString(),
            start_time: ev.start_time || '19:00',
            end_time: ev.end_time || '23:00',
        });
        const currentCourts = ev.courts || [];
        const mergedCourts = Array.from(new Set(['1', '2', '3', '4', ...currentCourts]));
        setAvailableCourts(sortCourts(mergedCourts));
        setSelectedCourts(sortCourts(currentCourts));
        setLoading(false);
    };

    const updateField = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

    const toggleCourt = (court: string) => {
        setSelectedCourts(prev => {
            const next = prev.includes(court) ? prev.filter(c => c !== court) : [...prev, court];
            return sortCourts(next);
        });
    };

    const handleAddCourt = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const court = newCourtInput.trim();
        if (!court) {
            toast.error('กรุณาระบุเลขหรือชื่อคอร์ท');
            return;
        }
        if (selectedCourts.includes(court)) {
            toast.error(`คอร์ท ${court} ถูกเลือกอยู่แล้ว`);
            return;
        }
        if (!availableCourts.includes(court)) {
            setAvailableCourts(prev => sortCourts([...prev, court]));
        }
        setSelectedCourts(prev => sortCourts([...prev, court]));
        setNewCourtInput('');
        toast.success(`เพิ่มคอร์ท ${court} เรียบร้อย`);
    };

    const removeCourt = (court: string) => {
        setSelectedCourts(prev => prev.filter(c => c !== court));
        if (!['1', '2', '3', '4'].includes(court)) {
            setAvailableCourts(prev => prev.filter(c => c !== court));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.shuttlecock_brand || !form.shuttlecock_price || !form.entry_fee) {
            toast.error('กรุณากรอกข้อมูลให้ครบถ้วน'); return;
        }
        if (selectedCourts.length === 0) {
            toast.error('กรุณาเลือกคอร์ทอย่างน้อย 1 คอร์ท'); return;
        }
        setSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.from('events').update({
                event_date: form.event_date, shuttlecock_brand: form.shuttlecock_brand,
                shuttlecock_price: parseFloat(form.shuttlecock_price), entry_fee: parseFloat(form.entry_fee),
                courts: selectedCourts, start_time: form.start_time, end_time: form.end_time,
            }).eq('id', eventId);

            if (error) { toast.error(error.message); return; }
            toast.success('บันทึกการแก้ไขสำเร็จ!');
            router.push(`/badminton-group/dashboard/admin/events/${eventId}`);
        } catch { toast.error('เกิดข้อผิดพลาด'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex items-center justify-center py-20"><div className="spinner" style={{ width: 28, height: 28 }} /></div>;

    return (
        <div className="animate-in max-w-xl mx-auto">
            <div className="mb-6">
                <Link href={`/badminton-group/dashboard/admin/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-gray-900" style={{ color: 'var(--gray-500)' }}>
                    <Icon icon="solar:arrow-left-linear" width={18} /> กลับไประบุรายละเอียก๊กวน
                </Link>
            </div>

            <div className="card shadow-md" style={{ padding: '40px 32px' }}>
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-sm" style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <Icon icon="solar:pen-linear" width={28} style={{ color: '#3b82f6' }} />
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--gray-900)' }}>แก้ไขก๊วน</h1>
                    <p className="text-sm mt-2 font-medium" style={{ color: 'var(--gray-500)' }}>อัปเดตข้อมูลรายละเอียดของก๊วน</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">วันที่</label>
                        <input type="date" className="form-input form-input-plain" value={form.event_date} onChange={(e) => updateField('event_date', e.target.value)} required />
                    </div>

                    {/* เวลาเริ่ม — สิ้นสุด */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">เวลาเริ่ม</label>
                            <input type="time" className="form-input form-input-plain" value={form.start_time} onChange={(e) => updateField('start_time', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">เวลาสิ้นสุด</label>
                            <input type="time" className="form-input form-input-plain" value={form.end_time} onChange={(e) => updateField('end_time', e.target.value)} />
                        </div>
                    </div>

                    {/* คอร์ท */}
                    <div className="form-group">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="form-label mb-0">เลือกสนาม / คอร์ทที่ใช้งาน *</label>
                            {selectedCourts.length > 0 && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                                    เลือกแล้ว {selectedCourts.length} คอร์ท
                                </span>
                            )}
                        </div>

                        {/* Court Badges / Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                            {availableCourts.map(court => {
                                const isSelected = selectedCourts.includes(court);
                                const isCustom = !['1', '2', '3', '4'].includes(court);
                                return (
                                    <div
                                        key={court}
                                        className="relative inline-flex items-center group"
                                    >
                                        <button
                                            key={court}
                                            type="button"
                                            onClick={() => toggleCourt(court)}
                                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                                            style={{
                                                background: isSelected ? '#3b82f6' : 'var(--card-elevated)',
                                                color: isSelected ? '#ffffff' : 'var(--foreground)',
                                                border: `1.5px solid ${isSelected ? '#3b82f6' : 'var(--card-border)'}`,
                                                boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.25)' : 'none',
                                            }}
                                        >
                                            {isSelected ? (
                                                <Icon icon="solar:check-circle-bold" width={16} />
                                            ) : (
                                                <span className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-blue-400 transition-colors" />
                                            )}
                                            คอร์ท {court}
                                        </button>
                                        {isCustom && (
                                            <button
                                                type="button"
                                                title={`ลบคอร์ท ${court}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeCourt(court);
                                                }}
                                                className="ml-1 text-gray-400 hover:text-red-500 p-1 transition-colors"
                                            >
                                                <Icon icon="solar:close-circle-bold" width={16} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input + Button for adding any court number */}
                        <div className="mt-3 flex items-center gap-2">
                            <div className="relative flex-1 sm:max-w-[200px]">
                                <input
                                    type="text"
                                    className="form-input form-input-plain !py-2 text-sm pl-8"
                                    placeholder="ระบุเลขคอร์ท เช่น 5, 6"
                                    value={newCourtInput}
                                    onChange={(e) => setNewCourtInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCourt();
                                        }
                                    }}
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                                    #
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleAddCourt()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 bg-blue-500 hover:bg-blue-600"
                            >
                                <Icon icon="solar:add-circle-bold" width={18} />
                                <span>เพิ่มคอร์ท</span>
                            </button>
                        </div>

                        {selectedCourts.length > 0 ? (
                            <p className="text-xs mt-2" style={{ color: 'var(--gray-500)' }}>
                                คอร์ทที่เปิด: <strong className="text-blue-600">{selectedCourts.join(', ')}</strong>
                            </p>
                        ) : (
                            <p className="text-xs mt-2 text-red-500 font-medium">
                                * กรุณากดเลือกหรือเพิ่มคอร์ทอย่างน้อย 1 คอร์ท
                            </p>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">ยี่ห้อลูกแบด *</label>
                        <input className="form-input form-input-plain" placeholder="เช่น Yonex, RSL, Victor" value={form.shuttlecock_brand} onChange={(e) => updateField('shuttlecock_brand', e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">ราคาลูก (บาท) *</label>
                            <input type="number" className="form-input form-input-plain" placeholder="0" min="0" step="0.01" value={form.shuttlecock_price} onChange={(e) => updateField('shuttlecock_price', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ค่าลงสนาม (บาท) *</label>
                            <input type="number" className="form-input form-input-plain" placeholder="0" min="0" step="0.01" value={form.entry_fee} onChange={(e) => updateField('entry_fee', e.target.value)} required />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-full mt-4" style={{ padding: '14px', fontSize: '15px' }} disabled={saving}>
                        {saving ? <><div className="spinner" /> กำลังบันทึก...</> : 'บันทึกการแก้ไข'}
                    </button>
                </form>
            </div>
        </div>
    );
}
