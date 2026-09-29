"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import {
  addPlayerToSession,
  createSessionMatch,
  updateMatchShuttlecock,
  finishSessionMatch,
  updatePlayerPayment,
  togglePlayerCheckin,
  removePlayerFromSession,
  searchSystemProfiles,
  addExistingProfileToSession,
} from "../actions";
import { autoGenerateMatch, type AvailablePlayer } from "@/lib/badminton/matchmaker";
import { calculatePlayerExpense } from "@/lib/badminton/billing";
import { getRankFromMMR, SKILL_LEVEL_MAP } from "@/lib/badminton/rank";

export type SessionData = {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  shuttlecock_brand: string;
  shuttlecock_price: number;
  entry_fee: number;
  court_names: string[];
  status: string;
};

export type SessionPlayer = {
  id: string;
  session_id: string;
  profile_id?: string | null;
  player_name: string;
  player_phone: string | null;
  skill_level: string;
  mmr: number;
  is_guest?: boolean;
  is_checked_in: boolean;
  games_played: number;
  discount: number;
  additional_cost: number;
  payment_status: "pending" | "paid";
  payment_method: string | null;
};

export type SessionMatch = {
  id: string;
  session_id: string;
  court_name: string;
  match_number: number;
  status: "waiting" | "playing" | "finished" | "cancelled";
  team_a_score: number;
  team_b_score: number;
  shuttlecock_count: number;
  started_at: string | null;
  completed_at: string | null;
  group_session_match_players: {
    session_player_id: string;
    team: "A" | "B";
    group_session_players: {
      id: string;
      player_name: string;
      skill_level: string;
      mmr: number;
    } | null;
  }[];
};

