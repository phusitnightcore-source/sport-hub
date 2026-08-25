"use client";

import { useState } from "react";
import { PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WriteForm } from "@/app/blog/write/WriteForm";

// หัวหน้ารวมบทความ + ปุ่มสลับฟอร์มเขียน "ในหน้าเดิม" (ไม่เปลี่ยน URL)
// เข้าฟอร์มได้เฉพาะกดปุ่มเท่านั้น — พิมพ์ URL ตรงๆ ไม่ได้ (ไม่มี route แยก)
export function BlogWriteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-display-lg font-semibold text-ink">บทความ</h1>
          <p className="text-body-sm text-ink-soft">
            แบ่งปันรีวิว/เทคนิคกีฬา และอ่านบทความจากชุมชน
          </p>
        </div>
        <Button
          size="sm"
          variant={open ? "secondary" : "primary"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <>
              <X className="h-4 w-4" />
              ปิด
            </>
          ) : (
            <>
              <PenLine className="h-4 w-4" />
              เขียนบทความ
            </>
          )}
        </Button>
      </header>

      {open && <WriteForm backHref="/me/blog" />}
    </section>
  );
}
