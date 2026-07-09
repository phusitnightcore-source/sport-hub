import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { ManualMemberForm } from "./ManualMemberForm";

export default async function NewMemberPage() {
  const ctx = await getStaffContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, price")
    .eq("tenant_id", ctx.tenantId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center py-10">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/members"
            className="rounded-full bg-surface p-2 text-ink-soft shadow-sm transition-all hover:bg-line hover:text-ink"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="font-display text-display-md font-semibold text-ink">
            เพิ่มสมาชิกใหม่
          </h1>
        </div>

        <div className="w-full">
          <ManualMemberForm packages={packages || []} />
        </div>
      </div>
    </main>
  );
}
