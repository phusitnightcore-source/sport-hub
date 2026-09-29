"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { selfCheckin } from "./actions";

type Result = { ok: boolean; message: string; memberName?: string };

export function KioskClient({ token }: { token: string }) {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // รีเซ็ตหน้าจอผลลัพธ์อัตโนมัติหลัง 6 วิ เพื่อรอคนถัดไป
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => {
      setResult(null);
      setPhone("");
    }, 6000);
    return () => clearTimeout(t);
  }, [result]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const res = await selfCheckin(token, phone);
    setResult({
      ok: res.success,
      message: res.success ? "เช็คอินสำเร็จ ยินดีต้อนรับ" : res.error ?? "เกิดข้อผิดพลาด",
      memberName: res.memberName,
    });
    setSubmitting(false);
  }

  if (result) {
    return (
      <div
        className={cn(
          "card-floating flex flex-col items-center gap-4 p-10 text-center",
          result.ok ? "ring-2 ring-success/40" : "ring-2 ring-danger/40",
        )}
      >
        {result.ok ? (
          <CheckCircle2 aria-hidden className="h-16 w-16 text-success" />
        ) : (
          <XCircle aria-hidden className="h-16 w-16 text-danger" />
        )}
        {result.memberName && (
          <p className="text-display-sm font-display font-semibold text-ink">
            {result.memberName}
          </p>
        )}
        <p className={cn("text-body", result.ok ? "text-success" : "text-danger")}>
          {result.message}
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setResult(null);
            setPhone("");
          }}
        >
          เช็คอินคนถัดไป
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-floating flex flex-col gap-5 p-8">
      <Input
        label="เบอร์โทรศัพท์ที่ลงทะเบียนไว้"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoFocus
        required
        pattern="0[0-9]{8,9}"
        placeholder="08XXXXXXXX"
        icon={<Phone />}
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
      />
      <Button
        type="submit"
        size="lg"
        disabled={phone.length < 9 || submitting}
        className={cn(submitting && "animate-press")}
      >
        {submitting ? "กำลังตรวจสอบ..." : "เช็คอิน"}
      </Button>
    </form>
  );
}
