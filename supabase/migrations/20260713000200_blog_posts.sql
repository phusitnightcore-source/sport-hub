-- SportHub Blog — คอนเทนต์ SEO (สร้างทราฟฟิก → รองรับ AdSense/Affiliate/Banner)
-- จัดการโดยทีม SportHub (super_admin) — อ่านสาธารณะเฉพาะที่ published

do $$ begin
  create type blog_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

create table if not exists blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text,
  content         text not null default '',   -- HTML (เขียนโดย super_admin ที่เชื่อถือได้)
  cover_image_url text,
  category        text,
  tags            text[] not null default '{}',
  status          blog_status not null default 'draft',
  author_name     text,
  views           int not null default 0,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_blog_posts_status on blog_posts (status, published_at desc);
create index if not exists idx_blog_posts_category on blog_posts (category);

-- RLS: อ่านสาธารณะเฉพาะบทความที่เผยแพร่ / เขียนผ่าน service role (super_admin API) เท่านั้น
alter table blog_posts enable row level security;

do $$ begin
  create policy blog_posts_public_read on blog_posts
    for select using (status = 'published');
exception when duplicate_object then null; end $$;

create trigger set_blog_posts_updated_at
  before update on blog_posts
  for each row execute function set_updated_at();
