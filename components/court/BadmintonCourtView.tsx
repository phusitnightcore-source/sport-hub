"use client";

import { useState } from "react";
import { BookOpen, X, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import type { CourtPositions } from "@/lib/scoring/types";

interface BadmintonCourtViewProps {
  positions: CourtPositions;
  servingTeam: 1 | 2;
  serverPlayerId: string;
  receiverPlayerId: string;
  team1Name: string;
  team2Name: string;
  servingScore?: number;
}

export function BadmintonCourtView({
  positions,
  servingTeam,
  serverPlayerId,
  receiverPlayerId,
  team1Name,
  team2Name,
  servingScore = 0,
}: BadmintonCourtViewProps) {
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Check active roles
  const isServer = (id?: string | null) => Boolean(id && id === serverPlayerId);
  const isReceiver = (id?: string | null) => Boolean(id && id === receiverPlayerId);

  const isEvenScore = servingScore % 2 === 0;

  // Find server and receiver player objects
  const allPlayers = [
    positions.team1_left,
    positions.team1_right,
    positions.team2_left,
    positions.team2_right,
  ].filter(Boolean);

  const serverPlayer = allPlayers.find((p) => isServer(p?.id));
  const receiverPlayer = allPlayers.find((p) => isReceiver(p?.id));

  // Circular Player Token with Image / Avatar and Distinct Corner Borders
  function PlayerToken({
    player,
    cornerName,
    isEvenBox,
  }: {
    player: { id: string; name: string; avatar_url?: string | null } | null;
    cornerName: string;
    isEvenBox: boolean;
  }) {
    if (!player) {
      return (
        <div className="flex flex-col items-center justify-center p-2 opacity-35">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center text-xs font-bold text-white/50">
            ว่าง
          </div>
          <span className="mt-1 text-[10px] font-bold text-white/50">{cornerName}</span>
        </div>
      );
    }

    const isThisServer = isServer(player.id);
    const isThisReceiver = isReceiver(player.id);
    const initials = player.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PL";

    return (
      <div className="flex flex-col items-center justify-center relative z-20 transition-all select-none">
        {/* Corner Role Badge above Avatar */}
        <div className="h-6 flex items-center justify-center mb-1">
          {isThisServer && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-md">
              <span>🏸</span>
              <span>เสิร์ฟ (SERVER)</span>
            </span>
          )}
          {isThisReceiver && (
            <span className="flex items-center gap-1 rounded-full bg-cyan-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-md">
              <span>🎯</span>
              <span>รับเสิร์ฟ (RECEIVER)</span>
            </span>
          )}
          {!isThisServer && !isThisReceiver && (
            <span className="text-[9px] font-bold text-white/60">
              คู่ร่วมทีม (Partner)
            </span>
          )}
        </div>

        {/* Circular Player Image / Avatar Container */}
        <div
          className={`relative flex items-center justify-center rounded-full overflow-hidden transition-all duration-200 ${
            isThisServer
              ? "h-16 w-16 sm:h-20 sm:w-20 border-4 border-amber-400 ring-4 ring-amber-400/50 shadow-xl shadow-amber-400/30 bg-amber-500/20"
              : isThisReceiver
              ? "h-16 w-16 sm:h-20 sm:w-20 border-4 border-cyan-400 ring-4 ring-cyan-400/50 shadow-xl shadow-cyan-400/30 bg-cyan-500/20"
              : "h-14 w-14 sm:h-16 sm:w-16 border-2 border-white/50 bg-white/20 text-white/90"
          }`}
        >
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.name}
              className="h-full w-full object-cover rounded-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-display font-black text-sm sm:text-base">
              {initials}
            </div>
          )}

          {/* Mini Corner Watermark Indicator */}
          {isThisServer && (
            <span className="absolute bottom-0 right-0 rounded-tl-lg bg-amber-400 px-1 py-0.2 text-[9px] font-black text-slate-950">
              🏸
            </span>
          )}
          {isThisReceiver && (
            <span className="absolute bottom-0 right-0 rounded-tl-lg bg-cyan-400 px-1 py-0.2 text-[9px] font-black text-slate-950">
              🎯
            </span>
          )}
        </div>

        {/* Player Name and Corner Details */}
        <span
          className={`mt-1 font-display text-xs sm:text-sm font-black truncate max-w-[130px] px-2 py-0.5 rounded-md ${
            isThisServer
              ? "bg-black/70 text-amber-300 shadow-xs"
              : isThisReceiver
              ? "bg-black/70 text-cyan-300 shadow-xs"
              : "text-white/90 drop-shadow-sm"
          }`}
        >
          {player.name}
        </span>
        <span className="text-[9px] font-bold text-white/70">
          {cornerName} ({isEvenBox ? "คู่" : "คี่"})
        </span>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-lg select-none space-y-3">
      {/* Top Banner: Serving / Receiving Status & Rules Button */}
      <div className="card-floating rounded-2xl border border-line bg-surface p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-display text-xs font-black text-ink">
              ตำแหน่งการเสิร์ฟตามกติกา BWF สากล
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-brand hover:text-brand-dark transition-colors cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>ดูกติกาการเสิร์ฟ (8 ข้อ)</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Server Pill */}
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-2 text-ink">
            <div className="h-8 w-8 rounded-full border-2 border-amber-400 bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
              🏸
            </div>
            <div className="min-w-0">
              <div className="font-bold truncate">
                ผู้เสิร์ฟ: <span className="text-amber-600 dark:text-amber-400 font-black">{serverPlayer?.name || "—"}</span>
              </div>
              <div className="text-[10px] text-ink-soft">
                แต้ม {servingScore} ({isEvenScore ? "คู่" : "คี่"}) → คอร์ท{isEvenScore ? "ขวา" : "ซ้าย"}
              </div>
            </div>
          </div>

          {/* Receiver Pill */}
          <div className="flex items-center gap-2.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-2 text-ink">
            <div className="h-8 w-8 rounded-full border-2 border-cyan-400 bg-cyan-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              🎯
            </div>
            <div className="min-w-0">
              <div className="font-bold truncate">
                ผู้รับ: <span className="text-cyan-600 dark:text-cyan-400 font-black">{receiverPlayer?.name || "—"}</span>
              </div>
              <div className="text-[10px] text-ink-soft">
                ยืนรับในคอร์ททแยงมุม
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Badminton Court Canvas (No animation lines per user request) */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border-4 border-white/95 bg-[#0e6d4c] p-2.5 shadow-2xl dark:border-emerald-500/50 dark:bg-[#074b33]">
        {/* Court Boundary & Tramlines */}
        {/* Doubles sideline: Full width (outer border) */}
        {/* Singles sideline insets: Inner line */}
        <div className="absolute inset-x-3 inset-y-0 border-x-2 border-white/70 pointer-events-none" />

        {/* Back tramline insets (top and bottom) */}
        <div className="absolute inset-x-0 inset-y-3.5 border-y-2 border-white/70 pointer-events-none" />

        {/* Center Net */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center pointer-events-none">
          <div className="h-2 w-full bg-white shadow-md border-y border-slate-300" />
          <span className="absolute rounded-full bg-slate-950/90 px-3 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300 border border-white/20 backdrop-blur-md shadow-md">
            🏸 ตาข่าย (NET) 🏸
          </span>
        </div>

        {/* Short service lines */}
        <div className="absolute inset-x-0 top-[37%] h-0.5 bg-white/75 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-[37%] h-0.5 bg-white/75 pointer-events-none" />

        {/* Center service lines (dividing left & right courts) */}
        <div className="absolute inset-y-3.5 left-1/2 w-0.5 -translate-x-1/2 bg-white/75 pointer-events-none" />

        {/* Court Quadrants Layout */}
        <div className="relative z-10 flex h-full flex-col justify-between text-white">
          {/* Top Half: Team 2 */}
          <div className="flex h-[46%] flex-col justify-between pt-1">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-0.5 text-[11px] font-black text-amber-300 border border-white/10 backdrop-blur-xs">
                <span>{team2Name}</span>
                {servingTeam === 2 && <span className="text-[10px] text-amber-400 font-bold">(เสิร์ฟ)</span>}
              </span>
            </div>

            <div className="grid h-full grid-cols-2 gap-2 p-1.5">
              {/* Team 2 Screen Left = Team 2's Right Court (Even score: 0, 2, 4, 6...) */}
              <div className="flex items-center justify-center rounded-2xl">
                <PlayerToken
                  player={positions.team2_right}
                  cornerName="คอร์ทขวา"
                  isEvenBox={true}
                />
              </div>

              {/* Team 2 Screen Right = Team 2's Left Court (Odd score: 1, 3, 5, 7...) */}
              <div className="flex items-center justify-center rounded-2xl">
                <PlayerToken
                  player={positions.team2_left}
                  cornerName="คอร์ทซ้าย"
                  isEvenBox={false}
                />
              </div>
            </div>
          </div>

          {/* Bottom Half: Team 1 */}
          <div className="flex h-[46%] flex-col justify-between pb-1">
            <div className="grid h-full grid-cols-2 gap-2 p-1.5">
              {/* Team 1 Screen Left = Team 1's Left Court (Odd score: 1, 3, 5, 7...) */}
              <div className="flex items-center justify-center rounded-2xl">
                <PlayerToken
                  player={positions.team1_left}
                  cornerName="คอร์ทซ้าย"
                  isEvenBox={false}
                />
              </div>

              {/* Team 1 Screen Right = Team 1's Right Court (Even score: 0, 2, 4, 6...) */}
              <div className="flex items-center justify-center rounded-2xl">
                <PlayerToken
                  player={positions.team1_right}
                  cornerName="คอร์ทขวา"
                  isEvenBox={true}
                />
              </div>
            </div>

            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-0.5 text-[11px] font-black text-cyan-300 border border-white/10 backdrop-blur-xs">
                <span>{team1Name}</span>
                {servingTeam === 1 && <span className="text-[10px] text-amber-400 font-bold">(เสิร์ฟ)</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official BWF Service Rules Modal (กติกาการเสิร์ฟแบดมินตัน 8 ข้อ) */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">กติกาการเสิร์ฟแบดมินตัน (BWF)</h3>
                  <p className="text-[11px] text-ink-soft">มาตรฐานสหพันธ์แบดมินตันโลกสำหรับการแข่งขัน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="rounded-full p-1.5 text-ink-soft hover:bg-surface-raised hover:text-ink transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-ink">
              {/* Rule 1 */}
              <div className="rounded-2xl border border-line bg-surface-raised p-3.5 space-y-1">
                <div className="font-bold text-ink flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-black">1</span>
                  <span>ผู้เสิร์ฟและผู้รับต้องยืนอยู่ในช่องเสิร์ฟที่ถูกต้อง</span>
                </div>
                <ul className="list-disc list-inside text-ink-soft space-y-0.5 pl-6">
                  <li>ผู้เสิร์ฟต้องอยู่ในช่องเสิร์ฟฝั่งตรงข้ามกับผู้รับ</li>
                  <li>ห้ามเหยียบเส้นเขตของช่องเสิร์ฟขณะเสิร์ฟ</li>
                </ul>
              </div>

              {/* Rule 2 */}
              <div className="rounded-2xl border border-line bg-surface-raised p-3.5 space-y-1">
                <div className="font-bold text-ink flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-black">2</span>
                  <span>คะแนนเป็นตัวกำหนดฝั่งการเสิร์ฟ</span>
                </div>
                <ul className="list-disc list-inside text-ink-soft space-y-0.5 pl-6">
                  <li>หากผู้เสิร์ฟมีคะแนน <strong>เป็นเลขคู่ (0, 2, 4, 6, ...)</strong> ให้เสิร์ฟจากฝั่งขวา</li>
                  <li>หากผู้เสิร์ฟมีคะแนน <strong>เป็นเลขคี่ (1, 3, 5, 7, ...)</strong> ให้เสิร์ฟจากฝั่งซ้าย</li>
                </ul>
              </div>

              {/* Rule 3 */}
              <div className="rounded-2xl border border-line bg-surface-raised p-3.5 space-y-1">
                <div className="font-bold text-ink flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-black">3</span>
                  <span>ต้องเสิร์ฟเฉียงไปยังช่องรับ</span>
                </div>
                <ul className="list-disc list-inside text-ink-soft space-y-0.5 pl-6">
                  <li>ลูกเสิร์ฟต้องข้ามตาข่ายและตกในช่องเสิร์ฟฝั่งตรงข้ามที่อยู่ในแนวทแยง</li>
                  <li>หากลูกตกนอกช่องหรือไม่ข้ามตาข่าย ถือว่าเสียคะแนน</li>
                </ul>
              </div>

              {/* Rule 4 */}
              <div className="rounded-2xl border border-line bg-surface-raised p-3.5 space-y-1">
                <div className="font-bold text-ink flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-black">4</span>
                  <span>การตีลูกขณะเสิร์ฟ</span>
                </div>
                <ul className="list-disc list-inside text-ink-soft space-y-0.5 pl-6">
                  <li>ต้องตีส่วนฐานของลูกขนไก่ก่อน</li>
                  <li>การเสิร์ฟต้องเป็นจังหวะต่อเนื่อง ห้ามหยุดหรือถ่วงเวลาโดยไม่จำเป็น</li>
                  <li>ห้ามทำท่าหลอกหรือเคลื่อนไหวผิดกติกาเพื่อรบกวนผู้รับ</li>
                </ul>
              </div>

              {/* Rule 5 */}
              <div className="rounded-2xl border border-line bg-surface-raised p-3.5 space-y-1">
                <div className="font-bold text-ink flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-black">5</span>
                  <span>ห้ามเหยียบเส้นขณะเสิร์ฟ</span>
                </div>
                <ul className="list-disc list-inside text-ink-soft space-y-0.5 pl-6">
                  <li>เท้าของผู้เสิร์ฟและผู้รับต้องอยู่ภายในพื้นที่ที่กำหนด</li>
                  <li>ห้ามยกหรือเลื่อนเท้าจนผิดตำแหน่งก่อนลูกถูกตี</li>
                </ul>
              </div>

              {/* Rule 6 */}
              <div className="rounded-2xl border border-line bg-surface-raised p-3.5 space-y-1">
                <div className="font-bold text-ink flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-black">6</span>
                  <span>ประเภทเดี่ยวและประเภทคู่</span>
                </div>
                <ul className="list-disc list-inside text-ink-soft space-y-0.5 pl-6">
                  <li>ประเภทเดี่ยวใช้เส้นด้านข้าง <strong>เส้นใน</strong></li>
                  <li>ประเภทคู่ใช้เส้นด้านข้าง <strong>เส้นนอก</strong></li>
                  <li>ในการเสิร์ฟ ลูกต้องตกในพื้นที่เสิร์ฟที่กำหนดตามประเภทการแข่งขัน</li>
                </ul>
              </div>

              {/* Rule 7 */}
              <div className="rounded-2xl border border-line bg-surface-raised p-3.5 space-y-1">
                <div className="font-bold text-ink flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[10px] font-black">7</span>
                  <span>การเปลี่ยนฝั่งเสิร์ฟ</span>
                </div>
                <ul className="list-disc list-inside text-ink-soft space-y-0.5 pl-6">
                  <li>ฝ่ายที่ชนะในแต่ละแรลลี่จะได้ <strong>1 คะแนน</strong></li>
                  <li>หากฝ่ายเสิร์ฟชนะ จะได้คะแนนและเสิร์ฟต่อ โดยเปลี่ยนช่องเสิร์ฟตามคะแนน</li>
                  <li>หากฝ่ายรับชนะ จะได้คะแนนและเปลี่ยนเป็นฝ่ายเสิร์ฟ (ผู้เล่นไม่สลับช่อง)</li>
                </ul>
              </div>

              {/* Rule 8 */}
              <div className="rounded-2xl border border-danger/20 bg-danger/10 p-3.5 space-y-1 text-danger">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white text-[10px] font-black">8</span>
                  <span>กรณีเสิร์ฟผิด (ฟาวล์)</span>
                </div>
                <p className="pl-6 text-[11px]">
                  หากผู้เล่นเสิร์ฟผิดช่อง เหยียบเส้น ลูกไม่ข้ามตาข่าย หรือลูกตกผิดพื้นที่ ให้ถือว่าเป็น <strong>ฟาวล์</strong> และฝ่ายตรงข้ามได้คะแนนทันที
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="rounded-xl font-bold bg-brand text-white px-5 py-2.5 text-xs shadow-xs hover:bg-brand-dark cursor-pointer"
              >
                เข้าใจแล้ว ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
