import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
      "id, tenant_id, name, type, status, advance_booking_days, free_cancel_hours, cancel_fee_percent, allow_reschedule, reschedule_hours, refund_note, branches(name,status), tenants(name,status)",
    )
    .eq("id", courtId)
    .eq("tenant_id", tenantId)
    .single();
  if (!court || court.status !== "open" || court.branches?.status !== "active" || !["active","trial","free"].includes(court.tenants?.status ?? "")) notFound();

  const today = bangkokToday();
  const max = new Date(`${today}T00:00:00Z`);
  max.setUTCDate(max.getUTCDate() + court.advance_booking_days);
  const maxDate = max.toISOString().slice(0, 10);

  // prefill สำหรับสมาชิกที่ล็อกอินอยู่ (จองในนามสมาชิก)
  let member: { name: string; phone: string } | null = null;
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (user) {
    const { data: m } = await admin
      .from("members")
      .select("first_name, last_name, phone")
      .eq("profile_id", user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (m) {
      member = {
        name: `${m.first_name} ${m.last_name ?? ""}`.trim(),
        phone: m.phone ?? "",
      };
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/book/${tenantId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-ink-soft hover:text-brand"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        กลับไปเลือกสนาม
      </Link>
      <header className="mb-8">
        <h1 className="font-display text-display-md font-semibold text-ink">
          จอง {court.name}
        </h1>
        <p className="mt-3 text-sm text-ink/70">{court.tenants?.name} · {court.branches?.name} · {court.type}</p><p className="mt-4 text-sm text-ink/70">เลือกวันและเวลาที่สะดวก ตรวจรายละเอียด แล้วดำเนินการชำระเงิน</p>
      </header>

      <BookingClient
        courtName={court.name}
        branchName={court.branches?.name ?? ""}
        courtId={court.id}
        minDate={today}
        maxDate={maxDate}
        member={member}
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
