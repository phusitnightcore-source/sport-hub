import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import {
  GraduationCap,
  ShieldCheck,
  MapPin,
  Edit3,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  Package,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CoachProfileModal } from "./CoachProfileModal";

export const metadata = {
  title: "จัดการโปรไฟล์โค้ช | SportHub",
};

export default async function ManageCoachProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Verify role
  const { data: role } = await (admin as any)
    .from("user_roles")
    .select("role")
    .eq("profile_id", user.id)
    .eq("role", "coach")
    .eq("is_active", true)
    .maybeSingle();

  if (!role) {
    redirect("/me/coach/apply");
  }

  // Get coach profile
  const { data: profile } = await (admin as any)
    .from("coach_profiles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  const statusMap = {
    pending: { label: "รอตรวจสอบ", color: "bg-warning/20 text-warning-dark" },
    approved: { label: "อนุมัติแล้ว", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    rejected: { label: "ไม่อนุมัติ", color: "bg-danger/20 text-danger-dark" },
    suspended: { label: "ถูกระงับ", color: "bg-danger/20 text-danger-dark" },
  };
  const status = statusMap[(profile?.approval_status as keyof typeof statusMap) || "pending"];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
            <GraduationCap className="h-8 w-8 text-purple-600" />
            <span>ศูนย์จัดการสำหรับโค้ช (Coach Hub)</span>
          </h1>
          <p className="mt-1 text-body-sm text-ink-soft">
            จัดการโปรไฟล์ ตารางเวลาว่าง คอร์สสอน และตรวจดูรายได้ของคุณ
          </p>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <Link
              href={`/coaches/${profile.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-raised border border-line px-4 py-2 text-body-sm font-medium text-ink hover:text-brand transition-colors"
            >
              <span>ดูหน้าสาธารณะ</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}

          <CoachProfileModal coach={profile} />
        </div>
      </header>

      {/* 4 Coach Management Pillar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Schedule */}
        <Link
          href="/me/coach/schedule"
          className="card-floating flex items-center justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">ตารางเวลาว่าง (Schedule)</h3>
              <p className="text-body-xs text-ink-soft">กำหนดวันและช่วงเวลาที่เปิดรับสอน</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-soft" />
        </Link>

        {/* Card 2: Earnings */}
        <Link
          href="/me/coach/earnings"
          className="card-floating flex items-center justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">รายได้ & การจ่ายเงิน</h3>
              <p className="text-body-xs text-ink-soft">สรุปยอดเงินค่าสอนและประวัติการรับเงิน</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-soft" />
        </Link>

        {/* Card 3: Services */}
        <Link
          href="/me/coach/services"
          className="card-floating flex items-center justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">แพ็กเกจ & คอร์สสอน</h3>
              <p className="text-body-xs text-ink-soft">กำหนดราคา และหลักสูตรการสอน</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-soft" />
        </Link>

        {/* Card 4: Bookings */}
        <Link
          href="/me/coach/bookings"
          className="card-floating flex items-center justify-between rounded-3xl border border-line p-5 transition-all hover:border-brand shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">คำขอจองเรียน</h3>
              <p className="text-body-xs text-ink-soft">ตรวจสอบและตอบรับคำขอจากผู้เรียน</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-soft" />
        </Link>
      </div>

      {/* Profile Overview Card */}
      {profile ? (
        <div className="card-floating rounded-3xl border border-line bg-surface p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/60 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark font-display text-2xl font-bold text-white shadow-xs">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  profile.display_name?.charAt(0).toUpperCase() || "C"
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-ink">{profile.display_name}</h2>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-body-xs text-ink-soft mt-0.5">
                  🏅 ผู้ฝึกสอนกีฬา: <strong>{profile.sport}</strong> · ประสบการณ์ <strong>{profile.years_experience || 1} ปี</strong>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-body-xs text-ink-soft block">อัตราค่าสอนเริ่มต้น</span>
              <span className="font-display text-xl font-extrabold text-brand">
                ฿{profile.hourly_rate ?? 500} <span className="text-xs font-normal text-ink-soft">/ ชั่วโมง</span>
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-ink mb-1">ประวัติและผลงาน (Bio)</h4>
            <p className="text-body-sm text-ink-soft whitespace-pre-line leading-relaxed">
              {profile.bio || "ยังไม่ได้ระบุประวัติ กดปุ่ม 'แก้ไขข้อมูลโปรไฟล์' เพื่อกรอกข้อมูลผลงานและประสบการณ์"}
            </p>
          </div>

          {profile.phone && (
            <div className="pt-2">
              <span className="text-body-xs text-ink-soft">เบอร์โทรศัพท์ติดต่อ: </span>
              <span className="font-mono text-body-sm font-bold text-ink">{profile.phone}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="card-floating rounded-3xl border border-line bg-surface p-12 text-center space-y-4">
          <GraduationCap className="mx-auto h-12 w-12 text-ink-soft" />
          <h2 className="font-display text-lg font-bold text-ink">คุณยังไม่ได้ตั้งค่าโปรไฟล์โค้ช</h2>
          <p className="text-body-sm text-ink-soft max-w-sm mx-auto">
            ตั้งค่าโปรไฟล์ของคุณเพื่อให้ผู้เรียนสามารถค้นพบและจองคอร์สเรียนผ่าน SportHub
          </p>
          <div className="pt-2">
            <CoachProfileModal coach={null} />
          </div>
        </div>
      )}
    </div>
  );
}
