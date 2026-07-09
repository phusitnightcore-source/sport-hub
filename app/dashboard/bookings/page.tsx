import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { bangkokToday } from "@/lib/api";
import { formatBahtFromDb } from "@/lib/money";
import { BOOKING_STATUS_LABEL } from "@/lib/booking/status";
import { Button } from "@/components/ui/Button";
import { ListRowCard, LeadingIcon } from "@/components/ui/ListRowCard";
import { StatusPill } from "@/components/ui/StatusPill";

// รายการจองของ tenant — RLS: venue_admin เห็นทุกสาขา / staff เห็นเฉพาะสาขาตัวเอง
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
      "id, booking_code, user_name, user_phone, booking_date, start_time, end_time, total_price, status, courts(name)",
    )
    .eq("booking_date", date)
    .order("start_time");

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-display-md font-semibold text-ink">
          การจอง
        </h1>
        {/* เปลี่ยนวันด้วย GET form — ไม่ต้องมี client JS */}
        <form method="get" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-sm bg-surface px-4 py-2 text-body-sm text-ink shadow-sm outline-none focus:ring-2 focus:ring-brand"
          />
          <Button type="submit" size="sm">
            ดูวันที่เลือก
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {(bookings ?? []).map((b) => {
          const st = BOOKING_STATUS_LABEL[b.status];
          return (
            <ListRowCard
              key={b.id}
              leading={
                <LeadingIcon>
                  <CalendarDays aria-hidden />
                </LeadingIcon>
              }
              title={`${b.user_name} · ${b.courts?.name ?? ""}`}
              subtitle={`${b.user_phone} · ฿${formatBahtFromDb(b.total_price)}`}
              trailing={<StatusPill tone={st.tone}>{st.label}</StatusPill>}
            >
              <span className="font-mono text-mono-sm text-ink">
                {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
              </span>
              <span className="font-mono text-mono-sm text-ink-soft">
                {b.booking_code}
              </span>
            </ListRowCard>
          );
        })}
        {(bookings ?? []).length === 0 && (
          <div className="card-floating flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <CalendarDays aria-hidden className="h-6 w-6" />
            </span>
            <p className="text-body text-ink">ไม่มีการจองในวันที่เลือก</p>
          </div>
        )}
      </div>
    </main>
  );
}
