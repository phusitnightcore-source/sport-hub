import { getStaffContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Plus, Edit2 } from "lucide-react";
import { formatBaht } from "@/lib/money";

export default async function CouponsPage() {
  const ctx = await getStaffContext();
  if (!ctx?.tenantId) redirect("/login");

  const supabase = await createClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand">โค้ดส่วนลดทั้งหมด</h1>
          <p className="mt-2 text-body text-ink-soft">
            จัดการโปรโมชั่นและคูปองส่วนลดสำหรับลูกค้า
          </p>
        </div>
        <Link href="/dashboard/coupons/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            สร้างคูปองใหม่
          </Button>
        </Link>
      </div>

      <div className="card-floating overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm text-ink">
            <thead className="border-b border-line bg-surface/50 text-ink-soft">
              <tr>
                <th className="p-4 font-medium">โค้ดส่วนลด</th>
                <th className="p-4 font-medium">ชื่อโปรโมชั่น</th>
                <th className="p-4 font-medium text-right">ส่วนลด</th>
                <th className="p-4 font-medium">การใช้งาน</th>
                <th className="p-4 font-medium">ระยะเวลา</th>
                <th className="p-4 font-medium">สถานะ</th>
                <th className="p-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink-soft">
                    ยังไม่มีโค้ดส่วนลดในระบบ
                  </td>
                </tr>
              ) : (
                coupons?.map((coupon) => (
                  <tr key={coupon.id} className="transition-colors hover:bg-surface/50">
                    <td className="p-4 font-bold text-brand">
                      {coupon.code}
                    </td>
                    <td className="p-4">{coupon.name}</td>
                    <td className="p-4 text-right">
                      {coupon.discount_type === "percent"
                        ? `${coupon.discount_value}%`
                        : `฿${formatBaht(coupon.discount_value * 100)}`}
                    </td>
                    <td className="p-4 text-ink-soft">
                      {coupon.usage_count} / {coupon.usage_limit || "∞"}
                    </td>
                    <td className="p-4 text-ink-soft">
                      {new Date(coupon.start_date).toLocaleDateString("th-TH")} - <br />
                      {new Date(coupon.end_date).toLocaleDateString("th-TH")}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold ${
                          coupon.status === "active"
                            ? "bg-brand-soft text-brand"
                            : "bg-surface text-ink-soft"
                        }`}
                      >
                        {coupon.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/dashboard/coupons/${coupon.id}`}>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-ink-soft hover:text-brand">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
