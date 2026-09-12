"use client";

import { useState } from "react";
import { Trophy, Clock, CheckCircle2, Flame, Award, ExternalLink, Table } from "lucide-react";

interface MatchData {
  id: string;
  round: number;
  match_number: number;
  status: string;
  score_a: string | null;
  score_b: string | null;
  winner_id: string | null;
  team_a: { id: string; name: string } | null;
  team_b: { id: string; name: string } | null;
  court_name?: string;
  scheduled_at?: string;
  match_type?: string;
  group_name?: string | null;
  notes?: string | null;
  score_details?: any;
}

export function TournamentBracketView({ matches }: { matches: MatchData[] }) {
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);

  if (matches.length === 0) {
    return (
      <div className="card-floating p-12 text-center rounded-3xl border border-line">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <Trophy className="h-7 w-7" />
        </div>
        <h4 className="font-display text-lg font-bold text-ink">สายการแข่งขันกำลังเตรียมการ</h4>
        <p className="text-body-sm text-ink-soft max-w-sm mx-auto mt-1">
          ผู้จัดจะทำการจัดสายการแข่งขัน (Draw / Bracket) หลังจากปิดรับสมัครและตรวจระดับมือเรียบร้อยแล้ว
        </p>
      </div>
    );
  }

  // Check if there are group stage matches
  const groupMatches = matches.filter((m) => m.match_type === "group");
  const knockoutMatches = matches.filter((m) => m.match_type !== "group");
  const groupStandings = groupMatches.reduce((groups, match) => {
    const groupName = match.group_name || "รอบแบ่งกลุ่ม";
    if (!groups[groupName]) groups[groupName] = new Map();
    const table = groups[groupName];
    for (const team of [match.team_a, match.team_b]) {
      if (!team) continue;
      if (!table.has(team.id)) table.set(team.id, { id: team.id, name: team.name, played: 0, won: 0, lost: 0 });
    }
    if (match.status === "completed" && match.team_a && match.team_b && match.winner_id) {
      const teamA = table.get(match.team_a.id);
      const teamB = table.get(match.team_b.id);
      if (teamA && teamB) {
        teamA.played += 1;
        teamB.played += 1;
        if (match.winner_id === teamA.id) { teamA.won += 1; teamB.lost += 1; }
        if (match.winner_id === teamB.id) { teamB.won += 1; teamA.lost += 1; }
      }
    }
    return groups;
  }, {} as Record<string, Map<string, { id: string; name: string; played: number; won: number; lost: number }>>);

  // Group matches by round for Knockout
  const roundsMap = knockoutMatches.reduce((acc, m) => {
    if (!acc[m.round]) acc[m.round] = [];
    acc[m.round].push(m);
    return acc;
  }, {} as Record<number, MatchData[]>);

  const roundNumbers = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b);

  function getRoundTitle(round: number, totalRounds: number) {
    const diff = totalRounds - round;
    if (diff === 0) return "รอบชิงชนะเลิศ (Finals)";
    if (diff === 1) return "รอบรองชนะเลิศ (Semi-Finals)";
    if (diff === 2) return "รอบก่อนรองชนะเลิศ (Quarter-Finals)";
    return `รอบที่ ${round}`;
  }

  return (
    <div className="space-y-8">
      {/* Knockout Bracket View */}
      {knockoutMatches.length > 0 && (
        <div className="overflow-x-auto pb-6">
          <div className="flex min-w-[720px] gap-8 items-stretch justify-start py-4">
            {roundNumbers.map((round) => {
              const roundMatches = roundsMap[round].sort((a, b) => a.match_number - b.match_number);
              const roundTitle = getRoundTitle(round, roundNumbers.length);

              return (
                <div key={round} className="flex-1 min-w-[280px] flex flex-col">
                  {/* Round Header */}
                  <div className="mb-4 rounded-2xl border border-line bg-surface-raised px-4 py-2.5 text-center shadow-xs">
                    <span className="font-display text-xs font-bold text-ink uppercase tracking-wider">
                      {roundTitle}
                    </span>
                    <p className="text-[11px] text-ink-soft">{roundMatches.length} แมตช์</p>
                  </div>

                  {/* Matches column */}
                  <div className="flex flex-col justify-around flex-1 gap-4">
                    {roundMatches.map((m) => {
                      const isFinished = m.status === "completed";
                      const isPlaying = m.status === "in_progress";
                      const aWon = isFinished && m.winner_id && m.team_a?.id === m.winner_id;
                      const bWon = isFinished && m.winner_id && m.team_b?.id === m.winner_id;
                      const isThirdPlace = m.match_type === "third_place";

                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMatch(m)}
                          className={`relative rounded-2xl border p-4 shadow-xs transition-all cursor-pointer ${
                            isThirdPlace
                              ? "border-amber-500/50 bg-amber-500/5"
                              : isPlaying
                              ? "border-emerald-500 shadow-emerald-500/10 ring-2 ring-emerald-500/20 bg-surface"
                              : "border-line bg-surface hover:border-brand/60"
                          }`}
                        >
                          {/* Match Meta Badge */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <span className="text-[11px] font-bold text-ink-soft">
                              {isThirdPlace ? "🥉 รอบชิงอันดับ 3" : `แมตช์ #${m.match_number}`}
                            </span>
                            {isPlaying ? (
                              <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                สด (Live)
                              </span>
                            ) : isFinished ? (
                              <span className="rounded-md bg-surface-raised px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                                จบแล้ว
                              </span>
                            ) : (
                              <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                                รอแข่ง
                              </span>
                            )}
                          </div>

                          {/* Team A */}
                          <div
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                              aWon
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black border border-amber-500/30"
                                : "bg-surface-raised text-ink"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {aWon && <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                              <span className="truncate">{m.team_a?.name ?? "TBD (รอผลรอบก่อน)"}</span>
                            </div>
                            <span className="font-mono font-bold text-ink shrink-0 ml-2">
                              {m.score_a ?? "-"}
                            </span>
                          </div>

                          <div className="my-1 text-center text-[10px] font-black text-ink-soft">VS</div>

                          {/* Team B */}
                          <div
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                              bWon
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black border border-amber-500/30"
                                : "bg-surface-raised text-ink"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {bWon && <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                              <span className="truncate">{m.team_b?.name ?? "TBD (รอผลรอบก่อน)"}</span>
                            </div>
                            <span className="font-mono font-bold text-ink shrink-0 ml-2">
                              {m.score_b ?? "-"}
                            </span>
                          </div>

                          <div className="mt-2 pt-2 border-t border-line/50 flex items-center justify-between text-[10px] text-ink-soft">
                            <span>คลิกดูรายละเอียดคะแนน</span>
                            <span className="font-bold text-brand">รายละเอียด →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {groupMatches.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">รอบแบ่งกลุ่ม</h3>
            <span className="text-xs font-bold text-ink-soft">ผลอัปเดตจากกรรมการ</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(groupStandings).map(([groupName, table]) => {
              const rows = Array.from(table.values()).sort((a, b) => b.won - a.won || a.lost - b.lost || a.name.localeCompare(b.name));
              return (
                <div key={groupName} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
                  <div className="flex items-center justify-between border-b border-line bg-surface-raised px-4 py-3">
                    <h4 className="font-display text-sm font-bold text-ink">ตารางคะแนน {groupName}</h4>
                    <span className="text-[11px] font-bold text-brand">อันดับ 1–2 ผ่านเข้ารอบ</span>
                  </div>
                  <div className="grid grid-cols-[30px_1fr_32px_32px_32px] gap-2 border-b border-line bg-surface-raised px-4 py-2 text-[10px] font-bold text-ink-soft">
                    <span>#</span><span>ทีม</span><span className="text-center">แข่ง</span><span className="text-center">ชนะ</span><span className="text-center">แพ้</span>
                  </div>
                  <div className="divide-y divide-line/60">
                    {rows.map((row, index) => (
                      <div key={row.id} className="grid grid-cols-[30px_1fr_32px_32px_32px] items-center gap-2 px-4 py-2.5 text-xs">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full font-black ${index < 2 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-surface-raised text-ink-soft"}`}>{index + 1}</span>
                        <span className="truncate font-bold text-ink">{row.name}</span>
                        <span className="text-center text-ink-soft" title="แข่ง">{row.played}</span>
                        <span className="text-center font-bold text-emerald-600" title="ชนะ">{row.won}</span>
                        <span className="text-center text-ink-soft" title="แพ้">{row.lost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groupMatches.map((match) => {
              const completed = match.status === "completed";
              return (
                <button key={match.id} onClick={() => setSelectedMatch(match)} className="rounded-2xl border border-line bg-surface p-4 text-left shadow-xs transition hover:border-brand">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-bold text-ink-soft">
                    <span>{match.group_name || "รอบแบ่งกลุ่ม"} · รอบ {match.round}</span>
                    <span className={completed ? "text-emerald-600" : "text-brand"}>{completed ? "จบแล้ว" : "รอแข่ง"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-ink"><span className="truncate">{match.team_a?.name ?? "TBD"}</span><span className="font-mono">{match.score_a ?? "-"}</span></div>
                  <div className="my-1 border-t border-line/60" />
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-ink"><span className="truncate">{match.team_b?.name ?? "TBD"}</span><span className="font-mono">{match.score_b ?? "-"}</span></div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Match Details Popup Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="card-floating w-full max-w-sm rounded-3xl border border-line bg-surface p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h4 className="font-display text-sm font-bold text-ink">
                  ผลการแข่งขันรอบที่ {selectedMatch.round} · แมตช์ #{selectedMatch.match_number}
                </h4>
                <p className="text-[11px] text-ink-soft">มาตรฐานกติกาคะแนนสากล BWF</p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="rounded-lg p-1 text-ink-soft hover:bg-surface-raised cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Teams & Scores */}
            <div className="space-y-2.5 py-1">
              <div
                className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold ${
                  selectedMatch.winner_id === selectedMatch.team_a?.id
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
                    : "bg-surface-raised text-ink"
                }`}
              >
                <span>{selectedMatch.team_a?.name ?? "TBD"}</span>
                <span className="font-mono font-black text-sm">{selectedMatch.score_a ?? "-"}</span>
              </div>

              <div
                className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold ${
                  selectedMatch.winner_id === selectedMatch.team_b?.id
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
                    : "bg-surface-raised text-ink"
                }`}
              >
                <span>{selectedMatch.team_b?.name ?? "TBD"}</span>
                <span className="font-mono font-black text-sm">{selectedMatch.score_b ?? "-"}</span>
              </div>
            </div>

            {selectedMatch.notes && (
              <p className="text-[11px] text-ink-soft bg-surface-raised p-2.5 rounded-xl border border-line">
                📌 {selectedMatch.notes}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <span className="text-[11px] text-ink-soft">
                สถานะ: {selectedMatch.status === "completed" ? "จบการแข่งขันแล้ว" : "รอการแข่งขัน"}
              </span>
              <a
                href={`/umpire/match/${selectedMatch.id}`}
                target="_blank"
                className="rounded-xl bg-brand text-white px-3 py-1.5 text-xs font-bold hover:bg-brand-dark flex items-center gap-1"
              >
                <span>🏸 ดูสกอร์บอร์ด</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
