"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintReceipt() {
  return (
    <Button onClick={() => window.print()} className="receipt-actions">
      <Printer className="h-4 w-4" />
      พิมพ์ใบเสร็จ
    </Button>
  );
}
