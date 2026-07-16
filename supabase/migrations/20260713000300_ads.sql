-- Monetization: Banner Ads (B4) + click tracking (B3 affiliate ใช้ร่วม)
-- จัดการโดยทีม SportHub (super_admin)

create table if not exists banners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_url   text not null,
  link_url    text not null,
  placement   text not null default 'home',   -- home / blog / sidebar
  is_active   boolean not null default true,
  weight      int not null default 1,          -- น้ำหนักการเลือกแสดง (มากกว่า = แสดงบ่อยกว่า)
  impressions int not null default 0,
  clicks      int not null default 0,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_banners_placement on banners (placement, is_active);

-- log คลิกโฆษณา/affiliate (สำหรับรายงาน) — ไม่เก็บ PII
create table if not exists ad_events (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,       -- banner / affiliate
  label      text,                -- banner id หรือชื่อร้าน affiliate
  path       text,                -- หน้าที่คลิกมาจาก
  created_at timestamptz not null default now()
);
create index if not exists idx_ad_events_time on ad_events (kind, created_at desc);

-- RLS: อ่าน banner ที่ active ได้สาธารณะ / เขียนผ่าน service role เท่านั้น
alter table banners enable row level security;
alter table ad_events enable row level security;

do $$ begin
  create policy banners_public_read on banners
    for select using (is_active = true);
exception when duplicate_object then null; end $$;

create trigger set_banners_updated_at
  before update on banners
  for each row execute function set_updated_at();
