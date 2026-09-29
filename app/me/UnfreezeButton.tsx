"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { unfreezeMember } from "./actions";

export function UnfreezeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const res = await unfreezeMember();
    if (res.success) {
      router.refresh();
    } else {
      setError(res.error || "เกิดข้อผิดพลาด");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="primary" className="w-full" onClick={handleClick} disabled={busy}>
        {busy ? "กำลังดำเนินการ..." : "เลิกระงับ (Unfreeze)"}
      </Button>
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
