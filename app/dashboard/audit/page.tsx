import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";

// Audit Log (§24) — Venue Admin ดูของ tenant ตัวเอง (RLS: staff อ่านไม่ได้)
export default async function AuditPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "venue_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, module, actor_role, reference_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">
          ประวัติการใช้งาน (Audit Log)
        </h1>
        <p className="text-body-sm text-ink-soft">
          100 รายการล่าสุดของสนามคุณ — ทุกการเปลี่ยนแปลงสำคัญถูกบันทึกอัตโนมัติ
        </p>
      </div>

      <div className="card-floating overflow-x-auto p-6">
        {(logs ?? []).length === 0 ? (
          <p className="text-body-sm text-ink-soft">ยังไม่มีบันทึก</p>
        ) : (
          <table className="w-full text-body-sm">
            <thead>
              <tr className="text-left uppercase text-ink-soft">
                <th className="pb-2 font-medium">เวลา</th>
                <th className="pb-2 font-medium">ผู้กระทำ</th>
                <th className="pb-2 font-medium">โมดูล</th>
                <th className="pb-2 font-medium">การกระทำ</th>
                <th className="pb-2 font-medium">อ้างอิง</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l) => (
                <tr key={l.id} className="border-t border-line">
                  <td className="py-2 font-mono text-mono-sm text-ink-soft">
                    {new Date(l.created_at).toLocaleString("th-TH", {
                      timeZone: "Asia/Bangkok",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 text-ink">{l.actor_role}</td>
                  <td className="py-2 text-ink">{l.module}</td>
                  <td className="py-2 text-ink">{l.action}</td>
                  <td className="py-2 font-mono text-mono-sm text-ink-soft">
                    {l.reference_id?.slice(0, 8) ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
