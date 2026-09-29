import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { bangkokToday, bangkokNowTime } from "@/lib/api";
import { coversBookingSlot, validBookingDate } from "@/lib/booking/dates";
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
  const date = validBookingDate(rawDate)
    ? (rawDate as string)
    : bangkokToday();

  const supabase = await createClient();

  // 1. Get branches for the tenant
  const branchQuery = supabase.from("branches").select("id,name").eq("tenant_id",ctx.tenantId).eq("status","active").order("created_at");
  if (ctx.role === "staff") {
    if (!ctx.staffId) redirect("/dashboard");
    const { data: staff } = await supabase.from("staff").select("status,multi_branch_access,staff_branches(branch_id)").eq("id",ctx.staffId).eq("tenant_id",ctx.tenantId).maybeSingle();
    if (!staff || staff.status !== "active") redirect("/dashboard");
    if (!staff.multi_branch_access) {
      const ids = staff.staff_branches.map(b => b.branch_id);
      if (!ids.length) redirect("/dashboard");
      branchQuery.in("id",ids);
    }
  }
  const { data: branches, error: branchError } = await branchQuery;
  if (branchError) return <main role="alert" className="card-floating p-8 text-ink">โหลดสาขาไม่สำเร็จ กรุณาลองใหม่</main>;

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
  const { data: courts, error: courtError } = await supabase
    .from("courts")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("branch_id", currentBranch.id)
    .eq("status", "open")
    .order("name");

  if (courtError) return <main role="alert" className="card-floating p-8 text-ink">โหลดสนามไม่สำเร็จ กรุณาลองใหม่</main>;
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
  const bookingsQuery = supabase
    .from("bookings")
    .select("id, booking_code, start_time, end_time, court_id, status, user_name", { count: "exact" })
    .eq("branch_id", currentBranch.id)
    .eq("tenant_id", ctx.tenantId)
    .eq("booking_date", date)
    .in("status", ["pending_payment", "awaiting_verification", "confirmed", "awaiting_refund"]);

  const blocksQuery = supabase
    .from("block_schedules")
    .select("id, start_time, end_time, court_id, reason", { count: "exact" })
    .in("court_id", courts.map(c => c.id))
    .eq("tenant_id", ctx.tenantId)
    .eq("block_date", date);

  const coachQuery = supabase.from("coach_bookings")
    .select("court_booking_id,status,coach_profiles(display_name)",{count:"exact"})
    .eq("tenant_id",ctx.tenantId).eq("branch_id",currentBranch.id).eq("booking_date",date)
    .in("status",["requested","accepted","confirmed","in_progress","completed"]);

  const [{ data:bookings,error:bookingError,count:bookingCount },{ data:blocks,error:blockError,count:blockCount },{data:coachAppointments,error:coachError,count:coachCount}] = await Promise.all([bookingsQuery,blocksQuery,coachQuery]);
  if (bookingError || blockError || coachError || bookingCount !== (bookings?.length ?? 0) || blockCount !== (blocks?.length ?? 0) || coachCount !== (coachAppointments?.length??0)) return <main role="alert" className="card-floating p-8 text-ink">โหลดตารางไม่ครบ กรุณาลองใหม่ก่อนตรวจเวลาว่าง</main>;
  const coachByBooking=new Map((coachAppointments??[]).map(c=>[c.court_booking_id,c.coach_profiles?.display_name??"โค้ช"]));
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

    // Staff must still see customers playing now and earlier bookings today.
    const displaySlots = slots.map((slot): typeof slot => {
      if (courtBookings.some(b => coversBookingSlot(b.start_time,b.end_time,slot.start))) return { ...slot,status:"booked" };
      if (courtBlocks.some(b => toMinutes(b.start_time) < toMinutes(slot.end) && toMinutes(b.end_time) > toMinutes(slot.start))) return { ...slot,status:"blocked" };
      return slot;
    });
    return { ...court, slots:displaySlots, courtBookings, courtBlocks };
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
                    (b) => coversBookingSlot(b.start_time, b.end_time, slot.start)
                  );
                  const block = court.courtBlocks.find(
                    (b) => coversBookingSlot(b.start_time, b.end_time, slot.start)
                  );

                  return (
                    <td key={court.id} className="border-b border-r border-line/50 p-1.5 align-top">
                      <div
                        className={cn(
                          "flex min-h-[4rem] flex-col rounded-sm p-2 text-left transition-colors",
                          slot.status === "available" && "bg-brand-soft/30 hover:bg-brand-soft",
                          slot.status === "booked" && "bg-brand-soft text-ink ring-1 ring-brand/30 shadow-sm",
                          slot.status === "blocked" && "bg-line/50 slot-hatch text-ink-soft",
                          slot.status === "past" && "bg-line/30 text-ink-soft/50",
                        )}
                      >
                        {slot.status === "available" && (
                          <Link
                            href={`/dashboard/bookings/new?court_id=${court.id}&date=${date}&start_time=${slot.start}`}
                            className="flex h-full flex-col justify-between group"
                            title={`คลิกเพื่อจอง Walk-in สำหรับ ${court.name} เวลา ${slot.start}`}
                          >
                            <span className="text-[10px] font-bold text-brand flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ว่าง
                            </span>
                            <span className="mt-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-brand bg-brand/10 rounded-md px-1.5 py-0.5 w-fit opacity-80 group-hover:opacity-100 group-hover:bg-brand group-hover:text-white transition-all">
                              + จอง Walk-in
                            </span>
                          </Link>
                        )}
                        {slot.status === "booked" && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold leading-tight line-clamp-1">{booking?.user_name || "จองแล้ว"}</span>
                            {booking&&coachByBooking.has(booking.id)&&<span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">โค้ช {coachByBooking.get(booking.id)}</span>}
                            {booking && (
                              <Link href={`/dashboard/bookings?date=${date}&q=${booking.booking_code}`} className="text-[10px] text-ink/70 hover:text-ink underline decoration-brand/40 underline-offset-2">
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
