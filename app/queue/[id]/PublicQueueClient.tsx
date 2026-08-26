"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { getRankFromMMR } from "@/lib/badminton/rank";
import { calculatePlayerExpense } from "@/lib/badminton/billing";
import { joinGroupSession, leaveGroupSession } from "@/app/dashboard/group-sessions/actions";

export function PublicQueueClient({
  session,
  players,
  matches,
  currentUserId,
}: {
  session: any;
  players: any[];
  matches: any[];
  currentUserId?: string | null;
}) {
  const myPlayerInSession = useMemo(() => {
    if (!currentUserId) return null;
    return players.find((p) => p.profile_id === currentUserId) || null;
  }, [players, currentUserId]);

  const [selectedPlayerId, setSelectedPlayerId] = useState(
    myPlayerInSession?.id || players[0]?.id || ""
  );
  const [activeTab, setActiveTab] = useState<"live" | "my_expenses">("live");
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const activeMatches = matches.filter((m) => m.status === "playing");

  const currentlyPlayingPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of matches) {
      if (m.status === "playing") {
        for (const p of m.group_session_match_players ?? []) {
          ids.add(p.session_player_id);
        }
      }
    }
    return ids;
  }, [matches]);

  const waitingPlayers = players.filter((p) => p.is_checked_in && !currentlyPlayingPlayerIds.has(p.id));

  async function handleJoin() {
    setIsJoining(true);
    const res = await joinGroupSession(session.id);
    if (!res.success) alert(res.error);
    setIsJoining(false);
  }

  async function handleLeave() {
    if (!confirm("คุณต้องการยกเลิกการเข้าร่วมก๊วนนี้ใช่หรือไม่?")) return;
    setIsLeaving(true);
    const res = await leaveGroupSession(session.id);
    if (!res.success) alert(res.error);
    setIsLeaving(false);
  }

  const selectedPlayerExpense = useMemo(() => {
    if (!selectedPlayerId) return null;
    const player = players.find((p) => p.id === selectedPlayerId);
    if (!player) return null;

    const matchesData = matches
      .filter((m) => m.status === "playing" || m.status === "finished")
      .map((m) => ({
        shuttlecockCount: m.shuttlecock_count,
        playerIds: (m.group_session_match_players ?? []).map((mp: any) => mp.session_player_id),
      }));

    const exp = calculatePlayerExpense({
      entryFee: session.entry_fee,
      shuttlecockPrice: session.shuttlecock_price,
      matches: matchesData,
      playerId: player.id,
      additionalCost: player.additional_cost,
      discount: player.discount,
    });

    return {
      ...player,
      ...exp,
    };
  }, [selectedPlayerId, players, matches, session]);

  return (
    <div className="space-y-6">
      {/* Session Hero Banner */}
      <div className="bg-card text-center relative overflow-hidden" style={{ padding: '40px 24px' }}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 shadow-sm" style={{ background: 'var(--bg-orange-500)' }}>
          <Icon icon="solar:play-bold-duotone" width={24} style={{ color: 'var(--bg-white)' }} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--bg-gray-900)' }}>
          {session.title}
        </h1>
        <p className="text-sm font-medium flex items-center justify-center gap-3 flex-wrap" style={{ color: 'var(--bg-gray-500)' }}>
          <span>⏰ {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
          <span className="hidden sm:inline">•</span>
          <span>🏸 {session.shuttlecock_brand} (฿{session.shuttlecock_price}/ลูก)</span>
          {session.entry_fee > 0 && (
            <>
              <span className="hidden sm:inline">•</span>
              <span>🎟️ ค่าลง ฿{session.entry_fee}</span>
            </>
          )}
        </p>

        {/* Join / Leave Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {!currentUserId ? (
            <Link href={`/login?next=/queue/${session.id}`} className="bg-btn bg-btn-primary px-6">
              <Icon icon="solar:login-2-linear" width={18} />
              เข้าสู่ระบบเพื่อร่วมก๊วน
            </Link>
          ) : myPlayerInSession ? (
            <div className="flex flex-col items-center gap-2">
              <span className="bg-badge bg-badge-success text-sm py-2 px-4 shadow-sm">
                <Icon icon="solar:check-circle-bold" width={16} />
                คุณอยู่ในก๊วนนี้แล้ว ({myPlayerInSession.player_name})
              </span>
              {myPlayerInSession.games_played === 0 && (
                <button onClick={handleLeave} disabled={isLeaving} className="text-xs font-bold underline" style={{ color: 'var(--bg-danger)' }}>
                  {isLeaving ? "กำลังยกเลิก..." : "ยกเลิกเข้าร่วม"}
                </button>
              )}
            </div>
          ) : (
            <button onClick={handleJoin} disabled={isJoining} className="bg-btn bg-btn-primary px-6 py-3">
              <Icon icon="solar:user-plus-bold-duotone" width={18} />
              {isJoining ? "กำลังลงทะเบียน..." : "กดลงทะเบียนเข้าร่วมก๊วน"}
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-card p-1.5 rounded-2xl max-w-sm mx-auto shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("live")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
            activeTab === "live" ? "bg-[var(--bg-orange-500)] text-white shadow-md" : "text-[var(--bg-gray-500)] hover:bg-[var(--bg-gray-50)]"
          }`}
        >
          <Icon icon="solar:play-circle-bold-duotone" width={18} />
          กระดานคิวสด
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("my_expenses")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
            activeTab === "my_expenses" ? "bg-[var(--bg-orange-500)] text-white shadow-md" : "text-[var(--bg-gray-500)] hover:bg-[var(--bg-gray-50)]"
          }`}
        >
          <Icon icon="solar:bill-list-bold-duotone" width={18} />
          เช็คยอดเงิน
        </button>
      </div>

      {activeTab === "live" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--bg-gray-900)' }}>
              <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              คอร์ทที่กำลังเล่น ({activeMatches.length})
            </h2>

            {activeMatches.length === 0 ? (
              <div className="bg-card text-center p-12">
                <Icon icon="solar:play-circle-bold-duotone" width={48} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--bg-gray-500)' }} />
                <p className="font-bold text-lg mb-1" style={{ color: 'var(--bg-gray-900)' }}>ยังไม่มีแมตช์ที่กำลังแข่ง</p>
                <p className="text-sm font-medium" style={{ color: 'var(--bg-gray-500)' }}>กรุณารอเจ้าของสนามจัดคิวลงสนาม</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeMatches.map((m) => {
                  const teamA = (m.group_session_match_players ?? []).filter((mp: any) => mp.team === "A");
                  const teamB = (m.group_session_match_players ?? []).filter((mp: any) => mp.team === "B");

                  return (
                    <div key={m.id} className="bg-card p-5 border border-[var(--bg-orange-200)] relative overflow-hidden">
                      <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: 'var(--bg-gray-100)' }}>
                        <span className="bg-badge bg-badge-orange font-bold text-sm">
                          {m.court_name}
                        </span>
                        <span className="text-xs font-bold" style={{ color: 'var(--bg-gray-500)' }}>
                          🏸 ใช้ไป {m.shuttlecock_count} ลูก
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="rounded-xl p-3 border" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
                          <span className="text-[10px] font-bold uppercase" style={{ color: '#2563eb' }}>ทีม A</span>
                          <div className="mt-2 space-y-1">
                            {teamA.map((p: any) => (
                              <p key={p.session_player_id} className="font-bold text-sm truncate" style={{ color: 'var(--bg-gray-900)' }}>
                                {p.group_session_players?.player_name}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl p-3 border" style={{ background: 'rgba(225, 29, 72, 0.05)', borderColor: 'rgba(225, 29, 72, 0.15)' }}>
                          <span className="text-[10px] font-bold uppercase" style={{ color: '#e11d48' }}>ทีม B</span>
                          <div className="mt-2 space-y-1">
                            {teamB.map((p: any) => (
                              <p key={p.session_player_id} className="font-bold text-sm truncate" style={{ color: 'var(--bg-gray-900)' }}>
                                {p.group_session_players?.player_name}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--bg-gray-900)' }}>
              คิวผู้เล่นที่รอลงสนาม ({waitingPlayers.length} คน)
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {waitingPlayers.map((p) => {
                const rank = getRankFromMMR(p.mmr);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-xl p-3 bg-[var(--bg-gray-50)] border" style={{ borderColor: 'var(--bg-gray-200)' }}>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--bg-gray-900)' }}>{p.player_name}</p>
                      <p className="text-[11px] font-medium" style={{ color: 'var(--bg-gray-500)' }}>เล่นไป {p.games_played} เกม</p>
                    </div>
                    <span className="bg-white border rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ borderColor: 'var(--bg-gray-200)' }}>
                      {rank.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "my_expenses" && (
        <div className="bg-card max-w-lg mx-auto space-y-6">
          <div>
            <label className="bg-form-label">เลือกชื่อของคุณเพื่อดูยอดค่าใช้จ่าย</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="bg-form-select text-base py-3"
            >
              <option value="" disabled>-- เลือกชื่อของคุณ --</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.player_name} ({p.skill_level})
                </option>
              ))}
            </select>
          </div>

          {selectedPlayerExpense && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--bg-gray-50)', borderColor: 'var(--bg-gray-200)' }}>
                <div className="flex justify-between items-center text-sm font-medium" style={{ color: 'var(--bg-gray-600)' }}>
                  <span>เกมที่ลงเล่น:</span>
                  <span className="font-bold text-base" style={{ color: 'var(--bg-gray-900)' }}>{selectedPlayerExpense.gamesPlayed} เกม</span>
                </div>
                {selectedPlayerExpense.entryFee > 0 && (
                  <div className="flex justify-between items-center text-sm font-medium" style={{ color: 'var(--bg-gray-600)' }}>
                    <span>ค่าลงสนาม:</span>
                    <span className="font-bold" style={{ color: 'var(--bg-gray-900)' }}>฿{selectedPlayerExpense.entryFee}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-medium" style={{ color: 'var(--bg-gray-600)' }}>
                  <span>ค่าลูกแบดตามจริง:</span>
                  <span className="font-bold" style={{ color: 'var(--bg-orange-600)' }}>฿{selectedPlayerExpense.shuttleFee}</span>
                </div>
                <div className="border-t pt-3 mt-3 flex justify-between items-baseline" style={{ borderColor: 'var(--bg-gray-200)' }}>
                  <span className="font-bold text-sm" style={{ color: 'var(--bg-gray-900)' }}>ยอดรวมที่ต้องชำระ:</span>
                  <span className="text-3xl font-extrabold" style={{ color: 'var(--bg-orange-600)' }}>
                    ฿{selectedPlayerExpense.totalDue}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border bg-white" style={{ borderColor: 'var(--bg-gray-200)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--bg-gray-900)' }}>สถานะการชำระเงิน:</span>
                <span className={`bg-badge text-sm py-1.5 px-3 ${selectedPlayerExpense.payment_status === "paid" ? "bg-badge-success" : "bg-badge-warning"}`}>
                  {selectedPlayerExpense.payment_status === "paid" ? "ชำระเงินเรียบร้อยแล้ว" : "รอชำระเงิน"}
                </span>
              </div>
              
              {selectedPlayerExpense.payment_status !== "paid" && (
                <p className="text-center text-xs font-medium px-4" style={{ color: 'var(--bg-gray-500)' }}>
                  สามารถสแกนจ่ายผ่าน QR Code หรือชำระเงินสดกับผู้จัดก๊วนที่หน้าเคาน์เตอร์
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
