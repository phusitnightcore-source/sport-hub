-- Waitlist: จองคิวเมื่อ slot เต็ม → แจ้งเตือนเมื่อว่าง (§ ฟีเจอร์เสริม)
create table if not exists waitlists (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  court_id     uuid not null references courts(id) on delete cascade,
  booking_date date not null,
  start_time   time not null,
  end_time     time not null,
  user_name    text not null,
  user_phone   text not null,
  profile_id   uuid references profiles(id) on delete set null,
  notified_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_waitlists_slot on waitlists (court_id, booking_date, start_time);

-- RLS: เขียน/อ่านผ่าน service role (join action + cron/notify) เท่านั้น
alter table waitlists enable row level security;
