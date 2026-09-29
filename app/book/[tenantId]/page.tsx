import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { MapPin, Clock, CalendarSearch } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBahtFromDb } from "@/lib/money";
import { ListRowCard, LeadingIcon } from "@/components/ui/ListRowCard";
import { StatusPill } from "@/components/ui/StatusPill";

// หน้าเลือกสนามสาธารณะของ tenant — ใช้ service role อย่างจงใจ (guest อ่าน
// tenants/branches ผ่าน RLS ไม่ได้) เลือกเฉพาะ field ที่จำเป็นต่อการแสดงผล
export default async function VenuePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  if (!z.string().uuid().safeParse(tenantId).success) notFound();

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, status")
    .eq("id", tenantId)
    .single();
  if (!tenant || !["active", "trial", "free"].includes(tenant.status)) notFound();

  const [{ data: branches, error: branchError }, { data: courts, error: courtError }] = await Promise.all([
    admin
      .from("branches")
      .select("id, name, address, open_time, close_time")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("created_at"),
    admin
      .from("courts")
      .select("id, branch_id, name, type, price_standard, price_peak, open_time, close_time")
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .order("created_at"),
  ]);

  if (branchError || courtError) return <main role="alert" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 text-ink"><h1 className="text-xl font-bold">โหลดสนามไม่สำเร็จ</h1><p className="mt-3">กรุณาโหลดหน้าใหม่เพื่อตรวจสนามที่เปิดให้จอง</p></main>;
  const activeCourts = (courts ?? []).filter(c => branches?.some(b => b.id === c.branch_id));
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-4 flex justify-end">
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-1.5 text-body-sm font-medium text-ink/70 shadow-sm ring-1 ring-inset ring-line transition-colors hover:text-brand"
        >
          <CalendarSearch aria-hidden className="h-4 w-4" />
          เช็คการจองของฉัน
        </Link>
      </div>
      <header className="mb-8 rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-sm"><p className="mb-3 text-xs font-semibold tracking-widest text-brand">FIND YOUR COURT</p>
        <h1 className="font-display text-display-lg font-bold text-ink">
          {tenant.name}
        </h1>
        <p className="mt-4 text-sm text-ink/70">เลือกสนามที่ชอบ แล้วเลือกวันและเวลาที่สะดวก</p><p className="mt-3 text-sm text-ink/70">{activeCourts.length} สนามที่เปิดให้จอง</p>
      </header>

      <div className="flex flex-col gap-8">
        {(branches ?? []).map((branch) => {
          const branchCourts = activeCourts.filter(
            (c) => c.branch_id === branch.id,
          );
          if (branchCourts.length === 0) return null;
          return (
            <section key={branch.id}>
              <div className="mb-3 flex items-center gap-2 text-ink/70">
                <MapPin aria-hidden className="h-4 w-4" />
                <h2 className="text-body font-medium text-ink">{branch.name}</h2>
                {branch.address && (
                  <span className="truncate text-body-sm">{branch.address}</span>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {branchCourts.map((court) => (
                  <Link key={court.id} href={`/book/${tenantId}/${court.id}`}>
                    <ListRowCard
                      leading={
                        <LeadingIcon>
                          <Clock aria-hidden />
                        </LeadingIcon>
                      }
                      title={court.name}
                      subtitle={`${court.type} · เปิด ${court.open_time.slice(0, 5)}–${court.close_time.slice(0, 5)}`}
                      trailing={
                        <StatusPill tone="brand">
                          ฿{formatBahtFromDb(court.price_standard)}/ชม.
                        </StatusPill>
                      }
                    />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
        {activeCourts.length === 0 && (
          <p className="text-center text-body text-ink/70">
            ยังไม่มีสนามเปิดให้จองในขณะนี้
          </p>
        )}
      </div>
    </main>
  );
}
