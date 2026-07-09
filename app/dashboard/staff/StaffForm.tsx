"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createStaff, updateStaff, toggleStaffStatus } from "./actions";

type StaffStatus = "active" | "inactive";

export type StaffFormData = {
  id?: string;
  name: string;
  email: string;
  phone: string | null;
  multi_branch_access: boolean;
  branch_ids: string[];
  extra_permissions: string[];
  status: StaffStatus;
};

export type BranchOption = {
  id: string;
  name: string;
};

const AVAILABLE_PERMISSIONS = [
  { id: "cancel_booking", label: "ยกเลิกการจอง" },
  { id: "verify_slip", label: "ตรวจสลิปโอนเงิน" },
  { id: "confirm_refund", label: "อนุมัติการคืนเงิน" },
  { id: "edit_member", label: "แก้ไขข้อมูลสมาชิก" },
  { id: "freeze_member", label: "ระงับสมาชิก (Freeze)" },
  { id: "issue_guest_pass", label: "ออกบัตร Guest Pass" },
];

export function StaffForm({
  initialData,
  branches,
}: {
  initialData?: StaffFormData;
  branches: BranchOption[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const [multiBranch, setMultiBranch] = useState(initialData?.multi_branch_access ?? false);

  const isEdit = !!initialData?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("multi_branch_access", multiBranch ? "true" : "false");

    if (isEdit) {
      const res = await updateStaff(initialData.id!, formData);
      if (res?.error) setError(res.error);
      setBusy(false);
    } else {
      const res = await createStaff(formData);
      if (res?.error) {
        setError(res.error);
        setBusy(false);
      } else if (res?.success) {
        setCreatedPassword(res.tempPassword ?? "");
        setBusy(false);
      }
    }
  }

  async function handleToggleStatus() {
    if (!initialData?.id) return;
    const newStatus = initialData.status === "active" ? "inactive" : "active";
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะพนักงานเป็น ${newStatus.toUpperCase()}?`)) return;
    
    setBusy(true);
    const res = await toggleStaffStatus(initialData.id, newStatus);
    if (res?.error) {
      setError(res.error);
      setBusy(false);
    }
  }

  if (createdPassword !== null) {
    return (
      <div className="card-floating flex flex-col items-center gap-4 p-10 text-center">
        <h2 className="font-display text-display-md font-semibold text-success">
          สร้างพนักงานสำเร็จ
        </h2>
        <div className="w-full max-w-sm rounded-md bg-brand-soft p-4 text-body-sm text-ink">
          รหัสผ่านชั่วคราวสำหรับพนักงานเข้าสู่ระบบครั้งแรก (แจ้งให้พนักงานเปลี่ยนภายหลัง):
          <br />
          <span className="mt-2 inline-block font-mono text-body-lg font-bold text-brand">
            {createdPassword}
          </span>
        </div>
        <Link href="/dashboard/staff">
          <Button type="button">กลับไปหน้ารายชื่อพนักงาน</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-floating flex flex-col gap-8 p-6">

      {/* ข้อมูลส่วนตัว */}
      <section>
        <h2 className="mb-4 text-body-lg font-bold text-ink border-b border-line pb-2">ข้อมูลส่วนตัว</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="name">
              ชื่อ-นามสกุล <span className="text-danger">*</span>
            </label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={initialData?.name}
              placeholder="เช่น สมชาย ใจดี"
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
                { value: "active", label: "ปกติ (Active)" },
                { value: "inactive", label: "ระงับการใช้งาน (Inactive)" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="email">
              อีเมลสำหรับล็อกอิน <span className="text-danger">*</span>
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={initialData?.email}
              placeholder="staff@domain.com"
              disabled={isEdit}
            />
            {isEdit && <p className="text-[10px] text-ink-soft">ไม่สามารถแก้ไขอีเมลได้</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-ink" htmlFor="phone">
              เบอร์โทรศัพท์
            </label>
            <Input
              id="phone"
              name="phone"
              defaultValue={initialData?.phone || ""}
              placeholder="08X-XXX-XXXX"
            />
          </div>
        </div>
      </section>

      {/* สิทธิ์การเข้าถึงสาขา */}
      <section>
        <h2 className="mb-4 text-body-lg font-bold text-ink border-b border-line pb-2">การเข้าถึงสาขา</h2>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={multiBranch}
              onChange={(e) => setMultiBranch(e.target.checked)}
              className="h-5 w-5 rounded border-line text-brand focus:ring-brand"
            />
            <span className="text-body font-medium text-ink">ให้สิทธิ์ดูแลทุกสาขา (Multi-branch Access)</span>
          </label>

          {!multiBranch && (
            <div className="mt-2 ml-8 flex flex-col gap-3 rounded-xl bg-surface p-4">
              <p className="text-body-sm text-ink-soft mb-2">เลือกสาขาที่พนักงานสามารถเข้าถึงได้:</p>
              {branches.length === 0 ? (
                <p className="text-body-sm text-danger">ยังไม่มีสาขาในระบบ กรุณาสร้างสาขาก่อน</p>
              ) : (
                branches.map((branch) => (
                  <label key={branch.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="branch_ids"
                      value={branch.id}
                      defaultChecked={initialData?.branch_ids?.includes(branch.id)}
                      className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="text-body-sm text-ink">{branch.name}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* สิทธิ์เพิ่มเติม */}
      <section>
        <h2 className="mb-4 text-body-lg font-bold text-ink border-b border-line pb-2">สิทธิ์การใช้งานพิเศษ</h2>
        <div className="grid gap-4 sm:grid-cols-2 ml-2">
          {AVAILABLE_PERMISSIONS.map((perm) => (
            <label key={perm.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                name="extra_permissions"
                value={perm.id}
                defaultChecked={initialData?.extra_permissions?.includes(perm.id)}
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
              />
              <span className="text-body-sm text-ink">{perm.label}</span>
            </label>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-danger/10 p-3 text-body-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between border-t border-line">
        {isEdit ? (
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={handleToggleStatus}
          >
            {initialData.status === "active" ? "ระงับพนักงาน" : "เปิดใช้งานพนักงาน"}
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
            {busy ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างพนักงาน"}
          </Button>
        </div>
      </div>
    </form>
  );
}
