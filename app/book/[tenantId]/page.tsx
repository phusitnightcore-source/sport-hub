import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { MapPin, Clock } from "lucide-react";
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

  const [{ data: branches }, { data: courts }] = await Promise.all([
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

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 text-center">
        <h1 className="font-display text-display-lg font-bold text-ink">
          {tenant.name}
        </h1>
        <p className="mt-1 text-body text-ink-soft">เลือกสนามเพื่อจอง</p>
      </header>

      <div className="flex flex-col gap-8">
        {(branches ?? []).map((branch) => {
          const branchCourts = (courts ?? []).filter(
            (c) => c.branch_id === branch.id,
          );
          if (branchCourts.length === 0) return null;
          return (
            <section key={branch.id}>
              <div className="mb-3 flex items-center gap-2 text-ink-soft">
                <MapPin aria-hidden className="h-4 w-4" />
                <h2 className="text-body font-medium text-ink">{branch.name}</h2>
                {branch.address && (
                  <span className="truncate text-body-sm">{branch.address}</span>
                )}
              </div>
              <div className="flex flex-col gap-3">
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
        {(courts ?? []).length === 0 && (
          <p className="text-center text-body text-ink-soft">
            ยังไม่มีสนามเปิดให้จองในขณะนี้
          </p>
        )}
      </div>
    </main>
  );
}
