"use client";

import { useState, useEffect } from "react";
import { Maximize2, Minimize2, Trophy, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DisplayClientProps {
  matchId: string;
  eventName: string;
  courtNo?: number | null;
  teamAName: string;
  teamBName: string;
  initialScoreA?: string | null;
  initialScoreB?: string | null;
  status: string;
}

export function DisplayClient({
  matchId,
  eventName,
  courtNo,
  teamAName,
  teamBName,
  initialScoreA,
  initialScoreB,
  status,
}: DisplayClientProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  // Periodic polling for live scores in projector mode
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scoreA = initialScoreA || "0";
  const scoreB = initialScoreB || "0";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-white p-6 sm:p-12 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <span className="rounded-2xl bg-amber-500 text-slate-950 px-5 py-2 text-xl font-black tracking-widest uppercase">
            {courtNo ? `COURT ${courtNo}` : "COURT 1"}
          </span>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
              {eventName}
            </h1>
            <p className="text-xs font-bold text-white/50 tracking-wider uppercase mt-0.5">
              Official BWF Live Scoreboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 text-sm font-black animate-pulse">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            LIVE
          </span>

          <Button
            variant="secondary"
            onClick={toggleFullscreen}
            className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20 p-3"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Main Huge Arena Scoreboard */}
      <main className="grid grid-cols-2 gap-8 items-center flex-1 my-auto">
        {/* Left Team: Team A */}
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl space-y-4">
          <h2 className="font-display text-4xl sm:text-5xl font-black text-amber-400 text-center tracking-tight truncate max-w-full">
            {teamAName}
          </h2>
          <div className="font-mono text-8xl sm:text-9xl font-black tracking-tighter text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
            {scoreA}
          </div>
        </div>

        {/* Right Team: Team B */}
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl space-y-4">
          <h2 className="font-display text-4xl sm:text-5xl font-black text-emerald-400 text-center tracking-tight truncate max-w-full">
            {teamBName}
          </h2>
          <div className="font-mono text-8xl sm:text-9xl font-black tracking-tighter text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
            {scoreB}
          </div>
        </div>
      </main>

      {/* Footer Bar */}
      <footer className="border-t border-white/10 pt-4 flex items-center justify-between text-xs font-bold text-white/40">
        <span>SportHub Tournament Arena System · Auto-refresh active</span>
        <span>Press F11 for full screen</span>
      </footer>
    </div>
  );
}
