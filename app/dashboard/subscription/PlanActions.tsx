"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { PlanType } from "@/lib/plans";

export function PlanActions({
  plan,
  isCurrent,
  hasPending,
}: {
  plan: PlanType;
  isCurrent: boolean;
  hasPending: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function select() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/subscription/select-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const json = await res.json();
    if (!json.success) {
      setMessage(json.error?.message ?? "เกิดข้อผิดพลาด");
      setBusy(false);
      return;
    }
    if (json.data.message) setMessage(json.data.message);
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={isCurrent ? "secondary" : "primary"}
        onClick={select}
        disabled={busy || isCurrent || hasPending}
      >
        {isCurrent ? "แพลนปัจจุบัน" : busy ? "กำลังดำเนินการ..." : "เลือกแพลนนี้"}
      </Button>
      {message && <p className="text-body-sm text-ink-soft">{message}</p>}
    </div>
  );
}
