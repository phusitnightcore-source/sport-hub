-- ============================================================================
-- SportHub v5.0 — Complete Supabase Database Schema (Single Migration)
-- Multi-tenant SaaS: Booking / Fitness Membership / PromptPay / Check-in /
-- Omise Subscription / Branch / Coupon / Notification / Audit Log / RBAC
--
-- วิธีรัน: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run
-- (idempotent: รันซ้ำได้ ไม่พังของเดิม)
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist"; -- สำหรับกัน Double Booking

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
do $$ begin
  create type user_role as enum ('super_admin','venue_admin','staff','member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tenant_status as enum ('active','trial','free','suspended','cancelled_pending_delete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type business_type as enum ('sports_venue','fitness','both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_type as enum ('free','growth','pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active','trial','grace','suspended','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type branch_status as enum ('active','inactive','maintenance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type court_status as enum ('open','closed','maintenance');
exception when duplicate_object then null; end $$;

do $$ begin
  -- รอชำระ / รอยืนยัน / ยืนยันแล้ว / ปฏิเสธ / ยกเลิก / รอคืนเงิน / คืนเงินแล้ว
  create type booking_status as enum
    ('pending_payment','awaiting_verification','confirmed','rejected',
     'cancelled','awaiting_refund','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type price_type as enum ('standard','peak','offpeak');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('online_qr','walk_in_cash','walk_in_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('awaiting_verification','verified','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type refund_status as enum ('awaiting_refund','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_status as enum ('active','expired','frozen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type package_type as enum
    ('daily','weekly','monthly','three_month','six_month','yearly','session_based');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkin_method as enum ('qr','staff','kiosk','guest_pass');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkout_method as enum ('auto','kiosk_scan','staff_manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkin_result as enum ('passed','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkin_fail_reason as enum
    ('expired','frozen','branch_denied','session_limit','capacity_full','invalid_qr');
exception when duplicate_object then null; end $$;

do $$ begin
  create type discount_type as enum ('percent','fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coupon_status as enum ('active','inactive','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('booking','payment','membership','promotion','system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_channel as enum ('line','email','in_app');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_status as enum ('sent','failed','pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type freeze_request_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2. CORE: TENANT / PROFILES / SUBSCRIPTION
-- ============================================================================

create table if not exists tenants (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,                       -- ชื่อสนาม/ฟิตเนส
  owner_name        text not null,
  phone             text not null,
  email             text not null,
  address           text,
  business_type     business_type not null default 'sports_venue',
  promptpay_id      text,                                -- เบอร์/บัญชีพร้อมเพย์
  tax_id            text,                                -- ไม่บังคับ
  logo_url          text,
  status            tenant_status not null default 'trial',
  -- PDPA consent (เจ้าของสนาม ตอน Onboarding)
  pdpa_consent_at   timestamptz,
  pdpa_consent_ip   inet,
  consent_version   text,
  -- Settings รวม (Section 23) เก็บเป็น JSONB ยืดหยุ่นสุด
  settings          jsonb not null default '{
    "slot_lock_minutes": 30,
    "auto_approve_slip": false,
    "renewal_reminder_days": [7,3,0],
    "theme": {}
  }'::jsonb,
  cancelled_at      timestamptz,                         -- เริ่มนับ 30 วัน Grace
  hard_delete_after timestamptz,                         -- cancelled_at + 30 วัน
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- profiles: เชื่อม auth.users → role + tenant
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid references tenants(id) on delete cascade, -- null สำหรับ super_admin
  role        user_role not null default 'member',
  full_name   text,
  phone       text,
  email       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null unique references tenants(id) on delete cascade,
  plan                  plan_type not null default 'growth',    -- Trial = Growth features
  status                subscription_status not null default 'trial',
  billing_cycle         text not null default 'monthly',
  trial_start           timestamptz default now(),
  trial_end             timestamptz default (now() + interval '14 days'),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  omise_customer_id     text,
  omise_card_id         text,                                   -- null = ชำระ PromptPay
  last_payment_date     timestamptz,
  last_payment_amount   numeric(10,2),
  next_billing_date     timestamptz,
  grace_period_end      timestamptz,                            -- +3 วันเมื่อชำระไม่สำเร็จ
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists subscription_invoices (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  invoice_number    text not null unique,
  plan_name         text not null,
  billing_period_start date not null,
  billing_period_end   date not null,
  amount_before_vat numeric(10,2) not null,
  vat_7             numeric(10,2) not null,
  total_amount      numeric(10,2) not null,
  due_date          date,
  payment_method    text,                 -- 'card_xxxx' / 'promptpay'
  payment_status    text not null default 'pending', -- pending / paid
  omise_charge_id   text,
  paid_at           timestamptz,
  pdf_url           text,
  created_at        timestamptz not null default now()
);

create table if not exists plan_change_logs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  from_plan   plan_type not null,
  to_plan     plan_type not null,
  prorate_amount numeric(10,2),
  effective_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 3. BRANCH / STAFF
-- ============================================================================

create table if not exists branches (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants(id) on delete cascade,
  name                      text not null,
  phone                     text,
  email                     text,
  address                   text,
  city                      text,
  province                  text,
  postal_code               text,
  latitude                  double precision,
  longitude                 double precision,
  google_map_url            text,
  open_time                 time,
  close_time                time,
  max_capacity              int not null default 100,
  alert_threshold           int not null default 80 check (alert_threshold between 1 and 100),
  avg_session_duration_hours numeric(3,1) not null default 2.0
                              check (avg_session_duration_hours between 0.5 and 8),
  kiosk_scan_out_enabled    boolean not null default false,  -- Pro Plan
  amenities                 text[] not null default '{}',
  images                    text[] not null default '{}',
  status                    branch_status not null default 'active',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table if not exists staff (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  profile_id          uuid unique references profiles(id) on delete set null,
  name                text not null,
  email               text not null,
  phone               text,
  multi_branch_access boolean not null default false,
  -- Staff Extended: Admin unlock permission รายบุคคล (RBAC Section 26)
  extra_permissions   text[] not null default '{}',
  -- เช่น: cancel_booking, verify_slip, confirm_refund, edit_member,
  --       freeze_member, issue_guest_pass
  status              text not null default 'active' check (status in ('active','inactive')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tenant_id, email)
);

-- M:M Staff ↔ Branch
create table if not exists staff_branches (
  staff_id  uuid not null references staff(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  primary key (staff_id, branch_id)
);

-- ============================================================================
-- 4. COURT / PEAK PRICING / BLOCK SCHEDULE
-- ============================================================================

create table if not exists courts (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  branch_id             uuid not null references branches(id) on delete cascade,
  name                  text not null,
  type                  text not null,                 -- แบดมินตัน/ฟุตบอล/ว่ายน้ำ/อื่นๆ
  price_standard        numeric(10,2) not null default 0,
  price_peak            numeric(10,2),
  price_offpeak         numeric(10,2),
  open_time             time not null default '08:00',
  close_time            time not null default '22:00',
  capacity              int not null default 1,
  advance_booking_days  int not null default 30 check (advance_booking_days between 1 and 90),
  status                court_status not null default 'open',
  images                text[] not null default '{}',
  -- Cancellation Policy ต่อสนาม (Section 7.2)
  free_cancel_hours     int not null default 24,
  cancel_fee_percent    int not null default 50 check (cancel_fee_percent between 0 and 100),
  allow_reschedule      boolean not null default true,
  reschedule_hours      int not null default 24,
  refund_note           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ช่วงเวลา Peak (กำหนดอิสระต่อสนาม เช่น จ-ศ 17:00–21:00, เสาร์-อาทิตย์ทั้งวัน)
create table if not exists court_peak_windows (
  id          uuid primary key default gen_random_uuid(),
  court_id    uuid not null references courts(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=อาทิตย์
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);

create table if not exists block_schedules (
  id          uuid primary key default gen_random_uuid(),
  court_id    uuid not null references courts(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  block_date  date not null,
  start_time  time not null,
  end_time    time not null,
  reason      text not null default 'maintenance', -- maintenance / vip / other
  note        text,
  created_by  uuid references staff(id),
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);

-- ============================================================================
-- 5. PACKAGE / MEMBER / FREEZE
-- ============================================================================

create table if not exists packages (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  name                text not null,
  type                package_type not null,
  duration_days       int,                                -- null สำหรับ session_based ไม่จำกัดวันได้
  sessions_limit      int,                                -- null = ไม่จำกัด
  sessions_carryover  boolean not null default false,
  price               numeric(10,2) not null,
  branch_access_all   boolean not null default true,
  branch_access_ids   uuid[] not null default '{}',       -- ใช้เมื่อ branch_access_all = false
  freeze_max_times    int not null default 2,
  freeze_max_days     int not null default 30,
  freeze_auto_approve boolean not null default false,
  benefits            text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists members (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants(id) on delete cascade,
  profile_id                uuid references profiles(id) on delete set null,
  member_number             text not null,
  first_name                text not null,
  last_name                 text,
  phone                     text not null,
  email                     text,
  birth_date                date,
  profile_image_url         text,
  health_info               text,
  emergency_contact_name    text,
  emergency_contact_phone   text,
  package_id                uuid references packages(id) on delete set null,
  start_date                date,
  end_date                  date,
  original_end_date         date,
  status                    member_status not null default 'active',
  freeze_count              int not null default 0,
  freeze_days_used          int not null default 0,
  freeze_start_date         date,
  sessions_used             int not null default 0,
  line_user_id              text,               -- สำหรับส่ง LINE Notification
  consent_given_at          timestamptz,        -- PDPA
  broadcast_opt_out         boolean not null default false, -- Right to Object
  created_by                uuid references staff(id),      -- null = self
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (tenant_id, member_number)
);

create table if not exists freeze_requests (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  reason        text,
  requested_at  timestamptz not null default now(),
  status        freeze_request_status not null default 'pending',
  reviewed_by   uuid references staff(id),
  reviewed_at   timestamptz,
  freeze_start  date,
  freeze_end    date,       -- วันที่ Unfreeze จริง (null = ยัง Frozen อยู่)
  reject_reason text
);

-- ============================================================================
-- 6. BOOKING
-- ============================================================================

create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  booking_code    text not null unique default upper(substr(md5(random()::text),1,8)),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  court_id        uuid not null references courts(id) on delete cascade,
  branch_id       uuid not null references branches(id) on delete cascade,
  member_id       uuid references members(id) on delete set null,
  user_name       text not null,
  user_phone      text not null,
  booking_date    date not null,
  start_time      time not null,
  end_time        time not null,
  duration_hours  numeric(4,2) generated always as
                    (extract(epoch from (end_time - start_time)) / 3600.0) stored,
  price_per_hour  numeric(10,2) not null,
  total_price     numeric(10,2) not null,
  discount_amount numeric(10,2) not null default 0,
  coupon_id       uuid,
  price_type      price_type not null default 'standard',
  status          booking_status not null default 'pending_payment',
  payment_method  payment_method not null default 'online_qr',
  slot_locked_until timestamptz,          -- now() + 30 นาที
  created_by      uuid references staff(id),  -- null = ลูกค้าจองเอง
  cancelled_at    timestamptz,
  cancel_reason   text,
  cancel_fee      numeric(10,2),
  policy_accepted_at timestamptz,         -- ลูกค้ากดยอมรับ Cancellation Policy
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_time > start_time)
);

-- กัน Double Booking ระดับ Database (Acceptance Criteria: ไม่มี Double Booking)
-- Postgres ไม่มี type "timerange" มาตรฐาน (มีแค่ tsrange/tstzrange/daterange/...)
-- จึงรวม booking_date + start_time/end_time เป็น timestamp ก่อนแล้วค่อยทำ tsrange
alter table bookings
  add column if not exists booking_range tsrange
  generated always as (
    tsrange(
      (booking_date + start_time)::timestamp,
      (booking_date + end_time)::timestamp,
      '[)'
    )
  ) stored;

-- ใช้ exclusion constraint: court เดียวกัน ช่วงเวลาซ้อนกันไม่ได้
-- ยกเว้นสถานะที่ปล่อย slot แล้ว (rejected / cancelled / refunded)
do $$
begin
  alter table bookings
  add constraint no_double_booking
  exclude using gist (
    court_id with =,
    tsrange(
      booking_date + start_time,
      booking_date + end_time
    ) with &&
  )
  where (
    status in (
      'pending_payment',
      'awaiting_verification',
      'confirmed',
      'awaiting_refund'
    )
  );
exception
  when duplicate_object or duplicate_table then null;
end $$;

create index if not exists idx_bookings_range on bookings using gist (court_id, booking_range);

-- ============================================================================
-- 7. PAYMENT / RECEIPT
-- ============================================================================

create table if not exists payments (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  booking_id          uuid references bookings(id) on delete set null,
  member_id           uuid references members(id) on delete set null,
  package_id          uuid references packages(id) on delete set null, -- ชำระค่าสมาชิก
  amount              numeric(10,2) not null,
  method              payment_method not null default 'online_qr',
  reference_module    text,
  reference_id        uuid,
  promptpay_qr_payload text,
  slip_image_url      text,
  slip_hash           text,                            -- ตรวจสลิปซ้ำ
  sender_name         text,
  transfer_datetime   timestamptz,
  submitted_at        timestamptz not null default now(),
  status              payment_status not null default 'awaiting_verification',
  verified_by         uuid references staff(id),
  verified_at         timestamptz,
  reject_reason       text,
  refund_status       refund_status,
  refund_evidence_url text,
  refund_confirmed_at timestamptz,
  refund_confirmed_by uuid references staff(id),
  check (booking_id is not null or member_id is not null)
);

-- index สำหรับ Duplicate Slip Detection (ภายใน tenant เดียวกัน)
create index if not exists idx_payments_slip_hash on payments (tenant_id, slip_hash)
  where slip_hash is not null;

-- Running number ใบเสร็จต่อ Tenant
create table if not exists tenant_counters (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  receipt_counter bigint not null default 0
);

create table if not exists receipts (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  payment_id        uuid not null unique references payments(id) on delete cascade,
  receipt_number    text not null,
  customer_name     text not null,
  item_description  text not null,
  amount            numeric(10,2) not null,
  payment_method    text not null default 'PromptPay',
  issued_date       date not null default current_date,
  pdf_url           text,
  created_at        timestamptz not null default now(),
  unique (tenant_id, receipt_number)
);

-- Auto receipt number: RCPT-000001 (ต่อ tenant)
create or replace function next_receipt_number(p_tenant uuid)
returns text language plpgsql as $$
declare v bigint;
begin
  insert into tenant_counters (tenant_id, receipt_counter) values (p_tenant, 1)
  on conflict (tenant_id) do update set receipt_counter = tenant_counters.receipt_counter + 1
  returning receipt_counter into v;
  return 'RCPT-' || lpad(v::text, 6, '0');
end $$;

-- ============================================================================
-- 8. CHECK-IN / GUEST PASS
-- ============================================================================

create table if not exists guest_passes (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  recipient_name  text not null,
  valid_from      date not null,
  valid_until     date not null,
  branch_access_all boolean not null default true,
  branch_access_ids uuid[] not null default '{}',
  sessions_limit  int,
  sessions_used   int not null default 0,
  issued_by       uuid references staff(id),
  qr_token        text not null unique default encode(gen_random_bytes(16),'hex'),
  created_at      timestamptz not null default now()
);

create table if not exists checkins (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants(id) on delete cascade,
  branch_id                 uuid not null references branches(id) on delete cascade,
  member_id                 uuid references members(id) on delete set null,
  guest_pass_id             uuid references guest_passes(id) on delete set null,
  checkin_time              timestamptz not null default now(),
  estimated_checkout_time   timestamptz,
  actual_checkout_time      timestamptz,
  checkout_method           checkout_method,
  method                    checkin_method not null,
  verified_by               uuid references staff(id),
  result                    checkin_result not null,
  fail_reason               checkin_fail_reason,
  check (member_id is not null or guest_pass_id is not null)
);

-- View: Realtime Occupancy ต่อสาขา (สมาชิกที่ยังไม่ checkout)
create or replace view branch_occupancy as
select
  b.id as branch_id,
  b.tenant_id,
  b.name,
  b.max_capacity,
  count(c.id) filter (
    where c.result = 'passed'
      and c.actual_checkout_time is null
      and (c.estimated_checkout_time is null or c.estimated_checkout_time > now())
  ) as current_occupancy
from branches b
left join checkins c on c.branch_id = b.id
group by b.id;

-- ============================================================================
-- 9. COUPON
-- ============================================================================

create table if not exists coupons (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  code                text not null,
  name                text not null,
  discount_type       discount_type not null,
  discount_value      numeric(10,2) not null,
  min_purchase        numeric(10,2) not null default 0,
  applicable_to       text not null default 'all' check (applicable_to in ('all','court','package')),
  applicable_ids      uuid[] not null default '{}',
  start_date          date not null,
  end_date            date not null,
  usage_limit         int,
  usage_count         int not null default 0,
  first_booking_only  boolean not null default false,
  status              coupon_status not null default 'active',
  created_by          uuid references staff(id),
  created_at          timestamptz not null default now(),
  unique (tenant_id, code),
  check (code = upper(code) and code !~ '\s')
);

create table if not exists coupon_usages (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references coupons(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  booking_id  uuid references bookings(id) on delete set null,
  member_id   uuid references members(id) on delete set null,
  user_phone  text,                     -- ใช้เช็ค first_booking_only สำหรับ guest
  discount_amount numeric(10,2) not null,
  used_at     timestamptz not null default now()
);

-- ============================================================================
-- 10. NOTIFICATION
-- ============================================================================

create table if not exists notifications (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade, -- null = system-wide
  recipient_id    uuid,                 -- profile_id / member_id
  recipient_type  text not null check (recipient_type in ('member','admin','staff')),
  type            notification_type not null,
  channel         notification_channel not null,
  title           text not null,
  body            text,
  reference_id    uuid,
  reference_type  text,                 -- booking / payment / member / subscription
  is_read         boolean not null default false,
  sent_at         timestamptz,
  read_at         timestamptz,
  retry_count     int not null default 0,   -- LINE retry 3 ครั้งแล้ว fallback email
  status          notification_status not null default 'pending',
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- 11. AUDIT LOG
-- ============================================================================

create table if not exists audit_logs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) on delete cascade,
  actor_id      uuid,
  actor_role    user_role not null,
  action        text not null,     -- create/update/delete/verify/reject/freeze/block/...
  module        text not null,     -- member/booking/payment/court/package/staff/settings/subscription
  reference_id  uuid,
  before_value  jsonb,
  after_value   jsonb,
  ip_address    inet,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_logs_tenant_time on audit_logs (tenant_id, created_at desc);

-- ============================================================================
-- 12. INDEXES (ที่จำเป็นต่อ Performance < 2s / เช็คอิน < 1s)
-- ============================================================================
create index if not exists idx_profiles_tenant       on profiles (tenant_id);
create index if not exists idx_branches_tenant       on branches (tenant_id);
create index if not exists idx_staff_tenant          on staff (tenant_id);
create index if not exists idx_courts_tenant         on courts (tenant_id);
create index if not exists idx_courts_branch         on courts (branch_id);
create index if not exists idx_bookings_tenant_date  on bookings (tenant_id, booking_date);
create index if not exists idx_bookings_court_date   on bookings (court_id, booking_date);
create index if not exists idx_bookings_status       on bookings (tenant_id, status);
create index if not exists idx_bookings_phone        on bookings (tenant_id, user_phone);
create index if not exists idx_members_tenant        on members (tenant_id);
create index if not exists idx_members_status        on members (tenant_id, status);
create index if not exists idx_members_end_date      on members (tenant_id, end_date);
create index if not exists idx_members_phone         on members (tenant_id, phone);
create index if not exists idx_payments_tenant_status on payments (tenant_id, status);
create index if not exists idx_checkins_branch_time  on checkins (branch_id, checkin_time desc);
create index if not exists idx_checkins_member       on checkins (member_id, checkin_time desc);
create index if not exists idx_checkins_open         on checkins (branch_id)
  where actual_checkout_time is null;
create index if not exists idx_notifications_recipient on notifications (recipient_id, is_read, created_at desc);
create index if not exists idx_block_court_date      on block_schedules (court_id, block_date);

-- ============================================================================
-- 13. TRIGGERS: updated_at อัตโนมัติ
-- ============================================================================
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['tenants','profiles','subscriptions','branches','staff',
    'courts','packages','members','bookings'] loop
    execute format('drop trigger if exists trg_%s_updated on %I', t, t);
    execute format('create trigger trg_%s_updated before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- Trigger: ออกใบเสร็จอัตโนมัติเมื่อ Admin ยืนยันสลิป (Section 9.8)
create or replace function auto_create_receipt() returns trigger language plpgsql
security definer as $$
declare
  v_customer text;
  v_desc text;
begin
  if new.status = 'verified' and old.status <> 'verified' then
    if new.booking_id is not null then
      select b.user_name,
             c.name || ' ' || b.booking_date || ' ' || b.start_time || '-' || b.end_time
        into v_customer, v_desc
        from bookings b join courts c on c.id = b.court_id
       where b.id = new.booking_id;
    else
      select m.first_name || ' ' || coalesce(m.last_name,''), p.name
        into v_customer, v_desc
        from members m left join packages p on p.id = new.package_id
       where m.id = new.member_id;
    end if;

    insert into receipts (tenant_id, payment_id, receipt_number, customer_name,
                          item_description, amount)
    values (new.tenant_id, new.id, next_receipt_number(new.tenant_id),
            coalesce(v_customer,'-'), coalesce(v_desc,'-'), new.amount)
    on conflict (payment_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trg_payment_receipt on payments;
create trigger trg_payment_receipt after update on payments
  for each row execute function auto_create_receipt();

-- Trigger: ตั้ง estimated_checkout_time อัตโนมัติตาม avg_session_duration ของสาขา
create or replace function set_estimated_checkout() returns trigger language plpgsql as $$
declare v_hours numeric;
begin
  if new.result = 'passed' and new.estimated_checkout_time is null then
    select avg_session_duration_hours into v_hours from branches where id = new.branch_id;
    new.estimated_checkout_time := new.checkin_time + make_interval(mins => (coalesce(v_hours,2) * 60)::int);
  end if;
  return new;
end $$;

drop trigger if exists trg_checkin_estimate on checkins;
create trigger trg_checkin_estimate before insert on checkins
  for each row execute function set_estimated_checkout();

-- ============================================================================
-- 14. RLS HELPER FUNCTIONS
-- ============================================================================
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_tenant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from profiles where id = auth.uid()
$$;

create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'super_admin', false)
$$;

create or replace function is_venue_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'venue_admin', false)
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('venue_admin','staff'), false)
$$;

-- สาขาที่ staff คนนี้เข้าถึงได้
create or replace function my_branch_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select case
    when is_venue_admin() then
      (select coalesce(array_agg(id), '{}') from branches where tenant_id = auth_tenant_id())
    when (select multi_branch_access from staff where profile_id = auth.uid()) then
      (select coalesce(array_agg(id), '{}') from branches where tenant_id = auth_tenant_id())
    else
      (select coalesce(array_agg(sb.branch_id), '{}')
         from staff s join staff_branches sb on sb.staff_id = s.id
        where s.profile_id = auth.uid())
  end
$$;

-- ============================================================================
-- 15. ROW LEVEL SECURITY
-- หลัก: บังคับ tenant_id ทุก Query โดยไม่มีข้อยกเว้น (Section 29)
-- Permission ละเอียด (Staff Extended ฯลฯ) enforce เพิ่มที่ API Layer
-- ============================================================================
alter table tenants               enable row level security;
alter table profiles              enable row level security;
alter table subscriptions         enable row level security;
alter table subscription_invoices enable row level security;
alter table plan_change_logs      enable row level security;
alter table branches              enable row level security;
alter table staff                 enable row level security;
alter table staff_branches        enable row level security;
alter table courts                enable row level security;
alter table court_peak_windows    enable row level security;
alter table block_schedules       enable row level security;
alter table packages              enable row level security;
alter table members               enable row level security;
alter table freeze_requests       enable row level security;
alter table bookings              enable row level security;
alter table payments              enable row level security;
alter table tenant_counters       enable row level security;
alter table receipts              enable row level security;
alter table guest_passes          enable row level security;
alter table checkins              enable row level security;
alter table coupons               enable row level security;
alter table coupon_usages         enable row level security;
alter table notifications         enable row level security;
alter table audit_logs            enable row level security;

-- ---- tenants ----
drop policy if exists tenants_super on tenants;
create policy tenants_super on tenants for all
  using (is_super_admin()) with check (is_super_admin());

drop policy if exists tenants_own on tenants;
create policy tenants_own on tenants for select
  using (id = auth_tenant_id());

drop policy if exists tenants_admin_update on tenants;
create policy tenants_admin_update on tenants for update
  using (id = auth_tenant_id() and is_venue_admin());

-- ---- profiles ----
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select using (id = auth.uid());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update using (id = auth.uid());

drop policy if exists profiles_tenant_admin on profiles;
create policy profiles_tenant_admin on profiles for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));

-- ---- Generic tenant isolation (ตารางที่ Admin+Staff อ่านได้ / Admin จัดการ) ----
-- branches
drop policy if exists branches_read on branches;
create policy branches_read on branches for select
  using (is_super_admin() or tenant_id = auth_tenant_id());
drop policy if exists branches_write on branches;
create policy branches_write on branches for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()))
  with check (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));

-- staff (Admin จัดการ / staff เห็นตัวเอง)
drop policy if exists staff_admin on staff;
create policy staff_admin on staff for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));
drop policy if exists staff_self on staff;
create policy staff_self on staff for select using (profile_id = auth.uid());

drop policy if exists staff_branches_rw on staff_branches;
create policy staff_branches_rw on staff_branches for all
  using (is_super_admin() or is_venue_admin()
         or exists (select 1 from staff s where s.id = staff_id and s.profile_id = auth.uid()));

-- courts / peak / block : ทุกคนใน tenant อ่านได้ + anonymous อ่านได้ (หน้าจองสาธารณะ)
drop policy if exists courts_public_read on courts;
create policy courts_public_read on courts for select using (true);
drop policy if exists courts_write on courts;
create policy courts_write on courts for all
  using (tenant_id = auth_tenant_id() and is_venue_admin())
  with check (tenant_id = auth_tenant_id() and is_venue_admin());

drop policy if exists peak_public_read on court_peak_windows;
create policy peak_public_read on court_peak_windows for select using (true);
drop policy if exists peak_write on court_peak_windows;
create policy peak_write on court_peak_windows for all
  using (tenant_id = auth_tenant_id() and is_venue_admin());

drop policy if exists block_public_read on block_schedules;
create policy block_public_read on block_schedules for select using (true);
drop policy if exists block_write on block_schedules;
create policy block_write on block_schedules for insert
  with check (tenant_id = auth_tenant_id() and is_staff()
              and court_id in (select c.id from courts c where c.branch_id = any(my_branch_ids())));
drop policy if exists block_manage on block_schedules;
create policy block_manage on block_schedules for delete
  using (tenant_id = auth_tenant_id() and is_venue_admin());

-- packages: public อ่านเฉพาะ active / admin จัดการ
drop policy if exists packages_public_read on packages;
create policy packages_public_read on packages for select using (is_active = true or tenant_id = auth_tenant_id());
drop policy if exists packages_write on packages;
create policy packages_write on packages for all
  using (tenant_id = auth_tenant_id() and is_venue_admin());

-- members: Admin เต็ม / Staff เฉพาะสาขา (basic) / สมาชิกเห็นตัวเอง
drop policy if exists members_admin on members;
create policy members_admin on members for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));
drop policy if exists members_staff_read on members;
create policy members_staff_read on members for select
  using (tenant_id = auth_tenant_id() and is_staff());
drop policy if exists members_staff_insert on members;
create policy members_staff_insert on members for insert
  with check (tenant_id = auth_tenant_id() and is_staff());
drop policy if exists members_self on members;
create policy members_self on members for select using (profile_id = auth.uid());
drop policy if exists members_self_update on members;
create policy members_self_update on members for update using (profile_id = auth.uid());

-- freeze_requests
drop policy if exists freeze_admin on freeze_requests;
create policy freeze_admin on freeze_requests for all
  using (tenant_id = auth_tenant_id() and is_staff());
drop policy if exists freeze_self on freeze_requests;
create policy freeze_self on freeze_requests for all
  using (member_id in (select id from members where profile_id = auth.uid()));

-- bookings: admin เห็นหมด / staff เฉพาะสาขาตัวเอง / ลูกค้าเห็นของตัวเอง
drop policy if exists bookings_admin on bookings;
create policy bookings_admin on bookings for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));
drop policy if exists bookings_staff on bookings;
create policy bookings_staff on bookings for select
  using (tenant_id = auth_tenant_id() and is_staff() and branch_id = any(my_branch_ids()));
drop policy if exists bookings_staff_insert on bookings;
create policy bookings_staff_insert on bookings for insert
  with check (tenant_id = auth_tenant_id() and is_staff() and branch_id = any(my_branch_ids()));
drop policy if exists bookings_member_self on bookings;
create policy bookings_member_self on bookings for select
  using (member_id in (select id from members where profile_id = auth.uid()));
-- หมายเหตุ: ลูกค้า guest (ไม่ login) สร้างการจองผ่าน API Route (service role)
-- เพื่อ validate advance_booking_limit / policy acceptance ก่อน insert

-- payments
drop policy if exists payments_admin on payments;
create policy payments_admin on payments for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));
drop policy if exists payments_member_self on payments;
create policy payments_member_self on payments for select
  using (member_id in (select id from members where profile_id = auth.uid()));

