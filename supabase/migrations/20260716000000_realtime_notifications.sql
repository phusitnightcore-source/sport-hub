-- Realtime + RLS สำหรับระบบแจ้งเตือนในแอปแบบเรียลไทม์ (ทุก role)
-- (1) เพิ่มตาราง notifications เข้า Supabase Realtime publication (pattern เดียวกับ realtime_checkins)
-- (2) เพิ่ม policy ให้ staff เห็นแจ้งเตือนฝั่งสนาม + member เห็นแจ้งเตือนของตัวเอง
--     (เดิม notif_self เทียบ recipient_id = auth.uid() แต่ dispatcher ใส่ recipient_id = members.id
--      → member มองไม่เห็นแจ้งเตือนของตัวเอง; นี่คือการอุด gap นั้น)
-- ปลอดภัยเมื่อรันซ้ำ

-- 1. Realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- payload ของ event มีข้อมูลแถวครบ (client อ่าน type/title/body ตรงจาก event ได้)
alter table public.notifications replica identity full;

-- 2. staff (รวม venue_admin) อ่านแจ้งเตือนฝั่งสนาม (admin/staff) ของ tenant ตัวเอง
drop policy if exists notif_staff_read on notifications;
create policy notif_staff_read on notifications for select
  using (
    is_staff()
    and tenant_id = auth_tenant_id()
    and recipient_type in ('admin', 'staff')
  );

-- 3. member อ่าน/อัปเดตแจ้งเตือนที่ recipient_id = members.id ของตัวเอง
drop policy if exists notif_member_own on notifications;
create policy notif_member_own on notifications for select
  using (
    recipient_type = 'member'
    and exists (
      select 1 from members m
      where m.id = notifications.recipient_id and m.profile_id = auth.uid()
    )
  );

drop policy if exists notif_member_own_update on notifications;
create policy notif_member_own_update on notifications for update
  using (
    recipient_type = 'member'
    and exists (
      select 1 from members m
      where m.id = notifications.recipient_id and m.profile_id = auth.uid()
    )
  );
