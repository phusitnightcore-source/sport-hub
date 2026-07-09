"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createBranch, updateBranch, deleteBranch } from "./actions";

type BranchStatus = "active" | "inactive" | "maintenance";

export type BranchFormData = {
  id?: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  open_time: string | null;
  close_time: string | null;
  max_capacity: number;
  status: BranchStatus;
};

export function BranchForm({
  initialData,
}: {
  initialData?: BranchFormData;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    let res;
    if (isEdit) {
      res = await updateBranch(initialData.id!, formData);
    } else {
      res = await createBranch(formData);
    }

    if (res?.error) {
      setError(res.error);
    }
    setBusy(false);
  }

  async function handleDelete() {
    if (!initialData?.id) return;
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบ (ปิด) สาขานี้?")) return;
    
    setBusy(true);
    const res = await deleteBranch(initialData.id);
    if (res?.error) {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-floating flex flex-col gap-6 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink" htmlFor="name">
            ชื่อสาขา <span className="text-danger">*</span>
          </label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initialData?.name}
            placeholder="เช่น สาขาเอกมัย"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink" htmlFor="status">
            สถานะ
          </label>
          <Select
            name="status"
            defaultValue={initialData?.status ?? "active"}
            options={[
              { value: "active", label: "เปิดให้บริการ (Active)" },
              { value: "maintenance", label: "ปรับปรุง (Maintenance)" },
              { value: "inactive", label: "ปิดใช้งาน (Inactive)" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink" htmlFor="phone">
            เบอร์โทรศัพท์
          </label>
          <Input
            id="phone"
            name="phone"
            defaultValue={initialData?.phone || ""}
            placeholder="02-XXX-XXXX"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink" htmlFor="email">
            อีเมลติดต่อ
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initialData?.email || ""}
            placeholder="contact@branch.com"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-body-sm font-medium text-ink" htmlFor="address">
            ที่อยู่สาขา
          </label>
          <Input
            id="address"
            name="address"
            defaultValue={initialData?.address || ""}
            placeholder="บ้านเลขที่, ถนน, ซอย..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink" htmlFor="open_time">
            เวลาเปิด
          </label>
          <Input
            id="open_time"
            name="open_time"
            type="time"
            defaultValue={initialData?.open_time?.slice(0, 5) || "08:00"}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink" htmlFor="close_time">
            เวลาปิด
          </label>
          <Input
            id="close_time"
            name="close_time"
            type="time"
            defaultValue={initialData?.close_time?.slice(0, 5) || "22:00"}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink" htmlFor="max_capacity">
            รองรับคนสูงสุด (คน)
          </label>
          <Input
            id="max_capacity"
            name="max_capacity"
            type="number"
            min="1"
            defaultValue={initialData?.max_capacity || 100}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 p-3 text-body-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between border-t border-line">
        {isEdit ? (
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={handleDelete}
          >
            ระงับ/ลบสาขา
          </Button>
        ) : (
          <div></div> // Spacer
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
            {busy ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างสาขา"}
          </Button>
        </div>
      </div>
    </form>
  );
}
