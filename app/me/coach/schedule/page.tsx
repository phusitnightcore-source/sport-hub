import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Calendar, ChevronLeft } from "lucide-react";
import { CoachScheduleClient } from "./CoachScheduleClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ตารางเวลาว่างสำหรับสอน | Coach Hub",
  description: "กำหนดวันและเวลาที่คุณสะดวกเปิดรับสอนในแต่ละสัปดาห์",
};

export default async function CoachSchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: coach } = await (admin as any)
    .from("coach_profiles")
    .select("id, display_name")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!coach) redirect("/me/coach");

  const { data: schedules } = await (admin as any)
    .from("coach_schedules")
    .select("day_of_week, start_time, end_time, is_available")
    .eq("coach_profile_id", coach.id)
    .order("day_of_week", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6 pb-20">
      <Link
        href="/me/coach"
        className="inline-flex items-center gap-1 text-body-sm font-semibold text-ink-soft hover:text-brand transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>กลับไปแดชบอร์ดโค้ช</span>
      </Link>

      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
          <Calendar className="h-7 w-7 text-blue-600" />
          <span>ตารางเวลาว่างสำหรับสอน (Weekly Schedule)</span>
        </h1>
        <p className="text-body-sm text-ink-soft mt-1">
          กำหนดช่วงเวลาที่คุณสะดวกรับสอนในแต่ละวัน ผู้เรียนจะสามารถเลือกจองได้เฉพาะช่วงเวลาที่คุณเปิดไว้เท่านั้น
        </p>
      </header>

      <CoachScheduleClient initialSchedules={(schedules ?? []) as any[]} />
    </main>
  );
}
