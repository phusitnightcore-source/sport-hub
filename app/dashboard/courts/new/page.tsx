import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { CourtForm } from "../CourtForm";

export default async function NewCourtPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "venue_admin") redirect("/dashboard/courts");

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "active")
    .order("created_at");

  if (!branches || branches.length === 0) {
    return (
      <main className="card-floating p-8 text-center text-body text-ink-soft">
        ต้องมีสาขาก่อนจึงจะเพิ่มสนามได้
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">เพิ่มสนามใหม่</h1>
      <CourtForm branches={branches} />
    </main>
  );
}
