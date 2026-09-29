import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { KioskClient } from "./KioskClient";

export const dynamic = "force-dynamic";

// หน้า Kiosk self check-in สาธารณะต่อสาขา (/checkin/[token]) — ไม่ต้องล็อกอิน
// token = branches.kiosk_token (unique). ลูกค้ากรอกเบอร์เพื่อเช็คอินเอง
export default async function KioskPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) notFound();

  const admin = createAdminClient();
  const { data: branch } = await admin
    .from("branches")
    .select("id, tenant_id, name, status, tenants(name)")
    .eq("kiosk_token", token)
    .maybeSingle();
  if (!branch || branch.status !== "active") notFound();

  const { entitlements } = await getTenantEntitlements(admin, branch.tenant_id);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-body-sm font-medium text-brand">
            {branch.tenants?.name ?? "SportHub"}
          </p>
          <h1 className="font-display text-display-md font-semibold text-ink">
            {branch.name}
          </h1>
          <p className="text-body-sm text-ink-soft">ลงทะเบียนเข้าใช้บริการด้วยตนเอง</p>
        </div>

        {entitlements.kiosk_mode ? (
          <KioskClient token={token} />
        ) : (
          <div className="card-floating p-8 text-center text-body text-ink-soft">
            สาขานี้ยังไม่เปิดใช้งานระบบเช็คอินด้วยตนเอง กรุณาติดต่อเจ้าหน้าที่
          </div>
        )}
      </div>
    </main>
  );
}
