import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Check, X, Clock, CalendarDays, MapPin, ReceiptText } from "lucide-react";
import { formatBahtFromDb } from "@/lib/money";

export const metadata = {
  title: "คำขอจอง & ตารางสอน | SportHub",
};

export default async function ManageCoachBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("coach_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/me/coach/apply");

  const { data: bookings } = await admin
    .from("coach_bookings")
    .select(`
      id,
      booking_date,
      start_time,
      end_time,
      location_note,
      total_price,
      status,
      player_note,
      created_at,
      profiles!player_profile_id (
        full_name,
        phone
      ),
      coach_services (
        name
      )
    `)
    .eq("coach_profile_id", profile.id)
    .order("booking_date", { ascending: true });

  const allBookings = bookings ?? [];
  const pending = allBookings.filter(b => b.status === "requested");
  const confirmed = allBookings.filter(b => b.status === "accepted" || b.status === "confirmed");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-display-sm font-bold text-ink">คำขอจอง & ตารางสอน</h1>
        <p className="mt-1 text-body-sm text-ink-soft">
          จัดการคำขอเรียนและดูแลตารางเวลาของคุณ
        </p>
      </header>

      <div className="space-y-10">
        <section>
          <h2 className="mb-4 font-display text-body-lg font-semibold text-ink flex items-center gap-2">
            คำขอจองใหม่
            {pending.length > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">
                {pending.length}
              </span>
            )}
          </h2>

          {pending.length === 0 ? (
            <div className="card-floating p-8 text-center text-body-sm text-ink-soft">
              ไม่มีคำขอจองใหม่ในขณะนี้
            </div>
          ) : (
            <div className="grid gap-4">
              {pending.map((booking) => (
                <div key={booking.id} className="card-floating p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-l-4 border-l-warning">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                        {booking.coach_services?.name}
                      </span>
                      <span className="text-body-sm text-ink-soft">
                        ส่งคำขอเมื่อ {new Date(booking.created_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    <h3 className="text-body font-semibold text-ink">
                      ผู้เรียน: {booking.profiles?.full_name || "ไม่ระบุชื่อ"}
                    </h3>
                    <p className="text-body-sm text-ink-soft mt-1">เบอร์โทร: {booking.profiles?.phone || "-"}</p>
                    
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-body-sm">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-ink-soft" />
                        <span className="font-medium text-ink">{booking.booking_date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-ink-soft" />
                        <span className="font-medium text-ink">{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <MapPin className="h-4 w-4 text-ink-soft shrink-0" />
                        <span className="text-ink">{booking.location_note}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <ReceiptText className="h-4 w-4 text-success shrink-0" />
                        <span className="font-semibold text-success">฿{formatBahtFromDb(booking.total_price)}</span>
                      </div>
                    </div>

                    {booking.player_note && (
                      <div className="mt-4 rounded bg-surface p-3 text-body-sm text-ink-soft ring-1 ring-inset ring-line">
                        <span className="font-semibold text-ink">ข้อความจากผู้เรียน:</span> {booking.player_note}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 shrink-0 sm:w-32">
                    <button className="flex w-full items-center justify-center gap-2 rounded bg-success px-4 py-2 text-body-sm font-semibold text-white hover:bg-success-dark">
                      <Check className="h-4 w-4" />
                      ตอบรับ
                    </button>
                    <button className="flex w-full items-center justify-center gap-2 rounded bg-surface px-4 py-2 text-body-sm font-medium text-danger ring-1 ring-inset ring-line hover:bg-danger/10">
                      <X className="h-4 w-4" />
                      ปฏิเสธ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-body-lg font-semibold text-ink">ตารางสอนที่ยืนยันแล้ว</h2>
          {confirmed.length === 0 ? (
            <div className="card-floating p-8 text-center text-body-sm text-ink-soft">
              ยังไม่มีตารางสอนที่ยืนยันแล้ว
            </div>
          ) : (
             <div className="grid gap-4">
               {confirmed.map((booking) => (
                 <div key={booking.id} className="card-floating p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-l-4 border-l-success">
                   <div className="flex flex-wrap gap-x-6 gap-y-2">
                     <div className="w-full sm:w-auto">
                        <p className="text-xs font-semibold uppercase text-ink-soft mb-1">วัน/เวลา</p>
                        <p className="font-medium text-ink flex items-center gap-1.5">
                          {booking.booking_date}
                          <span className="text-ink-soft font-normal text-sm">{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
                        </p>
                     </div>
                     <div className="w-full sm:w-auto">
                        <p className="text-xs font-semibold uppercase text-ink-soft mb-1">ผู้เรียน</p>
                        <p className="font-medium text-ink">{booking.profiles?.full_name || "ไม่ระบุชื่อ"}</p>
                     </div>
                     <div className="w-full sm:w-auto">
                        <p className="text-xs font-semibold uppercase text-ink-soft mb-1">สถานที่</p>
                        <p className="text-sm text-ink-soft flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {booking.location_note}
                        </p>
                     </div>
                   </div>
                   <div className="shrink-0 text-right">
                     <span className="inline-block rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                       ยืนยันแล้ว
                     </span>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </section>
      </div>
    </div>
  );
}
