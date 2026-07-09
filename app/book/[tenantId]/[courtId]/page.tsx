import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { bangkokToday } from "@/lib/api";
import { BookingClient } from "./BookingClient";

// หน้าจองรายสนาม — service role อย่างจงใจ (public page, เลือกเฉพาะ field จำเป็น)
export default async function CourtBookingPage({
  params,
}: {
  params: Promise<{ tenantId: string; courtId: string }>;
}) {
  const { tenantId, courtId } = await params;
  const uuid = z.string().uuid();
  if (!uuid.safeParse(tenantId).success || !uuid.safeParse(courtId).success) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: court } = await admin
    .from("courts")
    .select(
      "id, tenant_id, name, type, status, advance_booking_days, free_cancel_hours, cancel_fee_percent, allow_reschedule, reschedule_hours, refund_note",
    )
    .eq("id", courtId)
    .eq("tenant_id", tenantId)
    .single();
  if (!court || court.status !== "open") notFound();

  const today = bangkokToday();
  const max = new Date(`${today}T00:00:00Z`);
  max.setUTCDate(max.getUTCDate() + court.advance_booking_days);
  const maxDate = max.toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/book/${tenantId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-ink-soft hover:text-brand"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        กลับไปเลือกสนาม
      </Link>
      <header className="mb-6">
        <h1 className="font-display text-display-md font-semibold text-ink">
          จอง {court.name}
        </h1>
        <p className="text-body-sm text-ink-soft">{court.type}</p>
      </header>

      <BookingClient
        courtId={court.id}
        minDate={today}
        maxDate={maxDate}
        policy={{
          freeCancelHours: court.free_cancel_hours,
          cancelFeePercent: court.cancel_fee_percent,
          allowReschedule: court.allow_reschedule,
          rescheduleHours: court.reschedule_hours,
          refundNote: court.refund_note,
        }}
      />
    </main>
  );
}
