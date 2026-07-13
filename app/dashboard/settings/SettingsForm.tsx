"use client";

import { useActionState } from "react";
import {
  Save, CheckCircle2, Building2, User, Phone, Mail, MapPin, Hash, QrCode, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateTenantSettings, type SettingsState } from "./actions";

type Tenant = {
  name: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string | null;
  promptpay_id: string | null;
  tax_id: string | null;
  slot_lock_minutes: number;
  auto_approve_slip: boolean;
};

export function SettingsForm({ tenant }: { tenant: Tenant }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateTenantSettings,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="card-floating flex flex-col gap-4 p-6">
        <h2 className="font-display text-body-lg font-semibold text-ink">
          ข้อมูลธุรกิจ
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="ชื่อสนาม/ฟิตเนส" name="name" defaultValue={tenant.name} required icon={<Building2 />} />
          <Input label="ชื่อเจ้าของ" name="owner_name" defaultValue={tenant.owner_name} required icon={<User />} />
          <Input label="เบอร์โทร" name="phone" defaultValue={tenant.phone} required icon={<Phone />} />
          <Input label="อีเมล" name="email" type="email" defaultValue={tenant.email} required icon={<Mail />} />
          <Input
            label="ที่อยู่"
            name="address"
            defaultValue={tenant.address ?? ""}
            icon={<MapPin />}
            className="sm:col-span-2"
          />
          <Input label="เลขผู้เสียภาษี (ถ้ามี)" name="tax_id" defaultValue={tenant.tax_id ?? ""} icon={<Hash />} />
        </div>
      </section>

      <section className="card-floating flex flex-col gap-4 p-6">
        <h2 className="font-display text-body-lg font-semibold text-ink">
          การรับชำระเงิน
        </h2>
        <Input
          label="พร้อมเพย์ (เบอร์/เลขบัญชี) สำหรับรับชำระจากลูกค้า"
          name="promptpay_id"
          defaultValue={tenant.promptpay_id ?? ""}
          placeholder="0812345678 หรือเลขบัตรประชาชน"
          icon={<QrCode />}
        />
      </section>

      <section className="card-floating flex flex-col gap-4 p-6">
        <h2 className="font-display text-body-lg font-semibold text-ink">
          การจอง
        </h2>
        <Input
          label="ระยะเวลาล็อกช่วงเวลาจอง (นาที)"
          name="slot_lock_minutes"
          type="number"
          min={5}
          max={120}
          defaultValue={tenant.slot_lock_minutes}
          icon={<Clock />}
        />
        <label className="flex items-center gap-3 text-body text-ink">
          <input
            type="checkbox"
            name="auto_approve_slip"
            defaultChecked={tenant.auto_approve_slip}
            className="h-5 w-5 rounded-sm accent-brand"
          />
          ยืนยันสลิปอัตโนมัติ (ข้ามการตรวจด้วยมือ — ไม่แนะนำ)
        </label>
      </section>

      {state.error && (
        <p className="text-body-sm text-danger">{state.error}</p>
      )}
      {state.success && (
        <p className="flex items-center gap-1.5 text-body-sm text-success">
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          บันทึกการตั้งค่าเรียบร้อยแล้ว
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          <Save aria-hidden className="h-4 w-4" />
          {pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
        </Button>
      </div>
    </form>
  );
}
