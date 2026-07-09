"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { createPackage, togglePackageStatus } from "./actions";
import type { Database } from "@/lib/supabase/types";

type Package = Database["public"]["Tables"]["packages"]["Row"];

export function PackageForm({
  initialData,
}: {
  initialData?: Package;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState(initialData?.type ?? "monthly");
  const [priceStr, setPriceStr] = useState(
    initialData ? (initialData.price / 100).toString() : ""
  );
  const [duration, setDuration] = useState(
    initialData?.duration_days?.toString() ?? ""
  );
  const [sessionsLimit, setSessionsLimit] = useState(
    initialData?.sessions_limit?.toString() ?? ""
  );
  const [freezeMax, setFreezeMax] = useState(
    initialData?.freeze_max_times?.toString() ?? "2"
  );
  const [freezeDays, setFreezeDays] = useState(
    initialData?.freeze_max_days?.toString() ?? "30"
  );
  const [freezeAuto, setFreezeAuto] = useState(
    initialData?.freeze_auto_approve ?? false
  );
  const [benefits] = useState(initialData?.benefits ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const price = Math.round(parseFloat(priceStr) * 100);
    const duration_days = duration ? parseInt(duration, 10) : null;
    const sessions_limit = sessionsLimit ? parseInt(sessionsLimit, 10) : null;
    
    if (initialData) {
      // TODO: Update logic if needed, but for now we focus on creation
      // For editing, we might just allow toggling status or basic edits
      setError("การแก้ไขแบบเต็มรูปแบบกำลังอยู่ระหว่างพัฒนา");
      setLoading(false);
      return;
    }

    const res = await createPackage({
      name,
      type,
      price,
      duration_days,
      sessions_limit,
      sessions_carryover: false,
      branch_access_all: true, // simplifying for now
      freeze_max_times: parseInt(freezeMax, 10) || 0,
      freeze_max_days: parseInt(freezeDays, 10) || 0,
      freeze_auto_approve: freezeAuto,
      benefits,
    });

    if (res.success) {
      router.push("/dashboard/packages");
    } else {
      setError(res.error || "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!initialData) return;
    setLoading(true);
    const res = await togglePackageStatus(initialData.id, !initialData.is_active);
    if (res.success) {
      router.refresh();
      setLoading(false);
    } else {
      setError(res.error || "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      {error && (
        <div className="rounded-md bg-danger-soft p-4 text-body-sm text-danger">
          {error}
        </div>
      )}

      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">ข้อมูลพื้นฐาน</h2>
        
        <div>
          <label className="mb-1 block text-body-sm font-medium text-ink">
            ชื่อแพ็กเกจ
          </label>
          <input
            required
            type="text"
            className="w-full rounded-md border border-line bg-surface p-2 text-ink outline-none focus:border-brand"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">
              ประเภทแพ็กเกจ
            </label>
            <div className="z-20">
              <Select
                name="type"
                options={[
                  { value: "daily", label: "รายวัน (Daily)" },
                  { value: "weekly", label: "รายสัปดาห์ (Weekly)" },
                  { value: "monthly", label: "รายเดือน (Monthly)" },
                  { value: "yearly", label: "รายปี (Yearly)" },
                  { value: "session_based", label: "นับครั้ง (Session Based)" }
                ]}
                value={type}
                onChange={(val) => setType(val as Package["type"])}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">
              ราคา (บาท)
            </label>
            <input
              required
              type="number"
              step="0.01"
              className="w-full rounded-md border border-line bg-surface p-2 text-ink outline-none focus:border-brand"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {type !== "session_based" && (
            <div>
              <label className="mb-1 block text-body-sm font-medium text-ink">
                ระยะเวลา (วัน)
              </label>
              <input
                type="number"
                className="w-full rounded-md border border-line bg-surface p-2 text-ink outline-none focus:border-brand"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="เช่น 30"
              />
            </div>
          )}
          {type === "session_based" && (
            <div>
              <label className="mb-1 block text-body-sm font-medium text-ink">
                จำนวนครั้ง
              </label>
              <input
                required
                type="number"
                className="w-full rounded-md border border-line bg-surface p-2 text-ink outline-none focus:border-brand"
                value={sessionsLimit}
                onChange={(e) => setSessionsLimit(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">สิทธิ์การ Freeze (ระงับชั่วคราว)</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">
              จำนวนครั้งสูงสุดที่ให้ Freeze ได้
            </label>
            <input
              type="number"
              className="w-full rounded-md border border-line bg-surface p-2 text-ink outline-none focus:border-brand"
              value={freezeMax}
              onChange={(e) => setFreezeMax(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">
              ระยะเวลา Freeze สูงสุดรวม (วัน)
            </label>
            <input
              type="number"
              className="w-full rounded-md border border-line bg-surface p-2 text-ink outline-none focus:border-brand"
              value={freezeDays}
              onChange={(e) => setFreezeDays(e.target.value)}
            />
          </div>
        </div>
        
        <label className="flex items-center gap-2 text-body-sm text-ink">
          <input
            type="checkbox"
            className="rounded text-brand focus:ring-brand"
            checked={freezeAuto}
            onChange={(e) => setFreezeAuto(e.target.checked)}
          />
          อนุมัติคำขอ Freeze อัตโนมัติ (ไม่ต้องรอแอดมินยืนยัน)
        </label>
      </div>

      <div className="flex justify-end gap-3">
        {initialData && (
          <Button
            type="button"
            variant={initialData.is_active ? "danger" : "primary"}
            disabled={loading}
            onClick={handleToggleStatus}
          >
            {initialData.is_active ? "ปิดชั่วคราว (Inactive)" : "เปิดขาย (Active)"}
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          ยกเลิก
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "กำลังบันทึก..." : initialData ? "บันทึกการแก้ไข" : "สร้างแพ็กเกจ"}
        </Button>
      </div>
    </form>
  );
}
