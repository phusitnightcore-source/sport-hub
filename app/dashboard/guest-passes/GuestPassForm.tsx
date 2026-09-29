"use client";

import { useActionState } from "react";
import { Ticket, CheckCircle2, User, Hash } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { issueGuestPass, type GuestPassState } from "./actions";

export function GuestPassForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<GuestPassState, FormData>(
    issueGuestPass,
    {},
  );

  return (
    <form action={action} className="card-floating flex flex-col gap-4 p-6">
      <h2 className="font-display text-body-lg font-semibold text-ink">
        ออกบัตรเข้าใช้ชั่วคราว
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="ชื่อผู้รับบัตร"
          name="recipient_name"
          required
          icon={<User />}
          className="sm:col-span-2"
        />
        <DatePicker label="ใช้ได้ตั้งแต่" name="valid_from" defaultValue={today} min={today} required />
        <DatePicker label="ถึงวันที่" name="valid_until" defaultValue={today} min={today} required />
        <Input
          label="จำกัดจำนวนครั้ง (เว้นว่าง = ไม่จำกัด)"
          name="sessions_limit"
          type="number"
          min={1}
          icon={<Hash />}
          className="sm:col-span-2"
        />
      </div>

      {state.error && <p className="text-body-sm text-danger">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-body-sm text-success">
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          ออกบัตรเรียบร้อยแล้ว
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          <Ticket aria-hidden className="h-4 w-4" />
          {pending ? "กำลังออกบัตร…" : "ออกบัตร"}
        </Button>
      </div>
    </form>
  );
}
