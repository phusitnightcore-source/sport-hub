import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ApplyForm } from "./ApplyForm";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const resolvedParams = await params;
  const admin = createAdminClient();

  const [tenantRes, packagesRes] = await Promise.all([
    admin.from("tenants").select("name").eq("id", resolvedParams.tenantId).single(),
    admin.from("packages").select("*").eq("tenant_id", resolvedParams.tenantId).eq("is_active", true),
  ]);

  if (!tenantRes.data) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-center font-display text-display-md font-semibold text-brand">
        สมัครสมาชิก - {tenantRes.data.name}
      </h1>
      
      <ApplyForm 
        tenantId={resolvedParams.tenantId} 
        packages={packagesRes.data || []} 
      />
    </main>
  );
}
