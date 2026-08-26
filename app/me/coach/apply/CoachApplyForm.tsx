"use client";

import { useActionState, useState } from "react";
import { submitCoachApplication, type ApplyCoachState } from "./actions";
import { Button } from "@/components/ui/Button";
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  MapPin,
  Image as ImageIcon,
  User,
  ArrowRight,
} from "lucide-react";

type CoachApplyFormProps = {
  initialData?: any;
  userEmail?: string;
};

const SPORTS_LIST = [
  "แบดมินตัน",
  "ฟุตบอล",
  "ฟุตซอล",
  "เทนนิส",
  "พิกเคิลบอล",
  "บาสเกตบอล",
  "ฟิตเนส / เวทเทรนนิ่ง",
  "กอล์ฟ",
  "ปิงปอง (เทเบิลเทนนิส)",
  "ว่ายน้ำ",
  "โยคะ / พิลาทิส",
  "มวยไทย / ศิลปะการต่อสู้",
];

const PROVINCES_LIST = [
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
  "สมุทรปราการ",
  "เชียงใหม่",
  "ชลบุรี",
  "ภูเก็ต",
  "ขอนแก่น",
  "นครราชสีมา",
  "สงขลา",
  "สุราษฎร์ธานี",
  "ระยอง",
  "พระนครศรีอยุธยา",
  "เชียงราย",
  "อุบลราชธานี",
];

const SKILL_LEVELS = [
  { value: "all", label: "ทุกระดับ (ตั้งแต่เริ่มต้น - แข่งขัน)" },
  { value: "beginner", label: "ระดับเริ่มต้น (Beginner)" },
  { value: "intermediate", label: "ระดับกลาง (Intermediate)" },
  { value: "advanced", label: "ระดับสูง / นักกีฬา (Advanced / Pro)" },
];

export function CoachApplyForm({ initialData, userEmail }: CoachApplyFormProps) {
  const [state, formAction, isPending] = useActionState<ApplyCoachState, FormData>(
    submitCoachApplication,
    {}
  );

  const [selectedSport, setSelectedSport] = useState(initialData?.sport || SPORTS_LIST[0]);
  const [selectedProvince, setSelectedProvince] = useState(
    initialData?.location_province || PROVINCES_LIST[0]
  );
  const [selectedSkill, setSelectedSkill] = useState(initialData?.skill_level || "all");

  return (
    <form action={formAction} className="space-y-6">
      {/* Success banner */}
      {state?.success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">ส่งใบสมัครเป็นโค้ชเรียบร้อยแล้ว!</h4>
            <p className="text-body-sm mt-0.5 text-emerald-700 dark:text-emerald-300">
              ทีมงานได้รับข้อมูลแล้ว และจะทำการตรวจสอบอนุมัติโปรไฟล์ของคุณในเร็วๆ นี้
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {state?.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-4 text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">เกิดข้อผิดพลาด</h4>
            <p className="text-body-sm mt-0.5 text-rose-700 dark:text-rose-300">{state.error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-display text-body-lg font-bold text-ink border-b border-line pb-2">
          1. ข้อมูลทั่วไปของโค้ช
        </h3>

        {/* Display Name */}
        <div>
          <label className="mb-1.5 block text-body-sm font-semibold text-ink">
            ชื่อที่ใช้แสดงในระบบ (Display Name) <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              name="displayName"
              defaultValue={initialData?.display_name || ""}
              placeholder="เช่น โค้ชบอล, Coach Alex, เอกชัย (อดีตเยาวชนทีมชาติ)"
              required
              className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-4 text-body text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
            />
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
          </div>
        </div>

        {/* Sport & Province Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Sport */}
          <div>
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              ประเภทกีฬาหลักที่สอน <span className="text-danger">*</span>
            </label>
            <select
              name="sport"
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-body-sm font-semibold text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 cursor-pointer [&>option]:bg-surface [&>option]:text-ink"
            >
              {SPORTS_LIST.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </div>

          {/* Location Province */}
          <div>
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              จังหวัดที่สะดวกสอน <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <select
                name="locationProvince"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-body-sm font-semibold text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 cursor-pointer [&>option]:bg-surface [&>option]:text-ink"
              >
                {PROVINCES_LIST.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Skill level & Experience */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Target Skill Level */}
          <div>
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              ระดับผู้เรียนที่รับสอน
            </label>
            <select
              name="skillLevel"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-body-sm font-semibold text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 cursor-pointer [&>option]:bg-surface [&>option]:text-ink"
            >
              {SKILL_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Years */}
          <div>
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              ประสบการณ์การสอน (ปี) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="experienceYears"
              min={1}
              max={50}
              defaultValue={initialData?.experience_years || 2}
              required
              className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-body text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-mono"
            />
          </div>
        </div>

        {/* Profile Image URL */}
        <div>
          <label className="mb-1.5 block text-body-sm font-semibold text-ink">
            ลิงก์รูปโปรไฟล์โค้ช (URL)
          </label>
          <div className="relative">
            <input
              type="url"
              name="profileImageUrl"
              defaultValue={initialData?.profile_image_url || ""}
              placeholder="https://images.unsplash.com/... หรือ ลิงก์รูปภาพของคุณ"
              className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-4 text-body text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
            />
            <ImageIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
          </div>
        </div>

        {/* Biography */}
        <div>
          <label className="mb-1.5 block text-body-sm font-semibold text-ink">
            ประวัติ ผลงาน และสไตล์การสอน (Biography) <span className="text-danger">*</span>
          </label>
          <textarea
            name="biography"
            rows={4}
            defaultValue={initialData?.biography || ""}
            placeholder="แนะนำตัว ประวัติการแข่งขัน ผลงานการสอน และแนวทางการพัฒนาทักษะให้นักเรียน..."
            required
            className="w-full rounded-2xl border border-line bg-surface p-4 text-body text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all leading-relaxed"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-line">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-2xl font-bold py-4 shadow-lg shadow-brand/25 text-body"
        >
          {isPending ? "กำลังบันทึกข้อมูล..." : initialData ? "อัปเดตข้อมูลใบสมัคร" : "ส่งใบสมัครเป็นโค้ช"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
