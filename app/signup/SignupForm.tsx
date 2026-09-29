"use client";

import { useState } from "react";
import { Building2, User, Phone, Mail, Lock, MapPin, QrCode, Hash, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [hasOa, setHasOa] = useState<"" | "yes" | "no">("");
  const [wantSetup, setWantSetup] = useState<"team" | "self">("team");
  const [sendLater, setSendLater] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const lineOa =
      hasOa === "yes"
        ? {
            has: true,
            inviteLink: String(form.get("lineInvite") ?? "").trim() || undefined,
            sendLater,
          }
        : hasOa === "no"
          ? { has: false, wantSetup }
          : undefined;

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
        lineOa,
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
      <Input label="ชื่อสนาม/ฟิตเนส" name="venueName" required minLength={2} icon={<Building2 />} />
      <Input label="ชื่อเจ้าของ (ชื่อ-นามสกุล)" name="ownerName" required minLength={2} icon={<User />} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="เบอร์โทรศัพท์"
          name="phone"
          type="tel"
          required
          pattern="0[0-9]{8,9}"
          placeholder="08XXXXXXXX"
          icon={<Phone />}
        />
        <Select
          name="businessType"
          label="ประเภทธุรกิจ"
          defaultValue="sports_venue"
          options={[
            { value: "sports_venue", label: "สนามกีฬา" },
            { value: "fitness", label: "ฟิตเนส" },
            { value: "both", label: "ทั้งสองอย่าง" },
          ]}
        />
      </div>
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
      <Input label="ที่อยู่สนาม (ถ้ามี)" name="address" icon={<MapPin />} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="เบอร์/บัญชีพร้อมเพย์ (รับเงินลูกค้า)"
          name="promptpayId"
          pattern="[0-9]{10}|[0-9]{13}|[0-9]{15}"
          placeholder="08XXXXXXXX"
          icon={<QrCode />}
        />
        <Input
          label="เลขผู้เสียภาษี (ไม่บังคับ)"
          name="taxId"
          pattern="[0-9]{13}"
          icon={<Hash />}
        />
      </div>

      {/* LINE Official Account */}
      <div className="flex flex-col gap-3 rounded-md bg-brand-soft/30 p-4 ring-1 ring-inset ring-line">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-brand" />
          <span className="font-display font-semibold text-ink">LINE Official Account</span>
        </div>
        <p className="text-body-sm text-ink">มี LINE OA (บัญชีทางการ) ของร้านแล้วหรือยัง?</p>
        <div className="grid grid-cols-2 gap-3">
          {(["yes", "no"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setHasOa(v)}
              className={
                "rounded-sm px-4 py-2.5 text-body-sm font-medium shadow-sm transition-all " +
                (hasOa === v
                  ? "bg-brand text-white ring-2 ring-brand"
                  : "bg-surface text-ink ring-1 ring-inset ring-line hover:ring-brand/40")
              }
            >
              {v === "yes" ? "มีแล้ว" : "ยังไม่มี"}
            </button>
          ))}
        </div>

        {hasOa === "yes" && (
          <div className="flex flex-col gap-2">
            <Input
              label="ลิงก์เชิญเป็นแอดมิน (Admin invite link) — ไม่บังคับ"
              name="lineInvite"
              placeholder="วางลิงก์ที่ออกจาก LINE OA Manager"
            />
            <label className="flex cursor-pointer items-center gap-2 text-body-sm text-ink">
              <input
                type="checkbox"
                checked={sendLater}
                onChange={(e) => setSendLater(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              ฉันต้องการส่งในภายหลัง
            </label>
            <p className="text-body-sm text-ink-soft">
              ทีมงานขอสิทธิ์ผู้ดูแลเฉพาะสำหรับ<strong>การตั้งค่าและเชื่อมต่อระบบ</strong>เท่านั้น
              ไม่เข้าถึงข้อความสนทนาหรือข้อมูลลูกค้า — เพิกถอนสิทธิ์ได้ตลอดเวลา
            </p>
          </div>
        )}

        {hasOa === "no" && (
          <div className="flex flex-col gap-2">
            <p className="rounded-sm bg-success/10 px-3 py-2 text-body-sm text-success">
              ไม่เป็นไรครับ 👍 LINE OA สมัครฟรี — เลือกได้ว่าจะให้เราช่วยสร้างให้ หรือสร้างเอง
            </p>
            {(
              [
                { v: "team", t: "ให้ทีมงานสร้างให้", d: "สะดวกสุด เราสร้าง LINE OA + ตั้งค่าเชื่อมระบบให้ฟรี" },
                { v: "self", t: "จะสร้างเอง", d: "มีคู่มือ + ทีมงานคอยแนะนำขั้นตอนให้" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setWantSetup(o.v)}
                className={
                  "flex flex-col items-start rounded-sm px-4 py-3 text-left shadow-sm transition-all " +
                  (wantSetup === o.v
                    ? "bg-surface ring-2 ring-brand"
                    : "bg-surface ring-1 ring-inset ring-line hover:ring-brand/40")
                }
              >
                <span className="font-medium text-ink">{o.t}</span>
                <span className="text-body-sm text-ink-soft">{o.d}</span>
              </button>
            ))}
          </div>
        )}
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
      <Button type="submit" disabled={loading || !accepted} size="lg" className="mt-2 w-full">
        {loading ? "กำลังสมัคร..." : "เริ่มทดลองใช้ฟรี 14 วัน"}
      </Button>
    </form>
  );
}
