import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { GraduationCap, Sparkles, CheckCircle2, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CoachApplyForm } from "./CoachApplyForm";


export const metadata = {
  title: "สมัครเป็นโค้ชพาร์ทเนอร์ | SportHub",
  description: "ร่วมเป็นโค้ชมืออาชีพบนแพลตฟอร์ม SportHub ขยายฐานนักเรียนและสร้างรายได้จากการสอนกีฬา",
};

export default async function CoachApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/coach/apply");
  }

  const admin = createAdminClient();

  // Check if user already has coach profile
  const { data: profile } = await admin
    .from("coach_profiles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  // If approved, redirect to manage portal
  if (profile?.approval_status === "approved") {
    redirect("/me/coach");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-xs">
          <GraduationCap className="h-8 w-8" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold text-brand uppercase tracking-wider mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          Coach Partner Program
        </span>
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
          สมัครเป็นโค้ชพาร์ทเนอร์
        </h1>
        <p className="mt-2 text-body text-ink-soft max-w-lg mx-auto">
          สร้างโปรไฟล์มืออาชีพ กำหนดอัตราค่าสอน และรับการจองเวลาเรียนจากนักกีฬาทั่วประเทศบน SportHub
        </p>
      </div>

      {/* Pending status banner if already applied */}
      {profile?.approval_status === "pending" && (
        <div className="mb-8 rounded-2xl border border-warning/30 bg-warning/10 p-5 text-warning-dark dark:text-warning flex items-start gap-3.5">
          <Clock className="h-6 w-6 text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-body">ใบสมัครของคุณอยู่ระหว่างการตรวจสอบ</h3>
            <p className="text-body-sm text-ink-soft mt-1 leading-relaxed">
              ทีมงานกำลังตรวจสอบเอกสารและข้อมูลโปรไฟล์ของคุณ โดยจะแจ้งผลการอนุมัติภายใน 24–48 ชม. คุณสามารถอัปเดตข้อมูลเพิ่มเติมด้านล่างได้ตลอดเวลา
            </p>
          </div>
        </div>
      )}

      {/* Application Form */}
      <div className="card-floating rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-md">
        <CoachApplyForm initialData={profile} userEmail={user.email} />
      </div>

      {/* Benefits Section */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 text-center">
        <div className="card-floating p-4 border border-line">
          <ShieldCheck className="mx-auto h-6 w-6 text-brand mb-2" />
          <h4 className="font-bold text-body-sm text-ink">โปรไฟล์มีเครื่องหมายรับรอง</h4>
          <p className="text-[11px] text-ink-soft mt-1">สร้างความน่าเชื่อถือด้วยใบรับรองและรีวิวจริง</p>
        </div>
        <div className="card-floating p-4 border border-line">
          <Clock className="mx-auto h-6 w-6 text-emerald-600 mb-2" />
          <h4 className="font-bold text-body-sm text-ink">จัดการตารางสอนอิสระ</h4>
          <p className="text-[11px] text-ink-soft mt-1">เลือกวัน เวลา และสถานที่สอนได้ตามสะดวก</p>
        </div>
        <div className="card-floating p-4 border border-line">
          <Sparkles className="mx-auto h-6 w-6 text-amber-600 mb-2" />
          <h4 className="font-bold text-body-sm text-ink">รับเงินตรงเข้าบัญชี</h4>
          <p className="text-[11px] text-ink-soft mt-1">ระบบชำระเงินปลอดภัย ตรวจสอบรายได้ง่ายดาย</p>
        </div>
      </div>
    </main>
  );
}
