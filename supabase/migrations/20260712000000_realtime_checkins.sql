-- Realtime สำหรับ Check-in (§10.3-10.4) — occupancy ต้องอัปเดต < 1 วินาที
-- เพิ่มตาราง checkins เข้า publication ของ Supabase Realtime
-- RLS ยังบังคับตามปกติ: client เห็นเฉพาะ checkins ของ tenant ตัวเอง
-- ปลอดภัยเมื่อรันซ้ำ — ตรวจก่อนว่าตารางอยู่ใน publication แล้วหรือยัง

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'checkins'
  ) then
    alter publication supabase_realtime add table public.checkins;
  end if;
end $$;

-- ให้ payload ของ event มีข้อมูลแถวครบ (เผื่อ client อ่านตรงจาก event ในอนาคต)
alter table public.checkins replica identity full;
