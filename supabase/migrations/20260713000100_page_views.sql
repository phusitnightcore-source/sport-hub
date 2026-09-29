-- Website visit tracking (first-party, PDPA-friendly)
-- เก็บการเข้าชมแบบไม่ระบุตัวตน: ไม่เก็บ IP ตรงๆ ไม่ใช้ cookie
-- visitor_hash = sha256(ip + ua + วันที่) ตัดสั้น — ประเมิน unique รายวันได้ แต่ย้อนกลับหาตัวตนไม่ได้

create table if not exists page_views (
  id           uuid primary key default gen_random_uuid(),
  path         text not null,
  tenant_id    uuid references tenants(id) on delete set null,  -- null = หน้าเว็บกลาง (landing/blog)
  referrer     text,
  visitor_hash text,          -- unique รายวันแบบไม่ระบุตัวตน
  device       text,          -- mobile / tablet / desktop
  created_at   timestamptz not null default now()
);

create index if not exists idx_page_views_time   on page_views (created_at desc);
create index if not exists idx_page_views_tenant on page_views (tenant_id, created_at desc);
create index if not exists idx_page_views_path   on page_views (path, created_at desc);

-- RLS: ไม่มี policy อ่าน/เขียนฝั่ง client — เขียน/อ่านผ่าน service role เท่านั้น
-- (บันทึกผ่าน /api/track/view, แสดงผลในหน้า super-admin/tenant analytics)
alter table page_views enable row level security;
