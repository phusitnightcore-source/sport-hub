"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import {
  addPlayerToSession,
  createSessionMatch,
  updateMatchShuttlecock,
  finishSessionMatch,
  updatePlayerPayment,
  searchSystemProfiles,
  addExistingProfileToSession,
  togglePlayerCheckin,
  removePlayerFromSession,
} from "@/app/dashboard/group-sessions/actions";
import { autoGenerateMatch, type AvailablePlayer } from "@/lib/badminton/matchmaker";
import { calculatePlayerExpense } from "@/lib/badminton/billing";
import { getRankFromMMR, SKILL_LEVEL_MAP } from "@/lib/badminton/rank";
import type { SessionData, SessionPlayer, SessionMatch } from "@/app/dashboard/group-sessions/[id]/GroupSessionControlClient";

export function QueueMasterStationClient({
  session,
  players,
  matches,
  tenantName,
}: {
  session: SessionData;
  players: SessionPlayer[];
  matches: SessionMatch[];
  tenantName?: string;
}) {
  const [sidebarTab, setSidebarTab] = useState<"queue" | "matchmaker" | "players" | "billing">("queue");
  const [currentTime, setCurrentTime] = useState("");
  const [searchPlayer, setSearchPlayer] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Matchmaker form state
  const [selectedCourt, setSelectedCourt] = useState(session.court_names[0] || "คอร์ท 1");
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);

  // New Player quick add
  const [playerName, setPlayerName] = useState("");
  const [playerSkill, setPlayerSkill] = useState("N");
  const [playerPhone, setPlayerPhone] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Score Modal
  const [scoringMatch, setScoringMatch] = useState<SessionMatch | null>(null);
  const [scoreA, setScoreA] = useState(21);
  const [scoreB, setScoreB] = useState(19);

  // QR Modal
  const [showQRModal, setShowQRModal] = useState(false);

  // Member Search State
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  const [addMode, setAddMode] = useState<"guest" | "member">("guest");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleSearchMember(q: string) {
    setMemberSearchQuery(q);
    if (q.trim().length >= 2) {
      setIsSearchingMember(true);
      const res = await searchSystemProfiles(q);
      setMemberSearchResults(res);
      setIsSearchingMember(false);
    } else {
      setMemberSearchResults([]);
    }
  }

  async function handleAddExistingMember(profileId: string) {
    const res = await addExistingProfileToSession(session.id, profileId, "N");
    if (!res.success) alert(res.error);
    setMemberSearchQuery("");
    setMemberSearchResults([]);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

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

  const availablePlayersList: AvailablePlayer[] = useMemo(() => {
    return players
      .filter((p) => p.is_checked_in)
      .map((p) => ({
        id: p.id,
        name: p.player_name,
        mmr: p.mmr,
        skillLevel: p.skill_level,
        gamesPlayed: p.games_played,
        isPlaying: currentlyPlayingPlayerIds.has(p.id),
      }));
  }, [players, currentlyPlayingPlayerIds]);

  const waitingPlayers = useMemo(() => {
    return availablePlayersList
      .filter((p) => !p.isPlaying)
      .filter((p) => p.name.toLowerCase().includes(searchPlayer.toLowerCase()));
  }, [availablePlayersList, searchPlayer]);

  const billingSummaries = useMemo(() => {
    const matchesData = matches
      .filter((m) => m.status === "playing" || m.status === "finished")
      .map((m) => ({
        shuttlecockCount: m.shuttlecock_count,
        playerIds: (m.group_session_match_players ?? []).map((mp) => mp.session_player_id),
      }));

    return players.map((p) => {
      const exp = calculatePlayerExpense({
        entryFee: session.entry_fee,
        shuttlecockPrice: session.shuttlecock_price,
        matches: matchesData,
        playerId: p.id,
        additionalCost: p.additional_cost,
        discount: p.discount,
      });

      return {
        ...p,
        ...exp,
      };
    });
  }, [session, players, matches]);

  const activeMatches = matches.filter((m) => m.status === "playing");
  const totalShuttlesUsed = useMemo(() => matches.reduce((acc, m) => acc + (m.shuttlecock_count || 1), 0), [matches]);
  const totalRevenueCollected = useMemo(() => billingSummaries.filter((b) => b.payment_status === "paid").reduce((acc, b) => acc + b.totalDue, 0), [billingSummaries]);

  function handleMagicMatch() {
    const generated = autoGenerateMatch(availablePlayersList);
    if (!generated) {
      alert("ผู้เล่นที่รอลงสนามมีไม่ถึง 4 คน");
      return;
    }
    setTeamAPlayers(generated.teamA.map((p) => p.id));
    setTeamBPlayers(generated.teamB.map((p) => p.id));
    setSidebarTab("matchmaker");
  }

  async function handleStartMatch() {
    if (teamAPlayers.length !== 2 || teamBPlayers.length !== 2) {
      alert("กรุณาเลือกผู้เล่นทีมละ 2 คน (ประเภทคู่)");
      return;
    }
    setIsSubmittingMatch(true);
    await createSessionMatch(session.id, selectedCourt, teamAPlayers, teamBPlayers);
    setTeamAPlayers([]);
    setTeamBPlayers([]);
    setIsSubmittingMatch(false);
  }

  async function handleQuickAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim()) return;
    setIsAddingPlayer(true);
    await addPlayerToSession(session.id, playerName, playerPhone, playerSkill);
    setPlayerName("");
    setPlayerPhone("");
    setIsAddingPlayer(false);
  }

  async function handleFinishMatch() {
    if (!scoringMatch) return;
    await finishSessionMatch(scoringMatch.id, scoreA, scoreB);
    setScoringMatch(null);
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden text-sm" style={{ background: 'var(--bg-gray-50)', color: 'var(--bg-gray-900)' }}>
      {/* HEADER */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-5 z-20 bg-white" style={{ borderColor: 'var(--bg-gray-200)' }}>
        <div className="flex items-center gap-3">
          <Link href="/badminton-group/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl border hover:border-[var(--bg-orange-500)] hover:text-[var(--bg-orange-500)] transition-all" style={{ borderColor: 'var(--bg-gray-200)', color: 'var(--bg-gray-500)' }}>
            <Icon icon="solar:arrow-left-linear" width={18} />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold shadow-sm" style={{ background: 'var(--bg-orange-500)' }}>
              🏸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base truncate max-w-[280px]">
                  {session.title}
                </h1>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'rgba(249, 115, 22, 0.1)', color: 'var(--bg-orange-600)' }}>
                  MASTER TERMINAL
                </span>
              </div>
              <p className="text-xs flex items-center gap-2 mt-0.5" style={{ color: 'var(--bg-gray-500)' }}>
                <span>{session.shuttlecock_brand} (฿{session.shuttlecock_price}/ลูก)</span>
                <span>•</span>
                <span>คอร์ท: {session.court_names.join(", ")}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 rounded-xl border px-4 py-1.5 shadow-sm" style={{ borderColor: 'var(--bg-gray-200)', background: 'var(--bg-gray-50)' }}>
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold" style={{ color: 'var(--bg-gray-500)' }}>แข่งอยู่:</span>
            <span className="font-bold">{activeMatches.length} คอร์ท</span>
          </div>
          <span style={{ color: 'var(--bg-gray-300)' }}>|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--bg-gray-500)' }}>รอคิว:</span>
            <span className="font-bold text-[var(--bg-orange-600)]">{waitingPlayers.length} คน</span>
          </div>
          <span style={{ color: 'var(--bg-gray-300)' }}>|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--bg-gray-500)' }}>ใช้ลูก:</span>
            <span className="font-bold">{totalShuttlesUsed} ลูก</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col text-right mr-2">
            <span className="font-bold text-[15px]">{currentTime}</span>
            <span className="text-[10px]" style={{ color: 'var(--bg-gray-500)' }}>{session.session_date}</span>
          </div>
          <button onClick={handleMagicMatch} className="bg-btn bg-btn-primary flex items-center gap-1.5 h-9 px-3">
            <Icon icon="solar:magic-stick-3-bold-duotone" width={16} />
            <span className="hidden sm:inline">Magic Match</span>
          </button>
          <button onClick={toggleFullscreen} className="flex h-9 w-9 items-center justify-center rounded-xl border hover:bg-[var(--bg-gray-50)] transition-colors" style={{ borderColor: 'var(--bg-gray-200)', color: 'var(--bg-gray-600)' }}>
            {isFullscreen ? <Icon icon="solar:minimize-square-linear" width={18} /> : <Icon icon="solar:maximize-square-linear" width={18} />}
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: COURTS ARENA */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-6 no-scrollbar space-y-6 relative">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <span>สนามแข่งขัน ({activeMatches.length}/{session.court_names.length})</span>
              </h2>
            </div>
            {activeMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-16 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--bg-gray-200)', background: 'var(--bg-white)' }}>
                <Icon icon="solar:play-circle-bold-duotone" width={48} className="opacity-20 mb-2" style={{ color: 'var(--bg-gray-500)' }} />
                <h3 className="font-bold text-lg">ยังไม่มีการแข่งขัน</h3>
                <p className="text-sm max-w-sm mb-3" style={{ color: 'var(--bg-gray-500)' }}>
                  กดปุ่ม "Magic Match" หรือเลือกแท็บจัดคู่ เพื่อนำผู้เล่นลงคอร์ท
                </p>
                <button onClick={handleMagicMatch} className="bg-btn bg-btn-primary px-6">
                  <Icon icon="solar:magic-stick-3-bold-duotone" width={18} />
                  จัดคิวอัตโนมัติ 4 คน
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {activeMatches.map((m) => {
                  const teamA = m.group_session_match_players.filter((mp) => mp.team === "A");
                  const teamB = m.group_session_match_players.filter((mp) => mp.team === "B");

                  return (
                    <div key={m.id} className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 bg-white p-5 shadow-sm transition-all" style={{ borderColor: 'rgba(249, 115, 22, 0.3)' }}>
                      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--bg-gray-100)' }}>
                        <div className="flex items-center gap-2">
                          <span className="rounded-xl font-bold px-2.5 py-0.5 text-xs text-white" style={{ background: 'var(--bg-orange-500)' }}>
                            {m.court_name}
                          </span>
                          <span className="text-xs font-bold" style={{ color: 'var(--bg-gray-500)' }}>
                            #{m.match_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg border px-2 py-0.5" style={{ borderColor: 'var(--bg-gray-200)' }}>
                          <span className="text-[10px] font-bold" style={{ color: 'var(--bg-gray-500)' }}>ลูก:</span>
                          <button onClick={() => updateMatchShuttlecock(m.id, -1)} className="flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--bg-gray-100)]">
                            <Icon icon="solar:minus-linear" width={12} />
                          </button>
                          <span className="font-bold text-sm" style={{ color: 'var(--bg-orange-600)' }}>{m.shuttlecock_count}</span>
                          <button onClick={() => updateMatchShuttlecock(m.id, 1)} className="flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--bg-gray-100)]">
                            <Icon icon="solar:add-linear" width={12} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 py-4 text-center">
                        <div className="flex flex-col justify-between rounded-2xl p-3 border" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: '#2563eb' }}>ทีม A (น้ำเงิน)</span>
                          <div className="my-2 space-y-1">
                            {teamA.map((p) => (
                              <div key={p.session_player_id} className="font-bold text-sm truncate">
                                {p.group_session_players?.player_name}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col justify-between rounded-2xl p-3 border" style={{ background: 'rgba(225, 29, 72, 0.05)', borderColor: 'rgba(225, 29, 72, 0.15)' }}>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: '#e11d48' }}>ทีม B (แดง)</span>
                          <div className="my-2 space-y-1">
                            {teamB.map((p) => (
                              <div key={p.session_player_id} className="font-bold text-sm truncate">
                                {p.group_session_players?.player_name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { setScoringMatch(m); setScoreA(21); setScoreB(19); }} className="bg-btn bg-btn-secondary w-full border-[var(--bg-gray-200)] mt-auto py-2.5">
                        <Icon icon="solar:cup-star-bold-duotone" width={16} /> บันทึกผล & จบแมตช์
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {session.court_names.length > activeMatches.length && (
            <div className="rounded-3xl border bg-white p-5" style={{ borderColor: 'var(--bg-gray-200)' }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--bg-gray-500)' }}>
                คอร์ทที่ว่างพร้อมลง ({session.court_names.length - activeMatches.length})
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {session.court_names.filter((cn) => !activeMatches.some((m) => m.court_name === cn)).map((courtName) => (
                  <button key={courtName} onClick={() => { setSelectedCourt(courtName); setSidebarTab("matchmaker"); }} className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-2 text-sm font-bold transition-all hover:bg-[var(--bg-orange-50)] hover:border-[var(--bg-orange-300)]" style={{ borderColor: 'var(--bg-gray-300)' }}>
                    <span>🟢 {courtName} (ว่าง)</span>
                    <span className="text-[11px]" style={{ color: 'var(--bg-orange-600)' }}>+ จัดคู่</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT: SMART CONTROL DRAWER */}
        <aside className="w-[360px] lg:w-[400px] shrink-0 border-l bg-white flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)]" style={{ borderColor: 'var(--bg-gray-200)' }}>
          <div className="flex border-b p-1.5" style={{ borderColor: 'var(--bg-gray-100)' }}>
            {[
              { id: "queue", icon: "solar:users-group-rounded-bold-duotone", label: `คิวรอ (${waitingPlayers.length})` },
              { id: "matchmaker", icon: "solar:magic-stick-3-bold-duotone", label: "จัดคู่" },
              { id: "players", icon: "solar:user-plus-bold-duotone", label: `ผู้เล่น (${players.length})` },
              { id: "billing", icon: "solar:bill-list-bold-duotone", label: "คิดเงิน" }
            ].map(tab => (
              <button key={tab.id} onClick={() => setSidebarTab(tab.id as any)} className={`flex-1 flex flex-col items-center py-2.5 text-[11px] font-bold rounded-xl transition-all ${
                sidebarTab === tab.id ? "bg-[var(--bg-orange-500)] text-white shadow-sm" : "text-[var(--bg-gray-500)] hover:text-[var(--bg-gray-900)] hover:bg-[var(--bg-gray-50)]"
              }`}>
                <Icon icon={tab.icon} width={18} className="mb-1" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {sidebarTab === "queue" && (
            <div className="flex flex-1 flex-col overflow-hidden p-4">
              <div className="relative mb-3">
                <Icon icon="solar:magnifer-linear" className="absolute left-3 top-2.5 text-[var(--bg-gray-400)]" width={16} />
                <input type="text" placeholder="ค้นหาชื่อผู้เล่น..." value={searchPlayer} onChange={(e) => setSearchPlayer(e.target.value)} className="bg-form-input pl-9 text-sm py-2" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pr-1">
                {waitingPlayers.length === 0 ? (
                  <p className="text-center text-sm py-10" style={{ color: 'var(--bg-gray-400)' }}>ไม่มีผู้เล่นรอคิว</p>
                ) : (
                  waitingPlayers.map((p) => {
                    const rank = getRankFromMMR(p.mmr);
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border p-3 transition-all hover:border-[var(--bg-orange-200)] shadow-sm bg-white" style={{ borderColor: 'var(--bg-gray-100)' }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="font-bold text-sm truncate">{p.name}</p>
                            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: 'var(--bg-gray-100)', color: 'var(--bg-gray-700)' }}>{p.skillLevel}</span>
                          </div>
                          <p className="text-[11px]" style={{ color: 'var(--bg-gray-500)' }}>เล่นไปแล้ว <span className="font-bold text-[var(--bg-gray-900)]">{p.gamesPlayed}</span> เกม</p>
                        </div>
                        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold border" style={{ borderColor: 'var(--bg-gray-200)' }}>
                          {rank.name}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <button onClick={handleMagicMatch} className="bg-btn bg-btn-primary w-full py-3.5 mt-3 text-[15px]">
                <Icon icon="solar:magic-stick-3-bold-duotone" width={18} /> จับคู่ 4 คนลงสนาม
              </button>
            </div>
          )}

          {sidebarTab === "matchmaker" && (
            <div className="flex flex-1 flex-col overflow-y-auto p-4 space-y-4 no-scrollbar">
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--bg-gray-700)' }}>เลือกลงคอร์ท:</label>
                <select value={selectedCourt} onChange={(e) => setSelectedCourt(e.target.value)} className="bg-form-select">
                  {session.court_names.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="rounded-2xl border p-3.5 space-y-2" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
                <div className="flex justify-between items-center" style={{ color: '#1e40af' }}>
                  <span className="text-[11px] font-extrabold uppercase tracking-wide">ทีม A (เลือก 2 คน)</span>
                  <span className="font-mono text-xs font-bold">{teamAPlayers.length}/2</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                  {players.filter((p) => p.is_checked_in && !teamBPlayers.includes(p.id)).map((p) => {
                    const isSelected = teamAPlayers.includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => {
                        if (isSelected) setTeamAPlayers(teamAPlayers.filter((id) => id !== p.id));
                        else if (teamAPlayers.length < 2) setTeamAPlayers([...teamAPlayers, p.id]);
                      }} className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                        isSelected ? "bg-blue-600 text-white shadow-sm" : "bg-white border hover:bg-blue-50"
                      }`} style={isSelected ? {} : { borderColor: 'var(--bg-gray-200)' }}>
                        <span className="truncate">{p.player_name}</span>
                        <span className="text-[10px] opacity-70 font-medium">{p.skill_level} ({p.games_played}G)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border p-3.5 space-y-2" style={{ background: 'rgba(225, 29, 72, 0.05)', borderColor: 'rgba(225, 29, 72, 0.15)' }}>
                <div className="flex justify-between items-center" style={{ color: '#9f1239' }}>
                  <span className="text-[11px] font-extrabold uppercase tracking-wide">ทีม B (เลือก 2 คน)</span>
                  <span className="font-mono text-xs font-bold">{teamBPlayers.length}/2</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                  {players.filter((p) => p.is_checked_in && !teamAPlayers.includes(p.id)).map((p) => {
                    const isSelected = teamBPlayers.includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => {
                        if (isSelected) setTeamBPlayers(teamBPlayers.filter((id) => id !== p.id));
                        else if (teamBPlayers.length < 2) setTeamBPlayers([...teamBPlayers, p.id]);
                      }} className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                        isSelected ? "bg-rose-600 text-white shadow-sm" : "bg-white border hover:bg-rose-50"
                      }`} style={isSelected ? {} : { borderColor: 'var(--bg-gray-200)' }}>
                        <span className="truncate">{p.player_name}</span>
                        <span className="text-[10px] opacity-70 font-medium">{p.skill_level} ({p.games_played}G)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={handleStartMatch} disabled={isSubmittingMatch || teamAPlayers.length !== 2 || teamBPlayers.length !== 2} className="bg-btn bg-btn-primary w-full mt-2 h-12 text-[15px]">
                <Icon icon="solar:play-circle-bold" width={18} /> เริ่มการแข่งขันลง {selectedCourt}
              </button>
            </div>
          )}

          {sidebarTab === "players" && (
            <div className="flex flex-1 flex-col overflow-hidden p-4 space-y-4">
              <div className="rounded-2xl border bg-[var(--bg-gray-50)] p-4 shadow-sm" style={{ borderColor: 'var(--bg-gray-200)' }}>
                {addMode === "member" ? (
                  <div className="space-y-3">
                     <div className="flex justify-between items-center">
                       <h4 className="font-bold text-sm">ค้นหาสมาชิก</h4>
                       <button onClick={() => setAddMode("guest")} className="text-xs text-blue-600 underline">กลับ</button>
                     </div>
                     <div className="relative">
                        <Icon icon="solar:magnifer-linear" className="absolute left-2.5 top-2 text-gray-400" width={16} />
                        <input
                          type="text"
                          placeholder="ชื่อ, อีเมล, เบอร์..."
                          value={memberSearchQuery}
                          onChange={(e) => handleSearchMember(e.target.value)}
                          className="bg-form-input pl-8 py-1.5 text-sm"
                        />
                     </div>
                     {isSearchingMember && <div className="text-xs text-gray-500">กำลังค้นหา...</div>}
                     {memberSearchResults.length > 0 && (
                       <div className="flex flex-col gap-2 mt-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                         {memberSearchResults.map((m) => (
                           <div key={m.id} className="flex flex-col p-2 border rounded-xl bg-white" style={{ borderColor: 'var(--bg-gray-200)' }}>
                             <div className="font-bold text-sm">{m.full_name || m.email}</div>
                             <div className="text-[10px] text-gray-500 mb-1">{m.phone || '-'}</div>
                             <button onClick={() => handleAddExistingMember(m.id)} className="bg-btn bg-btn-secondary py-1 text-xs">
                               เพิ่มเข้าก๊วน
                             </button>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                ) : (
                  <form onSubmit={handleQuickAddPlayer} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm">เพิ่มแขกวอล์กอิน</h4>
                      <button type="button" onClick={() => setAddMode("member")} className="text-xs text-blue-600 underline">ค้นหาสมาชิก</button>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" required placeholder="ชื่อผู้เล่น..." value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="bg-form-input flex-1 py-1.5" />
                      <select value={playerSkill} onChange={(e) => setPlayerSkill(e.target.value)} className="bg-form-select w-20 py-1.5 px-2">
                        {Object.keys(SKILL_LEVEL_MAP).map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <button type="submit" disabled={isAddingPlayer} className="bg-btn bg-btn-primary w-full py-2">
                      <Icon icon="solar:user-plus-bold" width={16} /> เพิ่มเข้าก๊วน
                    </button>
                  </form>
                )}
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border p-2.5 bg-white" style={{ borderColor: 'var(--bg-gray-100)' }}>
                    <div>
                      <p className="font-bold text-sm">{p.player_name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--bg-gray-500)' }}>ระดับ {p.skill_level} • เล่น {p.games_played} เกม</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePlayerCheckin(p.id, session.id, !p.is_checked_in)} className={`bg-badge cursor-pointer border-none ${p.is_checked_in ? 'bg-badge-success' : 'bg-badge-muted'}`}>
                        {p.is_checked_in ? 'เช็คอินแล้ว' : 'ไม่เช็คอิน'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sidebarTab === "billing" && (
            <div className="flex flex-1 flex-col overflow-hidden p-0">
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--bg-gray-50)] border-b text-xs sticky top-0" style={{ borderColor: 'var(--bg-gray-200)', color: 'var(--bg-gray-500)' }}>
                    <tr>
                      <th className="px-4 py-2 font-bold">ผู้เล่น</th>
                      <th className="px-3 py-2 font-bold text-right">ยอด(฿)</th>
                      <th className="px-4 py-2 font-bold text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingSummaries.map((b) => (
                      <tr key={b.id} className="border-b bg-white" style={{ borderColor: 'var(--bg-gray-100)' }}>
                        <td className="px-4 py-3 font-bold">{b.player_name}</td>
                        <td className="px-3 py-3 text-right font-bold text-[var(--bg-orange-600)]">{b.totalDue}</td>
                        <td className="px-4 py-3 text-center">
                          {b.payment_status === "paid" ? (
                            <button onClick={() => updatePlayerPayment(b.id, session.id, "pending")} className="bg-badge bg-badge-success cursor-pointer border-none">
                              จ่ายแล้ว
                            </button>
                          ) : (
                            <button onClick={() => updatePlayerPayment(b.id, session.id, "paid", "cash")} className="bg-badge bg-badge-warning cursor-pointer border-none">
                              รอชำระ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </aside>
      </div>

      {scoringMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card max-w-md w-full shadow-2xl space-y-5 animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-center">บันทึกคะแนน {scoringMatch.court_name} (#{scoringMatch.match_number})</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <label className="text-sm font-bold text-blue-600 mb-1 block">คะแนน ทีม A</label>
                <input type="number" value={scoreA} onChange={(e) => setScoreA(Number(e.target.value))} className="bg-form-input text-center text-3xl font-bold py-4" />
              </div>
              <div>
                <label className="text-sm font-bold text-rose-600 mb-1 block">คะแนน ทีม B</label>
                <input type="number" value={scoreB} onChange={(e) => setScoreB(Number(e.target.value))} className="bg-form-input text-center text-3xl font-bold py-4" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setScoringMatch(null)} className="bg-btn bg-btn-secondary flex-1">ยกเลิก</button>
              <button onClick={handleFinishMatch} className="bg-btn bg-btn-primary flex-1">
                ยืนยันผลแมตช์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
