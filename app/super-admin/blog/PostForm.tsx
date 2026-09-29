"use client";

import { useActionState } from "react";
import { Save, Type, Link2, FolderTree, Image as ImageIcon, Tags, User } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { savePost, type PostState } from "./actions";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  status: string;
  author_name: string | null;
};

export function PostForm({ post }: { post?: Post }) {
  const [state, action, pending] = useActionState<PostState, FormData>(savePost, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {post && <input type="hidden" name="id" value={post.id} />}

      <Input label="หัวข้อ" name="title" defaultValue={post?.title} required icon={<Type />} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Slug (URL) — เว้นว่าง = สร้างอัตโนมัติ"
          name="slug"
          defaultValue={post?.slug}
          placeholder="best-badminton-racket"
          icon={<Link2 />}
        />
        <Input
          label="หมวดหมู่"
          name="category"
          defaultValue={post?.category ?? ""}
          placeholder="รีวิวสนาม / เทคนิค / รีวิวอุปกรณ์"
          icon={<FolderTree />}
        />
      </div>

      <Input
        label="เกริ่นนำ (excerpt — ใช้ใน SEO/การ์ด)"
        name="excerpt"
        defaultValue={post?.excerpt ?? ""}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="รูปปก (URL)"
          name="cover_image_url"
          defaultValue={post?.cover_image_url ?? ""}
          icon={<ImageIcon />}
        />
        <Input
          label="แท็ก (คั่นด้วย ,)"
          name="tags"
          defaultValue={post?.tags?.join(", ") ?? ""}
          placeholder="แบดมินตัน, ไม้แบด"
          icon={<Tags />}
        />
      </div>
      <Input
        label="ผู้เขียน"
        name="author_name"
        defaultValue={post?.author_name ?? ""}
        icon={<User />}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium text-ink">
          เนื้อหา (รองรับ HTML เช่น &lt;h2&gt; &lt;p&gt; &lt;a&gt; &lt;img&gt; &lt;ul&gt;)
        </span>
        <textarea
          name="content"
          defaultValue={post?.content ?? ""}
          rows={16}
          className="w-full rounded-sm bg-surface px-4 py-3 font-mono text-mono-sm text-ink shadow-sm outline-none ring-1 ring-inset ring-line transition-all focus:shadow-md focus:ring-2 focus:ring-brand"
          placeholder="<h2>หัวข้อย่อย</h2>&#10;<p>เนื้อหา...</p>"
        />
      </label>

      <Select
        name="status"
        label="สถานะ"
        defaultValue={post?.status ?? "draft"}
        options={[
          { value: "draft", label: "แบบร่าง (ยังไม่เผยแพร่)" },
          { value: "published", label: "เผยแพร่" },
        ]}
      />

      {state.error && <p className="text-body-sm text-danger">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "กำลังบันทึก…" : "บันทึกบทความ"}
        </Button>
      </div>
    </form>
  );
}
