"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, MonitorSmartphone } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

type BranchLink = { id: string; name: string; token: string };

export function KioskLinkPanel({ branches }: { branches: BranchLink[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function urlFor(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/checkin/${token}`;
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(urlFor(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard ไม่พร้อม — เงียบไว้ */
    }
  }

  if (branches.length === 0) return null;

  return (
    <section className="card-floating flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <MonitorSmartphone aria-hidden className="h-5 w-5 text-brand" />
        <h2 className="text-body font-medium text-ink">ลิงก์ Kiosk (ลูกค้าเช็คอินเอง)</h2>
      </div>
      <p className="text-body-sm text-ink-soft">
        เปิดลิงก์นี้บนแท็บเล็ตหน้าเคาน์เตอร์ ลูกค้ากรอกเบอร์โทรเพื่อเช็คอินเองได้
      </p>
      <ul className="flex flex-col gap-2">
        {branches.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-sm bg-surface px-4 py-3 ring-1 ring-inset ring-line"
          >
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium text-ink">{b.name}</p>
              <p className="truncate font-mono text-mono-sm text-ink-soft">
                /checkin/{b.token}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton
                variant="surface"
                size="sm"
                aria-label="คัดลอกลิงก์"
                onClick={() => copy(b.token)}
                title="คัดลอกลิงก์"
              >
                {copied === b.token ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </IconButton>
              <a href={`/checkin/${b.token}`} target="_blank" rel="noopener noreferrer">
                <IconButton
                  variant="surface"
                  size="sm"
                  aria-label="เปิดหน้า Kiosk"
                  title="เปิดหน้า Kiosk"
                >
                  <ExternalLink className="h-4 w-4" />
                </IconButton>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
