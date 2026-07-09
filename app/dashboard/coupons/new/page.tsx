import { getStaffContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CouponForm } from "../CouponForm";

export default async function NewCouponPage() {
  const ctx = await getStaffContext();
  if (!ctx?.tenantId) redirect("/login");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand">สร้างโค้ดส่วนลดใหม่</h1>
        <p className="mt-2 text-body text-ink-soft">
          ระบุเงื่อนไขและรายละเอียดของคูปองที่คุณต้องการสร้าง
        </p>
      </div>
      <CouponForm />
    </div>
  );
}
