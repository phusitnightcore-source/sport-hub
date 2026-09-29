import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { FreezeActions } from "./FreezeActions";

export default async function FreezeRequestsPage() {
  const ctx = await getStaffContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("freeze_requests")
    .select(`
      *,
      members ( first_name, last_name, member_number, packages(name) )
    `)
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/members"
          className="rounded-full p-2 text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="font-display text-display-md font-semibold text-ink">
          คำขอระงับสมาชิกชั่วคราว (Freeze)
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        {(requests ?? []).map((req) => (
          <div
            key={req.id}
            className="card-floating flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-body font-medium text-ink">
                  {req.members?.member_number}
                </span>
                <span className="text-body-lg font-bold text-ink">
                  {req.members?.first_name} {req.members?.last_name || ""}
                </span>
              </div>
              <p className="mt-1 text-body-sm text-ink-soft">
                แพ็กเกจ: {req.members?.packages?.name || "-"}
              </p>
              <div className="mt-3 rounded bg-surface p-3 text-body-sm text-ink">
                <span className="font-medium">เหตุผล: </span>
                {req.reason || "-"}
              </div>
            </div>
            
            <div className="flex flex-col gap-2 sm:items-end">
              <span className="text-body-sm text-ink-soft">
                ขอเมื่อ {new Date(req.requested_at).toLocaleDateString("th-TH")}
              </span>
              <FreezeActions requestId={req.id} />
            </div>
          </div>
        ))}

        {(requests ?? []).length === 0 && (
          <div className="card-floating p-10 text-center text-ink-soft">
            ไม่มีคำขอที่รออนุมัติ
          </div>
        )}
      </div>
    </main>
  );
}
