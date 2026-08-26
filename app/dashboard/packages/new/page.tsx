import { getStaffContext } from "@/lib/auth";
import { PackageForm } from "../PackageForm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NewPackagePage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at");

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-display-md font-bold text-ink">
          สร้างแพ็กเกจสมาชิกใหม่
        </h1>
        <p className="text-body-sm text-ink-soft">
          กำหนดประเภท อัตราค่าบริการ สิทธิ์สาขา และนโยบายการพักสมาชิก
        </p>
      </div>

      <PackageForm branches={branches ?? []} />
    </main>
  );
}
