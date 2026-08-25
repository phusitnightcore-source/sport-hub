import { redirect } from "next/navigation";
import { CalendarClock, Phone } from "lucide-react";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill } from "@/components/ui/StatusPill";

export const dynamic = "force-dynamic";

// รายชื่อคิวรอ (Waitlist) ต่อสนาม — ลูกค้าที่กด "แจ้งเตือนเมื่อว่าง" ตอน slot เต็ม
// ข้อมูลมาจากตาราง waitlists (RLS = service role) → ใช้ admin client กรองด้วย tenant
export default async function WaitlistPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("waitlists")
    .select("id, booking_date, start_time, end_time, user_name, user_phone, notified_at, courts(name)")
    .eq("tenant_id", ctx.tenantId)
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(200);

  const entries = rows ?? [];
  const waiting = entries.filter((e) => !e.notified_at).length;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display-md font-semibold text-ink">คิวรอ (Waitlist)</h1>
        <p className="text-body-sm text-ink-soft">
          ลูกค้าที่รอ slot ว่าง — ระบบแจ้งเตือนอัตโนมัติเมื่อมีการยกเลิก/คืนเงิน
          {entries.length > 0 && ` · รออยู่ ${waiting} จาก ${entries.length} รายการ`}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="card-floating flex flex-col items-center gap-4 p-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
            <CalendarClock className="h-8 w-8 text-brand" />
          </span>
          <p className="max-w-xs text-body-sm text-ink-soft">
            ยังไม่มีคิวรอ — เมื่อ slot เต็มและลูกค้ากด &ldquo;แจ้งเตือนเมื่อว่าง&rdquo; รายการจะมาอยู่ที่นี่
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <div key={e.id} className="card-floating flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-display font-semibold text-ink">
                    {e.courts?.name ?? "สนาม"}
                  </span>
                  <span className="font-mono text-mono-sm text-ink-soft">
                    {e.booking_date} · {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-2 text-body-sm text-ink-soft">
                  <span>{e.user_name}</span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {e.user_phone}
                  </span>
                </p>
              </div>
              <StatusPill tone={e.notified_at ? "success" : "warning"}>
                {e.notified_at ? "แจ้งแล้ว" : "รออยู่"}
              </StatusPill>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
