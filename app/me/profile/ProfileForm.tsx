"use client";

import { useState } from "react";
import { User, Phone } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "./actions";

export function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = fullName !== initialName || phone !== initialPhone;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
    setSaving(false);
    setMsg(
      res.success
        ? { ok: true, text: "บันทึกโปรไฟล์แล้ว" }
        : { ok: false, text: res.error ?? "บันทึกไม่สำเร็จ" },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="ชื่อ-นามสกุล"
        name="fullName"
        icon={<User />}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        minLength={2}
        required
      />
      <Input
        label="เบอร์โทรศัพท์"
        name="phone"
        type="tel"
        inputMode="numeric"
        icon={<Phone />}
        placeholder="08XXXXXXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
        pattern="0[0-9]{8,9}"
      />
      {msg && (
        <p className={`text-body-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>
      )}
      <Button type="submit" disabled={!dirty || saving} className="self-start">
        {saving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
      </Button>
    </form>
  );
}
