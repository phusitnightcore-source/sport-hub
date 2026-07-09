"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createRenewalPayment } from "@/app/me/renew/actions";
import { formatBahtFromDb } from "@/lib/money";
import { CheckCircle2, Circle } from "lucide-react";

type RenewPackage = {
  id: string;
  name: string;
  price: number;
  type: string;
  duration_days: number | null;
  sessions_limit: number | null;
};

export function RenewForm({
  packages,
  currentPackageId,
}: {
  packages: RenewPackage[];
  currentPackageId: string;
}) {
  const [selectedPkgId, setSelectedPkgId] = useState(currentPackageId);
  const [couponCode, setCouponCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const res = await createRenewalPayment(selectedPkgId, couponCode);
    
    if (!res.success) {
      setError(res.error || "เกิดข้อผิดพลาด");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {packages.map((pkg) => {
          const isSelected = selectedPkgId === pkg.id;
          return (
            <label
              key={pkg.id}
              onClick={() => setSelectedPkgId(pkg.id)}
              className={`group relative flex cursor-pointer flex-col gap-3 rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-md ${
                isSelected
                  ? "border-brand bg-brand-soft/50 shadow-sm"
                  : "border-line bg-white hover:border-brand-soft"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${isSelected ? "text-brand" : "text-ink-soft group-hover:text-brand-soft"}`}>
                    {isSelected ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-body-lg font-bold text-ink">{pkg.name}</span>
                    <span className="text-body-sm text-ink-soft">
                      {pkg.type === "session_based"
                        ? `${pkg.sessions_limit} ครั้ง`
                        : `${pkg.duration_days} วัน`}
                      {pkg.id === currentPackageId && " (แพ็กเกจปัจจุบัน)"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-body-lg font-bold text-brand">
                    ฿{formatBahtFromDb(pkg.price)}
                  </span>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface/30 p-5">
        <label className="text-body-sm font-medium text-ink" htmlFor="couponCode">
          โค้ดส่วนลด (ถ้ามี)
        </label>
        <div className="flex gap-2">
          <input
            id="couponCode"
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="กรอกโค้ดส่วนลด"
            className="flex h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-sm uppercase placeholder:text-ink-soft/50 placeholder:normal-case focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-danger-soft p-4 text-body-sm text-danger">
          {error}
        </div>
      )}

      <div className="pt-2">
        <Button type="submit" variant="primary" disabled={busy || !selectedPkgId} className="w-full h-12">
          {busy ? "กำลังสร้างรายการชำระเงิน..." : "ดำเนินการชำระเงินด้วย PromptPay"}
        </Button>
      </div>
    </form>
  );
}
