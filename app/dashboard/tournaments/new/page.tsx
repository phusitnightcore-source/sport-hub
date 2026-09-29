import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Trophy, ChevronLeft } from "lucide-react";
import { NewTournamentForm } from "./NewTournamentForm";

export const metadata = {
  title: "สร้างการแข่งขันใหม่ | แดชบอร์ดสนาม",
};

export default async function NewTournamentPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "venue_admin") redirect("/dashboard");

  const admin = createAdminClient();

  const { data: branches } = await (admin as any)
    .from("branches")
    .select("id, name")
    .eq("tenant_id", ctx.tenantId);

  const allBranches = (branches ?? []) as { id: string; name: string }[];
  const today = new Date().toISOString().split("T")[0];

  return (
    <main className="mx-auto max-w-3xl flex flex-col gap-6 pb-20">
      {/* Back button */}
      <Link
        href="/dashboard/tournaments"
        className="inline-flex items-center gap-1 text-body-sm font-semibold text-ink-soft hover:text-brand transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>กลับไปยังรายการแข่งขันทั้งหมด</span>
      </Link>

      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
          <Trophy className="h-7 w-7 text-amber-500" />
          <span>สร้างการแข่งขันใหม่ (Create Tournament)</span>
        </h1>
        <p className="text-body-sm text-ink-soft mt-1">
          เปิดรับสมัครนักกีฬาและจัดสายการแข่งขันบนแพลตฟอร์ม SportHub
        </p>
      </header>

      <NewTournamentForm branches={allBranches} today={today} />
    </main>
  );
}
