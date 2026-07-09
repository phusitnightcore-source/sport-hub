import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { formatBahtFromDb } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { ListRowCard, LeadingIcon } from "@/components/ui/ListRowCard";
import { StatusPill } from "@/components/ui/StatusPill";

const COURT_STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  open: { label: "เปิดจอง", tone: "success" },
  maintenance: { label: "ซ่อมบำรุง", tone: "warning" },
  closed: { label: "ปิด", tone: "danger" },
};

export default async function CourtsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const [{ data: branches }, { data: courts }] = await Promise.all([
    supabase.from("branches").select("id, name").eq("tenant_id", ctx.tenantId).order("created_at"),
    supabase
      .from("courts")
      .select("id, branch_id, name, type, price_standard, price_peak, open_time, close_time, status")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at"),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-md font-semibold text-ink">สนาม</h1>
        {ctx.role === "venue_admin" && (branches ?? []).length > 0 && (
          <Link href="/dashboard/courts/new">
            <Button size="sm">
              <Plus aria-hidden className="h-4 w-4" />
              เพิ่มสนาม
            </Button>
          </Link>
        )}
      </div>

      {(branches ?? []).length === 0 ? (
        <div className="card-floating p-8 text-center text-body text-ink-soft">
          ยังไม่มีสาขา — สร้างสาขาก่อนที่หน้า &ldquo;สาขา&rdquo;
        </div>
      ) : (
        (branches ?? []).map((branch) => {
          const branchCourts = (courts ?? []).filter((c) => c.branch_id === branch.id);
          return (
            <section key={branch.id} className="flex flex-col gap-3">
              <h2 className="text-body font-medium text-ink-soft">{branch.name}</h2>
              {branchCourts.length === 0 ? (
                <p className="text-body-sm text-ink-soft">ยังไม่มีสนามในสาขานี้</p>
              ) : (
                branchCourts.map((c) => (
                  <Link key={c.id} href={`/dashboard/courts/${c.id}`}>
                    <ListRowCard
                      leading={
                        <LeadingIcon>
                          <LayoutGrid aria-hidden />
                        </LeadingIcon>
                      }
                      title={c.name}
                      subtitle={`${c.type} · ${c.open_time.slice(0, 5)}–${c.close_time.slice(0, 5)}`}
                      trailing={
                        <StatusPill tone={COURT_STATUS[c.status]?.tone ?? "success"}>
                          {COURT_STATUS[c.status]?.label ?? c.status}
                        </StatusPill>
                      }
                    >
                      <span className="text-body-sm text-ink">
                        ฿{formatBahtFromDb(c.price_standard)}
                        {c.price_peak ? ` / Peak ฿${formatBahtFromDb(c.price_peak)}` : ""}
                      </span>
                    </ListRowCard>
                  </Link>
                ))
              )}
            </section>
          );
        })
      )}
    </main>
  );
}
