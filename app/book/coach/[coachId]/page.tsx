import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  FileText,
  CreditCard,
  ChevronLeft,
  Info,
} from "lucide-react";
import { formatBahtFromDb } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export default async function CoachBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ coachId: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { coachId } = await params;
  if (!z.string().uuid().safeParse(coachId).success) notFound();
  
  const { service: serviceId } = await searchParams;
  if (!serviceId || !z.string().uuid().safeParse(serviceId).success) {
    redirect(`/coaches/${coachId}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/book/coach/${coachId}?service=${serviceId}`);
  }

  const admin = createAdminClient();
  
  const [{ data: coach }, { data: service }] = await Promise.all([
    admin.from("coach_profiles").select("*").eq("id", coachId).single(),
    admin.from("coach_services").select("*").eq("id", serviceId).single(),
  ]);

  if (!coach || !service || service.coach_profile_id !== coach.id) {
    notFound();
  }

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
          <img src={coach.profile_image_url} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-line" />
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
        </div>
      </div>

      <form action="/api/coach-bookings" method="POST" className="space-y-6">
        <input type="hidden" name="coach_profile_id" value={coach.id} />
        <input type="hidden" name="service_id" value={service.id} />
        <input type="hidden" name="total_price" value={service.price} />

        <div className="card-floating p-6">
          <h3 className="mb-4 font-display text-body font-semibold text-ink">
            ข้อมูลการจอง
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="booking_date" className="mb-1.5 block text-body-sm font-medium text-ink">
                วันที่ต้องการเรียน
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
                <input
                  type="date"
                  id="booking_date"
                  name="booking_date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-radius-sm border border-line bg-surface py-2.5 pl-10 pr-3 text-body text-ink transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_time" className="mb-1.5 block text-body-sm font-medium text-ink">
                  เวลาเริ่ม
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="time"
                    id="start_time"
                    name="start_time"
                    required
                    className="w-full rounded-radius-sm border border-line bg-surface py-2.5 pl-10 pr-3 text-body text-ink transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="end_time" className="mb-1.5 block text-body-sm font-medium text-ink">
                  เวลาสิ้นสุด <span className="text-body-sm font-normal text-ink-soft">(ตามแพ็กเกจ)</span>
                </label>
                <div className="relative opacity-60">
                  <Clock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="time"
                    id="end_time"
                    name="end_time"
                    required
                    className="w-full rounded-radius-sm border border-line bg-surface py-2.5 pl-10 pr-3 text-body text-ink transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="location_note" className="mb-1.5 block text-body-sm font-medium text-ink">
                สถานที่เรียน <span className="text-body-sm font-normal text-ink-soft">(ระบุชื่อสนาม)</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-ink-soft" />
                <textarea
                  id="location_note"
                  name="location_note"
                  rows={2}
                  required
                  placeholder="เช่น SportHub Arena สาขาปิ่นเกล้า คอร์ท 3"
                  className="w-full rounded-radius-sm border border-line bg-surface py-2.5 pl-10 pr-3 text-body text-ink transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
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
            <p>การจองนี้ยังไม่สมบูรณ์จนกว่าโค้ชจะตอบรับคำขอและคุณทำการชำระเงินเรียบร้อยแล้ว กรุณารอการติดต่อกลับจากโค้ชผ่านระบบ</p>
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
            className="rounded-radius-sm bg-brand px-6 py-2.5 text-body font-semibold text-white shadow-sm transition-all hover:bg-brand-dark"
          >
            ส่งคำขอจองเวลาเรียน
          </button>
        </div>
      </form>
    </main>
  );
}
