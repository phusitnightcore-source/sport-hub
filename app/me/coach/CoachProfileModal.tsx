"use client";

import { useState } from "react";
import { Edit3, X, Loader2, GraduationCap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateCoachProfileAction } from "./actions";

interface CoachData {
  display_name: string;
  sport: string;
  biography?: string | null;
  experience_years?: number | null;
  cover_image_url?: string | null;
}

export function CoachProfileModal({ coach }: { coach?: CoachData | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateCoachProfileAction(formData);
    setIsLoading(false);

    if (!res.success) {
      setError(res.error || "เกิดข้อผิดพลาด");
    } else {
      setIsOpen(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-body-sm font-semibold text-white shadow-xs hover:bg-brand-dark transition-all"
      >
        <Edit3 className="h-4 w-4" />
        <span>{coach ? "แก้ไขข้อมูลโปรไฟล์" : "ตั้งค่าโปรไฟล์โค้ช"}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">
                    {coach ? "แก้ไขข้อมูลโปรไฟล์โค้ช" : "สร้างโปรไฟล์โค้ช"}
                  </h3>
                  <p className="text-body-xs text-ink-soft">
                    ข้อมูลนี้จะแสดงในตลาดโค้ช (Coach Marketplace)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-ink-soft hover:bg-surface-raised hover:text-ink"
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-body-xs font-bold text-ink mb-1">
                  ชื่อ-นามสกุล / ชื่อสำหรับแสดง <span className="text-danger">*</span>
                </label>
                <input
                  name="display_name"
                  type="text"
                  required
                  defaultValue={coach?.display_name || ""}
                  placeholder="เช่น โค้ชต้น แบดมินตัน"
                  className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    ชนิดกีฬาที่สอน <span className="text-danger">*</span>
                  </label>
                  <select
                    name="sport"
                    required
                    defaultValue={coach?.sport || "badminton"}
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="badminton">🏸 แบดมินตัน</option>
                    <option value="tennis">🎾 เทนนิส</option>
                    <option value="football">⚽ ฟุตบอล</option>
                    <option value="fitness">🏋️ ฟิตเนส / เทรนเนอร์</option>
                    <option value="swimming">🏊 ว่ายน้ำ</option>
                    <option value="basketball">🏀 บาสเกตบอล</option>
                  </select>
                </div>

                <div>
                  <label className="block text-body-xs font-bold text-ink mb-1">
                    ประสบการณ์สอน (ปี)
                  </label>
                  <input
                    name="experience_years"
                    type="number"
                    min="0"
                    max="60"
                    defaultValue={coach?.experience_years || 2}
                    className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-body-xs font-bold text-ink mb-1">
                  ลิงก์รูปภาพหน้าปก (Cover Image URL)
                </label>
                <input
                  name="cover_image_url"
                  type="url"
                  defaultValue={coach?.cover_image_url || ""}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-body-xs font-bold text-ink mb-1">
                  ประวัติและผลงาน (Bio)
                </label>
                <textarea
                  name="biography"
                  rows={4}
                  defaultValue={coach?.biography || ""}
                  placeholder="แนะนำตัวเอง ประสบการณ์การเป็นนักกีฬา อดีตทีมชาติ หรือหลักสูตรที่ได้รับรอง..."
                  className="w-full rounded-xl border border-line bg-surface-raised p-3 text-body-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
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
                  className="rounded-xl font-bold bg-brand text-white shadow-xs px-5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกข้อมูลโปรไฟล์</span>
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
