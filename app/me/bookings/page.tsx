import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarSearch, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingRow } from "@/components/ui/BookingRow";
import { Button } from "@/components/ui/Button";
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

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <Link
        href="/me"
        className="inline-flex items-center gap-1.5 text-body-sm text-ink-soft hover:text-brand"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        พื้นที่ของฉัน
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-md font-semibold text-ink">
          การจองของฉัน
        </h1>
        <Link href="/blog/write">
          <Button variant="secondary" size="sm">
            <PenLine className="h-4 w-4" />
            เขียนบทความ
          </Button>
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="card-floating flex flex-col items-center gap-3 p-10 text-center">
          <CalendarSearch className="h-10 w-10 text-ink-soft" />
          <p className="text-body-sm text-ink-soft">
            ยังไม่มีประวัติการจอง — จองผ่านลิงก์ของสนามที่คุณต้องการ
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
