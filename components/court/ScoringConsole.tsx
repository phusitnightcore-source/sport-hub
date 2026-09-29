"use client";

import { useState } from "react";
import {
  Trophy,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BadmintonCourtView } from "./BadmintonCourtView";
import type { MatchState, Team, EventType } from "@/lib/scoring/types";
import {
  initMatchState,
  addPoint,
  undoPoint,
  startNextGame,
  setWalkover,
  setRetired,
} from "@/lib/scoring/engine";

interface ScoringConsoleProps {
  matchId: string;
  eventName: string;
  courtNo?: number | null;
  team1: Team;
  team2: Team;
  eventType?: EventType;
  initialState?: MatchState;
  onStateChange?: (state: MatchState) => void;
  onMatchFinish?: (winnerTeamId: string, finalScores: string) => void;
}

export function ScoringConsole({
  matchId,
  eventName,
  courtNo,
  team1,
  team2,
  eventType = "MD",
  initialState,
  onStateChange,
  onMatchFinish,
}: ScoringConsoleProps) {
  const [state, setState] = useState<MatchState>(() => {
    if (initialState) return initialState;
    return initMatchState({
      eventType,
      team1,
      team2,
      bestOf: 3,
      pointsPerGame: 21,
      maxPoints: 30,
    });
  });

  const [confirmWalkover, setConfirmWalkover] = useState(false);

  function handleAddPoint(team: 1 | 2) {
    if (state.status === "match_finished" || state.status === "game_finished") return;
    const nextState = addPoint(state, team);
    setState(nextState);
    onStateChange?.(nextState);

    if (nextState.status === "match_finished" && nextState.matchWinner) {
      const winnerId = nextState.matchWinner === 1 ? team1.id : team2.id;
      const scoreStr = nextState.completedGames
        .map((g) => `${g.team1_score}-${g.team2_score}`)
        .join(", ");
      onMatchFinish?.(winnerId, scoreStr);
    }
  }

  function handleUndo() {
    const nextState = undoPoint(state);
    setState(nextState);
    onStateChange?.(nextState);
  }

  function handleNextGame() {
    const nextState = startNextGame(state);
    setState(nextState);
    onStateChange?.(nextState);
  }

  function handleWalkover(winner: 1 | 2) {
    const nextState = setWalkover(state, winner);
    setState(nextState);
    onStateChange?.(nextState);
    const winnerId = winner === 1 ? team1.id : team2.id;
    onMatchFinish?.(winnerId, "Walkover");
    setConfirmWalkover(false);
  }

  function handleRetired(winner: 1 | 2) {
    const nextState = setRetired(state, winner);
    setState(nextState);
    onStateChange?.(nextState);
    const winnerId = winner === 1 ? team1.id : team2.id;
    onMatchFinish?.(winnerId, "Retired");
    setConfirmWalkover(false);
  }

  const isFinished = state.status === "match_finished" || state.status === "walkover" || state.status === "retired";

  const allPlayers = [
    state.positions.team1_left,
    state.positions.team1_right,
    state.positions.team2_left,
    state.positions.team2_right,
  ].filter(Boolean);

  const serverPlayer = allPlayers.find((p) => p?.id === state.server_player_id);
  const receiverPlayer = allPlayers.find((p) => p?.id === state.receiver_player_id);
  const servingScore = state.serving_team === 1 ? state.team1_score : state.team2_score;
  const isEvenServing = servingScore % 2 === 0;

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6 pb-16">
      {/* Header Info */}
      <header className="card-floating rounded-3xl border border-line bg-surface p-4 sm:p-5 flex items-center justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand uppercase">
              {courtNo ? `คอร์ท ${courtNo}` : "สนามหลัก"}
            </span>
            <span className="text-xs font-bold text-ink-soft">{eventName}</span>
          </div>
          <p className="text-body-xs text-ink-soft mt-1">
            เกมที่ {state.currentGameNo} · แข่งขัน 2 ใน 3 เกม (ตันที่ 30 แต้ม)
          </p>
        </div>

        {/* Status Indicator Badges */}
        <div className="flex flex-wrap gap-1.5 justify-end">
          {state.isInterval && (
            <span className="rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-3 py-1 text-xs font-black animate-pulse flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              INTERVAL (พัก 11 แต้ม)
            </span>
          )}
          {state.isMatchPoint && (
            <span className="rounded-xl bg-rose-500 text-white px-3 py-1 text-xs font-black animate-bounce shadow-md">
              MATCH POINT!
            </span>
          )}
          {!state.isMatchPoint && state.isGamePoint && (
            <span className="rounded-xl bg-amber-500 text-white px-3 py-1 text-xs font-black animate-pulse shadow-md">
              GAME POINT
            </span>
          )}
          {state.isDeuce && (
            <span className="rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1 text-xs font-black">
              ⚔️ DEUCE (ดิวส์)
            </span>
          )}
        </div>
      </header>

      {/* Main Scoreboard Display */}
      <div className="card-floating rounded-3xl border border-line bg-surface p-6 shadow-md text-center space-y-4">
        {/* Set History */}
        {state.completedGames.length > 0 && (
          <div className="flex items-center justify-center gap-3 text-body-xs font-bold text-ink-soft">
            <span>ผลเซ็ตก่อนหน้า:</span>
            {state.completedGames.map((g) => (
              <span key={g.gameNo} className="rounded-lg bg-surface-raised px-2.5 py-1 border border-line font-mono text-ink">
                เกม {g.gameNo}: {g.team1_score}-{g.team2_score}
              </span>
            ))}
          </div>
        )}

        {/* Big Score Numbers */}
        <div className="grid grid-cols-3 items-center">
          {/* Team 1 Score */}
          <div className="flex flex-col items-center">
            <span className="font-display text-base sm:text-lg font-black text-ink truncate max-w-[160px]">
              {team1.name}
            </span>
            <span className="text-xs text-brand font-bold">
              (ชนะ {state.team1_games_won} เซ็ต)
            </span>
            <div className="font-display text-6xl sm:text-7xl font-black text-brand mt-2 font-mono tracking-tight">
              {state.team1_score}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center">
            <span className="rounded-full bg-surface-raised border border-line px-3 py-1 text-xs font-black text-ink-soft">
              VS
            </span>
            <span className="text-[11px] font-bold text-ink-soft mt-1">
              เกมที่ {state.currentGameNo}
            </span>
          </div>

          {/* Team 2 Score */}
          <div className="flex flex-col items-center">
            <span className="font-display text-base sm:text-lg font-black text-ink truncate max-w-[160px]">
              {team2.name}
            </span>
            <span className="text-xs text-amber-500 font-bold">
              (ชนะ {state.team2_games_won} เซ็ต)
            </span>
            <div className="font-display text-6xl sm:text-7xl font-black text-amber-500 mt-2 font-mono tracking-tight">
              {state.team2_score}
            </div>
          </div>
        </div>

        {/* Winner Banner if Finished */}
        {isFinished && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-emerald-600 dark:text-emerald-400">
            <Trophy className="mx-auto h-8 w-8 text-amber-400 mb-1" />
            <h3 className="font-display text-xl font-black">
              🏆 ผู้ชนะ: {state.matchWinner === 1 ? team1.name : team2.name}
            </h3>
            <p className="text-xs font-bold text-ink-soft mt-0.5">
              การแข่งขันจบลงเรียบร้อยแล้ว
            </p>
          </div>
        )}
      </div>

      {/* Visual Badminton Court UI */}
      <section className="space-y-2">
        <BadmintonCourtView
          positions={state.positions}
          servingTeam={state.serving_team}
          serverPlayerId={state.server_player_id}
          receiverPlayerId={state.receiver_player_id}
          team1Name={team1.name}
          team2Name={team2.name}
          servingScore={state.serving_team === 1 ? state.team1_score : state.team2_score}
        />
      </section>

      {/* Quick Umpire Status Card (Glanceable Serving & Rotation Indicator) */}
      {!isFinished && state.status !== "game_finished" && (
        <div className="card-floating rounded-2xl border border-line bg-surface p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border-2 border-amber-400 bg-amber-400/20 text-amber-500 flex items-center justify-center font-black text-lg shadow-xs shrink-0">
              🏸
            </div>
            <div>
              <div className="text-xs font-bold text-ink">
                ผู้เสิร์ฟ: <span className="text-amber-600 dark:text-amber-400 font-black">{serverPlayer?.name || "—"}</span> ({state.serving_team === 1 ? team1.name : team2.name})
              </div>
              <div className="text-[11px] text-ink-soft">
                ฝั่งเสิร์ฟ: <strong className="text-ink">{isEvenServing ? "คอร์ทขวา (แต้มคู่)" : "คอร์ทซ้าย (แต้มคี่)"}</strong> (แต้ม {servingScore})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:text-right">
            <div className="sm:order-1 order-2">
              <div className="text-xs font-bold text-ink">
                ผู้รับเสิร์ฟ: <span className="text-cyan-600 dark:text-cyan-400 font-black">{receiverPlayer?.name || "—"}</span> ({state.serving_team === 1 ? team2.name : team1.name})
              </div>
              <div className="text-[11px] text-ink-soft">
                ฝั่งรับ: <strong className="text-ink">แนวทแยง ({isEvenServing ? "คอร์ทขวา" : "คอร์ทซ้าย"})</strong>
              </div>
            </div>
            <div className="sm:order-2 order-1 h-10 w-10 rounded-2xl border-2 border-cyan-400 bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-black text-lg shadow-xs shrink-0">
              🎯
            </div>
          </div>
        </div>
      )}

      {/* Giant Mobile Touch Buttons (Height >= 80px according to CLAUDE.md) */}
      {!isFinished && state.status !== "game_finished" && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Button Team 1 */}
          <button
            onClick={() => handleAddPoint(1)}
            className={`relative flex h-28 sm:h-32 flex-col items-center justify-center rounded-3xl text-white shadow-xl active:scale-95 transition-all cursor-pointer select-none overflow-hidden ${
              state.serving_team === 1
                ? "bg-gradient-to-br from-brand via-brand to-emerald-800 ring-4 ring-amber-400 shadow-amber-500/20"
                : "bg-gradient-to-br from-brand/90 to-brand-dark"
            }`}
          >
            {/* Top Serving / Receiving Circle Pill */}
            <div className="absolute top-2.5 flex items-center gap-1.5">
              {state.serving_team === 1 ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-md animate-pulse">
                  <span>🏸</span>
                  <span>ฝั่งเสิร์ฟ</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-cyan-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-md">
                  <span>🎯</span>
                  <span>ฝั่งรับ</span>
                </span>
              )}
            </div>

            <span className="text-3xl sm:text-4xl font-black mt-3">+1 แต้ม</span>
            <span className="font-display text-xs sm:text-sm font-bold opacity-90 truncate max-w-[180px]">
              {team1.name}
            </span>
          </button>

          {/* Button Team 2 */}
          <button
            onClick={() => handleAddPoint(2)}
            className={`relative flex h-28 sm:h-32 flex-col items-center justify-center rounded-3xl text-white shadow-xl active:scale-95 transition-all cursor-pointer select-none overflow-hidden ${
              state.serving_team === 2
                ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 ring-4 ring-amber-400 shadow-amber-500/20"
                : "bg-gradient-to-br from-amber-500/90 to-amber-600"
            }`}
          >
            {/* Top Serving / Receiving Circle Pill */}
            <div className="absolute top-2.5 flex items-center gap-1.5">
              {state.serving_team === 2 ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-md animate-pulse">
                  <span>🏸</span>
                  <span>ฝั่งเสิร์ฟ</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-cyan-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-md">
                  <span>🎯</span>
                  <span>ฝั่งรับ</span>
                </span>
              )}
            </div>

            <span className="text-3xl sm:text-4xl font-black mt-3">+1 แต้ม</span>
            <span className="font-display text-xs sm:text-sm font-bold opacity-90 truncate max-w-[180px]">
              {team2.name}
            </span>
          </button>
        </div>
      )}

      {/* Advance to Next Game Button */}
      {state.status === "game_finished" && (
        <div className="pt-2 text-center">
          <Button
            onClick={handleNextGame}
            className="w-full h-16 rounded-2xl bg-brand text-white font-display text-lg font-black shadow-lg flex items-center justify-center gap-2"
          >
            <Play className="h-6 w-6" />
            <span>เริ่มเกมที่ {state.currentGameNo + 1}</span>
          </Button>
        </div>
      )}

      {/* Action Footer: Undo & Special Actions */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
        <Button
          variant="secondary"
          onClick={handleUndo}
          disabled={state.events.length === 0}
          className="rounded-2xl border-line font-bold text-body-xs flex items-center gap-1.5"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Undo ย้อนแต้ม ({state.events.length})</span>
        </Button>

        {!isFinished && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmWalkover(!confirmWalkover)}
              className="rounded-2xl border-line text-rose-500 font-bold text-body-xs"
            >
              ยุติแมตช์พิเศษ (Walkover / Retired)
            </Button>
          </div>
        )}
      </footer>

      {/* Walkover / Retired Confirmation Drawer */}
      {confirmWalkover && (
        <div className="rounded-3xl border border-danger/30 bg-danger/10 p-5 space-y-3">
          <h4 className="font-display text-sm font-bold text-danger">
            เลือกผลการแข่งขันแบบพิเศษ
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <Button
              onClick={() => handleWalkover(1)}
              className="bg-brand text-white rounded-xl py-2"
            >
              {team1.name} ชนะบาย (Walkover)
            </Button>
            <Button
              onClick={() => handleWalkover(2)}
              className="bg-amber-500 text-white rounded-xl py-2"
            >
              {team2.name} ชนะบาย (Walkover)
            </Button>
            <Button
              onClick={() => handleRetired(1)}
              variant="secondary"
              className="rounded-xl py-2"
            >
              {team2.name} ถอนตัว (Team 1 ชนะ)
            </Button>
            <Button
              onClick={() => handleRetired(2)}
              variant="secondary"
              className="rounded-xl py-2"
            >
              {team1.name} ถอนตัว (Team 2 ชนะ)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
