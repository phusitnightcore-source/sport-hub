"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { submitApplication } from "./actions";
import { formatBahtFromDb } from "@/lib/money";

type PackageInfo = {
  id: string;
  name: string;
  price: number;
  duration_days: number | null;
  sessions_limit: number | null;
  type: string;
};

export function ApplyForm({
  tenantId,
  packages,
}: {
  tenantId: string;
  packages: PackageInfo[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ paymentId: string; tempPassword?: string } | null>(null);

  const [packageId, setPackageId] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [healthInfo, setHealthInfo] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [pdpaConsent, setPdpaConsent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!packageId) return setError("กรุณาเลือกแพ็กเกจ");
    if (!pdpaConsent) return setError("กรุณายอมรับนโยบาย PDPA");
    
    setLoading(true);

    const res = await submitApplication({
      tenantId,
      packageId,
      email,
      firstName,
      lastName,
      phone,
      healthInfo,
      emergencyName,
      emergencyPhone,
    });

    if (res.success) {
      if (res.tempPassword) {
        // ผู้ใช้ใหม่ — แสดงรหัสผ่านชั่วคราวให้จดก่อนไปหน้าชำระเงิน
        setCreated({ paymentId: res.paymentId!, tempPassword: res.tempPassword });
        setLoading(false);
      } else {
        router.push(`/apply/${tenantId}/payment/${res.paymentId}`);
      }
    } else {
      setError(res.error || "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="card-floating flex flex-col gap-4 p-8 text-center">
        <h2 className="font-display text-display-md font-semibold text-success">
          สมัครสำเร็จ
        </h2>
        {created.tempPassword && (
          <div className="rounded-md bg-brand-soft p-4 text-body-sm text-ink">
            ระบบสร้างรหัสผ่านชั่วคราวให้คุณเข้าสู่ระบบภายหลัง กรุณาจดไว้:
            <br />
            <span className="mt-2 inline-block font-mono text-body-lg font-bold text-brand">
              {created.tempPassword}
            </span>
          </div>
        )}
        <Button
          type="button"
          size="lg"
          onClick={() =>
            router.push(`/apply/${tenantId}/payment/${created.paymentId}`)
          }
        >
          ดำเนินการชำระเงิน
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-md bg-danger-soft p-4 text-body-sm text-danger">
          {error}
        </div>
      )}

      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">1. เลือกแพ็กเกจ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {packages.map((pkg) => (
            <label
              key={pkg.id}
              className={`flex cursor-pointer flex-col gap-1 rounded-md border p-4 transition-colors ${
                packageId === pkg.id
                  ? "border-brand bg-brand-soft ring-1 ring-brand"
                  : "border-line bg-surface hover:border-brand-soft"
              }`}
            >
              <div className="flex items-center justify-between">
                <input
                  type="radio"
                  name="package"
                  value={pkg.id}
                  checked={packageId === pkg.id}
                  onChange={() => setPackageId(pkg.id)}
                  className="hidden"
                />
                <span className="font-bold text-ink">{pkg.name}</span>
                <span className="font-medium text-brand">฿{formatBahtFromDb(pkg.price)}</span>
              </div>
              <span className="text-body-sm text-ink-soft">
                {pkg.type === "session_based"
                  ? `${pkg.sessions_limit} ครั้ง`
                  : `${pkg.duration_days} วัน`}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">2. ข้อมูลส่วนตัว</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">ชื่อ</label>
            <input required type="text" className="w-full rounded-md border border-line p-2 text-ink outline-none focus:border-brand" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">นามสกุล</label>
            <input required type="text" className="w-full rounded-md border border-line p-2 text-ink outline-none focus:border-brand" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">อีเมล</label>
            <input required type="email" className="w-full rounded-md border border-line p-2 text-ink outline-none focus:border-brand" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">เบอร์โทรศัพท์</label>
            <input required type="tel" className="w-full rounded-md border border-line p-2 text-ink outline-none focus:border-brand" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-body-sm font-medium text-ink">ข้อมูลสุขภาพ (โรคประจำตัว / ข้อควรระวัง)</label>
            <textarea className="w-full rounded-md border border-line p-2 text-ink outline-none focus:border-brand" rows={2} value={healthInfo} onChange={(e) => setHealthInfo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body-lg font-bold text-ink">3. ผู้ติดต่อฉุกเฉิน</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">ชื่อผู้ติดต่อ</label>
            <input type="text" className="w-full rounded-md border border-line p-2 text-ink outline-none focus:border-brand" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-body-sm font-medium text-ink">เบอร์โทรศัพท์</label>
            <input type="tel" className="w-full rounded-md border border-line p-2 text-ink outline-none focus:border-brand" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2 text-body-sm text-ink">
        <input required type="checkbox" className="mt-1" checked={pdpaConsent} onChange={(e) => setPdpaConsent(e.target.checked)} />
        ฉันยินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล เพื่อการให้บริการตามวัตถุประสงค์ของคลับ ตามนโยบายความเป็นส่วนตัว (PDPA)
      </label>

      <Button type="submit" variant="primary" size="lg" disabled={loading}>
        {loading ? "กำลังดำเนินการ..." : "ดำเนินการต่อเพื่อชำระเงิน"}
      </Button>
    </form>
  );
}
