import { redirect } from "next/navigation";
import { CalendarSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingRow } from "@/components/ui/BookingRow";
import type { BookingStatus } from "@/lib/booking/status";

// ประวัติการจองของผู้ใช้ (ล็อกอิน) — ข้ามทุกสนาม ผูกด้วย profile_id (+ member_id ถ้าเป็นสมาชิกฟิตเนส)
export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const filter = member
    ? `profile_id.eq.${user.id},member_id.eq.${member.id}`
    : `profile_id.eq.${user.id}`;

  const { data: rows } = await admin
    .from("bookings")
    .select(
      "booking_code, booking_date, start_time, end_time, total_price, status, courts(name), tenants(name)",
    )
    .or(filter)
    .order("booking_date", { ascending: false })
    .limit(100);

  const bookings = rows ?? [];
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending_payment",
  ).length;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-display-lg font-semibold text-ink">การจองของฉัน</h1>
        <p className="text-body-sm text-ink-soft">
          {bookings.length > 0
            ? `ทั้งหมด ${bookings.length} รายการ · กำลังจะถึง ${upcoming} รายการ`
            : "รวมการจองจากทุกสนามไว้ที่เดียว"}
        </p>
      </header>

      {bookings.length === 0 ? (
        <div className="card-floating flex flex-col items-center gap-4 p-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
            <CalendarSearch className="h-8 w-8 text-brand" />
          </span>
          <p className="max-w-xs text-body-sm text-ink-soft">
            ยังไม่มีประวัติการจอง — จองผ่านลิงก์ของสนามที่คุณต้องการ แล้วรายการจะมาอยู่ที่นี่
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => (
            <BookingRow
              key={b.booking_code}
              booking={{
                code: b.booking_code,
                venue: b.tenants?.name ?? undefined,
                courtName: b.courts?.name ?? "—",
                date: b.booking_date,
                startTime: b.start_time,
                endTime: b.end_time,
                totalPrice: b.total_price,
                status: b.status as BookingStatus,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
