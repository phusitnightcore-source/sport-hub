import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { GraduationCap, ShieldCheck, MapPin, Edit3, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "จัดการโปรไฟล์โค้ช | SportHub",
};

export default async function ManageCoachProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  
  // Verify role
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("profile_id", user.id)
    .eq("role", "coach")
    .eq("is_active", true)
    .maybeSingle();

  if (!role) {
    // If not a coach, maybe they should apply?
    redirect("/me/coach/apply");
  }

  // Get coach profile
  const { data: profile } = await admin
    .from("coach_profiles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-display-sm font-bold text-ink">จัดการโปรไฟล์โค้ช</h1>
        <div className="mt-8 rounded-radius-md bg-surface p-8 text-center ring-1 ring-inset ring-line">
          <GraduationCap className="mx-auto mb-4 h-12 w-12 text-ink-soft" />
          <h2 className="text-body-lg font-semibold text-ink">คุณยังไม่ได้ตั้งค่าโปรไฟล์โค้ช</h2>
          <p className="mt-2 text-body-sm text-ink-soft">
            กรุณาตั้งค่าโปรไฟล์ก่อนเพื่อให้ผู้เรียนสามารถค้นหาคุณเจอในระบบ
          </p>
          <button className="mt-6 rounded-radius-sm bg-brand px-6 py-2.5 text-body font-semibold text-white shadow-sm hover:bg-brand-dark">
            สร้างโปรไฟล์โค้ช
          </button>
        </div>
      </div>
    );
  }

  const statusMap = {
    pending: { label: "รอตรวจสอบ", color: "bg-warning/20 text-warning-dark" },
    approved: { label: "อนุมัติแล้ว", color: "bg-success/20 text-success-dark" },
    rejected: { label: "ไม่อนุมัติ", color: "bg-danger/20 text-danger-dark" },
    suspended: { label: "ถูกระงับ", color: "bg-danger/20 text-danger-dark" },
  };
  const status = statusMap[profile.approval_status as keyof typeof statusMap] || statusMap.pending;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-display-sm font-bold text-ink">โปรไฟล์โค้ช</h1>
          <p className="mt-1 text-body-sm text-ink-soft">
            จัดการข้อมูลส่วนตัว รูปภาพ และใบรับรองที่ใช้แสดงใน Coach Marketplace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/coaches/${profile.id}`}
            target="_blank"
            className="rounded-radius-sm bg-surface px-4 py-2 text-body-sm font-medium text-ink ring-1 ring-inset ring-line hover:bg-brand-soft hover:text-brand"
          >
            ดูโปรไฟล์สาธารณะ
          </Link>
          <button className="flex items-center gap-2 rounded-radius-sm bg-brand px-4 py-2 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
            <Edit3 className="h-4 w-4" />
            แก้ไขข้อมูล
          </button>
        </div>
      </header>

      <div className="card-floating overflow-hidden">
        {/* Cover */}
        <div className="relative h-48 w-full bg-gradient-to-br from-brand-soft to-surface">
          {profile.cover_image_url ? (
             <img src={profile.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-ink-soft">
              <ImageIcon className="h-8 w-8 opacity-50" />
              <span className="mt-2 text-body-sm">ยังไม่มีรูปภาพปก</span>
            </div>
          )}
          
          <div className="absolute left-6 top-6 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm">
            สถานะ: <span className={status.color.split(" ")[1]}>{status.label}</span>
          </div>
        </div>

        <div className="relative p-6 pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="-mt-12 h-24 w-24 shrink-0 rounded-full border-4 border-surface bg-brand-soft text-brand shadow-sm sm:-mt-16 sm:h-32 sm:w-32">
               {profile.profile_image_url ? (
                 <img src={profile.profile_image_url} alt="" className="h-full w-full rounded-full object-cover" />
               ) : (
                 <div className="flex h-full w-full items-center justify-center">
                   <GraduationCap className="h-10 w-10 sm:h-14 sm:w-14" />
                 </div>
               )}
            </div>
            
            <div className="flex-1 pb-2">
              <h2 className="flex items-center gap-2 font-display text-display-sm font-bold text-ink">
                {profile.display_name}
                {profile.approval_status === "approved" && (
                  <ShieldCheck className="h-6 w-6 text-success" />
                )}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-body-sm">
                <span className="rounded-full bg-brand-soft px-3 py-1 text-mono-sm font-medium text-brand">
                  กีฬา: {profile.sport}
                </span>
                {profile.location_province && (
                  <span className="flex items-center gap-1 text-ink-soft">
                    <MapPin className="h-4 w-4" />
                    {profile.location_province}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-ink">ระดับความเชี่ยวชาญ</h3>
                <p className="text-body-sm text-ink-soft">{profile.skill_level || "-"}</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink">ประสบการณ์</h3>
                <p className="text-body-sm text-ink-soft">{profile.experience_years ? `${profile.experience_years} ปี` : "-"}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-ink">ช่องทางรับเงิน (PromptPay)</h3>
              <p className="text-body-sm text-ink-soft">{profile.payment_info || "ยังไม่ได้ตั้งค่า"}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-6">
            <h3 className="mb-2 font-semibold text-ink">ประวัติและผลงาน</h3>
            {profile.biography ? (
              <p className="whitespace-pre-line text-body-sm text-ink-soft">{profile.biography}</p>
            ) : (
              <p className="text-body-sm italic text-ink-soft">ยังไม่ได้ระบุประวัติ</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