drop policy if exists counters_admin on tenant_counters;
create policy counters_admin on tenant_counters for all
  using (tenant_id = auth_tenant_id() and is_venue_admin());

-- receipts
drop policy if exists receipts_tenant on receipts;
create policy receipts_tenant on receipts for select
  using (is_super_admin() or tenant_id = auth_tenant_id());

-- guest_passes
drop policy if exists guest_admin on guest_passes;
create policy guest_admin on guest_passes for all
  using (tenant_id = auth_tenant_id() and is_staff());

-- checkins: staff เฉพาะสาขา / admin ทุกสาขา / สมาชิกเห็นของตัวเอง
drop policy if exists checkins_admin on checkins;
create policy checkins_admin on checkins for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));
drop policy if exists checkins_staff on checkins;
create policy checkins_staff on checkins for select
  using (tenant_id = auth_tenant_id() and is_staff() and branch_id = any(my_branch_ids()));
drop policy if exists checkins_staff_insert on checkins;
create policy checkins_staff_insert on checkins for insert
  with check (tenant_id = auth_tenant_id() and is_staff() and branch_id = any(my_branch_ids()));
drop policy if exists checkins_self on checkins;
create policy checkins_self on checkins for select
  using (member_id in (select id from members where profile_id = auth.uid()));

