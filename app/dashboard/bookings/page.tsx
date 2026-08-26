import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { bangkokToday } from "@/lib/api";
import { BookingsClient, type BookingItem } from "./BookingsClient";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const { date: rawDate } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "")
    ? (rawDate as string)
    : bangkokToday();

  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, booking_code, user_name, user_phone, booking_date, start_time, end_time, total_price, status, courts(name)"
    )
    .eq("tenant_id", ctx.tenantId)
    .eq("booking_date", date)
    .order("start_time");

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display-md font-bold text-ink">
          รายการจองสนาม
        </h1>
        <p className="text-body-sm text-ink-soft">
          จัดการคิวจองสนาม ตรวจสอบสลิป และเช็คอินผู้เล่นเข้าสนาม
        </p>
      </div>

      <BookingsClient
        bookings={(bookings as any) ?? []}
        currentDate={date}
      />
    </main>
  );
}
