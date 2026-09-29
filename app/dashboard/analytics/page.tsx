import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toSatang, formatBaht } from "@/lib/money";
import { bangkokLastDays, isoDaysAgo } from "@/lib/api";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { PLANS } from "@/lib/plans";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { UpgradeLock } from "@/components/ui/UpgradeLock";

// Analytics (§16 / Module 10) — แนวโน้มรายได้ 14 วัน, ชั่วโมงพีค, สถานะสมาชิก, สนามยอดนิยม
export const dynamic = "force-dynamic";

function bkkDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

export default async function AnalyticsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();

  // Plan gating (§5/§26) — analytics เฉพาะ Growth+
  const { plan, entitlements } = await getTenantEntitlements(admin, ctx.tenantId);
  if (!entitlements.analytics) {
    return <UpgradeLock feature="การวิเคราะห์" plan={PLANS[plan].name} />;
  }

  // ช่วง 14 วันล่าสุด (รวมวันนี้)
  const days = bangkokLastDays(14);
  const since = isoDaysAgo(14);

  const [
    { data: payments },
    { data: bookings },
    { data: courts },
    activeM,
    expiredM,
    frozenM,
  ] = await Promise.all([
    admin
      .from("payments")
      .select("amount, verified_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "verified")
      .gte("verified_at", since),
    admin
      .from("bookings")
      .select("court_id, start_time, status")
      .eq("tenant_id", ctx.tenantId)
      .gte("created_at", since),
    admin.from("courts").select("id, name").eq("tenant_id", ctx.tenantId),
    admin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "active"),
    admin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "expired"),
    admin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "frozen"),
  ]);

  // รายได้รายวัน (สตางค์)
  const revByDay = new Map<string, number>(days.map((d) => [d, 0]));
  for (const p of payments ?? []) {
    if (!p.verified_at) continue;
    const day = bkkDate(p.verified_at);
    if (revByDay.has(day)) {
      revByDay.set(day, revByDay.get(day)! + toSatang(p.amount));
    }
  }
  const revSeries = days.map((d) => ({ day: d, satang: revByDay.get(d) ?? 0 }));
  const maxRev = Math.max(1, ...revSeries.map((r) => r.satang));
  const totalRev = revSeries.reduce((s, r) => s + r.satang, 0);

  // ชั่วโมงพีค (นับการจองที่ไม่ถูกยกเลิก ตาม start_time)
  const liveBookings = (bookings ?? []).filter(
    (b) => !["cancelled", "rejected"].includes(b.status),
  );
  const byHour = new Map<number, number>();
  for (const b of liveBookings) {
    const hour = parseInt(String(b.start_time).slice(0, 2), 10);
    if (!Number.isNaN(hour)) byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
  }
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00–22:00
  const maxHour = Math.max(1, ...hours.map((h) => byHour.get(h) ?? 0));

  // สนามยอดนิยม
  const byCourt = new Map<string, number>();
  for (const b of liveBookings) {
    byCourt.set(b.court_id, (byCourt.get(b.court_id) ?? 0) + 1);
  }
  const courtName = new Map((courts ?? []).map((c) => [c.id, c.name]));
  const topCourts = [...byCourt.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCourt = topCourts[0]?.[1] ?? 1;

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">
          วิเคราะห์ธุรกิจ
        </h1>
        <p className="text-body-sm text-ink-soft">ข้อมูล 14 วันล่าสุด</p>
      </div>

      <StatCard
        stats={[
          { label: "รายได้ 14 วัน", value: `฿${formatBaht(totalRev)}` },
          { label: "การจอง (ไม่ยกเลิก)", value: liveBookings.length, unit: "รายการ" },
          {
            label: "เฉลี่ย/วัน",
            value: `฿${formatBaht(Math.round(totalRev / 14))}`,
          },
        ]}
      />

      {/* แนวโน้มรายได้ */}
      <section className="card-floating flex flex-col gap-4 p-6">
        <h2 className="font-display text-body-lg font-semibold text-ink">
          แนวโน้มรายได้รายวัน
        </h2>
        <div className="flex h-40 items-end gap-1">
          {revSeries.map((r) => (
            <div
              key={r.day}
              className="group relative flex flex-1 flex-col items-center justify-end"
            >
              <div
                className="w-full rounded-t-sm bg-brand transition-all hover:bg-brand-dark"
                style={{ height: `${Math.round((r.satang / maxRev) * 100)}%` }}
                title={`${r.day}: ฿${formatBaht(r.satang)}`}
              />
              <span className="mt-1 text-[10px] text-ink-soft">
                {r.day.slice(8)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ชั่วโมงพีค */}
        <section className="card-floating flex flex-col gap-4 p-6">
          <h2 className="font-display text-body-lg font-semibold text-ink">
            ช่วงเวลายอดนิยม
          </h2>
          <div className="flex h-32 items-end gap-1">
            {hours.map((h) => {
              const c = byHour.get(h) ?? 0;
              return (
                <div key={h} className="flex flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t-sm bg-brand-soft"
                    style={{ height: `${Math.round((c / maxHour) * 100)}%` }}
                    title={`${h}:00 — ${c} การจอง`}
                  />
                  {h % 3 === 0 && (
                    <span className="mt-1 text-[10px] text-ink-soft">{h}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* สถานะสมาชิก */}
        <section className="card-floating flex flex-col gap-4 p-6">
          <h2 className="font-display text-body-lg font-semibold text-ink">
            สถานะสมาชิก
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-ink">ใช้งานอยู่</span>
              <StatusPill tone="success">{activeM.count ?? 0}</StatusPill>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-ink">หมดอายุ</span>
              <StatusPill tone="danger">{expiredM.count ?? 0}</StatusPill>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-ink">แช่แข็ง</span>
              <StatusPill tone="warning">{frozenM.count ?? 0}</StatusPill>
            </div>
          </div>
        </section>
      </div>

      {/* สนามยอดนิยม */}
      <section className="card-floating flex flex-col gap-4 p-6">
        <h2 className="font-display text-body-lg font-semibold text-ink">
          สนามยอดนิยม
        </h2>
        {topCourts.length === 0 ? (
          <p className="text-body-sm text-ink-soft">ยังไม่มีข้อมูลการจอง</p>
        ) : (
          <div className="flex flex-col gap-3">
            {topCourts.map(([id, count]) => (
              <div key={id} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-body-sm text-ink">
                  {courtName.get(id) ?? "—"}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-soft">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.round((count / maxCourt) * 100)}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-mono-sm text-ink-soft">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