-- coupons
drop policy if exists coupons_admin on coupons;
create policy coupons_admin on coupons for all
  using (tenant_id = auth_tenant_id() and is_venue_admin());
drop policy if exists coupons_public_read on coupons;
create policy coupons_public_read on coupons for select using (status = 'active');

drop policy if exists coupon_usages_tenant on coupon_usages;
create policy coupon_usages_tenant on coupon_usages for all
  using (tenant_id = auth_tenant_id() and is_staff());

-- notifications: เห็นเฉพาะของตัวเอง / admin จัดการของ tenant
drop policy if exists notif_self on notifications;
create policy notif_self on notifications for select using (recipient_id = auth.uid());
drop policy if exists notif_self_update on notifications;
create policy notif_self_update on notifications for update using (recipient_id = auth.uid());
drop policy if exists notif_admin on notifications;
create policy notif_admin on notifications for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));

-- subscriptions / invoices: super admin + venue admin ของตัวเอง
drop policy if exists subs_access on subscriptions;
create policy subs_access on subscriptions for all
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));
drop policy if exists inv_access on subscription_invoices;
create policy inv_access on subscription_invoices for select
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));
drop policy if exists plan_logs_access on plan_change_logs;
create policy plan_logs_access on plan_change_logs for select
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));

-- audit_logs: Venue Admin อ่านของ tenant ตัวเอง / Super Admin ทุก tenant / Staff อ่านไม่ได้
drop policy if exists audit_read on audit_logs;
create policy audit_read on audit_logs for select
  using (is_super_admin() or (tenant_id = auth_tenant_id() and is_venue_admin()));
