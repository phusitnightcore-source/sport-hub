import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { SuperAdminCoachesClient, type CoachRow } from "./SuperAdminCoachesClient";

export const metadata = {
  title: "จัดการและอนุมัติโค้ช | Super Admin",
};

export default async function SuperAdminCoachesPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();

  const [{data:coaches},{data:summaryData}]=await Promise.all([
    admin.from("coach_profiles").select("id, display_name, sport, skill_level, experience_years, biography, profile_image_url, location_province, approval_status, is_visible, rating_avg, review_count, created_at").order("created_at",{ascending:false}),
    admin.rpc("platform_coach_booking_summary"),
  ]);
  const summaries=summaryData&&typeof summaryData==="object"&&!Array.isArray(summaryData)?summaryData:{};
  const coachRows:CoachRow[]=(coaches??[]).map(coach=>{
    const raw=summaries[coach.id];const summary=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
    return {...coach,active_bookings:Number(summary.active??0),completed_bookings:Number(summary.completed??0),linked_bookings:Number(summary.linked??0)};
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display-md font-bold text-ink">
          จัดการและอนุมัติโค้ช
        </h1>
        <p className="text-body-sm text-ink-soft">
          ตรวจสอบใบสมัคร อนุมัติ หรือระงับการแสดงผลโปรไฟล์โค้ชใน Coach Marketplace
        </p>
      </div>

      <SuperAdminCoachesClient coaches={coachRows} />
    </main>
  );
}
