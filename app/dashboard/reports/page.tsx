import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { bangkokToday, isoDatePlusDays } from "@/lib/api";
import { toSatang, formatBaht } from "@/lib/money";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";

// รายงานสถิติ (§7.2, §8.2, §15) — เดือนปัจจุบัน + Export CSV
export default async function ReportsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { entitlements } = await getTenantEntitlements(supabase, ctx.tenantId);
  const today = bangkokToday();
  const month = today.slice(0, 7);
  const monthStartIso = new Date(`${month}-01T00:00:00+07:00`).toISOString();
  const in7 = isoDatePlusDays(7);
  const in30 = isoDatePlusDays(30);

  const [
    { data: verifiedPayments },
    { data: monthBookings },
    { data: courts },
    newMembers,
    expiring7,
    expiring30,
    frozen,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, booking_id, member_id")
      .eq("status", "verified")
      .gte("verified_at", monthStartIso),
    supabase
      .from("bookings")
      .select("court_id, status")
      .gte("created_at", monthStartIso),
    supabase.from("courts").select("id, name"),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStartIso),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("end_date", today)
      .lte("end_date", in7),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("end_date", today)
      .lte("end_date", in30),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "frozen"),
  ]);

  const pays = verifiedPayments ?? [];
  const bookingRevenue = pays
    .filter((p) => p.booking_id)
    .reduce((s, p) => s + toSatang(p.amount), 0);
  const memberRevenue = pays
    .filter((p) => p.member_id)
    .reduce((s, p) => s + toSatang(p.amount), 0);

  const bookings = monthBookings ?? [];
  const cancelled = bookings.filter((b) =>
    ["cancelled", "rejected", "refunded", "awaiting_refund"].includes(b.status),
  ).length;

  // สนามยอดนิยม (นับเฉพาะจองที่ไม่ถูกยกเลิก)
  const byCourt = new Map<string, number>();
  for (const b of bookings) {
    if (["cancelled", "rejected"].includes(b.status)) continue;
    byCourt.set(b.court_id, (byCourt.get(b.court_id) ?? 0) + 1);
  }
  const courtName = new Map((courts ?? []).map((c) => [c.id, c.name]));
  const popular = [...byCourt.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCount = popular[0]?.[1] ?? 1;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-md font-semibold text-ink">
          รายงานเดือน {month}
        </h1>
        {entitlements.export_reports ? (
          <div className="flex flex-wrap gap-2">
            {[
              { type: "bookings", label: "CSV การจอง" },
              { type: "members", label: "CSV สมาชิก" },
              { type: "payments", label: "CSV รายได้" },
            ].map((x) => (
              <a key={x.type} href={`/api/admin/reports/export?type=${x.type}&month=${month}`}>
                <Button size="sm" variant="secondary">
                  <Download aria-hidden className="h-4 w-4" />
                  {x.label}
                </Button>
              </a>
            ))}
          </div>
        ) : (
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-4 py-1.5 text-body-sm font-medium text-brand-dark"
          >
            <Lock className="h-4 w-4" />
            Export CSV — อัปเกรดแพลน
          </Link>
        )}
      </div>

      <StatCard
        stats={[
          { label: "รายได้ค่าจอง (ยืนยันแล้ว)", value: `฿${formatBaht(bookingRevenue)}` },
          { label: "รายได้ค่าสมาชิก", value: `฿${formatBaht(memberRevenue)}` },
          { label: "รวมทั้งเดือน", value: `฿${formatBaht(bookingRevenue + memberRevenue)}` },
        ]}
      />
      <StatCard
        stats={[
          { label: "การจองเดือนนี้", value: bookings.length, unit: "รายการ" },
          { label: "ยกเลิก/ปฏิเสธ", value: cancelled, unit: "รายการ" },
          { label: "สมาชิกใหม่เดือนนี้", value: newMembers.count ?? 0, unit: "คน" },
          { label: "หมดอายุใน 7 วัน", value: expiring7.count ?? 0, unit: "คน" },
          { label: "หมดอายุใน 30 วัน", value: expiring30.count ?? 0, unit: "คน" },
          { label: "Frozen", value: frozen.count ?? 0, unit: "คน" },
        ]}
      />

      <div className="card-floating p-6">
        <h2 className="mb-4 text-body font-medium text-ink">สนามยอดนิยม (เดือนนี้)</h2>
        {popular.length === 0 ? (
          <p className="text-body-sm text-ink-soft">ยังไม่มีการจองเดือนนี้</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {popular.map(([courtId, count]) => (
              <li key={courtId} className="flex items-center gap-3">
                <span className="w-40 truncate text-body-sm text-ink">
                  {courtName.get(courtId) ?? "-"}
                </span>
                <span
                  className="h-3 rounded-full bg-brand"
                  style={{ width: `${Math.max(8, (count / maxCount) * 100)}%` }}
                  aria-hidden
                />
                <span className="shrink-0 font-mono text-mono-sm text-ink-soft">
                  {count} ครั้ง
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
