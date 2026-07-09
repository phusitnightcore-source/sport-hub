"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { manualCreateMember } from "./actions";
import { formatBahtFromDb } from "@/lib/money";
import Link from "next/link";
import { UserPlus, CreditCard, User, Mail, Phone } from "lucide-react";

type PackageOption = { id: string; name: string; price: number };

export function ManualMemberForm({ packages }: { packages: PackageOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setBusy(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      packageId: formData.get("packageId") as string,
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      phone: formData.get("phone") as string,
      paymentMethod: formData.get("paymentMethod") as "cash" | "transfer",
    };

    if (!data.packageId) {
      setError("กรุณาเลือกแพ็กเกจ");
      setBusy(false);
      return;
    }

    const res = await manualCreateMember(data);
    
    if (!res.success) {
      setError(res.error || "เกิดข้อผิดพลาด");
      setBusy(false);
      return;
    }

    if (res.tempPassword) {
      setSuccessMsg(`สร้างสมาชิกสำเร็จ รหัสผ่านชั่วคราวคือ: ${res.tempPassword}`);
    } else {
      router.push("/dashboard/members");
    }
    
    setBusy(false);
  }

  const packageOptions = packages.map(pkg => ({
    value: pkg.id,
    label: `${pkg.name} (฿${formatBahtFromDb(pkg.price)})`
  }));

  const paymentOptions = [
    { value: "cash", label: "เงินสด" },
    { value: "transfer", label: "โอนเงิน (สแกน QR ร้าน / แจ้งโอนสลิป)" }
  ];

  return (
    <div className="card-floating flex flex-col p-0">
      <div className="flex items-center gap-3 border-b border-line p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <UserPlus className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-body-lg font-bold text-ink">กรอกข้อมูลผู้สมัคร</h2>
          <p className="text-body-sm text-ink-soft">รับสมัครสมาชิกหน้าเคาน์เตอร์ และชำระเงินทันที</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col p-6">
        {error && (
          <div className="mb-6 rounded-md bg-danger-soft p-4 text-body-sm text-danger">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 flex flex-col gap-4 rounded-md bg-success-soft p-4 text-body-sm font-bold text-success">
            {successMsg}
            <div>
              <Link href="/dashboard/members">
                <Button variant="secondary" type="button">กลับไปหน้ารายชื่อสมาชิก</Button>
              </Link>
            </div>
          </div>
        )}
        
        {!successMsg && (
          <div className="flex flex-col gap-8">
            {/* Section 1: Personal Info */}
            <div className="flex flex-col gap-4">
              <h3 className="flex items-center gap-2 font-bold text-ink">
                <User className="h-4 w-4 text-ink-soft" /> ข้อมูลลูกค้า
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-1 block text-body-sm font-medium text-ink">
                    ชื่อ <span className="text-danger">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className="w-full rounded-md border border-line bg-surface px-4 py-2.5 text-ink outline-none transition-shadow focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand"
                    placeholder="สมชาย"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-1 block text-body-sm font-medium text-ink">
                    นามสกุล <span className="text-danger">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className="w-full rounded-md border border-line bg-surface px-4 py-2.5 text-ink outline-none transition-shadow focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand"
                    placeholder="ใจดี"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 flex items-center gap-2 text-body-sm font-medium text-ink">
                    อีเมล <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-ink-soft" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full rounded-md border border-line bg-surface py-2.5 pl-10 pr-4 text-ink outline-none transition-shadow focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand"
                      placeholder="somchai@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-body-sm font-medium text-ink">
                    เบอร์โทรศัพท์ <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-ink-soft" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      className="w-full rounded-md border border-line bg-surface py-2.5 pl-10 pr-4 text-ink outline-none transition-shadow focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand"
                      placeholder="0812345678"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Package & Payment */}
            <div className="flex flex-col gap-4 border-t border-line pt-6">
              <h3 className="flex items-center gap-2 font-bold text-ink">
                <CreditCard className="h-4 w-4 text-ink-soft" /> แพ็กเกจและการชำระเงิน
              </h3>
              
              <div className="z-20">
                <label htmlFor="packageId" className="mb-1 block text-body-sm font-medium text-ink">
                  เลือกแพ็กเกจ <span className="text-danger">*</span>
                </label>
                <Select
                  name="packageId"
                  options={packageOptions}
                  placeholder="-- เลือกแพ็กเกจ --"
                  required
                />
              </div>

              <div className="z-10">
                <label htmlFor="paymentMethod" className="mb-1 block text-body-sm font-medium text-ink">
                  วิธีการชำระเงิน <span className="text-danger">*</span>
                </label>
                <Select
                  name="paymentMethod"
                  options={paymentOptions}
                  defaultValue="cash"
                  required
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 border-t border-line pt-6 md:flex-row">
              <Button type="submit" variant="primary" disabled={busy} className="flex-1 md:order-2">
                {busy ? "กำลังสร้างสมาชิก..." : "ยืนยันการสร้างสมาชิก"}
              </Button>
              <Link href="/dashboard/members" className="flex-1 md:order-1">
                <Button type="button" variant="secondary" className="w-full" disabled={busy}>
                  ยกเลิก
                </Button>
              </Link>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
