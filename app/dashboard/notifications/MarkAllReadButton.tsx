"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { markAllRead } from "./actions";

export function MarkAllReadButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await markAllRead();
        router.refresh();
        setBusy(false);
      }}
    >
      อ่านทั้งหมดแล้ว
    </Button>
  );
}
