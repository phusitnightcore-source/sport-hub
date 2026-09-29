"use client";

import { useState } from "react";
import { User, Phone, Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// สมัครผู้ใช้ทั่วไป (ผู้เล่น/ลูกค้า) — จองคอร์ทผ่านลิงก์สนาม + เขียนบทความได้
export function MemberSignupForm() {
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

    const res = await fetch("/api/signup/member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        phone: String(form.get("phone") ?? "").trim() || undefined,
        email,
        password,
        acceptPdpa: accepted,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "สมัครไม่สำเร็จ กรุณาลองใหม่");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      window.location.assign("/login");
      return;
    }
    window.location.assign("/me/bookings");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="ชื่อ-นามสกุล" name="fullName" required minLength={2} icon={<User />} />
      <Input
        label="เบอร์โทร (ไม่บังคับ)"
        name="phone"
        type="tel"
        pattern="0[0-9]{8,9}"
        placeholder="08XXXXXXXX"
        icon={<Phone />}
      />
      <Input label="อีเมล (ใช้ Login)" name="email" type="email" required icon={<Mail />} />
      <Input
        label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        icon={<Lock />}
      />

      <label className="flex cursor-pointer items-start gap-2 text-body-sm text-ink">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand"
          required
        />
        <span>
          ฉันยอมรับ<span className="font-medium">นโยบายความเป็นส่วนตัว</span>
          และยินยอมให้เก็บและประมวลผลข้อมูลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
        </span>
      </label>

      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading || !accepted} size="lg" className="mt-2 w-full">
        {loading ? "กำลังสมัคร..." : "สมัครใช้งานฟรี"}
      </Button>
    </form>
  );
}
