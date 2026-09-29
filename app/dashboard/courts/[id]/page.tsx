import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { bangkokToday } from "@/lib/api";
import { CourtForm, type CourtFormData } from "../CourtForm";
import { PeakBlockManager } from "./PeakBlockManager";

export default async function EditCourtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: court } = await supabase
    .from("courts")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .single();
  if (!court) notFound();

  const [{ data: branches }, { data: peaks }, { data: blocks }] = await Promise.all([
    supabase.from("branches").select("id, name").eq("tenant_id", ctx.tenantId),
    supabase
      .from("court_peak_windows")
      .select("id, day_of_week, start_time, end_time")
      .eq("court_id", id)
      .order("day_of_week"),
    supabase
      .from("block_schedules")
      .select("id, block_date, start_time, end_time, reason, note")
      .eq("court_id", id)
      .gte("block_date", bangkokToday())
      .order("block_date"),
  ]);

  const initialData: CourtFormData = {
    id: court.id,
    branch_id: court.branch_id,
    name: court.name,
    type: court.type,
    price_standard: court.price_standard,
    price_peak: court.price_peak,
    price_offpeak: court.price_offpeak,
    open_time: court.open_time,
    close_time: court.close_time,
    capacity: court.capacity,
    advance_booking_days: court.advance_booking_days,
    status: court.status,
    free_cancel_hours: court.free_cancel_hours,
    cancel_fee_percent: court.cancel_fee_percent,
    allow_reschedule: court.allow_reschedule,
    reschedule_hours: court.reschedule_hours,
    refund_note: court.refund_note,
  };

  return (
    <main className="flex flex-col gap-8">
      <h1 className="font-display text-display-md font-semibold text-ink">
        แก้ไขสนาม · {court.name}
      </h1>
      <CourtForm branches={branches ?? []} initialData={initialData} />
      <PeakBlockManager
        courtId={court.id}
        isAdmin={ctx.role === "venue_admin"}
        peaks={peaks ?? []}
        blocks={blocks ?? []}
        minDate={bangkokToday()}
      />
    </main>
  );
}
