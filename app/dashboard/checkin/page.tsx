import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckinClient } from "./CheckinClient";
import { OccupancyPanel } from "./OccupancyPanel";

// Check-in (§10) — รองรับทั้ง venue_admin และ staff
export default async function CheckinPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { data: branches } = await admin
    .from("branches")
    .select("id, name, max_capacity")
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "active")
    .order("created_at");

  const { data: openCheckins } = await admin
    .from("checkins")
    .select(
      "id, branch_id, checkin_time, estimated_checkout_time, members(first_name, last_name, member_number)",
    )
    .eq("tenant_id", ctx.tenantId)
    .eq("result", "passed")
    .is("actual_checkout_time", null)
    .order("checkin_time", { ascending: false });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-2 sm:p-6">
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">
          ลงทะเบียนเข้าใช้บริการ (Check-in)
        </h1>
        <p className="text-body-sm text-ink-soft">
          สแกน QR จากบัตรสมาชิก หรือค้นหาด้วยเบอร์โทรศัพท์
        </p>
      </div>

      {(branches ?? []).length === 0 ? (
        <div className="card-floating p-8 text-center text-body text-ink-soft">
          ยังไม่มีสาขาที่เปิดใช้งาน — สร้างสาขาก่อนที่หน้าจัดการสาขา
        </div>
      ) : (
        <>
          <CheckinClient branches={(branches ?? []).map((b) => ({ id: b.id, name: b.name }))} />
          <OccupancyPanel
            tenantId={ctx.tenantId}
            branches={branches ?? []}
            openCheckins={openCheckins ?? []}
          />
        </>
      )}
    </div>
  );
}
