import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { WalkInForm } from "./WalkInForm";

// Staff จองให้ลูกค้า (§7.2) — โทรจอง/เดินมาหน้าร้าน
export default async function NewBookingPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: courts } = await supabase
    .from("courts")
    .select("id, name, type, open_time, close_time, branches(name)")
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "open")
    .order("created_at");

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        จองให้ลูกค้า (Walk-in / โทรจอง)
      </h1>
      {(courts ?? []).length === 0 ? (
        <div className="card-floating p-8 text-center text-body text-ink-soft">
          ยังไม่มีสนามที่เปิดจอง
        </div>
      ) : (
        <WalkInForm
          courts={(courts ?? []).map((c) => ({
            id: c.id,
            label: `${c.name} (${c.branches?.name ?? ""}) ${c.open_time.slice(0, 5)}–${c.close_time.slice(0, 5)}`,
            openTime: c.open_time.slice(0, 5),
            closeTime: c.close_time.slice(0, 5),
          }))}
        />
      )}
    </main>
  );
}
