"use client";

import { useState } from "react";
import { Trophy, X, Loader2, Users, AlertCircle, CheckCircle2, Phone, ShieldCheck, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { registerTournamentAction } from "./actions";

export function TournamentRegistrationModal({
  tournamentId,
  tournamentName,
  entryFee,
  categories,
  isRegistered,
  isClosed,
  requireVideoProof = false,
  skillVerificationMode = "skill_level",
}: {
  tournamentId: string;
  tournamentName: string;
  entryFee: number;
  categories: { id: string; name: string }[];
  isRegistered: boolean;
  isClosed: boolean;
  requireVideoProof?: boolean;
  skillVerificationMode?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form local state for live preview
  const [teamName, setTeamName] = useState("");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [player2Avatar, setPlayer2Avatar] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("tournament_id", tournamentId);

    const result = await registerTournamentAction(formData);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "เกิดข้อผิดพลาดในการลงทะเบียน");
    } else {
      setIsSuccess(true);
    }
  }

  if (isRegistered) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-emerald-600 dark:text-emerald-400 font-bold text-body-sm shadow-xs">
        <CheckCircle2 className="h-5 w-5" />
        <span>คุณได้ลงทะเบียนเข้าร่วมแข่งขันแล้ว</span>
      </div>
    );
  }

  if (isClosed) {
    return (
      <Button disabled className="rounded-2xl font-bold bg-ink-soft/20 text-ink-soft px-6 py-3 cursor-not-allowed">
        ปิดรับสมัครแล้ว
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => { setIsOpen(true); setIsSuccess(false); setError(null); }}
        className="rounded-2xl font-extrabold bg-brand text-white shadow-md hover:bg-brand-dark px-6 py-3 flex items-center gap-2 text-body"
      >
        <Trophy className="h-5 w-5 text-amber-300" />
        <span>สมัครเข้าแข่งขัน (฿{entryFee > 0 ? entryFee : "ฟรี"})</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-black text-ink">ลงทะเบียนสมัครทีมแข่งขัน</h3>
                  <p className="text-body-xs text-ink-soft truncate max-w-xs">{tournamentName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-ink-soft hover:bg-surface-raised hover:text-ink transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h4 className="font-display text-xl font-bold text-ink">ลงทะเบียนสำเร็จ!</h4>
                <p className="text-body-sm text-ink-soft max-w-sm mx-auto">
                  ทีมของคุณได้รับการบันทึกเข้าสู่ระบบเรียบร้อยแล้ว รายชื่อและรูปโปรไฟล์วงกลมของทั้ง 2 ท่านจะปรากฏในผังสายแข่งและคอร์ทตัดสิน BWF
                </p>
                <Button
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl font-bold bg-brand text-white shadow-xs px-6 py-2.5 mt-2"
                >
                  เรียบร้อย
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-2xl border border-danger/20 bg-danger/10 p-3.5 text-danger flex items-center gap-2 text-body-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Important Notice: 1 Team = 2 Players (Doubles) */}
                <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-display text-sm font-black text-brand">
                    <Users className="h-4 w-4" />
                    <span>ข้อกำหนดกติกาทีม: 1 ทีมมี 2 คน (ประเภทคู่)</span>
                  </div>
                  <p className="text-body-xs text-ink-soft leading-relaxed">
                    ระบบจะดึงรูปโปรไฟล์ของนักกีฬาทั้ง 2 ท่านมาแสดงเป็น <strong>เหรียญวงกลม (Circular Avatar)</strong> ในหน้าจอนับแต้มสด พร้อมแสดง <strong>ขอบสีทองสำหรับผู้เสิร์ฟ (🏸)</strong> และ <strong>ขอบสีฟ้าสำหรับผู้รับเสิร์ฟ (🎯)</strong> ตามมุมคอร์ทตามกติกาสากล BWF
                  </p>
                </div>

                {/* Team Name */}
                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    ชื่อทีม <span className="text-danger">*</span>
                  </label>
                  <input
                    name="team_name"
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="เช่น Thunder Badminton Club"
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                {categories.length > 0 && (
                  <div>
                    <label className="block text-body-xs font-bold text-ink mb-1">
                      รุ่น / ประเภทการแข่งขัน <span className="text-danger">*</span>
                    </label>
                    <select
                      name="category_id"
                      required
                      className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Player 1 & Player 2 Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Player 1 (Captain) */}
                  <div className="rounded-2xl border border-line bg-surface-raised/60 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-ink">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[10px]">1</span>
                      <span>นักกีฬาคนที่ 1 (กัปตันทีม)</span>
                    </div>
                    <p className="text-[11px] text-ink-soft">ดึงจากบัญชีผู้ใช้ปัจจุบันของคุณ</p>
                    <input
                      name="player1_display_name"
                      type="text"
                      value={player1Name}
                      onChange={(e) => setPlayer1Name(e.target.value)}
                      placeholder="ระบุชื่อที่ต้องการให้แสดงในสนาม"
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
                    />
                  </div>

                  {/* Player 2 (Partner - Required) */}
                  <div className="rounded-2xl border border-brand/30 bg-surface-raised/60 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-ink">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-[10px]">2</span>
                      <span>นักกีฬาคนที่ 2 (คู่หูร่วมทีม)</span>
                      <span className="text-danger">*</span>
                    </div>
                    <p className="text-[11px] text-ink-soft">กรอกชื่อคู่หูที่จะร่วมทีมแข่งขัน</p>
                    <input
                      name="partner_name"
                      type="text"
                      required
                      value={player2Name}
                      onChange={(e) => setPlayer2Name(e.target.value)}
                      placeholder="ชื่อ-นามสกุล คู่แข่งขัน"
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                {/* Video Clip Proof (If required by tournament) */}
                {requireVideoProof && skillVerificationMode === "skill_level" && (
                  <div className="rounded-2xl border border-amber-400/40 bg-amber-500/5 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-ink">
                      <span className="text-base">📹</span>
                      <span>คลิปตีแบดสำหรับตรวจสอบระดับมือ (1–3 นาที) <span className="text-danger">*</span></span>
                    </div>
                    <p className="text-[11px] text-ink-soft">
                      รายการนี้กำหนดให้ส่งคลิปยืนยันระดับมือ กรุณาแนบลิงก์คลิปวิดีโอ (YouTube, TikTok, หรือ Google Drive)
                    </p>
                    <input
                      name="video_url"
                      type="url"
                      required
                      placeholder="เช่น https://www.youtube.com/watch?v=... หรือ TikTok / Google Drive"
                      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      <span>⏳ สถานะหลังสมัคร: จะเข้าสู่คิวรอผู้จัดตรวจสอบระดับมือก่อนเข้าแข่งขัน</span>
                    </div>
                  </div>
                )}

                {/* Contact Phone */}
                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    เบอร์โทรศัพท์สำหรับติดต่อฉุกเฉิน / ประสานงาน <span className="text-danger">*</span>
                  </label>
                  <input
                    name="contact_phone"
                    type="tel"
                    required
                    placeholder="08xxxxxxxx"
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                {/* Live Circular Avatar Preview */}
                <div className="rounded-2xl border border-line bg-surface-raised p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-ink">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>ตัวอย่างการแสดงผลวงกลมในคอร์ทแข่ง (BWF Tokens):</span>
                    </span>
                    <span className="text-[11px] text-ink-soft">1 ทีม 2 คน</span>
                  </div>

                  <div className="flex items-center justify-center gap-8 py-2">
                    {/* Token 1 (Server example) */}
                    <div className="flex flex-col items-center">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-400 ring-4 ring-amber-400/40 bg-amber-400/20 text-slate-950 font-display font-black text-sm shadow-md">
                        <span>🏸 P1</span>
                        <span className="absolute -bottom-1 rounded-full bg-amber-400 px-2 py-0.2 text-[9px] font-black text-slate-950 shadow-xs">
                          เสิร์ฟ
                        </span>
                      </div>
                      <span className="mt-2 text-xs font-bold text-ink max-w-[90px] truncate text-center">
                        {player1Name || "คนที่ 1"}
                      </span>
                    </div>

                    {/* Token 2 (Receiver example) */}
                    <div className="flex flex-col items-center">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-cyan-400 ring-4 ring-cyan-400/40 bg-cyan-400/20 text-cyan-600 dark:text-cyan-300 font-display font-black text-sm shadow-md">
                        <span>🎯 P2</span>
                        <span className="absolute -bottom-1 rounded-full bg-cyan-400 px-2 py-0.2 text-[9px] font-black text-slate-950 shadow-xs">
                          รับเสิร์ฟ
                        </span>
                      </div>
                      <span className="mt-2 text-xs font-bold text-ink max-w-[90px] truncate text-center">
                        {player2Name || "คนที่ 2"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Entry fee */}
                <div className="rounded-2xl border border-line bg-surface-raised p-4 flex items-center justify-between">
                  <span className="text-body-sm font-semibold text-ink-soft">ค่าธรรมเนียมสมัคร:</span>
                  <span className="font-display text-lg font-bold text-brand">
                    {Number(entryFee) > 0 ? `฿${entryFee} / ทีม (2 คน)` : "สมัครฟรี"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl font-bold"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-xl font-bold bg-brand text-white shadow-xs px-5 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>กำลังลงทะเบียน...</span>
                      </>
                    ) : (
                      <span>ยืนยันการสมัครทีม (2 คน)</span>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