export function GroupSessionControlClient({
  session,
  players,
  matches,
}: {
  session: SessionData;
  players: SessionPlayer[];
  matches: SessionMatch[];
}) {
  const [activeTab, setActiveTab] = useState<"players" | "live" | "matchmaker" | "billing">("players");

  // New Player Form State
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");
  const [newPlayerSkill, setNewPlayerSkill] = useState("N");
  const [addingPlayer, setAddingPlayer] = useState(false);

  const [addMode, setAddMode] = useState<"guest" | "member">("guest");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [isSearchingMember, setIsSearchingMember] = useState(false);

  // Matchmaker Custom State
  const [selectedCourt, setSelectedCourt] = useState(session.court_names[0] || "คอร์ท 1");
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [creatingMatch, setCreatingMatch] = useState(false);

  // Score Modal State
  const [scoringMatch, setScoringMatch] = useState<SessionMatch | null>(null);
  const [scoreA, setScoreA] = useState(21);
  const [scoreB, setScoreB] = useState(19);

  const currentlyPlayingPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of matches) {
      if (m.status === "playing") {
        for (const p of m.group_session_match_players) {
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

  const billingSummaries = useMemo(() => {
    const matchesData = matches
      .filter((m) => m.status === "playing" || m.status === "finished")
      .map((m) => ({
        shuttlecockCount: m.shuttlecock_count,
        playerIds: m.group_session_match_players.map((mp) => mp.session_player_id),
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
  const waitingPlayers = availablePlayersList.filter((p) => !p.isPlaying);

  function handleMagicMatch() {
    const generated = autoGenerateMatch(availablePlayersList);
    if (!generated) {
      alert("มีผู้เล่นที่รอลงสนามไม่ถึง 4 คน");
      return;
    }
    setTeamAPlayers(generated.teamA.map((p) => p.id));
    setTeamBPlayers(generated.teamB.map((p) => p.id));
    setActiveTab("matchmaker");
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setAddingPlayer(true);
    await addPlayerToSession(session.id, newPlayerName, newPlayerPhone, newPlayerSkill);
    setNewPlayerName("");
    setNewPlayerPhone("");
    setAddingPlayer(false);
  }

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

  async function handleStartMatch() {
    if (teamAPlayers.length !== 2 || teamBPlayers.length !== 2) {
      alert("กรุณาเลือกผู้เล่นทีมละ 2 คน (ประเภทคู่)");
      return;
    }
    setCreatingMatch(true);
    await createSessionMatch(session.id, selectedCourt, teamAPlayers, teamBPlayers);
    setTeamAPlayers([]);
    setTeamBPlayers([]);
    setCreatingMatch(false);
    setActiveTab("live");
  }

  async function handleFinishMatch() {
    if (!scoringMatch) return;
    await finishSessionMatch(scoringMatch.id, scoreA, scoreB);
    setScoringMatch(null);
  }

  return (
    <div className="bg-animate-in space-y-6">
      {/* 1. Header Control Bar */}
      <div className="bg-card flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="bg-badge bg-badge-orange uppercase">
                🏸 Badminton Session
              </span>
              <span className="font-mono text-xs font-bold" style={{ color: "var(--bg-gray-500)" }}>
                {session.session_date}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--bg-gray-900)" }}>
              {session.title}
            </h1>
            <p className="text-sm flex flex-wrap items-center gap-2.5 mt-1 font-medium" style={{ color: "var(--bg-gray-500)" }}>
              <span>⏰ {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
              <span>•</span>
              <span>🏸 {session.shuttlecock_brand} (฿{session.shuttlecock_price}/ลูก)</span>
              {session.entry_fee > 0 && <span>• 🎟️ ค่าลง ฿{session.entry_fee}</span>}
              <span>•</span>
              <span>🏟️ คอร์ท: {session.court_names.join(", ")}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/queue-master/${session.id}`}
              target="_blank"
              className="bg-btn bg-btn-secondary"
            >
              <Icon icon="solar:maximize-square-linear" width={18} />
              <span>สถานีเต็มจอ</span>
            </Link>
            
            <button
              type="button"
              onClick={handleMagicMatch}
              className="bg-btn bg-btn-primary"
            >
              <Icon icon="solar:magic-stick-3-bold-duotone" width={18} />
              <span>Magic Match</span>
            </button>

            <Link
              href={`/queue/${session.id}`}
              target="_blank"
              className="bg-btn bg-btn-secondary"
            >
              <Icon icon="solar:share-bold-duotone" width={18} />
              <span>หน้าคิวสด</span>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-t pt-4" style={{ borderColor: "var(--bg-card-border)" }}>
          <button
            type="button"
            onClick={() => setActiveTab("players")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === "players"
                ? "bg-[var(--bg-orange-500)] text-white shadow-md"
                : "text-[var(--bg-gray-500)] hover:bg-[var(--bg-gray-100)] hover:text-[var(--bg-gray-900)]"
            }`}
          >
            <Icon icon="solar:users-group-rounded-bold-duotone" width={18} />
            <span>รายชื่อผู้เล่น ({players.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === "live"
                ? "bg-[var(--bg-orange-500)] text-white shadow-md"
                : "text-[var(--bg-gray-500)] hover:bg-[var(--bg-gray-100)] hover:text-[var(--bg-gray-900)]"
            }`}
          >
            <Icon icon="solar:play-bold-duotone" width={18} />
            <span>กระดานคิวสด ({activeMatches.length} แมตช์)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("matchmaker")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === "matchmaker"
                ? "bg-[var(--bg-orange-500)] text-white shadow-md"
                : "text-[var(--bg-gray-500)] hover:bg-[var(--bg-gray-100)] hover:text-[var(--bg-gray-900)]"
            }`}
          >
            <Icon icon="solar:magic-stick-3-bold-duotone" width={18} />
            <span>จัดคิว & จับคู่</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("billing")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === "billing"
                ? "bg-[var(--bg-orange-500)] text-white shadow-md"
                : "text-[var(--bg-gray-500)] hover:bg-[var(--bg-gray-100)] hover:text-[var(--bg-gray-900)]"
            }`}
          >
            <Icon icon="solar:bill-list-bold-duotone" width={18} />
            <span>คิดเงิน & หารค่าลูก</span>
          </button>
        </div>
      </div>

      {/* 1. PLAYERS ROSTER TAB */}
      {activeTab === "players" && (
        <div className="space-y-6">
          <form onSubmit={handleAddPlayer} className="bg-card flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="bg-form-label">ชื่อผู้เล่น / สมาชิก *</label>
              <input
                type="text"
                required
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="เช่น โบ๊ท, แบงค์, นนท์"
                className="bg-form-input"
              />
            </div>
            <div className="w-full sm:w-44">
              <label className="bg-form-label">เบอร์โทร (ถ้ามี)</label>
              <input
                type="text"
                value={newPlayerPhone}
                onChange={(e) => setNewPlayerPhone(e.target.value)}
                placeholder="08XXXXXXXX"
                className="bg-form-input font-mono"
              />
            </div>
            <div className="w-full sm:w-36">
              <label className="bg-form-label">ระดับมือ</label>
              <select
                value={newPlayerSkill}
                onChange={(e) => setNewPlayerSkill(e.target.value)}
                className="bg-form-select"
              >
                {Object.keys(SKILL_LEVEL_MAP).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={addingPlayer}
              className="bg-btn bg-btn-primary h-[42px] w-full sm:w-auto"
            >
              <Icon icon="solar:user-plus-bold-duotone" width={18} />
              <span>เพิ่มผู้เล่น</span>
            </button>
          </form>

          {addMode === "member" ? (
            <div className="bg-card flex flex-col gap-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-base" style={{ color: "var(--bg-gray-900)" }}>
                  ค้นหาสมาชิกในระบบ SportHub
                </h3>
                <button
                  type="button"
                  onClick={() => setAddMode("guest")}
                  className="text-sm font-bold text-blue-500 hover:underline"
                >
                  ← กลับไปเพิ่มแขกทั่วไป
                </button>
              </div>
              <div className="relative">
                <Icon
                  icon="solar:magnifer-linear"
                  className="absolute left-3.5 top-3 text-[var(--bg-gray-400)]"
                  width={18}
                />
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อ, อีเมล หรือเบอร์โทรสมาชิก..."
                  value={memberSearchQuery}
                  onChange={(e) => handleSearchMember(e.target.value)}
                  className="bg-form-input pl-10"
                />
              </div>
              {isSearchingMember && (
                <div className="text-sm" style={{ color: "var(--bg-gray-500)" }}>
                  กำลังค้นหา...
                </div>
              )}
              {memberSearchResults.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 max-h-60 overflow-y-auto">
                  {memberSearchResults.map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between items-center p-3 border rounded-xl bg-[var(--bg-surface-elevated)] hover:border-[var(--bg-orange-500)] transition-all"
                      style={{ borderColor: "var(--bg-card-border)" }}
                    >
                      <div>
                        <div className="font-bold text-sm" style={{ color: "var(--bg-gray-900)" }}>
                          {m.full_name || m.email}
                        </div>
                        <div className="text-xs" style={{ color: "var(--bg-gray-500)" }}>
                          {m.phone || "ไม่มีเบอร์โทร"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddExistingMember(m.id)}
                        className="bg-btn bg-btn-secondary bg-btn-sm"
                      >
                        เพิ่มเข้าก๊วน
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setAddMode("member")}
                className="text-sm font-bold text-blue-500 hover:underline"
              >
                + ค้นหาสมาชิกที่มีอยู่แล้วในระบบเพื่อเพิ่มเข้าก๊วน
              </button>
            </div>
          )}

          <div className="bg-card overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead
                style={{
                  background: "var(--bg-gray-100)",
                  borderBottom: "1px solid var(--bg-card-border)",
                  color: "var(--bg-gray-500)",
                }}
              >
                <tr>
                  <th className="px-5 py-3.5 font-bold">ชื่อผู้เล่น</th>
                  <th className="px-4 py-3.5 font-bold">ระดับมือ (Rank)</th>
                  <th className="px-4 py-3.5 font-bold text-center">เล่นไปแล้ว</th>
                  <th className="px-4 py-3.5 font-bold">สถานะเช็คอิน</th>
                  <th className="px-4 py-3.5 font-bold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--bg-card-border)" }}>
                {players.map((p) => {
                  const rank = getRankFromMMR(p.mmr);
                  return (
                    <tr key={p.id} className="hover:bg-[var(--bg-gray-50)] transition-colors">
                      <td className="px-5 py-3.5 font-bold" style={{ color: "var(--bg-gray-900)" }}>
                        <div className="flex items-center gap-2">
                          <span>{p.player_name}</span>
                          {p.player_phone && (
                            <span className="text-[11px] font-mono font-normal opacity-60">
                              ({p.player_phone})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="bg-badge"
                          style={{ background: "var(--bg-gray-100)", color: "var(--bg-gray-800)" }}
                        >
                          {p.skill_level} ({rank.name})
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold font-mono">
                        {p.games_played} เกม
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => togglePlayerCheckin(p.id, session.id, !p.is_checked_in)}
                          className={`bg-badge ${
                            p.is_checked_in ? "bg-badge-success" : "bg-badge-muted"
                          } cursor-pointer border-none transition-transform active:scale-95`}
                        >
                          {p.is_checked_in ? "✓ เช็คอินแล้ว" : "○ ยังไม่เช็คอิน"}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => removePlayerFromSession(p.id, session.id)}
                          className="bg-btn bg-btn-ghost bg-btn-sm"
                          style={{ color: "var(--bg-danger)" }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {players.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10" style={{ color: "var(--bg-gray-500)" }}>
                      ยังไม่มีผู้เล่นในรอบก๊วนนี้ กรุณาเพิ่มผู้เล่นด้านบน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. LIVE BOARD TAB */}
      {activeTab === "live" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--bg-gray-900)" }}>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>คอร์ทที่กำลังแข่งขัน ({activeMatches.length})</span>
            </h3>
            {activeMatches.length === 0 ? (
              <div className="bg-card text-center py-12 px-4 rounded-2xl">
                <Icon
                  icon="solar:play-bold-duotone"
                  width={36}
                  className="mx-auto mb-2 opacity-30"
                  style={{ color: "var(--bg-gray-500)" }}
                />
                <p className="font-bold text-base" style={{ color: "var(--bg-gray-900)" }}>
                  ยังไม่มีแมตช์ที่กำลังเล่น
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--bg-gray-500)" }}>
                  กดปุ่ม Magic Match หรือไปที่แท็บ &quot;จัดคิว &amp; จับคู่&quot; เพื่อส่งคู่นักกีฬาลงสนาม
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeMatches.map((m) => {
                  const teamA = m.group_session_match_players.filter((mp) => mp.team === "A");
                  const teamB = m.group_session_match_players.filter((mp) => mp.team === "B");
                  return (
                    <div
                      key={m.id}
                      className="bg-card shadow-sm border relative overflow-hidden p-5 flex flex-col justify-between"
                      style={{ borderColor: "rgba(249, 115, 22, 0.3)" }}
                    >
                      <div>
                        <div
                          className="flex items-center justify-between mb-4 border-b pb-3"
                          style={{ borderColor: "var(--bg-card-border)" }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="bg-badge bg-badge-orange font-bold text-sm">
                              {m.court_name}
                            </span>
                            <span className="font-bold text-xs" style={{ color: "var(--bg-gray-500)" }}>
                              แมตช์ #{m.match_number}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-2 rounded-xl px-2.5 py-1 border"
                            style={{
                              background: "var(--bg-surface-elevated)",
                              borderColor: "var(--bg-card-border)",
                            }}
                          >
                            <span className="text-xs font-bold" style={{ color: "var(--bg-gray-500)" }}>
                              🏸 ลูก:
                            </span>
                            <button
                              type="button"
                              onClick={() => updateMatchShuttlecock(m.id, -1)}
                              className="p-1 hover:bg-[var(--bg-gray-200)] rounded transition-colors"
                            >
                              <Icon icon="solar:minus-linear" width={14} />
                            </button>
                            <span className="font-bold font-mono text-sm" style={{ color: "var(--bg-orange-500)" }}>
                              {m.shuttlecock_count}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateMatchShuttlecock(m.id, 1)}
                              className="p-1 hover:bg-[var(--bg-gray-200)] rounded transition-colors"
                            >
                              <Icon icon="solar:add-linear" width={14} />
                            </button>
                          </div>
                        </div>

                        {/* Teams Box */}
                        <div className="grid grid-cols-2 gap-3 text-center mb-4">
                          <div
                            className="rounded-2xl p-3.5 border"
                            style={{
                              background: "rgba(59, 130, 246, 0.08)",
                              borderColor: "rgba(59, 130, 246, 0.2)",
                            }}
                          >
                            <span className="text-xs font-bold uppercase text-blue-500 dark:text-blue-400">
                              ทีม A
                            </span>
                            <div className="mt-2 space-y-1">
                              {teamA.map((p) => (
                                <div
                                  key={p.session_player_id}
                                  className="font-bold text-sm truncate"
                                  style={{ color: "var(--bg-gray-900)" }}
                                >
                                  {p.group_session_players?.player_name}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div
                            className="rounded-2xl p-3.5 border"
                            style={{
                              background: "rgba(225, 29, 72, 0.08)",
                              borderColor: "rgba(225, 29, 72, 0.2)",
                            }}
                          >
                            <span className="text-xs font-bold uppercase text-rose-500 dark:text-rose-400">
                              ทีม B
                            </span>
                            <div className="mt-2 space-y-1">
                              {teamB.map((p) => (
                                <div
                                  key={p.session_player_id}
                                  className="font-bold text-sm truncate"
                                  style={{ color: "var(--bg-gray-900)" }}
                                >
                                  {p.group_session_players?.player_name}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setScoringMatch(m);
                          setScoreA(21);
                          setScoreB(19);
                        }}
                        className="bg-btn bg-btn-secondary w-full justify-center"
                      >
                        <Icon icon="solar:cup-star-bold-duotone" width={16} />
                        <span>บันทึกผล & จบแมตช์</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Queue Waiting */}
          <div className="bg-card">
            <h3 className="text-base font-bold mb-3 flex items-center justify-between" style={{ color: "var(--bg-gray-900)" }}>
              <span>คิวผู้เล่นรอลงสนาม ({waitingPlayers.length} คน)</span>
            </h3>
            {waitingPlayers.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--bg-gray-500)" }}>
                ไม่มีผู้เล่นที่กำลังรอคิว (ทุกคนกำลังลงสนามหรือยังไม่ได้เช็คอิน)
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {waitingPlayers.map((p) => {
                  const rank = getRankFromMMR(p.mmr);
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border p-3 flex justify-between items-center"
                      style={{
                        borderColor: "var(--bg-card-border)",
                        background: "var(--bg-surface-elevated)",
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: "var(--bg-gray-900)" }}>
                          {p.name}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--bg-gray-500)" }}>
                          เล่น {p.gamesPlayed} เกม
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-bold border px-1.5 py-0.5 rounded-lg"
                        style={{
                          background: "var(--bg-card-bg)",
                          borderColor: "var(--bg-card-border)",
                          color: "var(--bg-gray-700)",
                        }}
                      >
                        {rank.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MATCHMAKER TAB */}
      {activeTab === "matchmaker" && (
        <div className="bg-card space-y-6">
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
            style={{ borderColor: "var(--bg-card-border)" }}
          >
            <div>
              <h3 className="text-lg font-bold" style={{ color: "var(--bg-gray-900)" }}>
                จัดคู่ลงสนาม (Manual Matchmaker)
              </h3>
              <p className="text-sm" style={{ color: "var(--bg-gray-500)" }}>
                เลือกคอร์ทและผู้เล่น 4 คนสำหรับเกมประเภทคู่
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold" style={{ color: "var(--bg-gray-800)" }}>
                ลงคอร์ท:
              </label>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="bg-form-select w-auto"
              >
                {session.court_names.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Team A Picker */}
            <div
              className="rounded-2xl p-5 border space-y-3"
              style={{
                background: "rgba(59, 130, 246, 0.05)",
                borderColor: "rgba(59, 130, 246, 0.2)",
              }}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  ทีม A (เลือก {teamAPlayers.length}/2 คน)
                </h4>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {players
                  .filter((p) => p.is_checked_in && !teamBPlayers.includes(p.id))
                  .map((p) => {
                    const isSelected = teamAPlayers.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTeamAPlayers(teamAPlayers.filter((id) => id !== p.id));
                          } else if (teamAPlayers.length < 2) {
                            setTeamAPlayers([...teamAPlayers, p.id]);
                          }
                        }}
                        className={`w-full flex items-center justify-between rounded-xl p-2.5 text-sm font-bold transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-md"
                            : "border hover:bg-blue-500/10"
                        }`}
                        style={{
                          background: isSelected ? undefined : "var(--bg-surface-elevated)",
                          borderColor: isSelected ? undefined : "var(--bg-card-border)",
                          color: isSelected ? undefined : "var(--bg-gray-900)",
                        }}
                      >
                        <span>{p.player_name}</span>
                        <span className="text-[11px] opacity-80">
                          {p.skill_level} ({p.games_played} เกม)
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Team B Picker */}
            <div
              className="rounded-2xl p-5 border space-y-3"
              style={{
                background: "rgba(225, 29, 72, 0.05)",
                borderColor: "rgba(225, 29, 72, 0.2)",
              }}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                  ทีม B (เลือก {teamBPlayers.length}/2 คน)
                </h4>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {players
                  .filter((p) => p.is_checked_in && !teamAPlayers.includes(p.id))
                  .map((p) => {
                    const isSelected = teamBPlayers.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTeamBPlayers(teamBPlayers.filter((id) => id !== p.id));
                          } else if (teamBPlayers.length < 2) {
                            setTeamBPlayers([...teamBPlayers, p.id]);
                          }
                        }}
                        className={`w-full flex items-center justify-between rounded-xl p-2.5 text-sm font-bold transition-all ${
                          isSelected
                            ? "bg-rose-600 text-white shadow-md"
                            : "border hover:bg-rose-500/10"
                        }`}
                        style={{
                          background: isSelected ? undefined : "var(--bg-surface-elevated)",
                          borderColor: isSelected ? undefined : "var(--bg-card-border)",
                          color: isSelected ? undefined : "var(--bg-gray-900)",
                        }}
                      >
                        <span>{p.player_name}</span>
                        <span className="text-[11px] opacity-80">
                          {p.skill_level} ({p.games_played} เกม)
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartMatch}
            disabled={creatingMatch || teamAPlayers.length !== 2 || teamBPlayers.length !== 2}
            className="bg-btn bg-btn-primary w-full h-[50px] text-base"
          >
            <Icon icon="solar:play-circle-bold" width={20} />
            <span>เริ่มการแข่งขันลง {selectedCourt}</span>
          </button>
        </div>
      )}

      {/* 4. BILLING TAB */}
      {activeTab === "billing" && (
        <div className="bg-card overflow-hidden p-0">
          <div className="p-5 border-b" style={{ borderColor: "var(--bg-card-border)" }}>
            <h3 className="text-lg font-bold" style={{ color: "var(--bg-gray-900)" }}>
              สรุปยอดเงินและหารค่าลูกแบดมินตัน
            </h3>
            <p className="text-sm" style={{ color: "var(--bg-gray-500)" }}>
              คำนวณจาก ค่าลงสนาม (฿{session.entry_fee}) + (ลูกแบดที่ใช้จริงในแต่ละแมตช์ × ฿{session.shuttlecock_price} ÷ 4 คน)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead
                style={{
                  background: "var(--bg-gray-100)",
                  color: "var(--bg-gray-500)",
                  borderBottom: "1px solid var(--bg-card-border)",
                }}
              >
                <tr>
                  <th className="px-5 py-3.5 font-bold">ผู้เล่น</th>
                  <th className="px-4 py-3.5 font-bold text-center">เกมที่เล่น</th>
                  <th className="px-4 py-3.5 font-bold text-right">ค่าลงสนาม</th>
                  <th className="px-4 py-3.5 font-bold text-right">ค่าลูกแบด</th>
                  <th className="px-4 py-3.5 font-bold text-right" style={{ color: "var(--bg-gray-900)" }}>
                    ยอดสุทธิ
                  </th>
                  <th className="px-4 py-3.5 font-bold text-center">สถานะ</th>
                  <th className="px-5 py-3.5 font-bold text-right">การชำระเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--bg-card-border)" }}>
                {billingSummaries.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--bg-gray-50)] transition-colors">
                    <td className="px-5 py-3.5 font-bold" style={{ color: "var(--bg-gray-900)" }}>
                      {b.player_name}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-semibold">
                      {b.gamesPlayed}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono">
                      ฿{b.entryFee}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold" style={{ color: "var(--bg-orange-500)" }}>
                      ฿{b.shuttleFee}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-extrabold" style={{ color: "var(--bg-gray-900)" }}>
                      ฿{b.totalDue}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`bg-badge ${
                          b.payment_status === "paid" ? "bg-badge-success" : "bg-badge-warning"
                        }`}
                      >
                        {b.payment_status === "paid"
                          ? `ชำระแล้ว (${b.payment_method === "transfer" ? "โอน" : "สด"})`
                          : "รอชำระ"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {b.payment_status !== "paid" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => updatePlayerPayment(b.id, session.id, "paid", "cash")}
                            className="bg-btn bg-btn-sm"
                            style={{ background: "#16a34a", color: "white" }}
                          >
                            เงินสด
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePlayerPayment(b.id, session.id, "paid", "transfer")}
                            className="bg-btn bg-btn-secondary bg-btn-sm"
                          >
                            รับโอน
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updatePlayerPayment(b.id, session.id, "pending")}
                          className="bg-btn bg-btn-ghost bg-btn-sm"
                        >
                          ยกเลิก
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

      {/* 5. SCORE MODAL */}
      {scoringMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <span className="bg-badge bg-badge-orange uppercase font-bold">
                {scoringMatch.court_name} • แมตช์ #{scoringMatch.match_number}
              </span>
              <h3 className="text-xl font-bold" style={{ color: "var(--bg-gray-900)" }}>
                บันทึกผลการแข่งขัน
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div
                className="p-4 rounded-2xl border"
                style={{
                  background: "rgba(59, 130, 246, 0.06)",
                  borderColor: "rgba(59, 130, 246, 0.2)",
                }}
              >
                <label className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2 block">
                  คะแนน ทีม A
                </label>
                <input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(Number(e.target.value))}
                  className="bg-form-input text-center text-3xl font-extrabold py-3 font-mono"
                />
              </div>

              <div
                className="p-4 rounded-2xl border"
                style={{
                  background: "rgba(225, 29, 72, 0.06)",
                  borderColor: "rgba(225, 29, 72, 0.2)",
                }}
              >
                <label className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2 block">
                  คะแนน ทีม B
                </label>
                <input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(Number(e.target.value))}
                  className="bg-form-input text-center text-3xl font-extrabold py-3 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setScoringMatch(null)}
                className="bg-btn bg-btn-secondary flex-1"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleFinishMatch}
                className="bg-btn bg-btn-primary flex-1"
              >
                ยืนยันผลแมตช์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
