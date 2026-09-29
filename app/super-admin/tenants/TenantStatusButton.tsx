"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";

export function TenantStatusButton({
  tenantId,
  suspended,
}: {
  tenantId: string;
  suspended: boolean;
}) {
  const router = useRouter();

  async function toggle() {
    const res = await fetch(`/api/super/tenants/${tenantId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: suspended ? "activate" : "suspend" }),
    });
    await res.json();
    router.refresh();
  }

  return (
    <ConfirmButton
      onConfirm={toggle}
      title={suspended ? "คืนสถานะสนามนี้?" : "ระงับสนามนี้?"}
      message={
        suspended
          ? "สนามจะกลับมารับจอง/ใช้งานได้ตามปกติ"
          : "สนามจะหยุดรับจองและถูกล็อกการใช้งานทันที"
      }
      confirmLabel={suspended ? "คืนสถานะ" : "ระงับ"}
      tone={suspended ? "brand" : "danger"}
      triggerVariant={suspended ? "primary" : "danger"}
      triggerSize="sm"
    >
      {suspended ? "คืนสถานะ" : "ระงับ"}
    </ConfirmButton>
  );
}
