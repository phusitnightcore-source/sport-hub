-- Media Library (§25) — bucket เดียวเก็บไฟล์ทุก tenant แยกด้วยโฟลเดอร์ [tenant_id]/...
-- ตั้งเป็น private (public=false) — เข้าถึงผ่าน signed URL ฝั่ง server เท่านั้น
-- การเข้าถึงคุมที่ server action ด้วย service role + บังคับ path prefix = tenant_id
-- (จุด bypass RLS อย่างจงใจ ตาม CLAUDE.md ข้อ 2)

insert into storage.buckets (id, name, public, file_size_limit)
values ('tenant-media', 'tenant-media', false, 20971520)  -- 20 MB (§25.1)
on conflict (id) do nothing;
