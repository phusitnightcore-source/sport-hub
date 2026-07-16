-- ผู้ใช้ทั่วไป (general user) — สมัครเองจากหน้าเว็บ role=member tenant_id=null
-- จองคอร์ทผ่านลิงก์ของสนาม แล้วผูกกับบัญชี (profile_id) เพื่อดูประวัติข้ามทุกสนาม

-- ผูกการจองกับ account ของผู้ใช้ (ต่างจาก member_id ที่เป็นสมาชิกฟิตเนสรายสนาม)
alter table bookings add column if not exists profile_id uuid references profiles(id) on delete set null;
create index if not exists idx_bookings_profile on bookings (profile_id);

-- PDPA consent ของผู้ใช้ทั่วไป (§6.2)
alter table profiles add column if not exists pdpa_consent_at timestamptz;
