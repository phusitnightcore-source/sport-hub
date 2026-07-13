import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingRow } from "@/components/ui/BookingRow";
import type { BookingStatus } from "@/lib/booking/status";

// ประวัติการจองของสมาชิก (ผู้ใช้ที่ล็อกอิน) — จับคู่ด้วย member_id หรือเบอร์โทร
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
    .select("id, phone, tenant_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!member) {
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="font-display text-display-md font-semibold text-ink">
          คุณยังไม่ได้เป็นสมาชิก
        </h1>
        <p className="text-body-sm text-ink-soft">
          ผู้ที่จองแบบทั่วไปสามารถเช็คการจองได้ที่หน้าเช็คการจอง
        </p>
        <Link href="/track" className="font-medium text-brand hover:underline">
          ไปหน้าเช็คการจอง
        </Link>
      </main>
    );
  }

  const { data: rows } = await admin
    .from("bookings")
    .select(
      "booking_code, booking_date, start_time, end_time, total_price, status, courts(name)",
    )
    .eq("tenant_id", member.tenant_id)
    .or(`member_id.eq.${member.id},user_phone.eq.${member.phone}`)
    .order("booking_date", { ascending: false })
    .limit(100);

  const bookings = rows ?? [];

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <Link
        href="/me"
        className="inline-flex items-center gap-1.5 text-body-sm text-ink-soft hover:text-brand"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        กลับหน้าสมาชิก
      </Link>

      <h1 className="font-display text-display-md font-semibold text-ink">
        การจองของฉัน
      </h1>

      {bookings.length === 0 ? (
        <div className="card-floating flex flex-col items-center gap-3 p-10 text-center">
          <CalendarSearch className="h-10 w-10 text-ink-soft" />
          <p className="text-body-sm text-ink-soft">ยังไม่มีประวัติการจอง</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => (
            <BookingRow
              key={b.booking_code}
              booking={{
                code: b.booking_code,
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
