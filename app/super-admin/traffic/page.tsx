import { redirect } from "next/navigation";
import { getSuperAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { bangkokLastDays, isoDaysAgo } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";

// Super Admin: สถิติการเข้าชมเว็บ 14 วันล่าสุด (first-party page_views)
export const dynamic = "force-dynamic";

function bkkDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}
function refHost(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (h === "localhost" || h.endsWith("sporthub")) return null; // ตัด self/ภายใน
    return h;
  } catch {
    return null;
  }
}

export default async function TrafficPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("page_views")
    .select("path, visitor_hash, device, referrer, created_at")
    .gte("created_at", isoDaysAgo(14))
    .order("created_at", { ascending: false })
    .limit(20000);

  const views = rows ?? [];
  const totalViews = views.length;
  const uniqueVisitors = new Set(
    views.map((v) => v.visitor_hash).filter(Boolean),
  ).size;

  const days = bangkokLastDays(14);
  const byDay = new Map<string, number>(days.map((d) => [d, 0]));
  for (const v of views) {
    const d = bkkDate(v.created_at);
    if (byDay.has(d)) byDay.set(d, byDay.get(d)! + 1);
  }
  const daySeries = days.map((d) => ({ day: d, count: byDay.get(d) ?? 0 }));
  const maxDay = Math.max(1, ...daySeries.map((d) => d.count));

  const count = <T,>(arr: T[], key: (t: T) => string | null) => {
    const m = new Map<string, number>();
    for (const x of arr) {
      const k = key(x);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const topPaths = count(views, (v) => v.path).slice(0, 8);
  const maxPath = topPaths[0]?.[1] ?? 1;
  const devices = count(views, (v) => v.device);
  const topReferrers = count(views, (v) => refHost(v.referrer)).slice(0, 6);

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">
          การเข้าชมเว็บ
        </h1>
        <p className="text-body-sm text-ink-soft">14 วันล่าสุด (ไม่ใช้คุกกี้ / ไม่ระบุตัวตน)</p>
      </div>

      <StatCard
        stats={[
          { label: "เข้าชมรวม", value: totalViews.toLocaleString("th-TH"), unit: "ครั้ง" },
          { label: "ผู้เข้าชม (unique)", value: uniqueVisitors.toLocaleString("th-TH"), unit: "คน" },
          {
            label: "เฉลี่ย/วัน",
            value: Math.round(totalViews / 14).toLocaleString("th-TH"),
            unit: "ครั้ง",
          },
        ]}
      />

      {/* กราฟรายวัน */}
      <section className="card-floating flex flex-col gap-4 p-6">
        <h2 className="font-display text-body-lg font-semibold text-ink">การเข้าชมรายวัน</h2>
        <div className="flex h-40 items-end gap-1">
          {daySeries.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t-sm bg-brand transition-all hover:bg-brand-dark"
                style={{ height: `${Math.round((d.count / maxDay) * 100)}%` }}
                title={`${d.day}: ${d.count}`}
              />
              <span className="mt-1 text-[10px] text-ink-soft">{d.day.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* หน้ายอดนิยม */}
        <section className="card-floating flex flex-col gap-3 p-6">
          <h2 className="font-display text-body-lg font-semibold text-ink">หน้ายอดนิยม</h2>
          {topPaths.length === 0 ? (
            <p className="text-body-sm text-ink-soft">ยังไม่มีข้อมูล</p>
          ) : (
            topPaths.map(([path, c]) => (
              <div key={path} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate font-mono text-mono-sm text-ink" title={path}>
                  {path}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-soft">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.round((c / maxPath) * 100)}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-mono-sm text-ink-soft">
                  {c}
                </span>
              </div>
            ))
          )}
        </section>

        {/* อุปกรณ์ + ที่มา */}
        <section className="flex flex-col gap-6">
          <div className="card-floating flex flex-col gap-3 p-6">
            <h2 className="font-display text-body-lg font-semibold text-ink">อุปกรณ์</h2>
            <div className="flex flex-wrap gap-2">
              {devices.length === 0 ? (
                <p className="text-body-sm text-ink-soft">ยังไม่มีข้อมูล</p>
              ) : (
                devices.map(([d, c]) => (
                  <StatusPill key={d} tone="brand">
                    {d} · {c}
                  </StatusPill>
                ))
              )}
            </div>
          </div>
          <div className="card-floating flex flex-col gap-3 p-6">
            <h2 className="font-display text-body-lg font-semibold text-ink">ที่มา (referrer)</h2>
            {topReferrers.length === 0 ? (
              <p className="text-body-sm text-ink-soft">ส่วนใหญ่เข้าตรง / ยังไม่มีข้อมูล</p>
            ) : (
              topReferrers.map(([host, c]) => (
                <div key={host} className="flex items-center justify-between text-body-sm">
                  <span className="truncate text-ink">{host}</span>
                  <span className="font-mono text-mono-sm text-ink-soft">{c}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
