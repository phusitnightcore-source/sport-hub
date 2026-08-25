import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { bangkokToday, bangkokNowTime } from "@/lib/api";
import { buildSlots, toMinutes } from "@/lib/booking/slots";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { cn } from "@/lib/utils";

function toHHMM(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branch?: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const { date: rawDate, branch: rawBranch } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "")
    ? (rawDate as string)
    : bangkokToday();

  const supabase = await createClient();

  // 1. Get branches for the tenant
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at");

  if (!branches || branches.length === 0) {
    return (
      <main className="flex flex-col gap-6">
        <h1 className="font-display text-display-md font-semibold text-ink">ตารางสนาม</h1>
        <div className="card-floating p-10 text-center text-ink-soft">
          ยังไม่มีสาขาในระบบ
        </div>
      </main>
    );
  }

  const branchId = rawBranch || branches[0].id;
  const currentBranch = branches.find((b) => b.id === branchId) || branches[0];

  // 2. Get courts for the branch
  const { data: courts } = await supabase
    .from("courts")
    .select("*")
    .eq("branch_id", currentBranch.id)
    .order("name");

  if (!courts || courts.length === 0) {
    return (
      <main className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-display-md font-semibold text-ink">ตารางสนาม</h1>
          <form method="get" className="flex items-center gap-2">
            <select
              name="branch"
              defaultValue={currentBranch.id}
              className="rounded-sm bg-surface px-4 py-2 text-body-sm text-ink shadow-sm outline-none focus:ring-2 focus:ring-brand"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm">เปลี่ยนสาขา</Button>
          </form>
        </div>
        <div className="card-floating p-10 text-center text-ink-soft">
          ยังไม่มีสนามในสาขานี้
        </div>
      </main>
    );
  }

  // 3. Get bookings and blocks for the date
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, court_id, status, user_name")
    .eq("tenant_id", ctx.tenantId)
    .eq("booking_date", date)
    .neq("status", "cancelled");

  const { data: blocks } = await supabase
    .from("block_schedules")
    .select("id, start_time, end_time, court_id, reason")
    .eq("tenant_id", ctx.tenantId)
    .eq("block_date", date);

  const today = bangkokToday();
  const nowTime = bangkokNowTime();

  // 4. Calculate slots for each court
  const courtsData = courts.map((court) => {
    const courtBookings = (bookings || []).filter((b) => b.court_id === court.id);
    const courtBlocks = (blocks || []).filter((b) => b.court_id === court.id);

    const slots = buildSlots({
      court: {
        open_time: court.open_time,
        close_time: court.close_time,
        price_standard: court.price_standard,
        price_peak: court.price_peak,
      },
      peakWindows: [], // We don't need accurate peak/price info for the staff schedule view
      bookings: courtBookings,
      blocks: courtBlocks,
      date,
      today,
      nowTime,
    });

    return { ...court, slots, courtBookings, courtBlocks };
  });

  // 5. Generate overall timeline from min open_time to max close_time
  const minOpen = Math.min(...courts.map((c) => toMinutes(c.open_time)));
  const maxClose = Math.max(...courts.map((c) => toMinutes(c.close_time)));

  const timeline: { start: string; end: string }[] = [];
  for (let m = minOpen; m + 60 <= maxClose; m += 60) {
    timeline.push({ start: toHHMM(m), end: toHHMM(m + 60) });
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-display-md font-semibold text-ink">ตารางสนาม</h1>
        <form method="get" className="flex flex-wrap items-center gap-2.5">
          {branches.length > 1 && (
            <select
              name="branch"
              defaultValue={currentBranch.id}
              className="rounded-xl border border-line bg-surface px-3.5 py-2 text-body-sm font-semibold text-ink shadow-xs outline-none focus:border-brand cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-xl border border-line bg-surface px-3.5 py-2 text-body-sm font-semibold text-ink shadow-xs outline-none focus:border-brand cursor-pointer"
          />
          <Button type="submit" size="sm" className="rounded-xl shadow-xs">
            ดูตาราง
          </Button>
        </form>
      </div>

      <div className="card-floating overflow-x-auto">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-24 bg-surface px-4 py-3 text-left text-body-sm font-semibold text-ink-soft border-b border-r border-line/50">
                เวลา
              </th>
              {courtsData.map((court) => (
                <th
                  key={court.id}
                  className="bg-surface px-4 py-3 text-center text-body-sm font-semibold text-ink border-b border-r border-line/50 min-w-[140px]"
                >
                  {court.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeline.map((time) => (
              <tr key={time.start}>
                <td className="sticky left-0 z-10 bg-surface px-4 py-2 text-mono-sm text-ink-soft border-b border-r border-line/50 whitespace-nowrap align-top">
                  {time.start} - {time.end}
                </td>
                {courtsData.map((court) => {
                  // Find the slot for this time in this court
                  const slot = court.slots.find((s) => s.start === time.start);
                  
                  // If no slot exists (e.g. this time is before court opens or after it closes)
                  if (!slot) {
                    return (
                      <td key={court.id} className="bg-surface-soft border-b border-r border-line/50 p-2 text-center align-top">
                        <span className="text-[10px] text-ink-soft/40">ปิด</span>
                      </td>
                    );
                  }

                  // Find booking details if booked
                  const booking = court.courtBookings.find(
                    (b) => b.start_time.slice(0, 5) === slot.start
                  );
                  const block = court.courtBlocks.find(
                    (b) => b.start_time.slice(0, 5) === slot.start
                  );

                  return (
                    <td key={court.id} className="border-b border-r border-line/50 p-1.5 align-top">
                      <div
                        className={cn(
                          "flex min-h-[4rem] flex-col rounded-sm p-2 text-left transition-colors",
                          slot.status === "available" && "bg-brand-soft/30 hover:bg-brand-soft",
                          slot.status === "booked" && "bg-brand text-white shadow-sm",
                          slot.status === "blocked" && "bg-line/50 slot-hatch text-ink-soft",
                          slot.status === "past" && "bg-line/30 text-ink-soft/50",
                        )}
                      >
                        {slot.status === "available" && (
                          <span className="text-[10px] font-medium text-brand">ว่าง</span>
                        )}
                        {slot.status === "booked" && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold leading-tight line-clamp-1">{booking?.user_name || "จองแล้ว"}</span>
                            {booking && (
                              <Link href={`/dashboard/bookings?date=${date}`} className="text-[10px] text-white/80 hover:text-white underline decoration-white/40 underline-offset-2">
                                ดูรายละเอียด
                              </Link>
                            )}
                          </div>
                        )}
                        {slot.status === "blocked" && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-ink leading-tight">บล็อก</span>
                            <span className="text-[10px] leading-tight line-clamp-2">{block?.reason || "ปิดปรับปรุง"}</span>
                          </div>
                        )}
                        {slot.status === "past" && (
                          <span className="text-[10px] font-medium">ผ่านไปแล้ว</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
