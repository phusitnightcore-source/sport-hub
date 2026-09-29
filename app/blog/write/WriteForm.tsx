"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Send, CheckCircle2, Type, FolderTree } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitUserPost, type WriteState } from "./actions";

export function WriteForm({ backHref = "/blog" }: { backHref?: string }) {
  const [state, action, pending] = useActionState<WriteState, FormData>(
    submitUserPost,
    {},
  );

  if (state.success) {
    return (
      <div className="card-floating flex flex-col items-center gap-4 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h2 className="font-display text-body-lg font-semibold text-ink">
          ส่งบทความเรียบร้อยแล้ว
        </h2>
        <p className="text-body-sm text-ink-soft">
          ทีมงาน SportHub จะตรวจและเผยแพร่ให้เร็วที่สุด ขอบคุณที่ร่วมแบ่งปัน 🙌
        </p>
        <Link href={backHref}>
          <Button variant="secondary" size="sm">
            กลับหน้าบทความ
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="card-floating flex flex-col gap-4 p-6">
      <Input label="หัวข้อบทความ" name="title" required minLength={5} icon={<Type />} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="หมวดหมู่ (ไม่บังคับ)"
          name="category"
          placeholder="รีวิวสนาม / เทคนิค / รีวิวอุปกรณ์"
          icon={<FolderTree />}
        />
        <Input label="แท็ก (คั่นด้วย ,)" name="tags" placeholder="แบดมินตัน, รีวิว" />
      </div>
      <Input label="เกริ่นนำสั้นๆ (ไม่บังคับ)" name="excerpt" />
      <Input label="รูปปก URL (ไม่บังคับ)" name="cover_image_url" />

      <label className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium text-ink">เนื้อหา</span>
        <textarea
          name="content"
          required
          minLength={50}
          rows={14}
          placeholder="เขียนเนื้อหาบทความที่นี่… เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่"
          className="w-full rounded-sm bg-surface px-4 py-3 text-body text-ink shadow-sm outline-none ring-1 ring-inset ring-line transition-all focus:shadow-md focus:ring-2 focus:ring-brand"
        />
        <span className="text-body-sm text-ink-soft">
          ไม่ต้องใส่โค้ด — พิมพ์เป็นข้อความธรรมดา ระบบจัดย่อหน้าให้เอง
        </span>
      </label>

      {state.error && <p className="text-body-sm text-danger">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          <Send className="h-4 w-4" />
          {pending ? "กำลังส่ง…" : "ส่งให้ทีมตรวจ"}
        </Button>
      </div>
    </form>
  );
}
