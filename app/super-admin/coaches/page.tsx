import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdminContext } from "@/lib/auth";
import { GraduationCap } from "lucide-react";
import { SuperAdminCoachesClient, type CoachRow } from "./SuperAdminCoachesClient";

export const metadata = {
  title: "จัดการและอนุมัติโค้ช | Super Admin",
};

export default async function SuperAdminCoachesPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();

  const { data: coaches } = await admin
    .from("coach_profiles")
    .select(
      "id, display_name, sport, skill_level, experience_years, biography, profile_image_url, location_province, approval_status, is_visible, rating_avg, review_count, created_at"
    )
    .order("created_at", { ascending: false });

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

      <SuperAdminCoachesClient coaches={(coaches as any) ?? []} />
    </main>
  );
}
