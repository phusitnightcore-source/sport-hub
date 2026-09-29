"use client";

import { useState } from "react";
import {
  Trophy,
  Users,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Loader2,
  Award,
  ChevronRight,
  ShieldCheck,
  X,
  AlertCircle,
  Video,
  ExternalLink,
  ClipboardCheck,
  UserCheck,
  Shuffle,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  updateMatchScoreAction,
  updateTournamentStatusAction,
  addTeamAction,
  verifyRegistrationAction,
  checkInAthleteAction,
  generateTournamentDrawAction,
  verifyTournamentPaymentAction,
  generateGroupKnockoutStageAction,
} from "../actions";
import toast from "react-hot-toast";

interface Team {
  id: string;
  name: string;
  seed?: number | null;
}

interface Match {
  id: string;
  category_id?: string | null;
  round: number;
  match_number: number;
  status: string;
  score_a: string | null;
  score_b: string | null;
  winner_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  court_id: string | null;
  match_type?: string;
  notes?: string | null;
  team_a?: Team | null;
  team_b?: Team | null;
}

interface Court {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Registration {
  id: string;
  player_id: string;
  team_id: string | null;
  payment_status: "pending" | "paid" | "refunded";
  slip_image_url: string | null;
  payment_notes: string | null;
  verification_status: "pending" | "approved" | "rejected" | "auto_approved";
  verification_notes: string | null;
  video_url: string | null;
  partner_name: string | null;
  rating_at_registration: number | null;
  checkin_status: "not_checked_in" | "checked_in";
  checked_in_at: string | null;
  registered_at: string;
  profiles?: {
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
    skill_level: string | null;
    mmr: number | null;
  } | null;
}

export function TournamentAdminClient({
  tournamentId,
  status,
  teams,
  matches,
  courts,
  categories = [],
  registrations = [],
  requireVideoProof = false,
  skillVerificationMode = "skill_level",
  format = "knockout",
}: {
  tournamentId: string;
  status: string;
  teams: Team[];
  matches: Match[];
  courts: Court[];
  categories?: Category[];
  registrations?: Registration[];
  requireVideoProof?: boolean;
  skillVerificationMode?: string;
  format?: string;
}) {
  const [activeTab, setActiveTab] = useState<"matches" | "payment" | "verification" | "checkin" | "teams">("matches");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reject Modal state
  const [rejectingRegId, setRejectingRegId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  // Score modal states
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState("");

  // Draw Generation
  async function handleGenerateDraw(mode: "seeded" | "random" | "group") {
    const label = mode === "seeded" ? "จัดสายตามมือวาง" : mode === "random" ? "สุ่มจับสลาก" : "จัดสายรอบแบ่งกลุ่ม";
    if (!confirm(`ต้องการ${label}ใช่หรือไม่? แมตช์เดิมจะถูกสร้างใหม่ทั้งหมด`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await generateTournamentDrawAction(tournamentId, mode);
      if (res.success) {
        toast.success(`${label}สำเร็จ (${res.count} แมตช์)`);
      } else {
        setError(res.error || "เกิดข้อผิดพลาดในการจัดสายแข่ง");
        toast.error(res.error || "จัดสายไม่สำเร็จ");
      }
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการจัดสาย");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateKnockout() {
    if (!confirm("สร้างรอบน็อกเอาต์จากอันดับรอบแบ่งกลุ่มใช่หรือไม่?")) return;
    setLoading(true);
    try {
      const res = await generateGroupKnockoutStageAction(tournamentId);
      if (res.success) toast.success(`สร้างรอบน็อกเอาต์แล้ว ${res.count} แมตช์`);
      else toast.error(res.error || "สร้างรอบน็อกเอาต์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  // Verification Handler
  async function handleVerify(regId: string, verStatus: "approved" | "rejected", notes?: string) {
    setLoading(true);
    try {
      const res = await verifyRegistrationAction(regId, verStatus, notes);
      if (res.success) {
        toast.success(verStatus === "approved" ? "อนุมัติระดับมือสำเร็จ" : "ปฏิเสธการตรวจสอบสำเร็จ");
        setRejectingRegId(null);
        setRejectNotes("");
      } else {
        toast.error(res.error || "ดำเนินการไม่สำเร็จ");
      }
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment(regId: string, approved: boolean) {
    setLoading(true);
    try {
      const res = await verifyTournamentPaymentAction(regId, approved);
      if (res.success) toast.success(approved ? "ยืนยันค่าสมัครแล้ว" : "ตั้งสถานะรอชำระอีกครั้งแล้ว");
      else toast.error(res.error || "อัปเดตการชำระเงินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  // Athlete Check-in Handler
  async function handleCheckIn(regId: string) {
    setLoading(true);
    try {
      const res = await checkInAthleteAction(regId);
      if (res.success) {
        toast.success(res.checkin_status === "checked_in" ? "เช็กอินรายงานตัวสำเร็จ!" : "ยกเลิกเช็กอินแล้ว");
      } else {
        toast.error(res.error || "เช็กอินไม่สำเร็จ");
      }
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  // Status Change
  async function handleStatusChange(newStatus: string) {
    setLoading(true);
    const res = await updateTournamentStatusAction(tournamentId, newStatus);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "เปลี่ยนสถานะไม่สำเร็จ");
    } else {
      toast.success("อัปเดตสถานะการแข่งขันแล้ว");
    }
  }

  // Add Team
  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    const res = await addTeamAction(tournamentId, teamName);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "เพิ่มทีมไม่สำเร็จ");
    } else {
      toast.success("เพิ่มทีมสำเร็จ");
      setTeamName("");
      setIsAddTeamOpen(false);
    }
  }

  // Open match score modal
  function openScoreModal(match: Match) {
    setSelectedMatch(match);
    setScoreA(match.score_a || "");
    setScoreB(match.score_b || "");
    setWinnerId(match.winner_id || match.team_a_id || "");
    setSelectedCourtId(match.court_id || "");
  }

  // Submit Match Score
  async function handleScoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatch || !winnerId) return;

    setLoading(true);
    const res = await updateMatchScoreAction(
      selectedMatch.id,
      scoreA,
      scoreB,
      winnerId,
      selectedCourtId || undefined
    );
    setLoading(false);

    if (!res.success) {
      toast.error(res.error || "บันทึกผลการแข่งขันไม่สำเร็จ");
    } else {
      toast.success("บันทึกผลคะแนนเรียบร้อย");
      setSelectedMatch(null);
    }
  }

  const pendingVerifications = registrations.filter((r) => r.verification_status === "pending");
  const pendingPayments = registrations.filter((r) => r.payment_status === "pending").length;
  const checkedInCount = registrations.filter((r) => r.checkin_status === "checked_in").length;
  const paidCount = registrations.filter((r) => r.payment_status === "paid").length;
  const verifiedCount = registrations.filter((r) => r.verification_status === "approved" || r.verification_status === "auto_approved").length;
  const visibleMatches = selectedCategoryId === "all"
    ? matches
    : matches.filter((match) => match.category_id === selectedCategoryId);
  const categoryName = (categoryId?: string | null) => categories.find((category) => category.id === categoryId)?.name || "ประเภททั่วไป";

  return (
    <div className="space-y-6">
      {/* Top Status Banner & Flow Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body-xs font-bold text-ink-soft mr-1">สถานะรายการ:</span>
          {["registration_open", "registration_closed", "in_progress", "completed"].map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              disabled={loading || status === st}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                status === st
                  ? "bg-brand text-white shadow-xs"
                  : "bg-surface-raised border border-line text-ink-soft hover:text-ink hover:border-brand/40"
              }`}
            >
              {st === "registration_open"
                ? "🟢 1. เปิดรับสมัคร"
                : st === "registration_closed"
                ? "🟡 2. ปิดรับสมัคร"
                : st === "in_progress"
                ? "⚡ 3. กำลังแข่งขัน"
                : "🏁 4. จบการแข่งขัน"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsAddTeamOpen(true)}
            className="rounded-xl font-bold border-line text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มทีมด้วยตนเอง</span>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="ความพร้อมของการแข่งขัน">
        {[
          { label: "สมัครแล้ว", value: `${registrations.length}`, hint: "ทีม", tone: "text-ink" },
          { label: "ชำระแล้ว", value: `${paidCount}/${registrations.length}`, hint: "รอตรวจสลิป", tone: "text-emerald-600" },
          { label: "ผ่านคัดกรอง", value: `${verifiedCount}/${registrations.length}`, hint: requireVideoProof ? "ตรวจคลิปแล้ว" : "พร้อมแข่งขัน", tone: "text-brand" },
          { label: "เช็กอินแล้ว", value: `${checkedInCount}/${registrations.length}`, hint: "วันแข่งขัน", tone: "text-amber-600" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-line bg-surface p-3.5 shadow-xs">
            <p className="text-[11px] font-bold text-ink-soft">{metric.label}</p>
            <p className={`mt-1 font-display text-xl font-black ${metric.tone}`}>{metric.value}</p>
            <p className="mt-0.5 text-[10px] text-ink-soft">{metric.hint}</p>
          </div>
        ))}
      </section>

      {/* Organizer Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveTab("payment")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all cursor-pointer relative ${
            activeTab === "payment"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-soft hover:bg-surface-raised hover:text-ink"
          }`}
        >
          <span>💳 ตรวจสลิปค่าสมัคร</span>
          {pendingPayments > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-black">{pendingPayments}</span>}
        </button>

        <button
          onClick={() => setActiveTab("matches")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all cursor-pointer ${
            activeTab === "matches"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-soft hover:bg-surface-raised hover:text-ink"
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>สายแข่ง & ผลสด ({matches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("verification")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all cursor-pointer relative ${
            activeTab === "verification"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-soft hover:bg-surface-raised hover:text-ink"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>ตรวจระดับ & คลิปวิดีโอ</span>
          {pendingVerifications.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-black">
              {pendingVerifications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("checkin")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all cursor-pointer ${
            activeTab === "checkin"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-soft hover:bg-surface-raised hover:text-ink"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>โต๊ะเช็กอินรายงานตัว ({checkedInCount}/{registrations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("teams")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-body-sm font-bold transition-all cursor-pointer ${
            activeTab === "teams"
              ? "bg-brand text-white shadow-xs"
              : "text-ink-soft hover:bg-surface-raised hover:text-ink"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>รายชื่อทีมทั้งหมด ({teams.length})</span>
        </button>
      </div>

      {/* TAB 1: MATCHES & DRAW ENGINE */}
      {activeTab === "matches" && (
        <div className="space-y-6">
          {/* Draw Actions Bar */}
          <div className="card-floating rounded-3xl border border-line bg-surface p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div>
              <h4 className="font-display text-sm font-bold text-ink">สร้างและจัดสายการแข่งขัน (Draw Engine)</h4>
              <p className="text-[12px] text-ink-soft">
                รองรับ Seed 1-4, BYE อัตโนมัติสำหรับจำนวนคู่ไม่ลงตัว และชิงอันดับ 3
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => handleGenerateDraw("seeded")}
                disabled={loading || teams.length < 2}
                className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ListOrdered className="h-4 w-4" />
                <span>จัดสายตามมือวาง (Seeded)</span>
              </Button>

              <Button
                onClick={() => handleGenerateDraw("random")}
                disabled={loading || teams.length < 2}
                className="rounded-xl font-bold bg-brand hover:bg-brand-dark text-white text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Shuffle className="h-4 w-4" />
                <span>สุ่มจับสลาก (Random Draw)</span>
              </Button>

              {format !== "knockout" && (
                <Button
                  onClick={() => handleGenerateDraw("group")}
                  disabled={loading || teams.length < 2}
                  variant="secondary"
                  className="rounded-xl font-bold border-line text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="h-4 w-4" />
                  <span>จัดสายรอบกลุ่ม (Round-Robin)</span>
                </Button>
              )}
              {format === "group_knockout" && (
                <Button
                  onClick={handleGenerateKnockout}
                  disabled={loading}
                  variant="secondary"
                  className="rounded-xl font-bold border-line text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trophy className="h-4 w-4" />
                  <span>สร้างรอบน็อกเอาต์จากกลุ่ม</span>
                </Button>
              )}
            </div>
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-3">
              <span className="px-1 text-xs font-bold text-ink-soft">แสดงประเภท:</span>
              <button
                onClick={() => setSelectedCategoryId("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${selectedCategoryId === "all" ? "bg-brand text-white" : "bg-surface-raised text-ink-soft hover:text-ink"}`}
              >ทั้งหมด</button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${selectedCategoryId === category.id ? "bg-brand text-white" : "bg-surface-raised text-ink-soft hover:text-ink"}`}
                >{category.name}</button>
              ))}
            </div>
          )}

          {/* Matches Grid */}
          {visibleMatches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line p-12 text-center text-body-sm text-ink-soft">
              ยังไม่มีสายการแข่งขัน กรุณากดปุ่ม <strong>&quot;จัดสายตามมือวาง&quot;</strong> หรือ <strong>&quot;สุ่มจับสลาก&quot;</strong> ด้านบน
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleMatches.map((m) => {
                const isCompleted = m.status === "completed";
                const canRecordResult = Boolean(m.team_a_id && m.team_b_id && !isCompleted);
                const courtName = courts.find((court) => court.id === m.court_id)?.name;
                const aWon = isCompleted && m.winner_id === m.team_a_id;
                const bWon = isCompleted && m.winner_id === m.team_b_id;

                return (
                  <div
                    key={m.id}
                    onClick={() => canRecordResult && openScoreModal(m)}
                    className={`card-floating rounded-2xl border p-4 transition-all space-y-3 ${
                      canRecordResult ? "cursor-pointer hover:border-brand hover:shadow-md" : "cursor-default"
                    } ${
                      isCompleted ? "border-line bg-surface" : "border-brand/40 bg-brand-soft/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-ink-soft">
                        {categoryName(m.category_id)} · รอบที่ {m.round} · แมตช์ #{m.match_number}
                        {m.match_type === "third_place" && (
                          <span className="ml-1.5 text-amber-500 font-bold">(ชิงอันดับ 3)</span>
                        )}
                      </span>
                      {courtName && <span className="text-brand">🏸 {courtName}</span>}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          isCompleted
                            ? "bg-surface-raised text-ink-soft"
                            : "bg-brand/15 text-brand"
                        }`}
                      >
                        {isCompleted ? "แข่งเสร็จแล้ว" : "รอแข่ง / กำลังแข่ง"}
                      </span>
                    </div>

                    {/* Team A */}
                    <div
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                        aWon ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold ring-1 ring-amber-500/30" : "bg-surface-raised text-ink"
                      }`}
                    >
                      <span className="truncate">{m.team_a?.name ?? "TBD (รอผลรอบก่อน)"}</span>
                      <span className="font-mono font-bold">{m.score_a ?? "-"}</span>
                    </div>

                    {/* Team B */}
                    <div
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                        bWon ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold ring-1 ring-amber-500/30" : "bg-surface-raised text-ink"
                      }`}
                    >
                      <span className="truncate">{m.team_b?.name ?? "TBD (รอผลรอบก่อน)"}</span>
                      <span className="font-mono font-bold">{m.score_b ?? "-"}</span>
                    </div>

                    <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-brand hover:underline">
                        {isCompleted
                          ? "ผลยืนยันแล้ว"
                          : canRecordResult
                          ? "👉 บันทึกผลด่วน"
                          : "รอผลจากรอบก่อน"}
                      </span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {m.team_a_id && m.team_b_id ? (
                          <a
                            href={`/umpire/match/${m.id}`}
                            target="_blank"
                            className="rounded-lg bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-brand-soft/80 flex items-center gap-1"
                          >
                            <span>🏸 นับแต้ม BWF</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="rounded-lg bg-surface-raised px-2.5 py-1 text-[11px] font-bold text-ink-soft">
                            รอทีมครบ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "payment" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-ink">ตรวจสอบการชำระค่าสมัคร</h4>
            <span className="text-xs text-ink-soft">รอยืนยัน {pendingPayments} รายการ</span>
          </div>
          {registrations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line p-12 text-center text-body-sm text-ink-soft">ยังไม่มีรายการชำระเงิน</div>
          ) : registrations.map((registration) => {
            const name = registration.profiles?.display_name || registration.profiles?.full_name || "นักกีฬา";
            const isPaid = registration.payment_status === "paid";
            return (
              <div key={registration.id} className="card-floating flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-bold text-ink">{name} {registration.partner_name ? `· ${registration.partner_name}` : ""}</div>
                  <div className={`mt-1 text-xs font-bold ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>{isPaid ? "✓ ชำระแล้ว" : "รอตรวจสลิป"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {registration.slip_image_url ? <span className="rounded-lg bg-surface-raised px-3 py-1.5 text-xs text-ink-soft">แนบสลิปแล้ว</span> : <span className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs text-danger">ไม่พบสลิป</span>}
                  <Button size="sm" disabled={loading || isPaid || !registration.slip_image_url} onClick={() => handlePayment(registration.id, true)} className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">ยืนยันชำระ</Button>
                  {isPaid && <Button size="sm" variant="secondary" disabled={loading} onClick={() => handlePayment(registration.id, false)} className="rounded-xl text-xs font-bold">เปิดเป็นรอตรวจ</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: SKILL & VIDEO VERIFICATION */}
      {activeTab === "verification" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand" />
              <span>คิวตรวจสอบระดับมือและคลิปวิดีโอ ({registrations.length} รายการ)</span>
            </h4>
            <span className="text-xs text-ink-soft">
              โหมดการตรวจสอบ: {skillVerificationMode === "skill_level" ? "🎯 แบ่งตามระดับมือ" : skillVerificationMode === "rating" ? "⚡ SportHub Rating" : "🌟 Open"}
            </span>
          </div>

          {registrations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line p-12 text-center text-body-sm text-ink-soft">
              ยังไม่มีผู้สมัครลงทะเบียนในรายการนี้
            </div>
          ) : (
            <div className="space-y-3">
              {registrations.map((reg) => {
                const p = reg.profiles;
                const name = p?.display_name || p?.full_name || "นักกีฬา";
                const isPending = reg.verification_status === "pending";
                const isApproved = reg.verification_status === "approved" || reg.verification_status === "auto_approved";
                const isRejected = reg.verification_status === "rejected";

                return (
                  <div
                    key={reg.id}
                    className="card-floating rounded-2xl border border-line bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-display text-sm font-bold text-ink">{name}</span>
                        {reg.partner_name && (
                          <span className="text-xs text-ink-soft font-semibold">
                            / คู่หู: <strong className="text-ink">{reg.partner_name}</strong>
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            isPending
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : isApproved
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-danger/15 text-danger"
                          }`}
                        >
                          {isPending ? "⏳ รอตรวจสอบคลิป" : isApproved ? "✅ อนุมัติแล้ว" : "❌ ไม่ผ่าน"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-soft">
                        <span>ระดับฝีมือ: <strong>{p?.skill_level || "ไม่ระบุ"}</strong></span>
                        <span>•</span>
                        <span>SportHub Rating (MMR): <strong className="text-brand font-mono">{reg.rating_at_registration ?? p?.mmr ?? 1000}</strong></span>
                        <span>•</span>
                        <span>สมัครเมื่อ: {new Date(reg.registered_at).toLocaleDateString("th-TH")}</span>
                      </div>

                      {reg.verification_notes && (
                        <p className="text-[11px] text-danger bg-danger/5 rounded-lg p-2 border border-danger/20">
                          หมายเหตุ: {reg.verification_notes}
                        </p>
                      )}
                    </div>

                    {/* Actions: Watch clip & Approve/Reject buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {reg.video_url ? (
                        <a
                          href={reg.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 flex items-center gap-1.5 transition-all"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>ดูคลิปวิดีโอ</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-ink-soft italic">ไม่มีคลิปแนบ</span>
                      )}

                      <Button
                        size="sm"
                        disabled={loading || isApproved}
                        onClick={() => handleVerify(reg.id, "approved")}
                        className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 cursor-pointer"
                      >
                        ✅ ผ่าน
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={loading}
                        onClick={() => {
                          setRejectingRegId(reg.id);
                          setRejectNotes("");
                        }}
                        className="rounded-xl font-bold border-line text-xs px-3 py-1.5 text-danger hover:bg-danger/10 cursor-pointer"
                      >
                        ❌ ไม่ผ่าน
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ATHLETE CHECK-IN DESK */}
      {activeTab === "checkin" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-brand" />
              <span>โต๊ะรายงานตัวนักกีฬา (Check-in Desk)</span>
            </h4>
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <span>รายงานตัวแล้ว:</span>
              <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-brand font-mono">
                {checkedInCount} / {registrations.length}
              </span>
            </div>
          </div>

          {registrations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line p-12 text-center text-body-sm text-ink-soft">
              ยังไม่มีนักกีฬาลงทะเบียน
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {registrations.map((reg) => {
                const isCheckedIn = reg.checkin_status === "checked_in";
                const p = reg.profiles;
                const name = p?.display_name || p?.full_name || "นักกีฬา";

                return (
                  <div
                    key={reg.id}
                    className={`card-floating rounded-2xl border p-4 flex items-center justify-between gap-3 transition-all ${
                      isCheckedIn
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-line bg-surface"
                    }`}
                  >
                    <div>
                      <div className="font-display text-sm font-bold text-ink">{name}</div>
                      {reg.partner_name && (
                        <div className="text-[11px] text-ink-soft">คู่หู: {reg.partner_name}</div>
                      )}
                      {isCheckedIn && reg.checked_in_at && (
                        <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                          รายงานตัวเมื่อ {new Date(reg.checked_in_at).toLocaleTimeString("th-TH")}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(reg.id)}
                      disabled={loading}
                      className={`rounded-xl text-xs font-bold px-3.5 py-1.5 cursor-pointer ${
                        isCheckedIn
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-surface-raised border border-line text-ink hover:border-brand"
                      }`}
                    >
                      {isCheckedIn ? "✓ เช็กอินแล้ว" : "กดเช็กอิน"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ALL TEAMS */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Users className="h-5 w-5 text-brand" />
              <span>รายชื่อทีมทั้งหมดในระบบ ({teams.length})</span>
            </h4>
            <Button
              size="sm"
              onClick={() => setIsAddTeamOpen(true)}
              className="rounded-xl font-bold bg-brand text-white text-xs cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>เพิ่มทีม</span>
            </Button>
          </div>

          {teams.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line p-12 text-center text-body-sm text-ink-soft">
              ยังไม่มีทีมในระบบ กดปุ่ม &quot;เพิ่มทีม&quot; เพื่อเพิ่มข้อมูล
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {teams.map((t, idx) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-line bg-surface p-3.5 flex items-center gap-3 shadow-xs"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand/10 text-brand font-mono font-black text-xs">
                    #{idx + 1}
                  </span>
                  <span className="font-display text-xs font-bold text-ink truncate">{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Score Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="card-floating w-full max-w-md rounded-3xl border border-line bg-surface p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h4 className="font-display text-base font-bold text-ink">
                บันทึกผลการแข่งขัน (รอบ {selectedMatch.round})
              </h4>
              <button
                onClick={() => setSelectedMatch(null)}
                className="rounded-lg p-1 text-ink-soft hover:bg-surface-raised"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleScoreSubmit} className="space-y-4">
              <div className="space-y-3">
                {/* Team A */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-xs text-ink truncate">
                    {selectedMatch.team_a?.name ?? "ทีม A"}
                  </span>
                  <input
                    type="text"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    placeholder="เช่น 2 หรือ 21-19"
                    className="w-28 rounded-xl border border-line bg-surface-raised px-3 py-1.5 text-center font-mono font-bold text-xs"
                  />
                </div>

                {/* Team B */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-xs text-ink truncate">
                    {selectedMatch.team_b?.name ?? "ทีม B"}
                  </span>
                  <input
                    type="text"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    placeholder="เช่น 0 หรือ 17-21"
                    className="w-28 rounded-xl border border-line bg-surface-raised px-3 py-1.5 text-center font-mono font-bold text-xs"
                  />
                </div>
              </div>

              {/* Winner Selector */}
              <div>
                <label className="block text-body-xs font-bold text-ink mb-1">
                  ทีมผู้ชนะ (เลื่อนเข้ารอบต่อไป) <span className="text-danger">*</span>
                </label>
                <select
                  value={winnerId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-xs font-bold text-ink focus:border-brand focus:outline-none"
                >
                  <option value="">-- เลือกทีมชนะเลิศ --</option>
                  {selectedMatch.team_a_id && (
                    <option value={selectedMatch.team_a_id}>
                      {selectedMatch.team_a?.name}
                    </option>
                  )}
                  {selectedMatch.team_b_id && (
                    <option value={selectedMatch.team_b_id}>
                      {selectedMatch.team_b?.name}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-body-xs font-bold text-ink mb-1">
                  สนามที่ใช้แข่ง
                </label>
                <select
                  value={selectedCourtId}
                  onChange={(e) => setSelectedCourtId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-xs font-bold text-ink focus:border-brand focus:outline-none"
                >
                  <option value="">ยังไม่ระบุสนาม</option>
                  {courts.map((court) => (
                    <option key={court.id} value={court.id}>{court.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedMatch(null)}
                  className="rounded-xl text-xs font-bold"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !winnerId}
                  className="rounded-xl bg-brand text-white text-xs font-bold"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึกผล"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingRegId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="card-floating w-full max-w-md rounded-3xl border border-line bg-surface p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h4 className="font-display text-base font-bold text-danger">
                ปฏิเสธการตรวจสอบระดับมือ
              </h4>
              <button
                onClick={() => setRejectingRegId(null)}
                className="rounded-lg p-1 text-ink-soft hover:bg-surface-raised"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-body-xs font-bold text-ink">
                เหตุผลและระดับที่แนะนำให้นักกีฬาสมัคร:
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="เช่น ระดับมือไม่ตรงตามเกณฑ์ N แนะนำให้ลงสมัครในระดับ P หรือ Open แทน"
                className="w-full rounded-xl border border-line bg-surface-raised p-3 text-xs text-ink focus:border-brand focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRejectingRegId(null)}
                className="rounded-xl text-xs font-bold"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={() => handleVerify(rejectingRegId, "rejected", rejectNotes)}
                disabled={loading}
                className="rounded-xl bg-danger text-white text-xs font-bold"
              >
                {loading ? "กำลังบันทึก..." : "ยืนยันปฏิเสธ"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Modal */}
      {isAddTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="card-floating w-full max-w-sm rounded-3xl border border-line bg-surface p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h4 className="font-display text-base font-bold text-ink">
                เพิ่มทีมเข้าแข่งขัน
              </h4>
              <button
                onClick={() => setIsAddTeamOpen(false)}
                className="rounded-lg p-1 text-ink-soft hover:bg-surface-raised"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="block text-body-xs font-bold text-ink mb-1">
                  ชื่อทีม / คู่แข่งขัน <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="เช่น ทีมสายฟ้า / สมชาย & ภูสิทธิ์"
                  className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddTeamOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !teamName.trim()}
                  className="rounded-xl bg-brand text-white text-xs font-bold"
                >
                  {loading ? "กำลังเพิ่ม..." : "เพิ่มทีม"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
