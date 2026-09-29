"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, AlertCircle, Trophy, Video, Users, Clock, ShieldCheck, Award } from "lucide-react";
import { createTournamentAction } from "../actions";
import toast from "react-hot-toast";

interface Branch {
  id: string;
  name: string;
}

export function NewTournamentForm({
  branches,
  today,
  basePath = "/dashboard/tournaments",
}: {
  branches: Branch[];
  today: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [verificationMode, setVerificationMode] = useState<"open" | "skill_level" | "rating">("skill_level");
  const [requireVideo, setRequireVideo] = useState(false);
  const [format, setFormat] = useState<"knockout" | "group_knockout" | "round_robin">("knockout");
  const [hasBronzeMatch, setHasBronzeMatch] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("skill_verification_mode", verificationMode);
    formData.set("require_video_proof", String(requireVideo));
    formData.set("format", format);
    formData.set("has_third_place_match", String(hasBronzeMatch));

    try {
      const res = await createTournamentAction(formData);
      if (res.success && res.id) {
        toast.success("สร้างรายการแข่งขัน BWF สำเร็จ!");
        router.push(`${basePath}/${res.id}`);
      } else {
        setError(res.error || "เกิดข้อผิดพลาดในการสร้างรายการแข่งขัน");
        toast.error(res.error || "สร้างการแข่งขันไม่สำเร็จ");
      }
    } catch (err: any) {
      setError(err?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      toast.error("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-floating rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-7 shadow-xs"
    >
      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 flex items-center gap-3 text-body-sm font-bold text-danger">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-line/60 pb-2">
          <Trophy className="h-5 w-5 text-brand" />
          <h3 className="font-display text-base font-bold text-ink">
            1. ข้อมูลพื้นฐานและสถานที่
          </h3>
        </div>

        <div>
          <label className="block text-body-xs font-bold text-ink mb-1">
            ชื่อรายการแข่งขัน <span className="text-danger">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="เช่น SportHub Badminton Championship 2026"
            className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-body-xs font-bold text-ink mb-1">
              ชนิดกีฬา <span className="text-danger">*</span>
            </label>
            <select
              name="sport"
              required
              defaultValue="badminton"
              className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="badminton">🏸 แบดมินตัน (Badminton BWF Standard)</option>
              <option value="tennis">🎾 เทนนิส</option>
              <option value="tabletennis">🏓 ปิงปอง</option>
              <option value="other">🏅 อื่นๆ</option>
            </select>
          </div>

          {branches.length > 0 && (
            <div>
              <label className="block text-body-xs font-bold text-ink mb-1">
                จัดที่สาขา / สนาม <span className="text-danger">*</span>
              </label>
              <select
                name="branch_id"
                required
                className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
              >
                <option value="">เลือกสาขาสนามแข่งขัน</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Events & Skill Verification Mode */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-line/60 pb-2">
          <ShieldCheck className="h-5 w-5 text-brand" />
          <h3 className="font-display text-base font-bold text-ink">
            2. ประเภทและรูปแบบการตรวจระดับมือ (Skill Verification)
          </h3>
        </div>

        <div>
          <label className="block text-body-xs font-bold text-ink mb-1">
            ประเภทการแข่งขันที่เปิดรับ (เลือกใส่ได้หลายประเภท คั่นด้วยจุลภาค)
          </label>
          <input
            name="categories"
            type="text"
            defaultValue="ชายเดี่ยว MS, หญิงเดี่ยว WS, ชายคู่ MD, หญิงคู่ WD, คู่ผสม XD"
            className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
          />
          <span className="text-[11px] text-ink-soft mt-1 block">
            ระบุประเภทย่อย เช่น MS (ชายเดี่ยว), MD (ชายคู่), XD (คู่ผสม), มือใหม่ N, มือ S
          </span>
        </div>

        {/* 3 Verification Modes */}
        <div>
          <label className="block text-body-xs font-bold text-ink mb-2">
            รูปแบบการคัดกรองระดับฝีมือ <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => { setVerificationMode("open"); setRequireVideo(false); }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                verificationMode === "open"
                  ? "border-brand bg-brand/10 ring-2 ring-brand/30"
                  : "border-line bg-surface-raised hover:border-brand/40"
              }`}
            >
              <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                <span>🌟 1. Open / ไม่จำกัด</span>
              </div>
              <p className="text-[11px] text-ink-soft mt-1">
                สมัครได้เลยทันที ไม่ต้องส่งคลิป เหมาะกับรายการทั่วไป
              </p>
            </button>

            <button
              type="button"
              onClick={() => setVerificationMode("skill_level")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                verificationMode === "skill_level"
                  ? "border-brand bg-brand/10 ring-2 ring-brand/30"
                  : "border-line bg-surface-raised hover:border-brand/40"
              }`}
            >
              <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                <span>🎯 2. แบ่งตามระดับมือ</span>
              </div>
              <p className="text-[11px] text-ink-soft mt-1">
                แบ่งระดับ N, P, S, A, Open สามารถกำหนดให้ส่งคลิปตรวจได้
              </p>
            </button>

            <button
              type="button"
              onClick={() => { setVerificationMode("rating"); setRequireVideo(false); }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                verificationMode === "rating"
                  ? "border-brand bg-brand/10 ring-2 ring-brand/30"
                  : "border-line bg-surface-raised hover:border-brand/40"
              }`}
            >
              <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                <span>⚡ 3. SportHub Rating</span>
              </div>
              <p className="text-[11px] text-ink-soft mt-1">
                อิงคะแนน Elo / MMR อัตโนมัติ (เช่น 0-499: Beginner, 500+: N)
              </p>
            </button>
          </div>
        </div>

        {/* Video Requirement Switch (Only if skill_level mode) */}
        {verificationMode === "skill_level" && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-line bg-surface-raised">
            <div className="flex items-center gap-2.5">
              <Video className="h-5 w-5 text-amber-500" />
              <div>
                <div className="font-bold text-xs text-ink">ต้องส่งคลิปวิดีโอตรวจระดับมือหรือไม่?</div>
                <div className="text-[11px] text-ink-soft">
                  {requireVideo
                    ? "เปิดใช้งาน: ผู้สมัครต้องแนบคลิปตีแบด 1-3 นาที ให้ผู้จัดอนุมัติก่อนแข่ง"
                    : "ปิดใช้งาน: ผู้สมัครสามารถลงทะเบียนได้โดยไม่ต้องแนบคลิป"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRequireVideo(!requireVideo)}
              className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                requireVideo ? "bg-brand" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  requireVideo ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Tournament Format & Scoring */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-line/60 pb-2">
          <Award className="h-5 w-5 text-brand" />
          <h3 className="font-display text-base font-bold text-ink">
            3. รูปแบบสายแข่งและระบบคะแนน (BWF Standard)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-body-xs font-bold text-ink mb-1">
              รูปแบบการแข่งขัน <span className="text-danger">*</span>
            </label>
            <select
              value={format}
              onChange={(e: any) => setFormat(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="knockout">แพ้คัดออก (Knockout / Single Elimination)</option>
              <option value="group_knockout">รอบกลุ่ม + แพ้คัดออก (Group Stage + Knockout)</option>
              <option value="round_robin">พบกันหมด (Round Robin Group Stage)</option>
              <option value="double_elimination">แพ้สองครั้งตกรอบ (Double Elimination · 4 หรือ 8 ทีม)</option>
            </select>
          </div>

          <div>
            <label className="block text-body-xs font-bold text-ink mb-1">
              ระบบคะแนน (Scoring Rule)
            </label>
            <input
              type="text"
              readOnly
              value="BWF 21 แต้ม Best of 3 (Deuce cap 30)"
              className="w-full rounded-xl border border-line bg-surface-raised/70 px-3.5 py-2.5 text-body-sm text-brand font-bold focus:outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-body-xs font-bold text-ink mb-1">
              จำนวนรับสมัครสูงสุด <span className="text-danger">*</span>
            </label>
            <select
              name="max_teams"
              defaultValue="16"
              className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none font-mono"
            >
              <option value="8">8 คน / 8 คู่</option>
              <option value="16">16 คน / 16 คู่</option>
              <option value="32">32 คน / 32 คู่</option>
              <option value="64">64 คน / 64 คู่</option>
            </select>
          </div>
        </div>

        {/* 3rd Place Match Switch */}
        {format !== "round_robin" && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-line bg-surface-raised">
            <div>
              <div className="font-bold text-xs text-ink">เปิดแข่งขันรอบชิงอันดับ 3 (Bronze Match)</div>
              <div className="text-[11px] text-ink-soft">
                ผู้แพ้ในรอบรองชนะเลิศ (Semifinals) จะได้ลงแข่งชิงเหรียญทองแดง
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHasBronzeMatch(!hasBronzeMatch)}
              className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                hasBronzeMatch ? "bg-brand" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  hasBronzeMatch ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Schedule & Timing */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-line/60 pb-2">
          <Clock className="h-5 w-5 text-brand" />
          <h3 className="font-display text-base font-bold text-ink">
            4. วันที่และกำหนดเวลาการแข่งขัน
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-body-xs font-bold text-ink mb-1">
              วันที่เริ่มแข่ง <span className="text-danger">*</span>
            </label>
            <input
              name="start_date"
              type="date"
              required
              defaultValue={today}
              className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-body-xs font-bold text-ink mb-1">
              วันปิดรับสมัคร
            </label>
            <input
              name="registration_deadline"
              type="date"
              defaultValue={today}
              className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-body-xs font-bold text-ink mb-1">
              ค่าสมัคร (บาท/ทีม)
            </label>
            <input
              name="entry_fee"
              type="number"
              min="0"
              defaultValue="300"
              placeholder="0 = สมัครฟรี"
              className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-body-xs font-bold text-ink mb-1">
              เวลารายงานตัว (Check-in)
            </label>
            <input
              name="check_in_time"
              type="text"
              defaultValue="08:00 น."
              placeholder="เช่น 08:00 น."
              className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-body-xs font-bold text-ink mb-1">
              เวลาเริ่มแข่งขันคู่แรก
            </label>
            <input
              name="start_time"
              type="text"
              defaultValue="09:00 น."
              placeholder="เช่น 09:00 น."
              className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Rules & Prize */}
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink border-b border-line/60 pb-2">
          5. รางวัลและระเบียบการแข่งขัน
        </h3>

        <div>
          <label className="block text-body-xs font-bold text-ink mb-1">
            เงินรางวัลและของรางวัล
          </label>
          <input
            name="prize_info"
            type="text"
            placeholder="เช่น ชนะเลิศ 5,000 บาท + ถ้วยเกียรติยศ, รองชนะเลิศ 2,500 บาท"
            className="w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-body-xs font-bold text-ink mb-1">
            กฎระเบียบการแข่งขัน
          </label>
          <textarea
            name="rules"
            rows={3}
            defaultValue="ใช้กติกาการแข่งขันและระบบนับคะแนนตามมาตรฐานสหพันธ์แบดมินตันโลก (BWF) Best of 3 เกมละ 21 แต้ม"
            className="w-full rounded-xl border border-line bg-surface-raised p-3.5 text-body-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
        <Link
          href={basePath}
          className="rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-body-sm font-bold text-ink hover:bg-surface-raised/80 transition-all"
        >
          ยกเลิก
        </Link>
        <Button
          type="submit"
          disabled={loading}
          className="rounded-xl font-bold bg-brand text-white shadow-xs px-6 py-2.5 flex items-center gap-2 cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{loading ? "กำลังบันทึกรายการ..." : "ยืนยันสร้างรายการแข่งขัน"}</span>
        </Button>
      </div>
    </form>
  );
}
