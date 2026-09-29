"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";
import { createPackage, updatePackage, togglePackageStatus } from "./actions";
import type { Database } from "@/lib/supabase/types";
import {
  Package as PackageIcon,
  CheckCircle2,
  AlertCircle,
  Building,
  Clock,
  Snowflake,
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
} from "lucide-react";

type Package = Database["public"]["Tables"]["packages"]["Row"];
type Branch = { id: string; name: string };

export function PackageForm({
  initialData,
  branches = [],
}: {
  initialData?: Package;
  branches?: Branch[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState<Package["type"]>(initialData?.type ?? "monthly");
  const [priceStr, setPriceStr] = useState(
    initialData ? (initialData.price / 100).toString() : ""
  );
  const [duration, setDuration] = useState(
    initialData?.duration_days?.toString() ?? "30"
  );
  const [sessionsLimit, setSessionsLimit] = useState(
    initialData?.sessions_limit?.toString() ?? "10"
  );
  const [sessionsCarryover, setSessionsCarryover] = useState(
    initialData?.sessions_carryover ?? false
  );
  const [branchAccessAll, setBranchAccessAll] = useState(
    initialData?.branch_access_all ?? true
  );
  const [branchAccessIds, setBranchAccessIds] = useState<string[]>(
    (initialData?.branch_access_ids as string[]) ?? []
  );

  // Freeze Policy states
  const [freezeMax, setFreezeMax] = useState(
    initialData?.freeze_max_times?.toString() ?? "2"
  );
  const [freezeDays, setFreezeDays] = useState(
    initialData?.freeze_max_days?.toString() ?? "30"
  );
  const [freezeAuto, setFreezeAuto] = useState(
    initialData?.freeze_auto_approve ?? false
  );
  const [benefits, setBenefits] = useState(initialData?.benefits ?? "");

  function toggleBranchId(branchId: string) {
    if (branchAccessIds.includes(branchId)) {
      setBranchAccessIds(branchAccessIds.filter((id) => id !== branchId));
    } else {
      setBranchAccessIds([...branchAccessIds, branchId]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const price = Math.round(parseFloat(priceStr) * 100);
    if (isNaN(price) || price < 0) {
      setError("กรุณาระบุราคาที่ถูกต้อง");
      setLoading(false);
      return;
    }

    const duration_days = type !== "session_based" && duration ? parseInt(duration, 10) : null;
    const sessions_limit = type === "session_based" && sessionsLimit ? parseInt(sessionsLimit, 10) : null;

    const payload = {
      name,
      type,
      price,
      duration_days,
      sessions_limit,
      sessions_carryover: sessionsCarryover,
      branch_access_all: branchAccessAll,
      branch_access_ids: branchAccessAll ? [] : branchAccessIds,
      freeze_max_times: parseInt(freezeMax, 10) || 0,
      freeze_max_days: parseInt(freezeDays, 10) || 0,
      freeze_auto_approve: freezeAuto,
      benefits,
    };

    if (initialData) {
      const res = await updatePackage(initialData.id, payload);
      if (res.success) {
        router.push("/dashboard/packages");
      } else {
        setError(res.error || "เกิดข้อผิดพลาดในการแก้ไขแพ็กเกจ");
        setLoading(false);
      }
      return;
    }

    const res = await createPackage(payload);
    if (res.success) {
      router.push("/dashboard/packages");
    } else {
      setError(res.error || "เกิดข้อผิดพลาดในการสร้างแพ็กเกจ");
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
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-4 text-body-sm text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">เกิดข้อผิดพลาด</h4>
            <p className="text-body-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 1. Basic Information */}
      <div className="card-floating flex flex-col gap-5 p-6 border border-line">
        <div className="flex items-center gap-2.5 border-b border-line pb-3">
          <PackageIcon className="h-5 w-5 text-brand" />
          <h2 className="text-body-lg font-bold text-ink">1. ข้อมูลพื้นฐานแพ็กเกจ</h2>
        </div>

        <div>
          <label className="mb-1.5 block text-body-sm font-semibold text-ink">
            ชื่อแพ็กเกจ <span className="text-danger">*</span>
          </label>
          <input
            required
            type="text"
            placeholder="เช่น รายเดือน 30 วัน (All Branches) หรือ บัตรเล่น 10 ครั้ง"
            className="w-full rounded-2xl border border-line bg-surface py-2.5 px-4 text-body text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              ประเภทแพ็กเกจ <span className="text-danger">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Package["type"])}
              className="w-full rounded-2xl border border-line bg-surface py-2.5 px-4 text-body-sm font-semibold text-ink shadow-xs outline-none focus:border-brand cursor-pointer [&>option]:bg-surface [&>option]:text-ink"
            >
              <option value="daily">รายวัน (Daily)</option>
              <option value="weekly">รายสัปดาห์ (Weekly)</option>
              <option value="monthly">รายเดือน (Monthly)</option>
              <option value="yearly">รายปี (Yearly)</option>
              <option value="session_based">นับจำนวนครั้ง (Session-based)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              ราคาขาย (บาท) <span className="text-danger">*</span>
            </label>
            <input
              required
              type="number"
              step="1"
              min="0"
              placeholder="0.00"
              className="w-full rounded-2xl border border-line bg-surface py-2.5 px-4 text-body text-ink shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-mono"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic fields based on type */}
        {type !== "session_based" ? (
          <div>
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              อายุการใช้งาน (จำนวนวัน) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              placeholder="เช่น 30 หรือ 365"
              className="w-full rounded-2xl border border-line bg-surface py-2.5 px-4 text-body text-ink shadow-xs outline-none focus:border-brand font-mono"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-ink-soft">
              ระบบจะคำนวณวันหมดอายุอัตโนมัตินับจากวันที่สมัครหรือต่ออายุ
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-body-sm font-semibold text-ink">
                จำนวนครั้งที่สามารถเข้าใช้ได้ <span className="text-danger">*</span>
              </label>
              <input
                required
                type="number"
                min="1"
                placeholder="เช่น 10 หรือ 20"
                className="w-full rounded-2xl border border-line bg-surface py-2.5 px-4 text-body text-ink shadow-xs outline-none focus:border-brand font-mono"
                value={sessionsLimit}
                onChange={(e) => setSessionsLimit(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded text-brand focus:ring-brand"
                checked={sessionsCarryover}
                onChange={(e) => setSessionsCarryover(e.target.checked)}
              />
              <span className="text-body-sm font-medium text-ink">
                อนุญาตให้ยกยอดครั้งคงเหลือเมื่อต่ออายุแพ็กเกจ (Sessions Carryover)
              </span>
            </label>
          </div>
        )}

        {/* Benefits */}
        <div>
          <label className="mb-1.5 block text-body-sm font-semibold text-ink">
            สิทธิประโยชน์และเงื่อนไขการใช้งาน (Benefits)
          </label>
          <textarea
            rows={3}
            placeholder="เช่น ใช้บริการฟิตเนสและสระว่ายน้ำได้ไม่จำกัด, ส่วนลดเครื่องดื่ม 10%, จองสนามล่วงหน้าได้ 7 วัน"
            className="w-full rounded-2xl border border-line bg-surface p-3.5 text-body-sm text-ink shadow-xs outline-none focus:border-brand leading-relaxed"
            value={benefits}
            onChange={(e) => setBenefits(e.target.value)}
          />
        </div>
      </div>

      {/* 2. Branch Access Policy */}
      <div className="card-floating flex flex-col gap-4 p-6 border border-line">
        <div className="flex items-center gap-2.5 border-b border-line pb-3">
          <Building className="h-5 w-5 text-brand" />
          <h2 className="text-body-lg font-bold text-ink">2. สิทธิ์การเข้าใช้งานสาขา (Branch Access)</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="branch_access"
              checked={branchAccessAll}
              onChange={() => setBranchAccessAll(true)}
              className="text-brand focus:ring-brand"
            />
            <span className="text-body-sm font-semibold text-ink">
              เข้าได้ทุกสาขา (All Branches)
            </span>
          </label>

          {branches.length > 1 && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="branch_access"
                checked={!branchAccessAll}
                onChange={() => setBranchAccessAll(false)}
                className="text-brand focus:ring-brand"
              />
              <span className="text-body-sm font-semibold text-ink">
                กำหนดเฉพาะสาขาที่เลือก (Custom Branches)
              </span>
            </label>
          )}

          {!branchAccessAll && branches.length > 1 && (
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 rounded-2xl bg-surface/60 border border-line p-4">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={branchAccessIds.includes(b.id)}
                    onChange={() => toggleBranchId(b.id)}
                    className="h-4 w-4 rounded text-brand focus:ring-brand"
                  />
                  <span className="text-body-sm text-ink">{b.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Freeze Policy */}
      <div className="card-floating flex flex-col gap-4 p-6 border border-line">
        <div className="flex items-center gap-2.5 border-b border-line pb-3">
          <Snowflake className="h-5 w-5 text-brand" />
          <h2 className="text-body-lg font-bold text-ink">3. สิทธิ์การขอพักสมาชิก (Membership Freeze Policy)</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              จำนวนครั้งสูงสุดที่ขอพักได้ (ครั้ง)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              className="w-full rounded-2xl border border-line bg-surface py-2.5 px-4 text-body text-ink shadow-xs outline-none focus:border-brand font-mono"
              value={freezeMax}
              onChange={(e) => setFreezeMax(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-body-sm font-semibold text-ink">
              ระยะเวลาขอพักสูงสุดรวม (วัน)
            </label>
            <input
              type="number"
              min="0"
              max="365"
              className="w-full rounded-2xl border border-line bg-surface py-2.5 px-4 text-body text-ink shadow-xs outline-none focus:border-brand font-mono"
              value={freezeDays}
              onChange={(e) => setFreezeDays(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none mt-1">
          <input
            type="checkbox"
            className="h-4 w-4 rounded text-brand focus:ring-brand"
            checked={freezeAuto}
            onChange={(e) => setFreezeAuto(e.target.checked)}
          />
          <span className="text-body-sm font-medium text-ink">
            อนุมัติคำขอพักสมาชิกอัตโนมัติ (ไม่ต้องรอแอดมินกดอนุมัติ)
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <Link href="/dashboard/packages">
          <Button variant="secondary" type="button" className="rounded-2xl border-line">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            ย้อนกลับ
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          {initialData && (
            <ConfirmButton
              onConfirm={handleToggleStatus}
              title={initialData.is_active ? "ปิดขายแพ็กเกจนี้ชั่วคราว?" : "เปิดขายแพ็กเกจนี้?"}
              message={
                initialData.is_active
                  ? "สมาชิกใหม่จะไม่สามารถเลือกซื้อแพ็กเกจนี้ได้จนกว่าจะเปิดขายอีกครั้ง"
                  : "แพ็กเกจนี้จะพร้อมให้สมาชิกเลือกซื้อได้ทันที"
              }
              confirmLabel={initialData.is_active ? "ปิดชั่วคราว" : "เปิดขาย"}
              tone={initialData.is_active ? "danger" : "brand"}
              triggerVariant="secondary"
              triggerClassName={`rounded-2xl ${
                initialData.is_active
                  ? "text-rose-600 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40"
                  : "text-emerald-600 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
              }`}
            >
              {initialData.is_active ? "ปิดขายชั่วคราว" : "เปิดขายแพ็กเกจ"}
            </ConfirmButton>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="rounded-2xl font-bold py-3 px-6 shadow-md shadow-brand/20"
          >
            {loading ? "กำลังบันทึก..." : initialData ? "บันทึกการแก้ไข" : "สร้างแพ็กเกจ"}
          </Button>
        </div>
      </div>
    </form>
  );
}
