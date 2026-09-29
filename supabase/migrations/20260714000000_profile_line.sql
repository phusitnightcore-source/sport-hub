-- LINE Login: เก็บ LINE userId ของลูกค้าที่ล็อกอินด้วย LINE (ใช้ส่งแจ้งเตือน + LIFF)
alter table profiles add column if not exists line_user_id text;
create index if not exists idx_profiles_line_user on profiles (line_user_id);
