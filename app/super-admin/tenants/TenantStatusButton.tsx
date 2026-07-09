"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function TenantStatusButton({
  tenantId,
  suspended,
}: {
  tenantId: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/super/tenants/${tenantId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: suspended ? "activate" : "suspend" }),
    });
    await res.json();
    router.refresh();
    setBusy(false);
  }

  return (
    <Button
      size="sm"
      variant={suspended ? "primary" : "danger"}
      onClick={toggle}
      disabled={busy}
    >
      {busy ? "..." : suspended ? "คืนสถานะ" : "ระงับ"}
    </Button>
  );
}