-- insert audit log ผ่าน service role จาก API layer เท่านั้น (ไม่มี policy insert)

-- ============================================================================
-- 16. STORAGE BUCKETS (โครงสร้างตาม Section 25.3: แยกโฟลเดอร์ต่อ tenant_id)
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('logos',           'logos',           true),
  ('branch-images',   'branch-images',   true),
  ('court-images',    'court-images',    true),
  ('member-profiles', 'member-profiles', false),
  ('slips',           'slips',           false),
  ('receipts',        'receipts',        false),
  ('documents',       'documents',       false)
on conflict (id) do nothing;

-- Storage RLS: path ต้องขึ้นต้นด้วย tenant_id ของตัวเอง เช่น {tenant_id}/xxx.jpg
drop policy if exists storage_tenant_rw on storage.objects;
create policy storage_tenant_rw on storage.objects for all
  using (
    (bucket_id in ('logos','branch-images','court-images') )  -- public read
    or (auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth_tenant_id()::text)
  )
  with check (
    auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
  );

-- ============================================================================
-- 17. REALTIME (ตาราง Realtime: จอง สลิป Occupancy)
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table bookings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table payments;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table checkins;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- เสร็จสิ้น — ขั้นถัดไป (ทำที่ API Layer / Edge Functions / Cron):
--  * pg_cron หรือ Vercel Cron: ยกเลิก booking หมด 30 นาที, Auto Check-out,
--    Renewal Reminder 7/3/0 วัน, Trial แจ้งเตือนวัน 11, Downgrade วัน 14,
--    Hard Delete tenant หลัง 30 วัน
--  * Omise Webhook: charge.complete / charge.failed → update subscriptions
--  * LINE Messaging API: ส่ง notification + retry 3 + fallback email
-- ============================================================================
