import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  ChevronLeft,
  Info,
} from "lucide-react";
import { formatBahtFromDb } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { bangkokToday, bangkokNowTime } from "@/lib/api";

export default async function CoachBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ coachId: string }>;
  searchParams: Promise<{ service?: string; error?: string }>;
}) {
  const { coachId } = await params;
  if (!z.string().uuid().safeParse(coachId).success) notFound();
  
  const { service: serviceId, error: errorCode } = await searchParams;
  if (!serviceId || !z.string().uuid().safeParse(serviceId).success) {
    redirect(`/coaches/${coachId}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/book/coach/${coachId}?service=${serviceId}`);
  }

  const admin = createAdminClient();
  
  const [{ data: coach }, { data: service }, { data: schedules }] = await Promise.all([
    admin.from("coach_profiles").select("*").eq("id", coachId).single(),
    admin.from("coach_services").select("*").eq("id", serviceId).single(),
    admin
      .from("coach_schedules")
      .select("day_of_week, start_time, end_time")
      .eq("coach_profile_id", coachId)
      .eq("is_available", true)
      .order("day_of_week", { ascending: true }),
  ]);

  if (!coach || coach.approval_status !== "approved" || !coach.is_visible || !service || !service.is_active || service.coach_profile_id !== coach.id) {
    notFound();
  }

  const { data: member } = await admin.from("members").select("id").eq("profile_id",user.id).maybeSingle();
  const ownership = member ? `profile_id.eq.${user.id},member_id.eq.${member.id}` : `profile_id.eq.${user.id}`;
  const { data: rawEligibleBookings } = await admin.from("bookings")
    .select("id,booking_code,booking_date,start_time,end_time,courts(name),branches(name),tenants(name)")
    .or(ownership).eq("status","confirmed").eq("attendance_status","not_arrived")
    .gte("booking_date",bangkokToday())
    .order("booking_date").order("start_time").limit(50);
  const {data:linkedAppointments}=await admin.from("coach_bookings").select("court_booking_id").eq("player_profile_id",user.id)
    .in("status",["requested","accepted","confirmed","in_progress"]);
  const linkedIds=new Set((linkedAppointments??[]).map(a=>a.court_booking_id));
  const today=bangkokToday(),now=bangkokNowTime();
  const eligibleBookings=(rawEligibleBookings??[]).filter(b=>!linkedIds.has(b.id) && (b.booking_date>today || b.start_time.slice(0,5)>now));

  const DAY_NAMES = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const scheduleText = (schedules ?? []).length > 0
    ? (schedules ?? []).map((s) => `${DAY_NAMES[s.day_of_week]} (${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)})`).join(", ")
    : "ทุกวัน (ตามนัดหมาย)";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link 
        href={`/coaches/${coachId}`}
        className="mb-6 inline-flex items-center gap-1 text-body-sm font-medium text-ink-soft transition-colors hover:text-brand"
      >
        <ChevronLeft className="h-4 w-4" />
        กลับไปหน้าโปรไฟล์โค้ช
      </Link>

      <header className="mb-8">
        <h1 className="font-display text-display-md font-bold text-ink">
          จองเวลาเรียน
        </h1>
        <p className="mt-1 text-body text-ink-soft">
          ระบุวันที่และเวลาที่ต้องการ เพื่อส่งคำขอจองไปยังโค้ช
        </p>
      </header>

      <div className="card-floating mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        {coach.profile_image_url ? (
          <Image unoptimized width={64} height={64} src={coach.profile_image_url} alt={coach.display_name} className="h-16 w-16 rounded-full object-cover ring-1 ring-line" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <GraduationCap className="h-8 w-8" />
          </div>
        )}
        <div>
          <h2 className="font-display text-body-lg font-semibold text-ink">
            {service.name}
          </h2>
          <p className="text-body-sm text-ink-soft">
            กับโค้ช {coach.display_name} · {coach.sport}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-mono-sm font-medium text-ink">
            <span className="flex items-center gap-1 rounded-full bg-surface px-2 py-1 ring-1 ring-inset ring-line">
              <Clock className="h-3.5 w-3.5 text-ink-soft" />
              {service.duration_minutes} นาที
            </span>
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-success">
              <CreditCard className="h-3.5 w-3.5" />
              ฿{formatBahtFromDb(service.price)}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-body-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded-xl px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>เวลาที่โค้ชสะดวก: {scheduleText}</span>
          </div>
        </div>
      </div>

      <form action="/api/coach-bookings" method="POST" className="space-y-6">
        <input type="hidden" name="coach_profile_id" value={coach.id} />
        <input type="hidden" name="service_id" value={service.id} />

        {errorCode && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-body-sm text-danger">
          {errorCode === "court_not_owned" ? "รายการสนามนี้ไม่ใช่ของบัญชีคุณ" : errorCode === "court_too_short" ? "เวลาที่จองสนามสั้นกว่าระยะเวลาคอร์ส" : errorCode === "outside_schedule" ? "ช่วงสนามนี้อยู่นอกเวลาที่โค้ชเปิดรับ" : errorCode === "slot_conflict" ? "โค้ชหรือผู้เรียนมีนัดซ้อนช่วงนี้แล้ว" : "รายการสนามเปลี่ยนสถานะหรือไม่พร้อมใช้งาน กรุณาเลือกรายการใหม่"}
        </div>}

        <div className="card-floating p-6">
          <h3 className="mb-4 font-display text-body font-semibold text-ink">
            ข้อมูลการจอง
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="court_booking_code" className="mb-1.5 block text-body-sm font-medium text-ink">
                เลือกรายการสนามของคุณ
              </label>
              {eligibleBookings?.length ? <select id="court_booking_code" name="court_booking_code" required className="min-h-12 w-full rounded-radius-sm border border-line bg-surface px-3 text-body text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="">เลือกวัน เวลา และคอร์ทที่ชำระแล้ว</option>
                {eligibleBookings.map(b => <option key={b.booking_code} value={b.booking_code}>#{b.booking_code} · {b.booking_date} {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)} · {b.tenants?.name} / {b.branches?.name} / {b.courts?.name}</option>)}
              </select> : <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-body-sm"><p className="font-semibold">ยังไม่มีรายการสนามที่ยืนยันแล้ว</p><p className="mt-1 text-ink-soft">จองและชำระคอร์ทก่อน แล้วกลับมาเลือกโค้ช ระบบจึงจะแชร์วัน เวลา และสถานที่เดียวกันทุกฝ่าย</p><Link href="/discover" className="mt-3 inline-flex font-semibold text-brand underline">ไปจองสนาม</Link></div>}
            </div>

            <div>
              <label htmlFor="player_note" className="mb-1.5 block text-body-sm font-medium text-ink">
                ข้อความถึงโค้ช <span className="text-body-sm font-normal text-ink-soft">(ทางเลือก)</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-ink-soft" />
                <textarea
                  id="player_note"
                  name="player_note"
                  rows={2}
                  placeholder="เช่น ต้องการเน้นฝึกการเสิร์ฟเป็นพิเศษ"
                  className="w-full rounded-radius-sm border border-line bg-surface py-2.5 pl-10 pr-3 text-body text-ink transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-radius-md bg-brand-soft p-4 flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-brand mt-0.5" />
          <div className="text-body-sm text-brand-dark">
            <p className="font-semibold mb-1">การส่งคำขอจอง</p>
            <p>ระบบใช้รายการสนามที่ยืนยันแล้วเป็นข้อมูลกลาง โค้ชและเจ้าของสนามจะเห็นวัน เวลา และคอร์ทตรงกัน ค่าสอนเป็นคนละส่วนกับค่าคอร์ทและยังต้องตกลงชำระกับโค้ช</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <Link
            href={`/coaches/${coachId}`}
            className="rounded-radius-sm px-6 py-2.5 text-body font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={!eligibleBookings?.length}
            className="rounded-radius-sm bg-brand px-6 py-2.5 text-body font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            ส่งคำขอจองเวลาเรียน
          </button>
        </div>
      </form>
    </main>
  );
}
