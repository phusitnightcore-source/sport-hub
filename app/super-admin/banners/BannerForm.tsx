"use client";

import { useActionState } from "react";
import { Save, Type, Image as ImageIcon, Link2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { saveBanner, type BannerState } from "./actions";

type Banner = {
  id: string;
  name: string;
  image_url: string;
  link_url: string;
  placement: string;
  weight: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

function toDate(v: string | null): string | undefined {
  return v ? v.slice(0, 10) : undefined;
}

export function BannerForm({ banner }: { banner?: Banner }) {
  const [state, action, pending] = useActionState<BannerState, FormData>(saveBanner, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {banner && <input type="hidden" name="id" value={banner.id} />}

      <Input label="ชื่อแบนเนอร์" name="name" defaultValue={banner?.name} required icon={<Type />} />
      <Input label="URL รูปแบนเนอร์" name="image_url" defaultValue={banner?.image_url} required icon={<ImageIcon />} />
      <Input label="URL ปลายทางเมื่อคลิก" name="link_url" defaultValue={banner?.link_url} required icon={<Link2 />} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="placement"
          label="ตำแหน่งแสดง"
          defaultValue={banner?.placement ?? "home"}
          options={[
            { value: "home", label: "หน้าแรก" },
            { value: "blog", label: "หน้าบทความ (Blog)" },
            { value: "sidebar", label: "แถบข้าง" },
          ]}
        />
        <Input
          label="น้ำหนัก (1-100 มาก=แสดงบ่อย)"
          name="weight"
          type="number"
          min={1}
          max={100}
          defaultValue={banner?.weight ?? 1}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DatePicker name="starts_at" label="เริ่มแสดง (ไม่บังคับ)" defaultValue={toDate(banner?.starts_at ?? null)} />
        <DatePicker name="ends_at" label="สิ้นสุด (ไม่บังคับ)" defaultValue={toDate(banner?.ends_at ?? null)} />
      </div>

      <label className="flex items-center gap-3 text-body text-ink">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={banner?.is_active ?? true}
          className="h-5 w-5 rounded-sm accent-brand"
        />
        เปิดใช้งาน (แสดงผล)
      </label>

      {state.error && <p className="text-body-sm text-danger">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "กำลังบันทึก…" : "บันทึกแบนเนอร์"}
        </Button>
      </div>
    </form>
  );
}
