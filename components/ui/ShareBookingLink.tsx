"use client";

import { useState } from "react";
import { Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ShareBookingLink({ tenantId }: { tenantId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/book/${tenantId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  return (
    <Button 
      variant="secondary" 
      onClick={handleCopy} 
      className="flex items-center gap-2 h-9 px-3 text-sm transition-all"
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <LinkIcon className="h-4 w-4" />}
      <span className="hidden sm:inline">{copied ? "คัดลอกลิงก์แล้ว!" : "แชร์ลิงก์จองสนาม"}</span>
    </Button>
  );
}
