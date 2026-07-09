"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createCoupon, updateCoupon, toggleCouponStatus } from "./actions";

export type CouponFormData = {
  id?: string;
  code: string;
  name: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_purchase: number;
  applicable_to: string;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  first_booking_only: boolean;
  status?: "active" | "inactive" | "expired";
};

export function CouponForm({
  initialData,
}: {
  initialData?: CouponFormData;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstBookingOnly, setFirstBookingOnly] = useState(
    initialData?.first_booking_only ?? false
  );
  
  const isEdit = !!initialData?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("first_booking_only", firstBookingOnly ? "true" : "false");

    let res;
    if (isEdit) {
      res = await updateCoupon(initialData.id!, formData);
    } else {
      res = await createCoupon(formData);
    }

    if (res?.error) {
      setError(res.error);
    } else {
      window.history.back();
    }
    setBusy(false);
  }

  async function handleToggleStatus() {
    if (!initialData?.id || !initialData?.status) return;
    const newStatus = initialData.status === "active" ? "inactive" : "active";
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะคูปองเป็น ${newStatus.toUpperCase()}?`)) return;
    
    setBusy(true);
    const res = await toggleCouponStatus(initialData.id, initialData.status);
    if (res?.error) {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-floating flex flex-col gap-8 p-6">
      
      <section>
        <h2 className="mb-4 text-body-lg font-bold text-ink border-b border-line pb-2">ข้อมูลส่วนลด</h2>
        <div className="grid gap-6 md:grid-cols-2">
          
          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="code">
              โค้ดส่วนลด <span className="text-danger">*</span>
            </label>
            <Input
              id="code"
              name="code"
              required
              defaultValue={initialData?.code}
              placeholder="เช่น SUMMER2024"
              className="uppercase"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="name">
              ชื่อโปรโมชั่น <span className="text-danger">*</span>
            </label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={initialData?.name}
              placeholder="เช่น ส่วนลดรับลมร้อน"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="discount_type">
              ประเภทส่วนลด <span className="text-danger">*</span>
            </label>
            <Select
              name="discount_type"
              defaultValue={initialData?.discount_type ?? "fixed"}
              options={[
                { value: "fixed", label: "ลดเป็นจำนวนเงิน (บาท)" },
                { value: "percent", label: "ลดเป็นเปอร์เซ็นต์ (%)" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="discount_value">
              มูลค่าส่วนลด <span className="text-danger">*</span>
            </label>
            <Input
              id="discount_value"
              name="discount_value"
              type="number"
              step="0.01"
              required
              defaultValue={initialData?.discount_value}
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="min_purchase">
              ยอดซื้อขั้นต่ำ
            </label>
            <Input
              id="min_purchase"
              name="min_purchase"
              type="number"
              step="0.01"
              defaultValue={initialData?.min_purchase ?? "0"}
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="usage_limit">
              จำนวนสิทธิ์ทั้งหมด (เว้นว่างถ้าไม่จำกัด)
            </label>
            <Input
              id="usage_limit"
              name="usage_limit"
              type="number"
              defaultValue={initialData?.usage_limit ?? ""}
              placeholder="เช่น 100"
            />
          </div>

        </div>
      </section>

      <section>
        <h2 className="mb-4 text-body-lg font-bold text-ink border-b border-line pb-2">เงื่อนไขการใช้งาน</h2>
        <div className="grid gap-6 md:grid-cols-2">
          
          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="start_date">
              วันที่เริ่มต้น <span className="text-danger">*</span>
            </label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              required
              defaultValue={initialData?.start_date}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="end_date">
              วันที่สิ้นสุด <span className="text-danger">*</span>
            </label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              required
              defaultValue={initialData?.end_date}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="applicable_to">
              ใช้งานได้กับ <span className="text-danger">*</span>
            </label>
            <Select
              name="applicable_to"
              defaultValue={initialData?.applicable_to ?? "all"}
              options={[
                { value: "all", label: "ทุกบริการ (ทั้งจองสนามและแพ็กเกจ)" },
                { value: "court", label: "เฉพาะค่าจองสนาม" },
                { value: "package", label: "เฉพาะค่าแพ็กเกจสมาชิก" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2 pt-8">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={firstBookingOnly}
                onChange={(e) => setFirstBookingOnly(e.target.checked)}
                className="h-5 w-5 rounded border-line text-brand focus:ring-brand"
              />
              <span className="text-body font-medium text-ink">เฉพาะลูกค้าใหม่ (ซื้อครั้งแรกเท่านั้น)</span>
            </label>
          </div>
          
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-danger/10 p-3 text-body-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between border-t border-line">
        {isEdit && initialData.status ? (
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={handleToggleStatus}
          >
            {initialData.status === "active" ? "ระงับคูปอง" : "เปิดใช้งานคูปอง"}
          </Button>
        ) : (
          <div></div> 
        )}
        
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.history.back()}
            disabled={busy}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างคูปอง"}
          </Button>
        </div>
      </div>
    </form>
  );
}
