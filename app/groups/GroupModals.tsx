"use client";

import { useState } from "react";
import { Plus, X, Loader2, Users, Calendar, Clock, DollarSign, Sparkles, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createGroupAction, joinGroupAction, leaveGroupAction } from "./actions";

export function CreateGroupButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createGroupAction(formData);

    setIsLoading(false);
    if (!result.success) {
      setError(result.error || "เกิดข้อผิดพลาด");
    } else {
      setIsOpen(false);
    }
  }

  // Default dates for form
  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="rounded-2xl font-bold bg-brand text-white shadow-xs hover:bg-brand-dark px-5 py-2.5 flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        <span>สร้างก๊วนใหม่</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">สร้างก๊วนกีฬาใหม่</h3>
                  <p className="text-body-xs text-ink-soft">เปิดรับสมาชิกเพื่อเล่นกีฬาและแชร์ค่าสนาม</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-ink-soft hover:bg-surface-raised hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 p-3.5 text-danger flex items-center gap-2 text-body-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-body-xs font-bold text-ink mb-1">
                  ชื่อก๊วนกีฬา <span className="text-danger">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="เช่น ก๊วนแบดมินตันมือ S- หลังเลิกงาน"
                  className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    ชนิดกีฬา <span className="text-danger">*</span>
                  </label>
                  <select
                    name="sport"
                    required
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="badminton">🏸 แบดมินตัน</option>
                    <option value="football">⚽ ฟุตบอล / ฟุตซอล</option>
                    <option value="tennis">🎾 เทนนิส</option>
                    <option value="basketball">🏀 บาสเกตบอล</option>
                    <option value="tabletennis">🏓 ปิงปอง</option>
                    <option value="running">🏃 วิ่ง / ออกกำลังกาย</option>
                    <option value="other">🏅 อื่นๆ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    ระดับฝีมือ
                  </label>
                  <select
                    name="skill_level"
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="เปิดทุกระดับ (Open)">เปิดทุกระดับ (Open)</option>
                    <option value="มือใหม่ (Beginner)">มือใหม่ (Beginner)</option>
                    <option value="ระดับกลาง (Intermediate)">ระดับกลาง (Intermediate)</option>
                    <option value="ระดับสูง (Advanced)">ระดับสูง (Advanced)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-body-xs font-bold text-ink mb-1">
                  วันที่เล่น <span className="text-danger">*</span>
                </label>
                <input
                  name="play_date"
                  type="date"
                  required
                  defaultValue={today}
                  min={today}
                  className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    เวลาเริ่ม <span className="text-danger">*</span>
                  </label>
                  <input
                    name="start_time"
                    type="time"
                    required
                    defaultValue="18:00"
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    เวลาสิ้นสุด <span className="text-danger">*</span>
                  </label>
                  <input
                    name="end_time"
                    type="time"
                    required
                    defaultValue="20:00"
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    รับสูงสุด (คน) <span className="text-danger">*</span>
                  </label>
                  <input
                    name="max_players"
                    type="number"
                    min="2"
                    max="100"
                    required
                    defaultValue="6"
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    ค่าใช้จ่ายเฉลี่ย (บาท/คน)
                  </label>
                  <input
                    name="cost_per_person"
                    type="number"
                    min="0"
                    defaultValue="150"
                    placeholder="0 = ฟรี"
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-body-xs font-bold text-ink mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="เช่น สนามสุขุมวิท คอร์ท 3 หารค่าลูกแบดตามจริง พกไม้แบดมาเอง"
                  className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>

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
                  className="rounded-xl font-bold bg-brand text-white shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังสร้าง...</span>
                    </>
                  ) : (
                    <span>ยืนยันสร้างก๊วน</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function JoinGroupButton({
  groupId,
  isJoined,
  isFull,
  isCreator,
}: {
  groupId: string;
  isJoined: boolean;
  isFull: boolean;
  isCreator: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setIsLoading(true);
    setError(null);
    const res = await joinGroupAction(groupId);
    setIsLoading(false);
    if (!res.success) {
      setError(res.error || "ไม่สามารถเข้าร่วมได้");
      alert(res.error || "ไม่สามารถเข้าร่วมได้");
    }
  }

  async function handleLeave() {
    if (!confirm("คุณต้องการออกจากก๊วนนี้ใช่หรือไม่?")) return;
    setIsLoading(true);
    setError(null);
    const res = await leaveGroupAction(groupId);
    setIsLoading(false);
    if (!res.success) {
      setError(res.error || "เกิดข้อผิดพลาด");
      alert(res.error || "เกิดข้อผิดพลาด");
    }
  }

  if (isCreator) {
    return (
      <span className="inline-flex items-center justify-center rounded-xl bg-brand/10 border border-brand/20 px-3.5 py-2 text-body-xs font-bold text-brand w-full sm:w-auto">
        👑 คุณคือผู้สร้างก๊วน
      </span>
    );
  }

  if (isJoined) {
    return (
      <button
        onClick={handleLeave}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-body-xs font-bold text-danger hover:bg-danger/20 transition-colors w-full sm:w-auto"
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        <span>เข้าร่วมแล้ว (คลิกเพื่อออก)</span>
      </button>
    );
  }

  if (isFull) {
    return (
      <span className="inline-flex items-center justify-center rounded-xl bg-ink-soft/10 px-3.5 py-2 text-body-xs font-bold text-ink-soft w-full sm:w-auto cursor-not-allowed">
        ก๊วนเต็มแล้ว
      </span>
    );
  }

  return (
    <Button
      onClick={handleJoin}
      disabled={isLoading}
      className="rounded-xl font-bold bg-brand text-white shadow-xs hover:bg-brand-dark px-4 py-2 text-body-xs w-full sm:w-auto"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>กำลังเข้าร่วม...</span>
        </>
      ) : (
        <>
          <Users className="h-3.5 w-3.5" />
          <span>กดเข้าร่วมก๊วน</span>
        </>
      )}
    </Button>
  );
}
