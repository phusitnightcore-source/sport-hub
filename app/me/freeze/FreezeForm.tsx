"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { requestFreeze } from "../actions";

export function FreezeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await requestFreeze(reason);
    if (res.success) {
      // ไม่ใช้ alert (บล็อกหน้า) — กลับไป /me ให้เห็นสถานะใหม่ทันที
      router.push("/me");
      router.refresh();
    } else {
      setError(res.error || "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <div className="text-body-sm text-danger">{error}</div>}
      <div>
        <label className="mb-1 block text-body-sm font-medium text-ink">
          เหตุผลในการขอระงับชั่วคราว (Freeze)
        </label>
        <textarea
          required
          rows={3}
          className="w-full rounded-md border border-line p-2 text-ink outline-none focus:border-brand"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="เช่น เดินทางไปต่างประเทศ ป่วย ฯลฯ"
        />
      </div>
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "กำลังส่งคำขอ..." : "ส่งคำขอ"}
      </Button>
    </form>
  );
}
