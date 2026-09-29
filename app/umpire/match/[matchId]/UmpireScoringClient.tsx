"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoringConsole } from "@/components/court/ScoringConsole";
import { saveLiveTournamentScoreAction, syncMatchResultAction } from "@/app/umpire/actions";
import type { Team, EventType, MatchState } from "@/lib/scoring/types";
import { ArrowLeft, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

interface UmpireScoringClientProps {
  matchId: string;
  eventName: string;
  courtNo?: number | null;
  team1: Team;
  team2: Team;
  eventType?: EventType;
}

export function UmpireScoringClient({
  matchId,
  eventName,
  courtNo,
  team1,
  team2,
  eventType = "MD",
}: UmpireScoringClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleStateChange(state: MatchState) {
    if (state.status === "match_finished" || state.status === "walkover" || state.status === "retired") {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveLiveTournamentScoreAction(matchId, state);
    }, 250);
  }

  async function handleMatchFinish(winnerTeamId: string, finalScores: string) {
    setSaving(true);
    toast.loading("กำลังบันทึกผลการแข่งขันและคะแนน Elo...", { id: "finish" });

    try {
      const res = await syncMatchResultAction(matchId, winnerTeamId, finalScores);
      if (res.success) {
        toast.success("บันทึกผลการแข่งขันและขยับสายผู้ชนะสำเร็จ!", { id: "finish" });
        router.refresh();
      } else {
        toast.error(res.error || "เกิดข้อผิดพลาดในการบันทึกผล", { id: "finish" });
      }
    } catch (e: any) {
      toast.error("เกิดข้อผิดพลาด: " + (e?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"), { id: "finish" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between px-2">
        <Link
          href="/umpire"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>กลับหน้ารายการแมตช์</span>
        </Link>

        <Link
          href={`/display/${matchId}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
        >
          <span>เปิดโหมดจอใหญ่ / โปรเจคเตอร์</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Main BWF Scoring Console */}
      <ScoringConsole
        matchId={matchId}
        eventName={eventName}
        courtNo={courtNo}
        team1={team1}
        team2={team2}
        eventType={eventType}
        onMatchFinish={handleMatchFinish}
        onStateChange={handleStateChange}
      />
    </div>
  );
}
