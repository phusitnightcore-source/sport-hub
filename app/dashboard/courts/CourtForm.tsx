"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createCourt, updateCourt } from "./actions";

export type CourtFormData = {
  id?: string;
  branch_id: string;
  name: string;
  type: string;
  price_standard: number;
  price_peak: number | null;
  price_offpeak: number | null;
  open_time: string;
  close_time: string;
  capacity: number;
  advance_booking_days: number;
  status: "open" | "closed" | "maintenance";
  free_cancel_hours: number;
  cancel_fee_percent: number;
  allow_reschedule: boolean;
  reschedule_hours: number;
  refund_note: string | null;
};

type BranchOption = { id: string; name: string };

export function CourtForm({
  branches,
  initialData,
}: {
  branches: BranchOption[];
  initialData?: CourtFormData;
}) {
  const router = useRouter();
  const isEdit = !!initialData?.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowReschedule, setAllowReschedule] = useState(
    initialData?.allow_reschedule ?? true,
  );
  const [branchId, setBranchId] = useState(
    initialData?.branch_id ?? branches[0]?.id ?? "",
  );
  const [status, setStatus] = useState(initialData?.status ?? "open");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const num = (k: string) => f.get(k)?.toString() ?? "";
    const payload = {
      branch_id: branchId,
      name: num("name"),
      type: num("type"),
      price_standard: num("price_standard"),
      price_peak: num("price_peak") ? num("price_peak") : null,
      price_offpeak: num("price_offpeak") ? num("price_offpeak") : null,
      open_time: num("open_time"),
      close_time: num("close_time"),
      capacity: num("capacity"),
      advance_booking_days: num("advance_booking_days"),
      status,
      free_cancel_hours: num("free_cancel_hours"),
      cancel_fee_percent: num("cancel_fee_percent"),
      allow_reschedule: allowReschedule,
      reschedule_hours: num("reschedule_hours"),
      refund_note: num("refund_note"),
    };

    const res = isEdit
      ? await updateCourt(initialData!.id!, payload)
      : await createCourt(payload);
    if (res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.push("/dashboard/courts");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">ข้อมูลสนาม</h2>
        {!isEdit && (
          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink">สาขา</label>
            <Select
              name="branch_id_display"
              value={branchId}
              onChange={setBranchId}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="ชื่อสนาม" name="name" required defaultValue={initialData?.name} />
          <Input
            label="ประเภท (แบดมินตัน/ฟุตบอล/ฯลฯ)"
            name="type"
            required
            defaultValue={initialData?.type}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-ink">สถานะ</label>
          <Select
            name="status_display"
            value={status}
            onChange={(v) => setStatus(v as CourtFormData["status"])}
            options={[
              { value: "open", label: "เปิดจอง (Open)" },
              { value: "maintenance", label: "ซ่อมบำรุง (Maintenance)" },
              { value: "closed", label: "ปิด (Closed)" },
            ]}
          />
        </div>
      </div>

      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">ราคา (บาท/ชั่วโมง)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="ราคามาตรฐาน"
            name="price_standard"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={initialData?.price_standard ?? 0}
          />
          <Input
            label="ราคา Peak (ไม่บังคับ)"
            name="price_peak"
            type="number"
            min="0"
            step="1"
            defaultValue={initialData?.price_peak ?? ""}
          />
          <Input
            label="ราคา Off-peak (ไม่บังคับ)"
            name="price_offpeak"
            type="number"
            min="0"
            step="1"
            defaultValue={initialData?.price_offpeak ?? ""}
          />
        </div>
      </div>

      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">เวลาและการจอง</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="เวลาเปิด"
            name="open_time"
            type="time"
            required
            defaultValue={initialData?.open_time?.slice(0, 5) ?? "08:00"}
          />
          <Input
            label="เวลาปิด"
            name="close_time"
            type="time"
            required
            defaultValue={initialData?.close_time?.slice(0, 5) ?? "22:00"}
          />
          <Input
            label="ความจุ (คน)"
            name="capacity"
            type="number"
            min="1"
            required
            defaultValue={initialData?.capacity ?? 1}
          />
          <Input
            label="จองล่วงหน้าได้ (วัน, 1–90)"
            name="advance_booking_days"
            type="number"
            min="1"
            max="90"
            required
            defaultValue={initialData?.advance_booking_days ?? 30}
          />
        </div>
      </div>

      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">นโยบายยกเลิก/เลื่อน</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="ยกเลิกฟรีก่อน (ชั่วโมง)"
            name="free_cancel_hours"
            type="number"
            min="0"
            required
            defaultValue={initialData?.free_cancel_hours ?? 24}
          />
          <Input
            label="ค่าธรรมเนียมถ้าเกินเวลา (%)"
            name="cancel_fee_percent"
            type="number"
            min="0"
            max="100"
            required
            defaultValue={initialData?.cancel_fee_percent ?? 50}
          />
          <Input
            label="เลื่อนต้องแจ้งก่อน (ชั่วโมง)"
            name="reschedule_hours"
            type="number"
            min="0"
            required
            defaultValue={initialData?.reschedule_hours ?? 24}
          />
        </div>
        <label className="flex items-center gap-2 text-body-sm text-ink">
          <input
            type="checkbox"
            checked={allowReschedule}
            onChange={(e) => setAllowReschedule(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          อนุญาตให้เลื่อนการจอง
        </label>
        <Input
          label="ข้อความแจ้งลูกค้าเรื่องคืนเงิน (ไม่บังคับ)"
          name="refund_note"
          defaultValue={initialData?.refund_note ?? ""}
        />
      </div>

      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={busy}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={busy || !branchId}>
          {busy ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างสนาม"}
        </Button>
      </div>
    </form>
  );
}
