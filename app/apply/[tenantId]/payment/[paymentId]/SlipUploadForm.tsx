"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { uploadApplicationSlip } from "./actions";

export function SlipUploadForm({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("กรุณาเลือกไฟล์สลิป");
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("slip", file);
    const res = await uploadApplicationSlip(paymentId, fd);

    if (res.success) {
      // หน้าเดิมจะเปลี่ยนเป็นสถานะ "รอตรวจสอบ" หลัง refresh
      router.refresh();
    } else {
      setError(res.error || "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      {error && <p className="text-body-sm text-danger">{error}</p>}
      <div>
        <label className="mb-2 block text-body font-medium text-ink">
          อัปโหลดสลิปโอนเงิน (JPG/PNG/WebP ไม่เกิน 10 MB)
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-body-sm text-ink-soft file:mr-4 file:rounded-md file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-body-sm file:font-semibold file:text-brand hover:file:bg-brand/20"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      <Button type="submit" disabled={!file || loading}>
        {loading ? "กำลังอัปโหลด..." : "ยืนยันการชำระเงิน"}
      </Button>
    </form>
  );
}
