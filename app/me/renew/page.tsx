import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";

import { RenewForm } from "./RenewForm";

// Simplified Renew Page (Server Component only for now)
export default async function RenewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("tenant_id, packages(id, name, price, type, duration_days, sessions_limit)")
    .eq("profile_id", user.id)
    .single();

  if (!member || !member.packages) {
    redirect("/me");
  }

  const { data: availablePackages } = await supabase
    .from("packages")
    .select("id, name, price, type, duration_days, sessions_limit")
    .eq("tenant_id", member.tenant_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/me"
            className="rounded-full bg-surface p-2 text-ink-soft shadow-sm transition-all hover:bg-line hover:text-ink"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="font-display text-display-md font-semibold text-ink">
            ต่ออายุแพ็กเกจ
          </h1>
        </div>

        <div className="card-floating flex flex-col gap-4 p-6">
          <h2 className="text-body-lg font-bold text-ink">เลือกแพ็กเกจใหม่</h2>
          
          <RenewForm 
            packages={availablePackages || []} 
            currentPackageId={member.packages.id} 
          />
          
          <Link href="/me" className="mt-4">
            <Button variant="secondary" className="w-full">
              ยกเลิก
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
