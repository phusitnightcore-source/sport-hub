-- Plan Entitlements (§5/§26) — Super Admin กำหนดได้ว่าแพลนไหนใช้ฟีเจอร์/ลิมิตอะไรได้
-- แยกจาก lib/plans.ts (ที่ถือ "ราคา/ข้อความ") — ตารางนี้ถือ "สิทธิ์การใช้งาน" ที่แก้ได้
-- ค่าเริ่มต้น seed ให้ตรงกับ lib/plans.ts เดิมเป๊ะ

create table if not exists plan_entitlements (
  plan                  plan_type primary key,
  online_payment        boolean not null default false,  -- รับชำระ QR PromptPay
  monthly_booking_limit int,                              -- null = ไม่จำกัด
  max_courts            int,                              -- null = ไม่จำกัด
  max_branches          int,                              -- null = ไม่จำกัด
  line_notify           boolean not null default false,
  member_system         boolean not null default false,  -- ระบบสมาชิกฟิตเนส
  peak_pricing          boolean not null default false,  -- ราคา Peak/Off-peak
  broadcast             boolean not null default false,
  export_reports        boolean not null default false,
  guest_pass            boolean not null default false,
  kiosk_mode            boolean not null default false,   -- Kiosk + Dynamic QR
  custom_domain         boolean not null default false,
  analytics             boolean not null default false,
  updated_at            timestamptz not null default now()
);

insert into plan_entitlements
  (plan, online_payment, monthly_booking_limit, max_courts, max_branches,
   line_notify, member_system, peak_pricing, broadcast, export_reports,
   guest_pass, kiosk_mode, custom_domain, analytics)
values
  ('free',   false, 30,   1,    1,    false, false, false, false, false, false, false, false, false),
  ('growth', true,  null, null, null, true,  true,  true,  true,  true,  false, false, false, true),
  ('pro',    true,  null, null, null, true,  true,  true,  true,  true,  true,  true,  true,  true)
on conflict (plan) do nothing;

-- RLS: อ่านได้ทุกคน (feature matrix เปิดเผยได้) — เขียนได้เฉพาะ service role (Super Admin API)
alter table plan_entitlements enable row level security;

do $$
begin
  create policy plan_entitlements_read on plan_entitlements for select using (true);
exception when duplicate_object then null;
end $$;

create trigger set_plan_entitlements_updated_at
  before update on plan_entitlements
  for each row execute function set_updated_at();
