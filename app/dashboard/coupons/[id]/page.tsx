import { getStaffContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CouponForm } from "../CouponForm";

export default async function EditCouponPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await getStaffContext();
  if (!ctx?.tenantId) redirect("/login");

  const supabase = await createClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", params.id)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (!coupon) redirect("/dashboard/coupons");

  const initialData = {
    ...coupon,
    start_date: coupon.start_date.split("T")[0],
    end_date: coupon.end_date.split("T")[0],
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand">แก้ไขโค้ดส่วนลด</h1>
        <p className="mt-2 text-body text-ink-soft">
          แก้ไขรายละเอียดของคูปอง {coupon.code}
        </p>
      </div>
      <CouponForm initialData={initialData} />
    </div>
  );
}
