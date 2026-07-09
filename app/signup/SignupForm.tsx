"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueName: form.get("venueName"),
        ownerName: form.get("ownerName"),
        phone: form.get("phone"),
        email,
        password,
        address: String(form.get("address") ?? "").trim() || undefined,
        promptpayId: String(form.get("promptpayId") ?? "").trim() || undefined,
        businessType: form.get("businessType"),
        taxId: String(form.get("taxId") ?? "").trim() || undefined,
        acceptPdpa: accepted,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "สมัครไม่สำเร็จ กรุณาลองใหม่");
      setLoading(false);
      return;
    }

    // สมัครสำเร็จ → login อัตโนมัติ → proxy พาเข้า /dashboard ตาม role
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      window.location.assign("/login");
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="ชื่อสนาม/ฟิตเนส" name="venueName" required minLength={2} />
      <Input label="ชื่อเจ้าของ (ชื่อ-นามสกุล)" name="ownerName" required minLength={2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="เบอร์โทรศัพท์"
          name="phone"
          type="tel"
          required
          pattern="0[0-9]{8,9}"
          placeholder="08XXXXXXXX"
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="businessType" className="text-body-sm font-medium text-ink">
            ประเภทธุรกิจ
          </label>
          <select
            id="businessType"
            name="businessType"
            required
            className="w-full rounded-sm bg-surface px-4 py-2.5 text-body text-ink shadow-sm outline-none transition-shadow duration-fast focus:shadow-md focus:ring-2 focus:ring-brand"
          >
            <option value="sports_venue">สนามกีฬา</option>
            <option value="fitness">ฟิตเนส</option>
            <option value="both">ทั้งสองอย่าง</option>
          </select>
        </div>
      </div>
      <Input label="อีเมล (ใช้ Login)" name="email" type="email" required />
      <Input
        label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <Input label="ที่อยู่สนาม (ถ้ามี)" name="address" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="เบอร์/บัญชีพร้อมเพย์ (รับเงินลูกค้า)"
          name="promptpayId"
          pattern="[0-9]{10}|[0-9]{13}|[0-9]{15}"
          placeholder="08XXXXXXXX"
        />
        <Input
          label="เลขผู้เสียภาษี (ไม่บังคับ)"
          name="taxId"
          pattern="[0-9]{13}"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-body-sm text-ink">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand"
          required
        />
        <span>
          ฉันยอมรับ
          <span className="font-medium">นโยบายความเป็นส่วนตัว</span>
          และยินยอมให้ SportHub เก็บและประมวลผลข้อมูลตาม พ.ร.บ.
          คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
        </span>
      </label>

      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading || !accepted} className="mt-2">
        {loading ? "กำลังสมัคร..." : "เริ่มทดลองใช้ฟรี 14 วัน"}
      </Button>
    </form>
  );
}
